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

export interface NotInterestedFormField {
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

const DEFAULT_NOT_INT_REASONS = [
  'High Price',
  'Location Issue',
  'Purchased Elsewhere',
  'Plan Cancelled',
  'Budget Issue',
  'Other',
];

const DEFAULT_NOT_INT_FIELDS: NotInterestedFormField[] = [
  {
    key: 'notIntReason',
    label: 'Not Interested Reason',
    type: 'select',
    required: true,
    dropdown_api: 'options/notIntReason',
    options: DEFAULT_NOT_INT_REASONS,
  },
  {
    key: 'otherNotIntReason',
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

export const NotInterestedModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Dynamic Form Fields & Values
  const [formFields, setNotIntFormFields] = useState<NotInterestedFormField[]>(DEFAULT_NOT_INT_FIELDS);
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
      notIntReason: (lead as any).notIntReason || (lead as any).not_int_reason || '',
      otherNotIntReason: (lead as any).otherNotIntReason || (lead as any).other_not_int_reason || '',
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
            screenKey: 'notInterested',
            screen_key: 'notInterested',
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
            const mapped: NotInterestedFormField[] = rawFields.map((f: any, idx: number) => ({
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
            setNotIntFormFields(mapped.sort((a, b) => (a.order || 0) - (b.order || 0)));
          }
        }

        // Load dynamic options for notIntReason
        const orgParam = finalOrg ? `?organizationId=${encodeURIComponent(finalOrg)}` : '';
        const indParam = finalIndustry ? `&industryId=${encodeURIComponent(finalIndustry)}` : '';
        const querySuffix = `${orgParam}${orgParam ? indParam : indParam ? `?${indParam.substring(1)}` : ''}`;

        const apiRes = await apiClient.get(`options/notIntReason${querySuffix}`).catch(() => null);
        if (apiRes?.data) {
          const raw = apiRes.data?.items || apiRes.data?.data || apiRes.data || [];
          if (Array.isArray(raw) && raw.length > 0) {
            const strVals = raw
              .map((item: any) => (typeof item === 'string' ? item : item.label || item.value || item.name || String(item)))
              .filter((v: string) => v && typeof v === 'string' && v.trim() !== '');

            if (strVals.length > 0 && isMounted) {
              setDynamicApiOptions((prev) => ({
                ...prev,
                notIntReason: Array.from(new Set(strVals)),
              }));
            }
          }
        }
      } catch (err) {
        console.warn('[NotInterestedModal] Config / options fetch warning:', err);
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
    (field: NotInterestedFormField): string[] => {
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
      if (fieldKey === 'notIntReason' || fieldKey === 'not_int_reason') {
        return DEFAULT_NOT_INT_REASONS;
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
  const openPicker = (field: NotInterestedFormField) => {
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

    const notIntReasonVal = formValues.notIntReason || formValues.not_int_reason || '';
    if (!notIntReasonVal) {
      Alert.alert('Required Field', 'Please Select Not Interested Reason');
      return;
    }

    try {
      setSubmitting(true);

      const otherReasonVal = notIntReasonVal === 'Other' ? String(formValues.otherNotIntReason || formValues.other_not_int_reason || '').trim() : '';
      const noteText = String(formValues.notes || formValues.note || '').trim();

      // 1. Update Contact Stage to NOT INTERESTED
      const contactPayload = {
        stage: 'NOT INTERESTED',
        status: 'NOT INTERESTED',
        notIntReason: notIntReasonVal,
        not_int_reason: notIntReasonVal,
        otherNotIntReason: otherReasonVal,
        other_not_int_reason: otherReasonVal,
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
                stage: 'NOT INTERESTED',
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
            customerName: lead.name || lead.firstName || '',
            userEmail: user?.email || '',
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
  const renderDynamicField = (field: NotInterestedFormField) => {
    const value = formValues[field.key] ?? '';
    const isSelect = field.type === 'select' || field.key === 'notIntReason' || field.key === 'not_int_reason';
    const isOtherField = field.key === 'otherNotIntReason' || field.key === 'other_not_int_reason';
    const isTextArea = field.type === 'textarea' || field.key === 'notes' || field.key === 'note';

    // Show otherNotIntReason field only if notIntReason is 'Other'
    if (isOtherField && formValues.notIntReason !== 'Other' && formValues.not_int_reason !== 'Other') {
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
              <Text style={styles.modalTitle}>Not Interested Details</Text>
              <Text style={styles.modalSubtitle}>Specify reason for marking lead as not interested.</Text>
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
                autoCorrect={false}
              />

              <FlatList
                data={filteredPickerOptions}
                keyExtractor={(item, index) => `${item}_${index}`}
                style={{ maxHeight: 280 }}
                renderItem={({ item }) => {
                  const isSelected = pickerModal.currentValue === item;
                  return (
                    <TouchableOpacity
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => {
                        if (pickerModal.onSelect) pickerModal.onSelect(item);
                        setPickerModal((prev) => ({ ...prev, visible: false }));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  pickerSearch.trim() ? (
                    <TouchableOpacity
                      style={styles.customOptionRow}
                      onPress={() => {
                        if (pickerModal.onSelect) pickerModal.onSelect(pickerSearch.trim());
                        setPickerModal((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color={theme.colors.brand700} />
                      <Text style={styles.customOptionText}>Use custom value: "{pickerSearch.trim()}"</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.emptyOptionsText}>No options found</Text>
                  )
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
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
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
    height: 48,
  },
  dropdownSelectText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  dropdownSelectPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  modalSearchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#334155',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  customOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    marginTop: 8,
  },
  customOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.colors.brand700,
  },
  emptyOptionsText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    backgroundColor: '#1E2238',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* IN-MODAL OVERLAY SHEET STYLES */
  inModalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 99999,
  },
  inModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '92%',
  },
});
