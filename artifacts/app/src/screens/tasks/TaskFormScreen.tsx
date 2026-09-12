import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskService, TaskItem } from '../../services/taskService';
import { leadService, LeadItem } from '../../services/leadService';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';
import { theme } from '../../theme/theme';

const CALLBACK_REASONS = [
  'Customer Busy / Call Later',
  'Price / Budget Discussion',
  'Location / Layout Clarification',
  'Site Visit Booking',
  'Decision Maker Unavailable',
  'Ringing / Not Picked',
  'Other',
];

const ENTERPRISE_TASK_TYPES = [
  'Call Back',
  'Site Visit',
  'Meeting',
  'Online Demo',
  'Follow-up',
  'Document Collection / KYC',
];

const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low'] as const;

interface OrgUser {
  id?: string;
  email: string;
  name: string;
}

export const TaskFormScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);

  const existingTask: TaskItem | undefined = route?.params?.task;
  const initialLead: any = route?.params?.lead;
  const isEditMode = Boolean(existingTask?.id);

  // 1. Customer / Contact Selection
  const [selectedContact, setSelectedContact] = useState<{
    id?: string;
    name?: string;
    phone?: string;
    project?: string;
    location?: string;
    email?: string;
  } | null>(
    existingTask?.contactId || existingTask?.leadId
      ? {
          id: existingTask.contactId || existingTask.leadId,
          name: existingTask.leadName || existingTask.customerName,
          phone: existingTask.phone || existingTask.contactNumber,
          project: existingTask.project || existingTask.projectName,
          location: existingTask.location,
          email: existingTask.email,
        }
      : initialLead
      ? {
          id: initialLead.id || initialLead._id,
          name: initialLead.name || initialLead.customerName,
          phone: initialLead.phone || initialLead.contactNumber,
          project: initialLead.project || initialLead.projectName,
          location: initialLead.location,
          email: initialLead.email,
        }
      : null
  );

  // 2. Task Type
  const [taskType, setTaskType] = useState<string>(
    existingTask?.type || existingTask?.taskType || 'Call Back'
  );

  // 3. Priority
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>(
    existingTask?.priority || 'Medium'
  );

  // 4. Due Date & Time
  const [dueDate, setDueDate] = useState<string>(
    existingTask?.rawDueDate || existingTask?.dueDate || ''
  );

  // 5. Assigned To
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>(existingTask?.assignedTo || user?.email || '');
  const [assignedToName, setAssignedToName] = useState<string>(
    existingTask?.assignedTo
      ? existingTask.assignedTo === user?.email ? 'You' : existingTask.assignedTo
      : user?.name || 'You'
  );

  // 6. Conditional Fields: Callback Reason, Meeting Venue/Location, Online Demo Link
  const [callbackReason, setCallbackReason] = useState<string>(
    existingTask?.callbackReason || existingTask?.call_back_reason || CALLBACK_REASONS[0]
  );
  const [meetingLocation, setMeetingLocation] = useState<string>(
    existingTask?.meetingLocation || existingTask?.location || initialLead?.location || initialLead?.projectName || initialLead?.project || ''
  );
  const [demoLink, setDemoLink] = useState<string>(
    existingTask?.demoLink || existingTask?.meetingLink || ''
  );

  // 7. Notes / Agenda
  const [notes, setNotes] = useState<string>(existingTask?.notes || '');
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Existing task status auto-resolution (Closed-loop CRM logic)
  const [existingTaskStatus, setExistingTaskStatus] = useState<boolean>(false);
  const [existingTaskSelected, setExistingTaskSelected] = useState<'Completed' | 'Cancelled' | ''>('');
  const [allContactTasks, setAllContactTasks] = useState<any[]>([]);

  // Pickers / Modals State
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<LeadItem[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  const [showTaskTypePicker, setShowTaskTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [showExistingStatusPicker, setShowExistingStatusPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Initialize default due date (tomorrow 10:00 AM) if new task
  useEffect(() => {
    if (!isEditMode && !dueDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setDueDate(`${yyyy}-${mm}-${dd}, 10:00 AM`);
    }
  }, [isEditMode, dueDate]);

  // Load Organization Users for Assignee dropdown
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/options/organizationUsers')
      .then((res) => {
        if (!isMounted) return;
        const users = res?.data?.options || res?.data?.items || res?.data || [];
        if (Array.isArray(users) && users.length > 0) {
          const mapped: OrgUser[] = users
            .map((u: any) => ({
              id: u.id || u._id || u.uid,
              email: u.email || u.value || '',
              name: u.name || u.label || u.email || 'User',
            }))
            .filter((u) => Boolean(u.email));
          setOrgUsers(mapped);
        }
      })
      .catch(() => null);

    return () => {
      isMounted = false;
    };
  }, []);

  // Check contact for existing pending tasks to enable Closed-Loop Resolution
  const checkContactPendingTasks = useCallback(async (contactId: string) => {
    if (!contactId) {
      setExistingTaskStatus(false);
      setExistingTaskSelected('');
      return;
    }
    try {
      const res = await apiClient.get('/tasks', { params: { contactId, contact_id: contactId } });
      const items = res?.data?.items || res?.data || [];
      if (Array.isArray(items)) {
        setAllContactTasks(items);
        const sorted = [...items].sort((a, b) => {
          const dA = new Date(a.createdAt || a.created_at || a.dueDate || a.due_date || 0).getTime();
          const dB = new Date(b.createdAt || b.created_at || b.dueDate || b.due_date || 0).getTime();
          return dB - dA;
        });
        const latestTask = sorted[0];
        if (
          latestTask &&
          String(latestTask.status || '').toUpperCase() === 'PENDING' &&
          latestTask.type !== 'Call Back'
        ) {
          setExistingTaskStatus(true);
        } else {
          setExistingTaskStatus(false);
        }
      }
    } catch (e) {
      console.warn('Failed to check contact pending tasks:', e);
    }
  }, []);

  useEffect(() => {
    const cid = selectedContact?.id;
    if (cid && !isEditMode) {
      checkContactPendingTasks(cid);
    }
  }, [selectedContact?.id, isEditMode, checkContactPendingTasks]);

  // Search Contacts for Contact dropdown
  const searchContacts = useCallback(async (query: string) => {
    try {
      setSearchingContacts(true);
      const results = await leadService.getLeads({ q: query, limit: 30 });
      setContactSearchResults(results);
    } catch (err) {
      console.warn('Failed to search contacts:', err);
    } finally {
      setSearchingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (showContactPicker) {
      searchContacts(contactSearchQuery);
    }
  }, [showContactPicker, contactSearchQuery, searchContacts]);

  const handleSelectContact = (item: LeadItem) => {
    const contactData = {
      id: item.id || item._id,
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Client',
      phone: item.phone || item.contactNo || '',
      project: item.project || item.projectName || '',
      location: item.location || '',
      email: item.email || '',
    };
    setSelectedContact(contactData);

    if (!meetingLocation) {
      setMeetingLocation(contactData.project || contactData.location || '');
    }

    setShowContactPicker(false);
    if (contactData.id) {
      checkContactPendingTasks(contactData.id);
    }
  };

  const handleClearContact = () => {
    setSelectedContact(null);
    setExistingTaskStatus(false);
    setExistingTaskSelected('');
  };

  // Safe Date parsing
  const parseDueDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    let d = new Date(dateStr.replace(',', ''));
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    const parts = dateStr.split(',');
    const datePart = parts[0]?.trim() || '';
    const timePart = parts[1]?.trim() || '10:00 AM';
    let y = 0, m = 0, day = 0;
    if (datePart.includes('-')) {
      const dp = datePart.split('-');
      y = parseInt(dp[0], 10);
      m = parseInt(dp[1], 10) - 1;
      day = parseInt(dp[2], 10);
    } else if (datePart.includes('/')) {
      const dp = datePart.split('/');
      day = parseInt(dp[0], 10);
      m = parseInt(dp[1], 10) - 1;
      day = parseInt(dp[2], 10);
    }
    if (y && !isNaN(m) && day) {
      d = new Date(y, m, day);
      const tm = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (tm) {
        let h = parseInt(tm[1], 10);
        const min = parseInt(tm[2], 10);
        const ap = tm[3]?.toUpperCase() || 'AM';
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        d.setHours(h, min, 0, 0);
      }
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return new Date().toISOString();
  };

  const getPriorityColor = (p: string) => {
    const s = p.toLowerCase();
    if (s === 'urgent') return '#9333EA';
    if (s === 'high') return '#E11D48';
    if (s === 'medium') return '#D97706';
    return '#059669';
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!selectedContact?.id && !isEditMode) {
      Alert.alert('Required Field', 'Please select Customer / Contact.');
      return;
    }

    if (!dueDate) {
      Alert.alert('Required Field', 'Please select Due Date & Time.');
      return;
    }

    const isoDate = parseDueDate(dueDate);
    const selectedTime = new Date(isoDate).getTime();
    if (!isEditMode && selectedTime < Date.now() - 60 * 1000) {
      Alert.alert('Invalid Date & Time', 'Scheduled follow-up date and time must be in the future.');
      return;
    }

    if (existingTaskStatus && !existingTaskSelected) {
      Alert.alert('Required Field', 'Please select existing task status (Completed or Cancelled).');
      return;
    }

    if (taskType === 'Site Visit' && !meetingLocation.trim()) {
      Alert.alert('Required Field', 'Please enter Site / Project Location.');
      return;
    }
    if (taskType === 'Meeting' && !meetingLocation.trim()) {
      Alert.alert('Required Field', 'Please enter Meeting Venue / Location.');
      return;
    }

    const clientName = selectedContact?.name || 'Contact';
    const contactPhone = selectedContact?.phone || '';
    const projectName = selectedContact?.project || '';
    const contactId = selectedContact?.id || undefined;
    const finalTitle = `${taskType} - ${clientName}`;

    try {
      setSubmitting(true);

      // Capture Geolocation matching Web CRM standard
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch (e) {
        console.warn('Geolocation capture skipped:', e);
      }

      // 1. Resolve prior pending task if applicable (Matching Web CRM 1:1)
      if (existingTaskStatus && allContactTasks.length > 0) {
        try {
          const pendingPrior = allContactTasks.filter(
            (t: any) =>
              String(t.status || '').toUpperCase() === 'PENDING' &&
              t._id !== existingTask?.id &&
              t.id !== existingTask?.id
          );
          if (pendingPrior.length > 0) {
            const latestPrior = pendingPrior[0];
            const priorId = latestPrior._id || latestPrior.id;
            const nextStatus = existingTaskSelected === 'Completed' ? 'COMPLETED' : 'CANCELLED';
            if (priorId) {
              await taskService.resolvePreviousTask(priorId, nextStatus);

              if (existingTaskSelected === 'Completed') {
                let unSiteVisit = false;
                let unMeeting = false;
                allContactTasks
                  .filter((item: any) => item.type === 'Meeting')
                  .forEach((list: any) => {
                    if (list.uniqueMeeting === true || list.unique_meeting === true) unMeeting = true;
                  });
                allContactTasks
                  .filter((item: any) => item.type === 'Site Visit')
                  .forEach((list: any) => {
                    if (list.uniqueSiteVisit === true || list.unique_site_visit === true) unSiteVisit = true;
                  });

                if (!unSiteVisit && latestPrior.type === 'Site Visit') {
                  await taskService.updateUniqueTaskType(priorId, false, true);
                }
                if (!unMeeting && latestPrior.type === 'Meeting') {
                  await taskService.updateUniqueTaskType(priorId, true, false);
                }
              }
            }
          }
        } catch (rErr) {
          console.warn('Prior task resolution warning:', rErr);
        }
      }

      // 2. Log Resource Note to Client Timeline if entered
      if (notes.trim() && contactId) {
        try {
          await apiClient.post('/resources/resourceNotes', {
            contactId,
            contact_id: contactId,
            note: notes.trim(),
            notes: notes.trim(),
            text: notes.trim(),
            customerName: clientName,
            userEmail: user?.email || '',
            userName: user?.name || user?.email || 'User',
          });
        } catch (nErr) {
          console.warn('Resource notes push warning:', nErr);
        }
      }

      // 3. Assemble combined notes matching Web CRM standard
      const combinedNotes = [
        notes.trim(),
        demoLink.trim() ? `Online Demo Link: ${demoLink.trim()}` : '',
        (taskType === 'Site Visit' || taskType === 'Meeting') && meetingLocation.trim()
          ? `Venue / Location: ${meetingLocation.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const payload: Record<string, any> = {
        type: taskType,
        taskType: taskType,
        task_type: taskType,
        title: finalTitle,
        dueDate: isoDate,
        due_date: isoDate,
        nextFollowUp: isoDate,
        next_follow_up_date_time: isoDate,
        priority,
        status: existingTask?.status || 'PENDING',
        customerName: clientName,
        customer_name: clientName,
        contactNumber: contactPhone,
        contact_number: contactPhone,
        projectName: projectName,
        project_name: projectName,
        email: selectedContact?.email || '',
        notes: combinedNotes,
        callbackReason: taskType === 'Call Back' ? callbackReason : undefined,
        call_back_reason: taskType === 'Call Back' ? callbackReason : undefined,
        assignedTo: assignedTo || user?.email || '',
        contactOwnerEmail: assignedTo || user?.email || '',
        location: meetingLocation.trim() || undefined,
        meetingLocation: meetingLocation.trim() || undefined,
        meeting_location: meetingLocation.trim() || undefined,
        demoLink: taskType === 'Online Demo' && demoLink.trim() ? demoLink.trim() : undefined,
        meetingLink: taskType === 'Online Demo' && demoLink.trim() ? demoLink.trim() : undefined,
        latitude: lat,
        longitude: lng,
      };

      if (contactId) {
        payload.contactId = contactId;
        payload.contact_id = contactId;
        payload.leadId = contactId;
      }

      // 4. Save Task
      if (isEditMode && existingTask?.id) {
        await taskService.updateTask(existingTask.id, payload);
      } else {
        await taskService.createTask(payload);
      }

      // 5. Synchronize Contact with latest follow-up information
      if (contactId) {
        try {
          await leadService.updateLead(contactId, {
            nextFollowUpType: taskType,
            next_follow_up_type: taskType,
            nextFollowUpDateTime: isoDate,
            next_follow_up_date_time: isoDate,
            location: meetingLocation.trim() || undefined,
            modifiedAt: new Date().toISOString(),
          });
        } catch (cErr) {
          console.warn('Contact follow-up sync warning:', cErr);
        }
      }

      Alert.alert(
        isEditMode ? 'Task Updated' : 'Task Scheduled',
        isEditMode
          ? 'Changes have been saved successfully.'
          : 'Task scheduled successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isEditMode) {
                navigation.goBack();
              } else {
                navigation.navigate('Tasks');
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Failed to submit task:', err);
      Alert.alert('Error', 'Failed to save task. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignees = useMemo(() => {
    if (!assigneeSearchQuery.trim()) return orgUsers;
    const q = assigneeSearchQuery.toLowerCase().trim();
    return orgUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [orgUsers, assigneeSearchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ── Header ── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
          >
            <Ionicons name="chevron-back" size={15} color="#FFFFFF" />
            <Text style={styles.headerBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBannerBox}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconCircle}>
              <Ionicons
                name={isEditMode ? 'create-outline' : 'add'}
                size={18}
                color="#0284C7"
              />
            </View>
            <Text style={styles.headerTitleText}>
              {isEditMode ? 'Edit Task' : 'Schedule New Task'}
            </Text>
          </View>
          <View style={styles.headerStatusPill}>
            <View style={styles.headerGreenPulseDot} />
            <Text style={styles.headerStatusPillText}>
              {isEditMode ? 'EDIT' : 'ENTRY'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          {/* ── Existing Task Status (Visible only if prior pending task exists) ── */}
          {existingTaskStatus && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Existing Task Status</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TouchableOpacity
                style={[styles.dropdownTrigger, styles.existingTaskWarningBorder]}
                onPress={() => setShowExistingStatusPicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !existingTaskSelected && styles.placeholderText,
                    ]}
                  >
                    {existingTaskSelected || 'Select Existing Task Status *'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── 1. Customer / Contact * ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Customer / Contact</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowContactPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <Ionicons name="person-circle-outline" size={19} color="#64748B" />
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !selectedContact && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedContact
                    ? `${selectedContact.name} ${selectedContact.phone ? `(${selectedContact.phone})` : ''}`
                    : 'Select Customer / Contact *'}
                </Text>
              </View>
              {selectedContact ? (
                <TouchableOpacity
                  onPress={handleClearContact}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>

          {/* ── 2. Task Type * ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Task Type</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowTaskTypePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <Ionicons name="briefcase-outline" size={18} color="#64748B" />
                <Text style={styles.dropdownTriggerText}>{taskType}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 3. Priority * ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Priority</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowPriorityPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(priority) },
                  ]}
                />
                <Text style={styles.dropdownTriggerText}>{priority}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 4. Due Date & Time * ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Due Date & Time</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !dueDate && styles.placeholderText,
                  ]}
                >
                  {dueDate || 'Select Due Date & Time *'}
                </Text>
              </View>
              <Ionicons name="calendar" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 5. Assigned To * ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Assigned To</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowAssigneePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <Ionicons name="person-outline" size={18} color="#64748B" />
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                  {assignedToName} {assignedTo ? `(${assignedTo})` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 6a. Callback Reason (Shown ONLY when taskType === 'Call Back') ── */}
          {taskType === 'Call Back' && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Callback Reason</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowReasonPicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#64748B"
                  />
                  <Text style={styles.dropdownTriggerText}>{callbackReason}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── 6b. Site Visit / Meeting Venue Location (Shown when Site Visit or Meeting) ── */}
          {(taskType === 'Site Visit' || taskType === 'Meeting') && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>
                  {taskType === 'Site Visit'
                    ? 'Site / Project Location'
                    : 'Meeting Venue / Location'}
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <View style={styles.inputBoxWithIcon}>
                <Ionicons
                  name={taskType === 'Site Visit' ? 'business-outline' : 'location-outline'}
                  size={18}
                  color="#64748B"
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder={
                    taskType === 'Site Visit'
                      ? 'e.g. Site Office / Project Location'
                      : 'e.g. Head Office / Client Conference Room / Cafe'
                  }
                  placeholderTextColor="#94A3B8"
                  value={meetingLocation}
                  onChangeText={setMeetingLocation}
                />
              </View>
            </View>
          )}

          {/* ── 6c. Meeting Link / Platform (Shown when Online Demo) ── */}
          {taskType === 'Online Demo' && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Meeting Link / Platform</Text>
              </View>
              <View style={styles.inputBoxWithIcon}>
                <Ionicons
                  name="videocam-outline"
                  size={18}
                  color="#64748B"
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="e.g. https://meet.google.com/... or Zoom URL"
                  placeholderTextColor="#94A3B8"
                  value={demoLink}
                  onChangeText={setDemoLink}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          )}

          {/* ── 7. Notes / Agenda ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Notes / Agenda</Text>
            </View>
            <TextInput
              style={[styles.dropdownTrigger, styles.textAreaInput]}
              placeholder="Enter task details or agenda..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Action Buttons Matching Web CRM 1:1 ── */}
          <View style={styles.formActionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scheduleTaskBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.scheduleTaskBtnText}>
                  {isEditMode ? 'Update Task' : 'Schedule Task'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ─── Contact Picker Modal ─── */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT CUSTOMER / CONTACT</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Choose from active {semantics.leadEntityPlural}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowContactPicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarBox}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search by name, phone, project..."
                placeholderTextColor="#94A3B8"
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
                autoFocus
              />
              {Boolean(contactSearchQuery) && (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {searchingContacts ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.modalLoadingText}>Searching contacts...</Text>
              </View>
            ) : contactSearchResults.length === 0 ? (
              <View style={styles.modalEmptyBox}>
                <Ionicons name="person-outline" size={32} color="#CBD5E1" />
                <Text style={styles.modalEmptyText}>No matching contacts found</Text>
              </View>
            ) : (
              <FlatList
                data={contactSearchResults}
                keyExtractor={(item) => item.id || item._id || String(Math.random())}
                renderItem={({ item }) => {
                  const isSelected = selectedContact?.id === (item.id || item._id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.contactListItem,
                        isSelected && styles.contactListItemSelected,
                      ]}
                      onPress={() => handleSelectContact(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactItemAvatar}>
                        <Ionicons name="person" size={15} color="#272944" />
                      </View>
                      <View style={styles.contactItemBody}>
                        <Text style={styles.contactItemName} numberOfLines={1}>
                          {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Client'}
                        </Text>
                        <Text style={styles.contactItemPhone} numberOfLines={1}>
                          {item.phone || item.contactNo || 'No phone'}
                          {item.project || item.projectName ? `  •  ${item.project || item.projectName}` : ''}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Task Type Picker Modal ─── */}
      <Modal
        visible={showTaskTypePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTaskTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT TASK TYPE</Text>
                <Text style={styles.modalSheetSubtitle}>
                  {ENTERPRISE_TASK_TYPES.length} options available
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTaskTypePicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {ENTERPRISE_TASK_TYPES.map((t) => {
                const isSelected = taskType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowSelected]}
                    onPress={() => {
                      setTaskType(t);
                      setShowTaskTypePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sheetOptionText, isSelected && styles.sheetOptionTextSelected]}>
                      {t}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Priority Picker Modal ─── */}
      <Modal
        visible={showPriorityPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT PRIORITY</Text>
                <Text style={styles.modalSheetSubtitle}>4 priority tiers available</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPriorityPicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p;
                const pColor = getPriorityColor(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowSelected]}
                    onPress={() => {
                      setPriority(p);
                      setShowPriorityPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                      <Text style={[styles.sheetOptionText, isSelected && styles.sheetOptionTextSelected]}>
                        {p}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={pColor} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Assignee Picker Modal ─── */}
      <Modal
        visible={showAssigneePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAssigneePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT ASSIGNEE</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Team members responsible for this task
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAssigneePicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarBox}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search team member..."
                placeholderTextColor="#94A3B8"
                value={assigneeSearchQuery}
                onChangeText={setAssigneeSearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {filteredAssignees.map((u) => {
                const isSelected = assignedTo === u.email;
                return (
                  <TouchableOpacity
                    key={u.email}
                    style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowSelected]}
                    onPress={() => {
                      setAssignedTo(u.email);
                      setAssignedToName(u.name);
                      setShowAssigneePicker(false);
                      setAssigneeSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.sheetOptionText, isSelected && styles.sheetOptionTextSelected]}>
                        {u.name}
                      </Text>
                      <Text style={styles.assigneeEmailSubtext}>{u.email}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Callback Reason Picker Modal ─── */}
      <Modal
        visible={showReasonPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReasonPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT CALLBACK REASON</Text>
                <Text style={styles.modalSheetSubtitle}>
                  {CALLBACK_REASONS.length} reasons available
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReasonPicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {CALLBACK_REASONS.map((r) => {
                const isSelected = callbackReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowSelected]}
                    onPress={() => {
                      setCallbackReason(r);
                      setShowReasonPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sheetOptionText, isSelected && styles.sheetOptionTextSelected]}>
                      {r}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Existing Task Status Picker Modal ─── */}
      <Modal
        visible={showExistingStatusPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExistingStatusPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>SELECT EXISTING TASK STATUS</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Resolve active prior task for this contact
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExistingStatusPicker(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 200 }}>
              {(['Completed', 'Cancelled'] as const).map((opt) => {
                const isSelected = existingTaskSelected === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowSelected]}
                    onPress={() => {
                      setExistingTaskSelected(opt);
                      setShowExistingStatusPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sheetOptionText, isSelected && styles.sheetOptionTextSelected]}>
                      {opt}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand700 || '#0EA5E9'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Date Picker Overlay ─── */}
      <CalendarDatePickerModal
        visible={showDatePicker}
        title="Due Date & Time"
        currentValue={dueDate}
        includeTime
        minDate={new Date()}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formatted) => {
          setDueDate(formatted);
          setShowDatePicker(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  luxuryHeader: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 44 : 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 2,
  },
  headerBackBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  headerBannerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  headerGreenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerStatusPillText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  existingTaskWarningBorder: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  fieldLeadingIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  textAreaInput: {
    height: 76,
    paddingTop: 8,
    fontSize: 13,
  },
  formActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  scheduleTaskBtn: {
    backgroundColor: '#1E2238',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#1E2238',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  scheduleTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  /* ── Modal Overlay & Sheets ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSheetSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalLoadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  contactListItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  contactItemAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactItemBody: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  contactItemPhone: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sheetOptionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  sheetOptionText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#334155',
  },
  sheetOptionTextSelected: {
    fontWeight: '700',
    color: theme.colors.brand700 || '#0EA5E9',
  },
  assigneeEmailSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
