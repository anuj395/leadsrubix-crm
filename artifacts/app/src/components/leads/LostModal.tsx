import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';

export interface LostFormField {
  key: string;
  label: string;
  type: string; // 'text' | 'select' | 'textarea'
  required?: boolean;
  options?: string[];
  placeholder?: string;
  order?: number;
  dropdown_source?: string;
  dropdown_api?: string;
}

const DEFAULT_LOST_REASONS = [
  'Price Too High',
  'Competitor Selection',
  'Financing Rejected',
  'Invalid Contact',
  'No Requirement',
  'Budget Issue',
  'Other',
];

const DEFAULT_LOST_FIELDS: LostFormField[] = [
  {
    key: 'lostReason',
    label: 'Lost Reason',
    type: 'select',
    required: true,
    dropdown_api: 'options/lostReason',
    options: DEFAULT_LOST_REASONS,
  },
  {
    key: 'otherLostReason',
    label: 'Other Reason Details',
    type: 'text',
    required: false,
    placeholder: 'Please mention reason details...',
  },
  {
    key: 'notes',
    label: 'Note',
    type: 'textarea',
    required: false,
    placeholder: 'Enter note or feedback...',
  },
];

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const LostModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Dynamic Form Fields & Values
  const [formFields, setLostFormFields] = useState<LostFormField[]>(DEFAULT_LOST_FIELDS);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // Dynamic Options & In-Modal Option Picker Overlay State
  const [dynamicApiOptions, setDynamicApiOptions] = useState<Record<string, string[]>>({});
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    fieldKey: string;
    fieldLabel: string;
    options: string[];
    currentValue: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    fieldKey: '',
    fieldLabel: '',
    options: [],
    currentValue: '',
    onSelect: () => {},
  });

  const [pickerSearch, setPickerSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Initialize Form Values from Lead
  useEffect(() => {
    if (!visible) return;

    const initialVals: Record<string, any> = {
      lostReason: (lead as any).lostReason || (lead as any).lost_reason || '',
      otherLostReason: (lead as any).otherLostReason || (lead as any).other_lost_reason || '',
      notes: '',
    };

    setFormValues(initialVals);
  }, [visible, lead]);

  // 2. Fetch Screen Resolution (POST /screens/resolve) & Dynamic Dropdown Options
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const loadConfigAndOptions = async () => {
      try {
        setLoadingConfig(true);
        const finalIndustry = user?.industryId || 'temp0001';
        const finalRole = user?.role || 'admin';
        const finalOrg = user?.organizationId || '';

        // Resolve screen config
        const res = await apiClient
          .post('/screens/resolve', {
            screenKey: 'lost',
            screen_key: 'lost',
            industryCode: finalIndustry,
            industry_code: finalIndustry,
            roleKey: finalRole,
            role_key: finalRole,
            organizationId: finalOrg,
            organization_id: finalOrg,
          })
          .catch(() => null);

        if (isMounted && res?.data) {
          const rawFields = res.data.formFields || res.data.form_fields || [];
          if (Array.isArray(rawFields) && rawFields.length > 0) {
            const mapped: LostFormField[] = rawFields.map((f: any, idx: number) => ({
              key: f.key || f.field_key || f.name,
              label: f.label || f.name || f.key,
              type: f.type || f.field_type || (f.options ? 'select' : 'text'),
              required: !!(f.required || f.is_required),
              options: Array.isArray(f.options) ? f.options.map((o: any) => (typeof o === 'object' ? o.label || o.value : String(o))) : undefined,
              placeholder: f.placeholder || '',
              order: f.order ?? idx,
              dropdown_source: f.dropdown_source || f.dropdownSource,
              dropdown_api: f.dropdown_api || f.dropdownApi,
            }));
            setLostFormFields(mapped.sort((a, b) => (a.order || 0) - (b.order || 0)));
          }
        }

        // Load dynamic options for lostReason
        const orgParam = finalOrg ? `?organizationId=${encodeURIComponent(finalOrg)}` : '';
        const indParam = finalIndustry ? `&industryId=${encodeURIComponent(finalIndustry)}` : '';
        const querySuffix = `${orgParam}${orgParam ? indParam : indParam ? `?${indParam.substring(1)}` : ''}`;

        const apiRes = await apiClient.get(`options/lostReason${querySuffix}`).catch(() => null);
        if (apiRes?.data) {
          const raw = apiRes.data?.items || apiRes.data?.data || apiRes.data || [];
          if (Array.isArray(raw) && raw.length > 0) {
            const strVals = raw
              .map((item: any) => (typeof item === 'string' ? item : item.label || item.value || item.name || String(item)))
              .filter((v: string) => v && typeof v === 'string' && v.trim() !== '');

            if (strVals.length > 0 && isMounted) {
              setDynamicApiOptions((prev) => ({
                ...prev,
                lostReason: Array.from(new Set(strVals)),
              }));
            }
          }
        }
      } catch (err) {
        console.warn('[LostModal] Config / options fetch warning:', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    loadConfigAndOptions();
    return () => {
      isMounted = false;
    };
  }, [visible, user?.industryId, user?.role, user?.organizationId]);

  // Helper: Get options for a field
  const getOptionsForField = useCallback(
    (field: LostFormField): string[] => {
      const fieldKey = field.key;

      // 1. Dynamic API fetched options FIRST
      const apiVals = dynamicApiOptions[fieldKey];
      if (apiVals && apiVals.length > 0) {
        return apiVals;
      }

      // 2. Field options SECOND
      if (field.options && field.options.length > 0) {
        return field.options;
      }

      // 3. Fallback defaults
      if (fieldKey === 'lostReason' || fieldKey === 'lost_reason') {
        return DEFAULT_LOST_REASONS;
      }

      return [];
    },
    [dynamicApiOptions]
  );

  // Helper: Update a form field value
  const setFieldValue = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Open option picker modal
  const openPicker = (field: LostFormField) => {
    const options = getOptionsForField(field);
    const currentVal = String(formValues[field.key] || '');
    setPickerSearch('');
    setPickerModal({
      visible: true,
      fieldKey: field.key,
      fieldLabel: field.label,
      options,
      currentValue: currentVal,
      onSelect: (val: string) => setFieldValue(field.key, val),
    });
  };

  // Filtered options in picker
  const filteredPickerOptions = useMemo(() => {
    if (!pickerSearch.trim()) return pickerModal.options;
    const query = pickerSearch.toLowerCase().trim();
    return pickerModal.options.filter((o) => o.toLowerCase().includes(query));
  }, [pickerModal.options, pickerSearch]);

  // Submit Handler (Matches Web CRM 1:1)
  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    const lostReasonVal = formValues.lostReason || formValues.lost_reason || '';
    if (!lostReasonVal) {
      Alert.alert('Required Field', 'Please Select Lost Reason');
      return;
    }

    try {
      setSubmitting(true);

      const otherReasonVal = lostReasonVal === 'Other' ? String(formValues.otherLostReason || formValues.other_lost_reason || '').trim() : '';
      const noteText = String(formValues.notes || formValues.note || '').trim();

      // Geolocation capture matching Web CRM 1:1
      let lat = null;
      let lng = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch (e) {
        console.warn('Geolocation capture warning:', e);
      }

      // 1. Update Contact Stage to LOST
      const contactPayload: Record<string, any> = {
        stage: 'LOST',
        status: 'LOST',
        lostReason: lostReasonVal,
        lost_reason: lostReasonVal,
        otherLostReason: otherReasonVal,
        other_lost_reason: otherReasonVal,
        latitude: lat,
        longitude: lng,
        modifiedAt: new Date(),
        stageChangeAt: new Date(),
      };

      await apiClient.put(`/contacts/${leadId}`, contactPayload).catch(() => null);

      // 2. Update tasks associated with this contact (Matching Web 1:1)
      try {
        const tasksRes = await apiClient.get('/tasks', { params: { contactId: leadId, contact_id: leadId } }).catch(() => null);
        const allTasks = tasksRes?.data?.items || tasksRes?.data || [];
        if (Array.isArray(allTasks)) {
          for (const t of allTasks) {
            const taskId = t._id || t.id;
            if (taskId) {
              const nextStatus = String(t.status || '').toUpperCase() === 'PENDING' ? 'INACTIVE' : t.status;
              await apiClient.put(`/tasks/${taskId}`, {
                ...t,
                status: nextStatus,
                stage: 'LOST',
              }).catch(() => null);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to update tasks:', e);
      }

      // 3. Save Resource Note if provided (Matching Web 1:1)
      if (noteText) {
        await apiClient
          .post('/resources/resourceNotes', {
            contactId: leadId,
            contact_id: leadId,
            note: noteText,
            notes: noteText,
            text: noteText,
            userName: user?.name || user?.email || 'Admin',
            userEmail: user?.email || '',
            createdBy: user?.name || user?.email || 'Admin',
          })
          .catch(() => null);
      }

      Alert.alert('Success', 'Lead Status Updated!!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save details');
    } finally {
      setSubmitting(false);
    }
  };

  // Render individual dynamic field based on type matching Web CRM 1:1
  const renderDynamicField = (field: LostFormField) => {
    const value = formValues[field.key] ?? '';
    const isSelect = field.type === 'select' || field.key === 'lostReason' || field.key === 'lost_reason';
    const isOtherField = field.key === 'otherLostReason' || field.key === 'other_lost_reason';
    const isTextArea = field.type === 'textarea' || field.key === 'notes' || field.key === 'note';

    // Show otherLostReason field only if lostReason is 'Other'
    if (isOtherField && formValues.lostReason !== 'Other' && formValues.lost_reason !== 'Other') {
      return null;
    }

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.modalInputLabel}>
          {field.label} {field.required && <Text style={styles.requiredStar}>*</Text>}
        </Text>

        {isSelect ? (
          <TouchableOpacity
            style={styles.dropdownSelectBox}
            onPress={() => openPicker(field)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownSelectText, !value && styles.dropdownSelectPlaceholder]}>
              {value || `Select ${field.label}`}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </TouchableOpacity>
        ) : isTextArea ? (
          <TextInput
            style={[styles.modalTextInput, { height: 85, textAlignVertical: 'top' }]}
            value={String(value)}
            onChangeText={(text) => setFieldValue(field.key, text)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            placeholderTextColor="#94A3B8"
            multiline
          />
        ) : (
          <TextInput
            style={styles.modalTextInput}
            value={String(value)}
            onChangeText={(text) => setFieldValue(field.key, text)}
            placeholder={field.placeholder || field.label}
            placeholderTextColor="#94A3B8"
          />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header Matching Web 1:1 */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.modalTitle}>Lost Details</Text>
              <Text style={styles.modalSubtitle}>Specify reason for marking lead as lost.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loadingConfig ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.brand700} />
              <Text style={styles.loadingText}>Loading fields...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {formFields.map((field) => renderDynamicField(field))}
            </ScrollView>
          )}

          {/* Action Buttons Matching Web 1:1 */}
          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* IN-MODAL OVERLAY: OPTION PICKER */}
        {pickerModal.visible && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>Select {pickerModal.fieldLabel}</Text>
                  <Text style={styles.modalSubtitle}>{filteredPickerOptions.length} options available</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search ${pickerModal.fieldLabel.toLowerCase()}...`}
                placeholderTextColor="#94A3B8"
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />

              <FlatList
                data={filteredPickerOptions}
                keyExtractor={(item, index) => `${item}-${index}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = item === pickerModal.currentValue;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => {
                        pickerModal.onSelect(item);
                        setPickerModal((prev) => ({ ...prev, visible: false }));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyOptionsView}>
                    <Text style={styles.emptyOptionsText}>No options match your search</Text>
                  </View>
                }
              />
            </View>
          </View>
        )}
      </View>
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
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
    position: 'relative',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleGroup: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
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
    marginRight: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 14,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  requiredStar: {
    color: '#EF4444',
  },
  dropdownSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownSelectText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  dropdownSelectPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  inModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  modalSearchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#0F172A',
    marginVertical: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemSelected: {
    backgroundColor: '#FEF2F2',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
  },
  pickerItemTextSelected: {
    color: '#DC2626',
    fontWeight: '700',
  },
  emptyOptionsView: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyOptionsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

