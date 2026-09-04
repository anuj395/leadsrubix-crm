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

export interface RescheduleFormField {
  key: string;
  label: string;
  type: string; // 'date' | 'textarea'
  required?: boolean;
  options?: string[];
  placeholder?: string;
  order?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const QUICK_TIMES = [
  '10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM'
];

const DEFAULT_RESCHEDULE_FIELDS: RescheduleFormField[] = [
  {
    key: 'nextFollowUp',
    label: 'Next Follow Up Date',
    type: 'date',
    required: true,
  },
  {
    key: 'notes',
    label: 'Notes / Instructions',
    type: 'textarea',
    required: false,
    placeholder: 'Additional reschedule notes...',
  },
];

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Dynamic Form Fields & Values
  const [formFields, setReschedFormFields] = useState<RescheduleFormField[]>(DEFAULT_RESCHEDULE_FIELDS);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const [showDatePicker, setShowDatePicker] = useState(false);
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
      nextFollowUp: '',
      notes: '',
    };

    setFormValues(initialVals);
  }, [visible, lead]);

  // 2. Fetch Screen Resolution (POST /screens/resolve)
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const finalIndustry = user?.industryId || 'temp0001';
        const finalRole = user?.role || 'admin';
        const finalOrg = user?.organizationId || '';

        // Resolve screen config
        const res = await apiClient
          .post('/screens/resolve', {
            screenKey: 'reschedule',
            screen_key: 'reschedule',
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
            const mapped: RescheduleFormField[] = rawFields.map((f: any, idx: number) => ({
              key: f.key || f.field_key || f.name,
              label: f.label || f.name || f.key,
              type: f.type || f.field_type || (f.options ? 'select' : 'text'),
              required: !!(f.required || f.is_required),
              options: Array.isArray(f.options) ? f.options.map((o: any) => (typeof o === 'object' ? o.label || o.value : String(o))) : undefined,
              placeholder: f.placeholder || '',
              order: f.order ?? idx,
            }));
            setReschedFormFields(mapped.sort((a, b) => (a.order || 0) - (b.order || 0)));
          }
        }
      } catch (err) {
        console.warn('[RescheduleModal] Config fetch warning:', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [visible, user?.industryId, user?.role, user?.organizationId]);

  // Helper: Update a form field value
  const setFieldValue = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Submit Handler (Matches Web CRM 1:1)
  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    if (!formValues.nextFollowUp) {
      Alert.alert('Invalid Date', 'Select A Valid Date!!');
      return;
    }

    const selectedDate = new Date(formValues.nextFollowUp);
    const now = new Date();
    if (selectedDate < now) {
      Alert.alert('Invalid Date', 'Select A Valid Date!!');
      return;
    }

    try {
      setSubmitting(true);

      const noteText = String(formValues.notes || formValues.note || '').trim();

      // 1. Update Contact properties
      const contactPayload = {
        nextFollowUpDateTime: selectedDate,
        modifiedAt: new Date(),
      };
      await apiClient.put(`/contacts/${leadId}`, contactPayload).catch(() => null);

      // 2. Complete previous PENDING tasks and find previous task type (Matching Web 1:1)
      let prevTaskType = '';
      try {
        const tasksRes = await apiClient.get('/tasks', { params: { contactId: leadId, contact_id: leadId } }).catch(() => null);
        const tasksList = tasksRes?.data?.items || tasksRes?.data || [];
        if (Array.isArray(tasksList)) {
          const pendingTasks = tasksList.filter((t: any) => String(t.status || '').toUpperCase() === 'PENDING');
          for (const pt of pendingTasks) {
            if (pt.taskType || pt.task_type || pt.type) {
              prevTaskType = pt.taskType || pt.task_type || pt.type;
            }
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

      // 4. Create new Rescheduled Task (Matching Web 1:1)
      const reschedTaskType = prevTaskType && !prevTaskType.toLowerCase().includes('re-schedule')
        ? `Re-Schedule (${prevTaskType})`
        : 'Re-Schedule';

      const taskPayload = {
        contactId: leadId,
        contact_id: leadId,
        type: reschedTaskType,
        taskType: reschedTaskType,
        task_type: reschedTaskType,
        dueDate: selectedDate,
        status: 'PENDING',
        customerName: lead.name || lead.firstName || '',
        contactNumber: lead.phone || '',
        contact_number: lead.phone || '',
        createdBy: user?.email || 'System',
        stage: lead.stage || 'INTERESTED',
        projectName: lead.project || lead.projectName || '',
        location: lead.location || '',
        budget: lead.budget || '',
        source: lead.source || '',
        notes: noteText,
      };
      await apiClient.post('/tasks', taskPayload).catch(() => null);

      Alert.alert('Success', 'Task Rescheduled!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to reschedule task');
    } finally {
      setSubmitting(false);
    }
  };

  // Render individual dynamic field based on type matching Web CRM 1:1
  const renderDynamicField = (field: RescheduleFormField) => {
    const value = formValues[field.key] ?? '';
    const isDate = field.type === 'date' || field.key === 'nextFollowUp';
    const isTextArea = field.type === 'textarea' || field.key === 'notes' || field.key === 'note';

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.modalInputLabel}>
          {field.label} {field.required && <Text style={styles.requiredStar}>*</Text>}
        </Text>

        {isDate ? (
          <TouchableOpacity
            style={styles.dropdownSelectBox}
            onPress={() => setShowDatePicker(true)}
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
              <Text style={styles.modalTitle}>Reschedule Task</Text>
              <Text style={styles.modalSubtitle}>Set new follow-up date and time for task.</Text>
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

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
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
                    setFieldValue('nextFollowUp', formattedDate);
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
    marginTop: 8,
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
