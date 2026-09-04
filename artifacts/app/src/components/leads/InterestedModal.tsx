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
import { getDynamicDefaultOptions } from '../../screens/leads/LeadFormScreen';

export interface FormField {
  key: string;
  label: string;
  type: string; // 'text' | 'select' | 'date' | 'textarea' | 'phone' | 'email'
  required?: boolean;
  options?: string[];
  placeholder?: string;
  order?: number;
  dropdown_source?: string;
  dropdown_api?: string;
}

const DIALING_CODES = [
  { code: '+91', flag: '🇮🇳', label: '🇮🇳 +91 (India)' },
  { code: '+1', flag: '🇺🇸', label: '🇺🇸 +1 (US)' },
  { code: '+44', flag: '🇬🇧', label: '🇬🇧 +44 (UK)' },
  { code: '+971', flag: '🇦🇪', label: '🇦🇪 +971 (UAE)' },
  { code: '+65', flag: '🇸🇬', label: '🇸🇬 +65 (Singapore)' },
  { code: '+61', flag: '🇦🇺', label: '🇦🇺 +61 (Australia)' },
  { code: '+966', flag: '🇸🇦', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+49', flag: '🇩🇪', label: '🇩🇪 +49 (Germany)' },
  { code: '+33', flag: '🇫🇷', label: '🇫🇷 +33 (France)' },
  { code: '+977', flag: '🇳🇵', label: '🇳🇵 +977 (Nepal)' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const QUICK_TIMES = [
  '10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM'
];

const DEFAULT_INTERESTED_FIELDS: FormField[] = [
  { key: 'customerName', label: 'Customer Name', type: 'text', required: true },
  { key: 'alternateNo', label: 'Alternate Number', type: 'phone', required: false },
  { key: 'location', label: 'Location', type: 'select', required: true, dropdown_api: 'options/location' },
  { key: 'projectName', label: 'Project Name', type: 'select', required: true, dropdown_api: 'options/projectName' },
  { key: 'taskType', label: 'Next Follow Up Type', type: 'select', required: true, options: ['Call Back', 'Meeting', 'Site Visit'] },
  { key: 'budget', label: 'Budget', type: 'select', required: true, dropdown_api: 'options/budget' },
  { key: 'propertyType', label: 'Property Type', type: 'select', required: true, dropdown_api: 'options/propertyType' },
  { key: 'propertyStage', label: 'Property Stage', type: 'select', required: false, dropdown_api: 'options/propertyStage' },
  { key: 'nextFollowUp', label: 'Next Follow Up Date', type: 'date', required: true },
  { key: 'propertySubType', label: 'Property Sub Type', type: 'select', required: false, dropdown_api: 'options/propertySubType' },
  { key: 'source', label: 'Lead Source', type: 'select', required: true, dropdown_api: 'options/source' },
  { key: 'notes', label: 'Note', type: 'textarea', required: false },
];

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const InterestedModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Dynamic Form Fields & Values
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_INTERESTED_FIELDS);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [dialCode, setDialCode] = useState('+91');
  const [showDialCodePicker, setShowDialCodePicker] = useState(false);

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateFieldKey, setActiveDateFieldKey] = useState('nextFollowUp');
  const [submitting, setSubmitting] = useState(false);

  // Interactive Calendar State
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calSelectedDate, setCalSelectedDate] = useState<number>(new Date().getDate());
  const [calTime, setCalTime] = useState<string>('11:00 AM');

  // Days in month calculation for interactive calendar grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];
    const today = new Date();

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, isToday: false, isSelected: false });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const isToday = today.getDate() === i && today.getMonth() === calMonth && today.getFullYear() === calYear;
      const isSelected = calSelectedDate === i;
      days.push({ day: i, isCurrentMonth: true, isToday, isSelected });
    }
    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, isToday: false, isSelected: false });
    }
    return days;
  }, [calYear, calMonth, calSelectedDate]);

  // 1. Initialize Form Values from Lead
  useEffect(() => {
    if (!visible) return;

    const initialVals: Record<string, any> = {
      customerName: lead.name || lead.firstName || '',
      alternateNo: (lead as any).alternateNo || (lead as any).alternate_no || '',
      location: lead.location || '',
      projectName: lead.project || lead.projectName || '',
      taskType: 'Call Back',
      budget: lead.budget || '',
      nextFollowUp: '',
      propertyType: lead.propertyType || '',
      propertyStage: (lead as any).propertyStage || '',
      propertySubType: (lead as any).propertySubType || '',
      source: lead.source || (lead as any).lead_source || '',
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
            screenKey: 'interested',
            screen_key: 'interested',
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
            const mapped: FormField[] = rawFields.map((f: any, idx: number) => ({
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
            setFormFields(mapped.sort((a, b) => (a.order || 0) - (b.order || 0)));
          }
        }

        // Load dynamic options from endpoints
        const orgParam = finalOrg ? `?organizationId=${encodeURIComponent(finalOrg)}` : '';
        const indParam = finalIndustry ? `&industryId=${encodeURIComponent(finalIndustry)}` : '';
        const querySuffix = `${orgParam}${orgParam ? indParam : indParam ? `?${indParam.substring(1)}` : ''}`;

        const endpoints = [
          { key: 'projectName', url: `options/projectName${querySuffix}` },
          { key: 'projectName', url: `options/resourceProjects?display=projectName${indParam}` },
          { key: 'location', url: `options/location${querySuffix}` },
          { key: 'location', url: `options/resourceLocations?display=locationName${indParam}` },
          { key: 'propertyType', url: `options/propertyType${querySuffix}` },
          { key: 'propertyType', url: `options/resourcePropertyTypes?display=propertyType${indParam}` },
          { key: 'propertyStage', url: `options/propertyStage${querySuffix}` },
          { key: 'propertyStage', url: `options/resourcePropertyStages?display=stage${indParam}` },
          { key: 'propertySubType', url: `options/propertySubType${querySuffix}` },
          { key: 'budget', url: `options/budget${querySuffix}` },
          { key: 'budget', url: `options/resourceBudgets?display=budget${indParam}` },
          { key: 'source', url: `options/source${querySuffix}` },
          { key: 'source', url: `options/resourceLeadSources?display=leadSource${indParam}` },
          { key: 'leadSource', url: `options/source${querySuffix}` },
        ];

        const loaded: Record<string, string[]> = {};

        await Promise.allSettled(
          endpoints.map(async ({ key, url }) => {
            try {
              const apiRes = await apiClient.get(url);
              const raw = apiRes.data?.items || apiRes.data?.data || apiRes.data || [];
              if (Array.isArray(raw) && raw.length > 0) {
                const strVals = raw
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    return (
                      item.name ||
                      item.label ||
                      item.value ||
                      item.projectName ||
                      item.locationName ||
                      item.propertyType ||
                      item.stage ||
                      item.budget ||
                      item.leadSource ||
                      String(item)
                    );
                  })
                  .filter((v: string) => v && typeof v === 'string' && v.trim() !== '');

                if (strVals.length > 0) {
                  loaded[key] = Array.from(new Set([...(loaded[key] || []), ...strVals]));
                }
              }
            } catch {
              // Ignore single endpoint failures
            }
          })
        );

        if (isMounted) {
          setDynamicApiOptions(loaded);
        }
      } catch (err) {
        console.warn('[InterestedModal] Config / options fetch warning:', err);
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
    (field: FormField): string[] => {
      const fieldKey = field.key;

      if (fieldKey === 'taskType') {
        return ['Call Back', 'Meeting', 'Site Visit'];
      }

      // 1. Check API fetched options FIRST (strictly use dynamic API values when available)
      const apiVals =
        dynamicApiOptions[fieldKey] ||
        dynamicApiOptions[fieldKey === 'source' ? 'leadSource' : fieldKey];

      if (apiVals && apiVals.length > 0) {
        return apiVals;
      }

      // 2. Check Static options defined on field SECOND
      if (field.options && field.options.length > 0) {
        return field.options;
      }

      // 3. Fallback to Industry Defaults ONLY if API returns no options
      const defaults = getDynamicDefaultOptions(user?.industryId);
      const defVals =
        defaults[fieldKey] ||
        defaults[fieldKey === 'projectName' ? 'project' : fieldKey] ||
        [];

      if (defVals && defVals.length > 0) {
        return defVals;
      }

      // Fallbacks
      if (fieldKey === 'propertyStage')
        return ['Under Construction', 'Ready to Move', 'Pre Launch', 'Resale'];
      return [];
    },
    [dynamicApiOptions, user?.industryId]
  );

  // Helper: Update a form field value
  const setFieldValue = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Open option picker modal
  const openPicker = (field: FormField) => {
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

    // Validate required fields
    for (const field of formFields) {
      if (field.required) {
        const val = formValues[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          Alert.alert('Required Field', `Please enter or select ${field.label}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      const contactFields: Record<string, any> = {};
      const taskFields: Record<string, any> = {};

      const taskKeys = ['taskType', 'nextFollowUp', 'notes', 'note'];

      Object.entries(formValues).forEach(([k, v]) => {
        if (taskKeys.includes(k)) {
          taskFields[k] = v;
        } else {
          contactFields[k] = v;
        }
      });

      // Standardize payload
      if (contactFields.customerName) {
        contactFields.name = contactFields.customerName;
      }
      if (contactFields.alternateNo) {
        contactFields.alternate_no = contactFields.alternateNo;
      }
      if (contactFields.projectName) {
        contactFields.project = contactFields.projectName;
      }
      if (contactFields.source) {
        contactFields.lead_source = contactFields.source;
      }

      contactFields.stage = 'INTERESTED';
      contactFields.status = 'INTERESTED';
      contactFields.modifiedAt = new Date();

      const noteText = String(taskFields.notes || taskFields.note || '').trim();
      if (noteText) contactFields.notes = noteText;

      // 1. Update Contact
      await apiClient.put(`/contacts/${leadId}`, contactFields).catch(() => null);

      // 2. Mark previous PENDING tasks for this contact as COMPLETED (Matching Web 1:1)
      try {
        const prevTasksRes = await apiClient.get('/tasks', { params: { contactId: leadId, contact_id: leadId } }).catch(() => null);
        const prevTasks = prevTasksRes?.data?.items || prevTasksRes?.data || [];
        if (Array.isArray(prevTasks)) {
          const pendingTasks = prevTasks.filter((t: any) => String(t.status || '').toUpperCase() === 'PENDING');
          for (const pt of pendingTasks) {
            const taskId = pt._id || pt.id;
            if (taskId) {
              await apiClient.put(`/tasks/${taskId}`, {
                status: 'COMPLETED',
                isCompleted: true,
                completedAt: new Date().toISOString(),
              }).catch(() => null);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to complete previous tasks:', e);
      }

      // 3. Create Task
      const taskPayload = {
        contactId: leadId,
        type: taskFields.taskType || 'Call Back',
        taskType: taskFields.taskType || 'Call Back',
        task_type: taskFields.taskType || 'Call Back',
        dueDate: taskFields.nextFollowUp ? new Date(taskFields.nextFollowUp) : new Date(),
        status: 'PENDING',
        customerName: contactFields.customerName || lead.name || lead.firstName || '',
        contactNumber: lead.phone || '',
        contact_number: lead.phone || '',
        createdBy: user?.email || 'System',
        stage: 'INTERESTED',
        projectName: contactFields.projectName || lead.project || lead.projectName || '',
        location: contactFields.location || lead.location || '',
        budget: contactFields.budget || lead.budget || '',
        source: contactFields.source || lead.source || '',
        notes: noteText,
      };
      await apiClient.post('/tasks', taskPayload).catch(() => null);

      // 3. Save Resource Note
      if (noteText) {
        await apiClient
          .post('/resources/resourceNotes', {
            contactId: leadId,
            note: noteText,
            userEmail: user?.email || 'System',
          })
          .catch(() => null);
      }

      Alert.alert(
        'Success',
        'Lead updated to Interested & follow-up task scheduled successfully!'
      );
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save interested details');
    } finally {
      setSubmitting(false);
    }
  };

  // Render individual dynamic field based on type matching Web CRM 1:1
  const renderDynamicField = (field: FormField) => {
    const value = formValues[field.key] ?? '';
    const isPhoneField = field.key === 'alternateNo' || field.type === 'phone';

    const isSelect =
      field.type === 'select' ||
      field.key === 'taskType' ||
      field.key === 'projectName' ||
      field.key === 'location' ||
      field.key === 'budget' ||
      field.key === 'propertyType' ||
      field.key === 'propertyStage' ||
      field.key === 'propertySubType' ||
      field.key === 'source' ||
      field.key === 'leadSource';

    const isDate = field.type === 'date' || field.key === 'nextFollowUp';
    const isTextArea = field.type === 'textarea' || field.key === 'notes' || field.key === 'note';

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.modalInputLabel}>
          {field.label} {field.required && <Text style={styles.requiredStar}>*</Text>}
        </Text>

        {isPhoneField ? (
          <View style={styles.phoneInputRow}>
            <TouchableOpacity
              style={styles.dialCodeBtn}
              onPress={() => setShowDialCodePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dialCodeText}>{dialCode}</Text>
              <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
            <TextInput
              style={[styles.modalTextInput, { flex: 1, marginLeft: 8 }]}
              value={String(value)}
              onChangeText={(text) => setFieldValue(field.key, text)}
              placeholder={field.placeholder || 'Alternate Number'}
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>
        ) : isSelect ? (
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
        ) : isDate ? (
          <TouchableOpacity
            style={styles.dropdownSelectBox}
            onPress={() => {
              setActiveDateFieldKey(field.key);
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownSelectText, !value && styles.dropdownSelectPlaceholder]}>
              {value || `Select ${field.label}`}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
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
            keyboardType={field.type === 'email' ? 'email-address' : 'default'}
          />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.modalTitle}>INTERESTED LEAD DETAILS</Text>
              <Text style={styles.modalSubtitle}>Manage client preferences, follow-up, and alternate contact details.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loadingConfig ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.brand700} />
              <Text style={styles.loadingText}>Loading form fields...</Text>
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

        {/* IN-MODAL OVERLAY: DIAL CODE PICKER */}
        {showDialCodePicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>Select Country Code</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDialCodePicker(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={DIALING_CODES}
                keyExtractor={(item) => item.code + item.label}
                style={{ maxHeight: 280 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.optionRow, dialCode === item.code && styles.optionRowSelected]}
                    onPress={() => {
                      setDialCode(item.code);
                      setShowDialCodePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                    {dialCode === item.code && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        )}

        {/* IN-MODAL OVERLAY: INTERACTIVE MONTHLY CALENDAR DATE & TIME PICKER */}
        {showDatePicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              {/* Calendar Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>SELECT FOLLOW UP DATE & TIME</Text>
                  <Text style={styles.selectedDateBadge}>
                    {calSelectedDate} {MONTHS[calMonth]?.substring(0, 3)} {calYear} • {calTime}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Quick Shortcuts */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: 'In 3 Days', days: 3 },
                    { label: 'Next Week', days: 7 },
                    { label: 'In 15 Days', days: 15 },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.label}
                      style={styles.presetChip}
                      onPress={() => {
                        const target = new Date();
                        target.setDate(target.getDate() + p.days);
                        setCalYear(target.getFullYear());
                        setCalMonth(target.getMonth());
                        setCalSelectedDate(target.getDate());
                      }}
                    >
                      <Text style={styles.presetChipText}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Month & Year Navigation Bar */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear((y) => y - 1);
                      } else {
                        setCalMonth((m) => m - 1);
                      }
                    }}
                  >
                    <Ionicons name="chevron-back" size={18} color="#1E293B" />
                  </TouchableOpacity>
                  <Text style={styles.monthYearText}>
                    {MONTHS[calMonth]} {calYear}
                  </Text>
                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      if (calMonth === 11) {
                        setCalMonth(0);
                        setCalYear((y) => y + 1);
                      } else {
                        setCalMonth((m) => m + 1);
                      }
                    }}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                  </TouchableOpacity>
                </View>

                {/* Day of Week Headers */}
                <View style={styles.daysOfWeekRow}>
                  {DAYS_OF_WEEK.map((d, idx) => (
                    <Text key={d} style={[styles.dayOfWeekText, idx === 0 && { color: '#EF4444' }]}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar Day Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.day}_${idx}`}
                      style={[
                        styles.dayCell,
                        item.isSelected && styles.dayCellSelected,
                        item.isToday && !item.isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => {
                        if (item.isCurrentMonth) setCalSelectedDate(item.day);
                      }}
                      disabled={!item.isCurrentMonth}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          !item.isCurrentMonth && styles.dayCellTextDim,
                          item.isSelected && styles.dayCellTextSelected,
                          item.isToday && !item.isSelected && styles.dayCellTextToday,
                        ]}
                      >
                        {item.day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Picker Bar */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionLabel}>SELECT OR ENTER CUSTOM TIME</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeChipsRow}>
                    {QUICK_TIMES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, calTime === t && styles.timeChipSelected]}
                        onPress={() => setCalTime(t)}
                      >
                        <Text style={[styles.timeChipText, calTime === t && styles.timeChipTextSelected]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Custom Time Input Row */}
                  <View style={styles.customTimeRow}>
                    <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.customTimeLabel}>Custom Time:</Text>
                    <TextInput
                      style={styles.customTimeInput}
                      value={calTime}
                      onChangeText={setCalTime}
                      placeholder="e.g. 10:15 AM, 06:45 PM"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    const mm = String(calMonth + 1).padStart(2, '0');
                    const dd = String(calSelectedDate).padStart(2, '0');
                    const formattedDate = `${calYear}-${mm}-${dd}, ${calTime}`;
                    setFieldValue(activeDateFieldKey, formattedDate);
                    setShowDatePicker(false);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Apply Date</Text>
                </TouchableOpacity>
              </View>
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dialCodeText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
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

  /* CALENDAR PICKER STYLES */
  selectedDateBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand700,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayOfWeekText: {
    width: 34,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.brand700,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.brand700,
    backgroundColor: '#EFF6FF',
  },
  dayCellText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayCellTextDim: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextToday: {
    color: theme.colors.brand700,
    fontWeight: '800',
  },
  timeSection: {
    marginBottom: 10,
  },
  timeSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginTop: 8,
  },
  customTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  customTimeInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand700,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.brand700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
