import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { LeadItem } from '../../services/leadService';
import { dealsService, Pipeline, Stage } from '../../services/dealsService';
import { useAuth } from '../../context/AuthContext';
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConvertLeadModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Dual Customer Type
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [accountName, setAccountName] = useState('');
  const [createDeal, setCreateDeal] = useState(true);

  // Form Fields
  const [dealTitle, setDealTitle] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [showCloseDatePicker, setShowCloseDatePicker] = useState(false);
  const [dealNotes, setDealNotes] = useState('');

  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sub-Pickers
  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible || !lead) return;
    setErrorMessage(null);
    setCreateDeal(true);

    const customerName = lead.name || 'Client';
    const indId = String(user?.industryId || '').toLowerCase();
    const isB2BVertical = indId === 'temp0006' || indId === 'temp0007';
    setCustomerType(isB2BVertical ? 'B2B' : 'B2C');

    if (isB2BVertical) {
      setAccountName(`${customerName} Co.`);
      setDealTitle(`${customerName} Co. - Enterprise Opportunity`);
    } else {
      setAccountName('');
      const projectName = lead.project || lead.projectName || 'Opportunity';
      setDealTitle(`${customerName} - ${projectName}`);
    }

    const parsedBudget = lead.budget ? String(lead.budget).replace(/[^0-9]/g, '') : '';
    setDealAmount(parsedBudget || '');

    // Default 30 days ahead
    const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setExpectedCloseDate(d30);
    setDealNotes(lead.notes || '');

    // Load real pipelines from backend
    loadPipelines();
  }, [visible, lead, user?.industryId]);

  const loadPipelines = async () => {
    try {
      setLoadingPipelines(true);
      const pipes = await dealsService.listPipelines();
      setPipelines(pipes);
      if (pipes.length > 0) {
        const defaultPipe = pipes.find((p) => p.isDefault || p.is_default) || pipes[0];
        const pId = String(defaultPipe._id || defaultPipe.id);
        setSelectedPipelineId(pId);
        if (defaultPipe.stages && defaultPipe.stages.length > 0) {
          const firstSt = defaultPipe.stages[0];
          setSelectedStageId(String(firstSt.stageId || firstSt.stage_id || firstSt.name));
        }
      }
    } catch (err) {
      console.warn('Failed to load pipelines for convert modal:', err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const activePipeline = pipelines.find((p) => String(p._id || p.id) === selectedPipelineId) || pipelines[0];
  const activeStages: Stage[] = activePipeline?.stages || [];
  const activeStage = activeStages.find((s) => String(s.stageId || s.stage_id || s.name) === selectedStageId) || activeStages[0];

  const handleTypeChange = (newType: 'B2C' | 'B2B') => {
    setCustomerType(newType);
    const customerName = lead.name || 'Client';
    const projectName = lead.project || lead.projectName || 'Opportunity';
    if (newType === 'B2B') {
      const defAcc = `${customerName} Co.`;
      setAccountName(defAcc);
      setDealTitle(`${defAcc} - ${projectName}`);
    } else {
      setAccountName('');
      setDealTitle(`${customerName} - ${projectName}`);
    }
  };

  const handleSelectPipeline = (pipe: Pipeline) => {
    const pId = String(pipe._id || pipe.id);
    setSelectedPipelineId(pId);
    setPipelinePickerOpen(false);
    if (pipe.stages && pipe.stages.length > 0) {
      const firstSt = pipe.stages[0];
      setSelectedStageId(String(firstSt.stageId || firstSt.stage_id || firstSt.name));
    }
  };

  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    if (customerType === 'B2B' && !accountName.trim()) {
      setErrorMessage('Please enter Company / Organization Name for B2B Corporate conversion.');
      return;
    }

    let amt = 0;
    if (createDeal) {
      if (!dealTitle.trim()) {
        setErrorMessage('Please enter a Deal Title.');
        return;
      }

      amt = Number(dealAmount) || 0;
      if (isNaN(amt) || amt < 0) {
        setErrorMessage('Deal value must be 0 or greater.');
        return;
      }

      if (expectedCloseDate) {
        const closeTime = new Date(expectedCloseDate).getTime();
        if (!isNaN(closeTime) && closeTime < Date.now() - 24 * 60 * 60 * 1000) {
          setErrorMessage('Expected close date cannot be in the past.');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const finalPipelineId = selectedPipelineId || String(pipelines[0]?._id || pipelines[0]?.id || '');
      const finalStageId = selectedStageId || String(activeStages[0]?.stageId || activeStages[0]?.stage_id || activeStages[0]?.name || '');

      const payload = {
        customerType,
        accountName: customerType === 'B2B' ? accountName.trim() : undefined,
        createDeal,
        dealTitle: createDeal ? dealTitle.trim() : undefined,
        dealAmount: createDeal ? amt : 0,
        pipelineId: createDeal ? finalPipelineId : undefined,
        stageId: createDeal ? finalStageId : undefined,
        stageName: createDeal ? (activeStage?.name || finalStageId) : undefined,
        probability: createDeal ? (activeStage?.probability ?? 25) : undefined,
        expectedCloseDate: createDeal ? expectedCloseDate : undefined,
        dealNotes: createDeal ? dealNotes.trim() : undefined,
      };

      // Call authoritative Backend API matching Web CRM ContactDetails.tsx 1:1
      await apiClient.post(`/contacts/${leadId}/convert`, payload);

      Alert.alert(
        'Lead Converted',
        createDeal
          ? 'Lead successfully promoted into an active Sales Deal!'
          : 'Lead successfully qualified and converted!'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lead conversion error:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to convert lead to deal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#059669" />
                <Text style={styles.modalTitle}>Convert Lead to Deal</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Promotes this contact into an active Sales Deal and links monetary value
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {Boolean(errorMessage) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Customer Type Engine */}
            <Text style={styles.sectionLabel}>CUSTOMER TYPE</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, customerType === 'B2C' && styles.typeBtnActive]}
                onPress={() => handleTypeChange('B2C')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={15} color={customerType === 'B2C' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.typeBtnText, customerType === 'B2C' && styles.typeBtnTextActive]}>
                  Direct (B2C)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, customerType === 'B2B' && styles.typeBtnActive]}
                onPress={() => handleTypeChange('B2B')}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={15} color={customerType === 'B2B' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.typeBtnText, customerType === 'B2B' && styles.typeBtnTextActive]}>
                  Corporate (B2B)
                </Text>
              </TouchableOpacity>
            </View>

            {/* B2B Company Name */}
            {customerType === 'B2B' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>
                  COMPANY / CORPORATE NAME <Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="e.g. Acme Technologies Private Limited"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {/* Create Deal Checkbox Option */}
            <TouchableOpacity
              style={styles.dealToggleBox}
              onPress={() => setCreateDeal((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={createDeal ? 'checkbox' : 'square-outline'}
                size={20}
                color={createDeal ? '#272944' : '#94A3B8'}
              />
              <View style={{ flex: 1, marginLeft: 9 }}>
                <Text style={styles.dealToggleTitle}>Create a New Deal in Sales Pipeline</Text>
                <Text style={styles.dealToggleSub}>
                  Generates an active commercial deal card with stage tracking and revenue value.
                </Text>
              </View>
            </TouchableOpacity>

            {createDeal && (
              <>
                {/* Deal Title */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>
                    DEAL TITLE <Text style={styles.star}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={dealTitle}
                    onChangeText={setDealTitle}
                    placeholder="e.g. Corporate License Deal"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Deal Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>
                    DEAL VALUE (INR) <Text style={styles.star}>*</Text>
                  </Text>
                  <View style={styles.amountBox}>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>₹ INR</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, { flex: 1, fontWeight: '700', color: '#059669' }]}
                      value={dealAmount}
                      onChangeText={setDealAmount}
                      placeholder="e.g. 5000000"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Pipeline & Stage Selection */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>SALES PIPELINE</Text>
                    <TouchableOpacity
                      style={styles.selectTrigger}
                      onPress={() => setPipelinePickerOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectTriggerText} numberOfLines={1}>
                        {activePipeline?.name || 'Standard Pipeline'}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>STAGE</Text>
                    <TouchableOpacity
                      style={styles.selectTrigger}
                      onPress={() => setStagePickerOpen(true)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: activeStage?.color || '#272944',
                          }}
                        />
                        <Text style={styles.selectTriggerText} numberOfLines={1}>
                          {activeStage?.name || 'Qualification'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Expected Close Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>EXPECTED CLOSE DATE</Text>
                  <TouchableOpacity
                    style={styles.dateTriggerBtn}
                    onPress={() => setShowCloseDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#272944" style={{ marginRight: 10 }} />
                    <Text style={expectedCloseDate ? styles.dateTriggerText : styles.dateTriggerPlaceholder}>
                      {expectedCloseDate ? formatDateDisplay(expectedCloseDate) : 'Select expected close date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>OPPORTUNITY NOTES</Text>
                  <TextInput
                    style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={dealNotes}
                    onChangeText={setDealNotes}
                    placeholder="Add any specific requirements, commercial terms or notes..."
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {createDeal ? 'Convert & Create Deal' : 'Convert Lead (No Deal)'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* In-Modal Calendar Date Picker */}
        <CalendarDatePickerModal
          visible={showCloseDatePicker}
          onClose={() => setShowCloseDatePicker(false)}
          onSelectDate={(formatted) => {
            setExpectedCloseDate(formatted);
            setShowCloseDatePicker(false);
          }}
          currentValue={expectedCloseDate}
          title="Expected Close Date"
          includeTime={false}
          asInModalOverlay={true}
          minDate={new Date()}
        />
      </View>

      {/* Sub-Modal: Pipeline Picker */}
      <Modal visible={pipelinePickerOpen} animationType="slide" transparent onRequestClose={() => setPipelinePickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Pipeline</Text>
              <TouchableOpacity onPress={() => setPipelinePickerOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {pipelines.map((p) => {
                const pId = String(p._id || p.id);
                const isSelected = selectedPipelineId === pId;
                return (
                  <TouchableOpacity
                    key={pId}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => handleSelectPipeline(p)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { color: '#272944', fontWeight: '700' }]}>
                      {p.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub-Modal: Stage Picker */}
      <Modal visible={stagePickerOpen} animationType="slide" transparent onRequestClose={() => setStagePickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Stage</Text>
              <TouchableOpacity onPress={() => setStagePickerOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {activeStages.map((st) => {
                const stId = String(st.stageId || st.stage_id || st.name);
                const isSelected = selectedStageId === stId;
                return (
                  <TouchableOpacity
                    key={stId}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => {
                      setSelectedStageId(stId);
                      setStagePickerOpen(false);
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color || '#272944', marginRight: 8 }} />
                    <Text style={[styles.pickerItemText, isSelected && { color: '#272944', fontWeight: '700' }]}>
                      {st.name} ({st.probability}%)
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#272944" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  scrollArea: {
    maxHeight: 440,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  typeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dealToggleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  dealToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealToggleSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  star: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.2)',
  },
  currencyBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#272944',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  subModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  pickerItemRowSelected: {
    backgroundColor: 'rgba(39, 41, 68, 0.05)',
    borderColor: '#272944',
  },
  pickerItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  dateTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  dateTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dateTriggerPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
  },
});
