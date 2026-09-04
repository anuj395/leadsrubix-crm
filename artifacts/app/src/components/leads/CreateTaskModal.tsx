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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';

interface Props {
  visible: boolean;
  lead: LeadItem;
  tasksData?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CreateTaskModal: React.FC<Props> = ({
  visible,
  lead,
  tasksData = [],
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Form states
  const [nextFollowUpType, setNextFollowUpType] = useState('Call Back');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [noteText, setNoteText] = useState('');

  // Existing task status state
  const [existingTaskStatus, setExistingTaskStatus] = useState(false);
  const [existingTaskSelected, setExistingTaskSelected] = useState('');
  const [allTasksList, setAllTasksList] = useState<any[]>([]);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown Pickers State
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');

  // Calendar Overlay Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [calTime, setCalTime] = useState('10:00 AM');
  const [customTimeInput, setCustomTimeInput] = useState('');

  // Helper: Format date for display (DD/MM/YYYY, HH:mm AM/PM)
  const formatIsoToDisplay = (dateObj: Date) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${strHours}:${minutes} ${ampm}`;
  };

  // 1. Initialize Form Values & Existing Task Detection on Open
  useEffect(() => {
    if (!visible) return;

    // Reset default date (Tomorrow 10:00 AM)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    defaultDate.setHours(10, 0, 0, 0);
    setNextFollowUpDate(formatIsoToDisplay(defaultDate));
    setCalMonth(defaultDate.getMonth());
    setCalYear(defaultDate.getFullYear());
    setSelectedDay(defaultDate.getDate());
    setCalTime('10:00 AM');
    setCustomTimeInput('');
    setNextFollowUpType('Call Back');
    setNoteText('');
    setExistingTaskSelected('');

    // Fetch tasks for contact to evaluate pending tasks & existing task status
    const leadId = lead.id || lead._id;
    if (leadId) {
      apiClient.get('/tasks', { params: { contactId: leadId, contact_id: leadId } })
        .then((res) => {
          const items = res?.data?.items || res?.data || [];
          if (Array.isArray(items)) {
            setAllTasksList(items);

            const sorted = [...items].sort((a, b) => {
              const dA = new Date(a.createdAt || a.created_at || a.dueDate || a.due_date || 0).getTime();
              const dB = new Date(b.createdAt || b.created_at || b.dueDate || b.due_date || 0).getTime();
              return dB - dA;
            });
            const latestTask = sorted[0];
            if (latestTask && String(latestTask.status || '').toUpperCase() === 'PENDING' && latestTask.type !== 'Call Back') {
              setExistingTaskStatus(true);
            } else {
              setExistingTaskStatus(false);
            }
          }
        })
        .catch(() => {
          setExistingTaskStatus(false);
        });
    }
  }, [visible, lead]);

  // Calendar calculation
  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(calYear, calMonth, 1).getDay();
  }, [calYear, calMonth]);

  // Quick Date Presets
  const applyPreset = (preset: 'today' | 'tomorrow' | 'in2days' | 'nextweek') => {
    const d = new Date();
    if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
    if (preset === 'in2days') d.setDate(d.getDate() + 2);
    if (preset === 'nextweek') d.setDate(d.getDate() + 7);

    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setSelectedDay(d.getDate());
  };

  // Time preset selection
  const handleTimeSelect = (t: string) => {
    setCalTime(t);
    setCustomTimeInput('');
  };

  const handleCustomTimeSubmit = () => {
    if (!customTimeInput.trim()) return;
    let text = customTimeInput.trim().toUpperCase();
    if (!text.includes('AM') && !text.includes('PM')) {
      text += ' AM';
    }
    setCalTime(text);
  };

  // Submit Handler (Matches Web CRM 1:1)
  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    if (!nextFollowUpType || nextFollowUpType === 'Select') {
      Alert.alert('Required Field', 'Select Next Follow Up Type!!');
      return;
    }

    if (!nextFollowUpDate) {
      Alert.alert('Invalid Date', 'Enter A Valid Date!!');
      return;
    }

    // Parse date safely for DD/MM/YYYY, HH:mm AM/PM format
    let parsedDate = new Date(nextFollowUpDate.replace(',', ''));
    if (isNaN(parsedDate.getTime()) && nextFollowUpDate.includes('/')) {
      const parts = nextFollowUpDate.split(',');
      const dateParts = parts[0].trim().split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const timeStr = parts[1] ? parts[1].trim() : '10:00 AM';
        parsedDate = new Date(year, month, day);
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ap = timeMatch[3] ? timeMatch[3].toUpperCase() : 'AM';
          if (ap === 'PM' && h < 12) h += 12;
          if (ap === 'AM' && h === 12) h = 0;
          parsedDate.setHours(h, m, 0, 0);
        }
      }
    }
    const now = new Date();
    if (isNaN(parsedDate.getTime()) || parsedDate < now) {
      Alert.alert('Invalid Date', 'Enter A Valid Date!!');
      return;
    }

    if (existingTaskStatus && (!existingTaskSelected || existingTaskSelected === 'Select')) {
      Alert.alert('Required Field', 'Select Existing Task Status!!');
      return;
    }

    try {
      setSubmitting(true);

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

      // 1. Save Resource Note if entered (Matching Web 1:1)
      if (noteText.trim()) {
        await apiClient.post('/resources/resourceNotes', {
          contactId: leadId,
          contact_id: leadId,
          note: noteText.trim(),
          notes: noteText.trim(),
          text: noteText.trim(),
          userEmail: user?.email || '',
          userName: user?.name || user?.email || 'Admin',
        }).catch(() => null);
      }

      // 2. Resolve prior pending task if applicable (Matching Web 1:1)
      try {
        const sortedTasks = [...allTasksList].sort((a, b) => {
          const dA = new Date(a.createdAt || a.created_at || a.dueDate || a.due_date || 0).getTime();
          const dB = new Date(b.createdAt || b.created_at || b.dueDate || b.due_date || 0).getTime();
          return dB - dA;
        });
        const latestTask = sortedTasks[0];
        if (latestTask && String(latestTask.status || '').toUpperCase() === 'PENDING') {
          const taskId = latestTask._id || latestTask.id;
          const nextStatus = (existingTaskStatus && existingTaskSelected === 'Completed') ? 'COMPLETED' : 'CANCELLED';
          if (taskId) {
            await apiClient.put(`/tasks/${taskId}`, {
              status: nextStatus,
              isCompleted: nextStatus === 'COMPLETED',
              completedAt: nextStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
            }).catch(() => null);
          }

          // Run unique task type updates for Meeting / Site Visit (Matching Web 1:1)
          if (existingTaskStatus && existingTaskSelected === 'Completed') {
            let unSiteVisit = false;
            let unMeeting = false;

            allTasksList.filter((item: any) => item.type === 'Meeting').forEach((list: any) => {
              if (list.uniqueMeeting === true || list.unique_meeting === true) unMeeting = true;
            });
            allTasksList.filter((item: any) => item.type === 'Site Visit').forEach((list: any) => {
              if (list.uniqueSiteVisit === true || list.unique_site_visit === true) unSiteVisit = true;
            });

            if (!unSiteVisit && allTasksList.filter((item: any) => item.type === 'Site Visit').some((list: any) => String(list.status || '').toUpperCase() === 'PENDING')) {
              const pendingSiteVisits = allTasksList.filter((item: any) => item.type === 'Site Visit' && String(item.status || '').toUpperCase() === 'PENDING');
              if (pendingSiteVisits[0]?._id || pendingSiteVisits[0]?.id) {
                await apiClient.post('/tasks/uniqueTaskTypeUpdate', {
                  id: pendingSiteVisits[0]._id || pendingSiteVisits[0].id,
                  unique_meeting: false,
                  unique_site_visit: true,
                }).catch(() => null);
              }
            }

            if (!unMeeting && allTasksList.filter((item: any) => item.type === 'Meeting').some((list: any) => String(list.status || '').toUpperCase() === 'PENDING')) {
              const pendingMeetings = allTasksList.filter((item: any) => item.type === 'Meeting' && String(item.status || '').toUpperCase() === 'PENDING');
              if (pendingMeetings[0]?._id || pendingMeetings[0]?.id) {
                await apiClient.post('/tasks/uniqueTaskTypeUpdate', {
                  id: pendingMeetings[0]._id || pendingMeetings[0].id,
                  unique_meeting: true,
                  unique_site_visit: false,
                }).catch(() => null);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Prior task status update warning:', e);
      }

      // 3. Create new follow-up task (Matching Web 1:1)
      const taskPayload = {
        contactId: leadId,
        contact_id: leadId,
        type: nextFollowUpType,
        taskType: nextFollowUpType,
        task_type: nextFollowUpType,
        dueDate: parsedDate,
        due_date: parsedDate,
        status: 'PENDING',
        customerName: lead.name || (lead as any).customerName || (lead as any).customer_name || 'Contact',
        contactNumber: lead.phone || (lead as any).contactNumber || (lead as any).contact_number || '',
        contact_number: lead.phone || (lead as any).contactNumber || (lead as any).contact_number || '',
        createdBy: user?.email || 'System',
        stage: lead.stage || '',
        contactOwnerEmail: (lead as any).contactOwnerEmail || (lead as any).contact_owner_email || user?.email || '',
        projectName: lead.projectName || (lead as any).project_name || '',
        location: lead.location || '',
        budget: lead.budget || '',
        source: lead.source || (lead as any).lead_source || '',
        notes: noteText.trim(),
        latitude: lat,
        longitude: lng,
      };

      await apiClient.post('/tasks', taskPayload).catch(() => null);

      // 4. Update contact with latest follow-up information (Matching Web 1:1)
      try {
        await apiClient.put(`/contacts/${leadId}`, {
          nextFollowUpType: nextFollowUpType,
          next_follow_up_type: nextFollowUpType,
          nextFollowUpDateTime: parsedDate,
          next_follow_up_date_time: parsedDate,
          modifiedAt: new Date(),
        }).catch(() => null);
      } catch (cErr) {
        console.warn('Contact follow-up sync warning:', cErr);
      }

      Alert.alert('Success', 'Task Created Successfully!!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header Matching Web 1:1 */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Existing Task Status Field (Visible only if prior pending task exists) */}
            {existingTaskStatus && (
              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>
                  Existing Task Status <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowStatusPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownTriggerText, !existingTaskSelected && styles.placeholderText]}>
                    {existingTaskSelected || 'Select Existing Task Status *'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            {/* Next Follow Up Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.modalInputLabel}>
                Next Follow Up Type <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowTypePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, !nextFollowUpType && styles.placeholderText]}>
                  {nextFollowUpType || 'Select Next Follow Up Type'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Next Follow Up Date & Time */}
            <View style={styles.fieldContainer}>
              <Text style={styles.modalInputLabel}>
                Next Follow Up Date & Time <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePickerTriggerText, !nextFollowUpDate && styles.placeholderText]}>
                  {nextFollowUpDate || 'Select Next Follow Up Date & Time'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Note Text */}
            <View style={styles.fieldContainer}>
              <Text style={styles.modalInputLabel}>Note</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top' }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Enter task details or note..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
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

        {/* CALENDAR OVERLAY PICKER */}
        {showDatePicker && (
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarSheet}>
              {/* Calendar Header */}
              <View style={styles.calHeaderRow}>
                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.calMonthTitle}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Chips */}
              <View style={styles.presetRow}>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('today')}>
                  <Text style={styles.presetChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('tomorrow')}>
                  <Text style={styles.presetChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('in2days')}>
                  <Text style={styles.presetChipText}>In 2 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('nextweek')}>
                  <Text style={styles.presetChipText}>Next Week</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Labels */}
              <View style={styles.weekDaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <Text key={d} style={styles.weekDayText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {Array.from({ length: firstDayOffset }).map((_, idx) => (
                  <View key={`blank-${idx}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSelected = dayNum === selectedDay;
                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                      onPress={() => setSelectedDay(dayNum)}
                    >
                      <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Selector Chips */}
              <Text style={styles.timeSectionTitle}>Select Time</Text>
              <View style={styles.timeChipsRow}>
                {['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, calTime === t && !customTimeInput && styles.timeChipSelected]}
                    onPress={() => handleTimeSelect(t)}
                  >
                    <Text style={[styles.timeChipText, calTime === t && !customTimeInput && styles.timeChipTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Time Input Box */}
              <View style={styles.customTimeRow}>
                <TextInput
                  style={styles.customTimeInput}
                  placeholder="Or enter custom time (e.g. 11:30 AM)"
                  placeholderTextColor="#94A3B8"
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  onSubmitEditing={handleCustomTimeSubmit}
                />
                {customTimeInput.length > 0 && (
                  <TouchableOpacity style={styles.applyCustomTimeBtn} onPress={handleCustomTimeSubmit}>
                    <Text style={styles.applyCustomTimeBtnText}>Set</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Calendar Overlay Action Buttons */}
              <View style={styles.calActionsRow}>
                <TouchableOpacity style={styles.calCancelBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.calCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    const mm = String(calMonth + 1).padStart(2, '0');
                    const dd = String(selectedDay).padStart(2, '0');
                    const formattedDate = `${dd}/${mm}/${calYear}, ${calTime}`;
                    setNextFollowUpDate(formattedDate);
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

        {/* IN-MODAL OVERLAY: NEXT FOLLOW UP TYPE */}
        {showTypePicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>SELECT NEXT FOLLOW UP TYPE</Text>
                  <Text style={styles.modalSubtitle}>3 options available</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTypePicker(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search next follow up type..."
                placeholderTextColor="#94A3B8"
                value={typeSearch}
                onChangeText={setTypeSearch}
                autoCorrect={false}
              />

              {['Call Back', 'Meeting', 'Site Visit']
                .filter((opt) => opt.toLowerCase().includes(typeSearch.toLowerCase()))
                .map((item) => {
                  const isSelected = nextFollowUpType === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => {
                        setNextFollowUpType(item);
                        setShowTypePicker(false);
                        setTypeSearch('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />}
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        )}

        {/* IN-MODAL OVERLAY: EXISTING TASK STATUS */}
        {showStatusPicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>SELECT EXISTING TASK STATUS</Text>
                  <Text style={styles.modalSubtitle}>2 options available</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStatusPicker(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {['Completed', 'Cancelled'].map((item) => {
                const isSelected = existingTaskSelected === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => {
                      setExistingTaskSelected(item);
                      setShowStatusPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />}
                  </TouchableOpacity>
                );
              })}
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
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
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
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 14,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  requiredStar: {
    color: '#EF4444',
  },
  dropdownTrigger: {
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
  dropdownTriggerText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  datePickerTrigger: {
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
  datePickerTriggerText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: '#1E293B',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  calendarSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekDayText: {
    width: '14%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: '14%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.brand700 || '#0EA5E9',
  },
  dayCellText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeChipSelected: {
    backgroundColor: theme.colors.brand700 || '#0EA5E9',
    borderColor: theme.colors.brand700 || '#0EA5E9',
  },
  timeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  customTimeInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  applyCustomTimeBtn: {
    backgroundColor: theme.colors.brand700 || '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyCustomTimeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  calActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  calCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.brand700 || '#0EA5E9',
  },
  confirmBtnText: {
    fontSize: 12,
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
    paddingVertical: 14,
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
    color: theme.colors.brand700 || '#0EA5E9',
  },
});
