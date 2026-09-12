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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { leadService, LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  visible: boolean;
  lead?: LeadItem | null;
  leadIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface OwnerOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const DEFAULT_TRANSFER_REASONS = [
  'Reassigned by Admin',
  'Lead Unresponsive',
  'Territory Re-allocation',
  'Owner Left Organization',
  'Workload Balancing',
  'Other',
];

const LEAD_TYPES: Array<'Leads' | 'Data'> = ['Leads', 'Data'];

export const ChangeOwnerModal: React.FC<Props> = ({
  visible,
  lead,
  leadIds,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Wizard Step (1 | 2) matching Web CRM 1:1
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [users, setUsers] = useState<OwnerOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reasons, setReasons] = useState<string[]>(DEFAULT_TRANSFER_REASONS);
  const [transferReason, setTransferReason] = useState<string>(DEFAULT_TRANSFER_REASONS[0]);
  const [leadType, setLeadType] = useState<'Leads' | 'Data'>('Leads');

  // Options matching Web CRM 1:1
  const [fresh, setFresh] = useState<boolean>(false);
  const [tasks, setTasks] = useState<boolean>(false);
  const [notes, setNotes] = useState<boolean>(true);
  const [attachments, setAttachments] = useState<boolean>(true);
  const [contactDetails, setContactDetails] = useState<boolean>(true);

  // Submitting & Error State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-picker modals for elegant mobile UX
  const [ownerPickerVisible, setOwnerPickerVisible] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [reasonPickerVisible, setReasonPickerVisible] = useState<boolean>(false);
  const [leadTypePickerVisible, setLeadTypePickerVisible] = useState<boolean>(false);

  const targetIds = leadIds && leadIds.length > 0
    ? leadIds
    : lead ? [lead.id || lead._id].filter(Boolean) as string[] : [];
  const leadCount = targetIds.length || 1;

  useEffect(() => {
    if (!visible) return;

    // Reset state on open
    setStep(1);
    setError(null);
    setLoadingUsers(true);
    setFresh(false);
    setTasks(false);
    setNotes(true);
    setAttachments(true);
    setContactDetails(true);
    setLeadType('Leads');
    setTransferReason(DEFAULT_TRANSFER_REASONS[0]);
    setUserSearchQuery('');

    // 1. Fetch All Active Users in the Organization matching Web CRM
    apiClient.get('/users')
      .then((res) => {
        const raw = res?.data?.items || res?.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          const activeUsers = raw
            .filter((u: any) => u.isActive !== false)
            .map((u: any) => ({
              _id: String(u._id || u.id || ''),
              name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              role: u.role || 'sales',
            }));
          setUsers(activeUsers);

          // Pre-select current lead owner if single lead and user exists
          const currentOwnerEmail = (lead as any)?.assignedTo || (lead as any)?.contactOwnerEmail || (lead as any)?.contact_owner_email || '';
          const matched = activeUsers.find((u) => u.email?.toLowerCase() === currentOwnerEmail?.toLowerCase());
          if (matched) {
            setSelectedUserId(matched._id);
          } else {
            setSelectedUserId('');
          }
        }
      })
      .catch(() => {
        setError('Failed to load active team members');
      })
      .finally(() => setLoadingUsers(false));

    // 2. Fetch Dynamic Transfer Reasons from Config (matching Web CRM)
    apiClient.get('/resource-items/resourceTransferReasons')
      .then((res) => {
        const items = res.data?.items || res.data || [];
        const mapped = Array.isArray(items)
          ? items.map((r: any) => (typeof r === 'string' ? r : r?.name || r?.label || r?.value)).filter(Boolean)
          : [];
        if (mapped.length > 0) {
          setReasons(mapped);
          setTransferReason(mapped[0]);
        }
      })
      .catch(() => {});
  }, [visible, lead, leadIds]);

  const selectedUser = users.find((u) => u._id === selectedUserId);

  const handleNext = () => {
    if (!selectedUserId) {
      setError('Please choose an owner to assign.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (targetIds.length === 0) {
      setError('No lead selected for reassignment');
      return;
    }

    if (!selectedUser) {
      setError('Selected owner is invalid.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const success = await leadService.bulkChangeOwner(
        targetIds,
        { email: selectedUser.email, uid: selectedUser._id },
        transferReason,
        leadType,
        {
          fresh,
          task: tasks,
          notes,
          attachments,
          contactDetails,
        }
      );

      if (success) {
        Alert.alert(
          'Reassignment Successful',
          `${leadCount} lead${leadCount > 1 ? 's' : ''} reassigned to ${selectedUser.name} successfully.`
        );
        onSuccess();
        onClose();
      } else {
        setError('Failed to transfer lead ownership. Please check network connection.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to transfer owner.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.modalTitle}>
                Reassign Lead ({leadCount} lead{leadCount > 1 ? 's' : ''})
              </Text>
              <Text style={styles.modalSubtitle}>
                {step === 1 ? 'Step 1 of 2: Assign Owner & Transfer Options' : 'Step 2 of 2: Reason & Category'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* ═══════════════════════════════════════════════════════════════
                STEP 1: ASSIGN OWNER + TRANSFER OPTIONS
            ═══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <View style={styles.stepContentBox}>
                {/* 1. Owner Select Dropdown */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Assign New Lead Owner / Agent *</Text>
                  <TouchableOpacity
                    style={[styles.selectBox, !selectedUser && styles.selectBoxEmpty]}
                    onPress={() => setOwnerPickerVisible(true)}
                    activeOpacity={0.8}
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? (
                      <View style={styles.selectBoxLoadingRow}>
                        <ActivityIndicator size="small" color="#272944" />
                        <Text style={styles.selectBoxLoadingText}>Loading team members...</Text>
                      </View>
                    ) : selectedUser ? (
                      <Text style={styles.selectBoxText} numberOfLines={1}>
                        {selectedUser.name} ({selectedUser.email}) — {selectedUser.role}
                      </Text>
                    ) : (
                      <Text style={styles.selectBoxPlaceholder}>Select New Lead Owner / Agent</Text>
                    )}
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 2. Transfer Lead(s) as Fresh Checkbox */}
                <TouchableOpacity
                  style={styles.masterCheckboxRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    const nextFresh = !fresh;
                    setFresh(nextFresh);
                    if (nextFresh) {
                      setTasks(false); // Matching Web CRM: disable tasks when fresh
                    }
                  }}
                >
                  <View style={[styles.customCheckbox, fresh && styles.customCheckboxChecked]}>
                    {fresh && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.masterCheckboxLabel}>Transfer Lead(s) as Fresh?</Text>
                </TouchableOpacity>

                {/* 3. Transfer Options Header */}
                <Text style={styles.optionsSectionTitle}>Select Transfer Options:</Text>

                {/* 4. Options Checkbox Grid */}
                <View style={styles.optionsGrid}>
                  {/* Include Open Tasks (Only visible if !fresh) */}
                  {!fresh && (
                    <TouchableOpacity
                      style={styles.optionCheckboxItem}
                      activeOpacity={0.7}
                      onPress={() => setTasks(!tasks)}
                    >
                      <View style={[styles.customCheckbox, tasks && styles.customCheckboxChecked]}>
                        {tasks && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.optionCheckboxLabel}>Include Open Tasks</Text>
                    </TouchableOpacity>
                  )}

                  {/* Include Notes */}
                  <TouchableOpacity
                    style={styles.optionCheckboxItem}
                    activeOpacity={0.7}
                    onPress={() => setNotes(!notes)}
                  >
                    <View style={[styles.customCheckbox, notes && styles.customCheckboxChecked]}>
                      {notes && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.optionCheckboxLabel}>Include Notes</Text>
                  </TouchableOpacity>

                  {/* Include Attachments */}
                  <TouchableOpacity
                    style={styles.optionCheckboxItem}
                    activeOpacity={0.7}
                    onPress={() => setAttachments(!attachments)}
                  >
                    <View style={[styles.customCheckbox, attachments && styles.customCheckboxChecked]}>
                      {attachments && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.optionCheckboxLabel}>Include Attachments</Text>
                  </TouchableOpacity>

                  {/* Include Contact Details */}
                  <TouchableOpacity
                    style={styles.optionCheckboxItem}
                    activeOpacity={0.7}
                    onPress={() => setContactDetails(!contactDetails)}
                  >
                    <View style={[styles.customCheckbox, contactDetails && styles.customCheckboxChecked]}>
                      {contactDetails && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.optionCheckboxLabel}>Include Contact Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2: REASON + LEAD TYPE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <View style={styles.stepContentBox}>
                {/* 1. Reason to Transfer Dropdown */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Select Reason To Transfer *</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => setReasonPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectBoxText} numberOfLines={1}>
                      {transferReason || 'Select Reason To Transfer'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 2. Lead Type Dropdown */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Please Select Lead Type *</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => setLeadTypePickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectBoxText} numberOfLines={1}>
                      {leadType}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Transfer Summary Card */}
                <View style={styles.transferSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Assignee:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedUser?.name} ({selectedUser?.role})
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fresh State:</Text>
                    <Text style={[styles.summaryValue, fresh && { color: '#059669', fontWeight: '700' }]}>
                      {fresh ? 'Yes (Reset to FRESH)' : 'No (Preserve Stage)'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Data Transferred:</Text>
                    <Text style={styles.summaryValue}>
                      {[
                        !fresh && tasks && 'Tasks',
                        notes && 'Notes',
                        attachments && 'Attachments',
                        contactDetails && 'Details',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer Actions matching Web CRM */}
          <View style={styles.modalFooterActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            {step === 1 ? (
              <TouchableOpacity
                style={[styles.primaryActionBtn, (!selectedUserId || loadingUsers) && styles.primaryActionBtnDisabled]}
                onPress={handleNext}
                disabled={!selectedUserId || loadingUsers}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              <View style={styles.stepTwoActionGroup}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color="#334155" style={{ marginRight: 4 }} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, submitting && styles.primaryActionBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.primaryActionBtnText}>Reassign Owner</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ─── OWNER SELECT PICKER MODAL (Exact Format: Name (email) — role) ─── */}
      <Modal
        visible={ownerPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOwnerPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setOwnerPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Assign New Lead Owner / Agent</Text>
              <TouchableOpacity onPress={() => setOwnerPickerVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input for fast team selection */}
            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search by name, email or role..."
                placeholderTextColor="#94A3B8"
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoCapitalize="none"
              />
              {userSearchQuery ? (
                <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {filteredUsers.length === 0 ? (
                <View style={styles.pickerEmptyBox}>
                  <Text style={styles.pickerEmptyText}>No active team members found.</Text>
                </View>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserId === u._id;
                  return (
                    <TouchableOpacity
                      key={u._id}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                      onPress={() => {
                        setSelectedUserId(u._id);
                        setError(null);
                        setOwnerPickerVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickerItemLeft}>
                        <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                          {u.name}
                        </Text>
                        <Text style={[styles.pickerItemSub, isSelected && styles.pickerItemSubSelected]}>
                          ({u.email}) — {u.role}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── REASON SELECT PICKER MODAL (6 Reasons matching Web CRM) ─── */}
      <Modal
        visible={reasonPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReasonPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setReasonPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Reason To Transfer</Text>
              <TouchableOpacity onPress={() => setReasonPickerVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {reasons.map((r) => {
                const isSelected = transferReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => {
                      setTransferReason(r);
                      setReasonPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                      {r}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── LEAD TYPE SELECT PICKER MODAL (Leads / Data) ─── */}
      <Modal
        visible={leadTypePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeadTypePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setLeadTypePickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Please Select Lead Type</Text>
              <TouchableOpacity onPress={() => setLeadTypePickerVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerList}>
              {LEAD_TYPES.map((t) => {
                const isSelected = leadType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => {
                      setLeadType(t);
                      setLeadTypePickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                      {t}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepContentBox: {
    gap: 16,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectBoxEmpty: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  selectBoxText: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  selectBoxPlaceholder: {
    fontSize: 13.5,
    color: '#94A3B8',
    flex: 1,
  },
  selectBoxLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectBoxLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  masterCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCheckboxChecked: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  masterCheckboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  optionsSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
    marginBottom: -4,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  optionCheckboxLabel: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  transferSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
  },
  stepTwoActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
  },
  backBtnText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272944',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9,
  },
  primaryActionBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  primaryActionBtnText: {
    fontSize: 13.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Picker Sheet Styles
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '75%',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 18,
    marginTop: 12,
    height: 38,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  pickerList: {
    paddingHorizontal: 10,
    marginTop: 8,
  },
  pickerEmptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  pickerItemName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerItemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  pickerItemTextSelected: {
    color: '#272944',
  },
  pickerItemSubSelected: {
    color: '#464A73',
  },
});
