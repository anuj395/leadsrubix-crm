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
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';

const ENTERPRISE_TASK_TYPES = [
  'Call Back',
  'Site Visit',
  'Meeting',
  'Online Demo',
  'Follow-up',
  'Document Collection / KYC',
];

const CALLBACK_REASONS = [
  'Customer Busy / Call Later',
  'Price / Budget Discussion',
  'Location / Layout Clarification',
  'Site Visit Booking',
  'Decision Maker Unavailable',
  'Ringing / Not Picked',
  'Other',
];

interface Props {
  visible: boolean;
  lead: LeadItem;
  tasksData?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

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
  const [callbackReason, setCallbackReason] = useState('Customer Busy / Call Later');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [demoLink, setDemoLink] = useState('');
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
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [reasonSearch, setReasonSearch] = useState('');

  // Calendar Overlay Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 1. Initialize Form Values & Existing Task Detection on Open
  useEffect(() => {
    if (!visible) return;

    // Reset default date (Tomorrow 10:00 AM)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    const yyyy = defaultDate.getFullYear();
    const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const dd = String(defaultDate.getDate()).padStart(2, '0');
    setNextFollowUpDate(`${yyyy}-${mm}-${dd}, 10:00 AM`);
    setNextFollowUpType('Call Back');
    setCallbackReason('Customer Busy / Call Later');
    setMeetingLocation(lead.projectName || (lead as any).project_name || lead.location || '');
    setDemoLink('');
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

    // Parse date safely for YYYY-MM-DD, HH:mm AM/PM or DD/MM/YYYY
    let parsedDate = new Date(nextFollowUpDate.replace(',', ''));
    if (isNaN(parsedDate.getTime())) {
      const parts = nextFollowUpDate.split(',');
      const datePart = parts[0].trim();
      const timeStr = parts[1] ? parts[1].trim() : '10:00 AM';
      let year = 0, month = 0, day = 0;
      if (datePart.includes('/')) {
        const dp = datePart.split('/');
        day = parseInt(dp[0], 10);
        month = parseInt(dp[1], 10) - 1;
        year = parseInt(dp[2], 10);
      } else if (datePart.includes('-')) {
        const dp = datePart.split('-');
        year = parseInt(dp[0], 10);
        month = parseInt(dp[1], 10) - 1;
        day = parseInt(dp[2], 10);
      }
      if (year && !isNaN(month) && day) {
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

    if ((nextFollowUpType === 'Site Visit' || nextFollowUpType === 'Meeting') && !meetingLocation.trim()) {
      Alert.alert(
        'Required Field',
        nextFollowUpType === 'Site Visit' ? 'Please enter Site / Project Location!' : 'Please enter Meeting Venue / Location!'
      );
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

      const combinedNotes = [
        noteText.trim(),
        demoLink.trim() ? `Online Demo Link: ${demoLink.trim()}` : '',
        (nextFollowUpType === 'Site Visit' || nextFollowUpType === 'Meeting') && meetingLocation.trim()
          ? `Venue / Location: ${meetingLocation.trim()}`
          : '',
      ].filter(Boolean).join('\n');

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
        priority: 'Medium',
        callbackReason: nextFollowUpType === 'Call Back' ? callbackReason : undefined,
        meetingLocation: (nextFollowUpType === 'Site Visit' || nextFollowUpType === 'Meeting') && meetingLocation.trim() ? meetingLocation.trim() : undefined,
        demoLink: nextFollowUpType === 'Online Demo' && demoLink.trim() ? demoLink.trim() : undefined,
        meetingLink: nextFollowUpType === 'Online Demo' && demoLink.trim() ? demoLink.trim() : undefined,
        customerName: lead.name || (lead as any).customerName || (lead as any).customer_name || 'Contact',
        contactNumber: lead.phone || (lead as any).contactNumber || (lead as any).contact_number || '',
        contact_number: lead.phone || (lead as any).contactNumber || (lead as any).contact_number || '',
        createdBy: user?.email || 'System',
        stage: lead.stage || '',
        contactOwnerEmail: (lead as any).contactOwnerEmail || (lead as any).contact_owner_email || user?.email || '',
        projectName: lead.projectName || (lead as any).project_name || '',
        location: meetingLocation.trim() || lead.location || '',
        budget: lead.budget || '',
        source: lead.source || (lead as any).lead_source || '',
        notes: combinedNotes,
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
          location: meetingLocation.trim() || lead.location || undefined,
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

            {/* Callback Reason (Visible when Call Back) */}
            {nextFollowUpType === 'Call Back' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>Callback Reason</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowReasonPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {callbackReason || 'Select Callback Reason'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            {/* Site / Project Location (Visible when Site Visit or Meeting) */}
            {(nextFollowUpType === 'Site Visit' || nextFollowUpType === 'Meeting') && (
              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>
                  {nextFollowUpType === 'Site Visit' ? 'Site / Project Location' : 'Meeting Venue / Location'} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={meetingLocation}
                  onChangeText={setMeetingLocation}
                  placeholder={nextFollowUpType === 'Site Visit' ? 'e.g. Site Office / Project Location' : 'e.g. Head Office / Client Conference Room / Cafe'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {/* Meeting Link / Platform (Visible when Online Demo) */}
            {nextFollowUpType === 'Online Demo' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>Meeting Link / Platform</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={demoLink}
                  onChangeText={setDemoLink}
                  placeholder="e.g. https://meet.google.com/... or Zoom URL"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

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

        {/* IN-MODAL OVERLAY: UNIFIED CALENDAR DATE & TIME PICKER */}
        <CalendarDatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={(formatted) => {
            setNextFollowUpDate(formatted);
            setShowDatePicker(false);
          }}
          currentValue={nextFollowUpDate}
          title="Select Next Follow Up Date & Time"
          includeTime={true}
          asInModalOverlay={true}
          minDate={new Date()}
        />

        {/* IN-MODAL OVERLAY: NEXT FOLLOW UP TYPE */}
        {showTypePicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>SELECT NEXT FOLLOW UP TYPE</Text>
                  <Text style={styles.modalSubtitle}>{ENTERPRISE_TASK_TYPES.length} options available</Text>
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

              {ENTERPRISE_TASK_TYPES
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

        {/* IN-MODAL OVERLAY: CALLBACK REASON */}
        {showReasonPicker && (
          <View style={styles.inModalOverlay}>
            <View style={styles.inModalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>SELECT CALLBACK REASON</Text>
                  <Text style={styles.modalSubtitle}>{CALLBACK_REASONS.length} options available</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReasonPicker(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search callback reason..."
                placeholderTextColor="#94A3B8"
                value={reasonSearch}
                onChangeText={setReasonSearch}
                autoCorrect={false}
              />

              {CALLBACK_REASONS
                .filter((r) => r.toLowerCase().includes(reasonSearch.toLowerCase()))
                .map((item) => {
                  const isSelected = callbackReason === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => {
                        setCallbackReason(item);
                        setShowReasonPicker(false);
                        setReasonSearch('');
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
    backgroundColor: '#272944',
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
