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

const CALLBACK_REASONS = [
  'Customer Busy / Call Later',
  'Price / Budget Discussion',
  'Location / Layout Clarification',
  'Site Visit Booking',
  'Decision Maker Unavailable',
  'Ringing / Not Picked',
  'Other',
];

interface OrgUser {
  id?: string;
  email: string;
  name: string;
}

export const TaskFormScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);

  // Determine if editing existing task or creating
  const existingTask: TaskItem | undefined = route?.params?.task;
  const initialLead: any = route?.params?.lead;
  const isEditMode = Boolean(existingTask?.id);

  // Dynamic industry task types (Always includes the 6 enterprise standard follow-up types)
  const taskTypes = useMemo(() => {
    const ind = (user?.industryId || '').toLowerCase();
    if (ind.includes('health') || ind.includes('clinic') || ind.includes('doctor')) {
      return ['Call Back', 'Consultation', 'Site Visit', 'Meeting', 'Online Demo', 'Follow-up', 'Document Collection / KYC'];
    }
    if (ind.includes('auto')) {
      return ['Call Back', 'Test Drive', 'Showroom Visit', 'Meeting', 'Online Demo', 'Follow-up', 'Document Collection / KYC'];
    }
    return [
      'Call Back',
      'Site Visit',
      'Meeting',
      'Online Demo',
      'Follow-up',
      'Document Collection / KYC',
    ];
  }, [user?.industryId]);

  // Form states
  const [taskType, setTaskType] = useState<string>(
    existingTask?.type || existingTask?.taskType || taskTypes[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    existingTask?.rawDueDate || existingTask?.dueDate || ''
  );
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>(
    existingTask?.priority || 'Medium'
  );
  const [callbackReason, setCallbackReason] = useState<string>(
    existingTask?.callbackReason || existingTask?.call_back_reason || CALLBACK_REASONS[0]
  );
  const [notes, setNotes] = useState<string>(existingTask?.notes || '');

  // Dynamic conditional fields matching Web CRM 1:1
  const [meetingLocation, setMeetingLocation] = useState<string>(
    existingTask?.meetingLocation || existingTask?.location || initialLead?.location || initialLead?.projectName || initialLead?.project || ''
  );
  const [demoLink, setDemoLink] = useState<string>(
    existingTask?.demoLink || existingTask?.meetingLink || ''
  );

  // Contact Attachment State
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

  // Manual fallback inputs (if no contact attached)
  const [manualClientName, setManualClientName] = useState(
    existingTask?.leadName || existingTask?.customerName || ''
  );
  const [manualPhone, setManualPhone] = useState(
    existingTask?.phone || existingTask?.contactNumber || ''
  );
  const [manualProject, setManualProject] = useState(
    existingTask?.project || existingTask?.projectName || ''
  );

  // Smart Title state (auto-derives type + client name without mandatory user effort)
  const clientDisplayName = selectedContact?.name || manualClientName.trim() || 'Client';
  const [title, setTitle] = useState(
    existingTask?.title || `${taskType} - ${clientDisplayName}`
  );

  // Existing task status auto-resolution state (Closed-loop CRM logic)
  const [existingTaskStatus, setExistingTaskStatus] = useState<boolean>(false);
  const [existingTaskSelected, setExistingTaskSelected] = useState<'Completed' | 'Cancelled' | ''>('');
  const [allContactTasks, setAllContactTasks] = useState<any[]>([]);

  // Assignee selection (organization users)
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>(existingTask?.assignedTo || user?.email || '');
  const [assignedToName, setAssignedToName] = useState<string>(
    existingTask?.assignedTo
      ? existingTask.assignedTo === user?.email ? 'You' : existingTask.assignedTo
      : user?.name || 'You'
  );
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

  // Contact Picker Modal State
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<LeadItem[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Set default due date (tomorrow 10:00 AM) if new task
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

  // Load Organization Users for Assignment
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

  // Update title automatically when type changes
  const handleSelectTaskType = (type: string) => {
    setTaskType(type);
    const client = selectedContact?.name || manualClientName.trim();
    setTitle(client ? `${type} - ${client}` : `${type} Follow-up`);
  };

  // Search Contacts for Picker
  const searchContacts = useCallback(async (query: string) => {
    try {
      setSearchingContacts(true);
      const results = await leadService.getLeads({ q: query, limit: 25 });
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
    setManualClientName(contactData.name);
    setManualPhone(contactData.phone);
    setManualProject(contactData.project);

    if (!meetingLocation) {
      setMeetingLocation(contactData.project || contactData.location || '');
    }

    setTitle(`${taskType} - ${contactData.name}`);
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

  // Parse due date to ISO string safely
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
      y = parseInt(dp[2], 10);
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

  const handleSubmit = async () => {
    const clientName = selectedContact?.name || manualClientName.trim() || 'Client';
    const finalTitle = title.trim() || `${taskType} - ${clientName}`;

    if (!dueDate) {
      Alert.alert('Required Field', 'Please select a scheduled due date & time.');
      return;
    }

    const isoDate = parseDueDate(dueDate);
    const selectedTime = new Date(isoDate).getTime();
    if (!isEditMode && selectedTime < Date.now() - 60 * 1000) {
      Alert.alert('Invalid Date & Time', 'Scheduled follow-up date and time must be in the future.');
      return;
    }

    // Validation: Existing task status must be selected if a pending task exists
    if (existingTaskStatus && !existingTaskSelected) {
      Alert.alert('Required Field', 'Please select existing task status (Completed or Cancelled).');
      return;
    }

    // Validation: Dynamic location requirement for Site Visit and Meeting matching Web CRM 1:1
    if (taskType === 'Site Visit' && !meetingLocation.trim()) {
      Alert.alert('Required Field', 'Please enter Site / Project Location.');
      return;
    }
    if (taskType === 'Meeting' && !meetingLocation.trim()) {
      Alert.alert('Required Field', 'Please enter Meeting Venue / Location.');
      return;
    }

    if (!selectedContact && manualPhone.trim()) {
      const rawDigits = manualPhone.replace(/\D/g, '');
      if (rawDigits.length < 7 || rawDigits.length > 15) {
        Alert.alert('Invalid Contact Number', 'Contact Number must be between 7 and 15 digits.');
        return;
      }
    }

    const contactPhone = selectedContact?.phone || manualPhone.trim() || '';
    const projectName = selectedContact?.project || manualProject.trim() || '';
    const contactId = selectedContact?.id || undefined;

    try {
      setSubmitting(true);

      // Geolocation capture matching Web CRM standard
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

              // Closed-loop analytics updates for unique Meeting or Site Visit
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
        meetingLink: demoLink.trim() || undefined,
        demoLink: demoLink.trim() || undefined,
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

      // 5. Synchronize Contact with latest follow-up information matching Web CRM 1:1
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
          : `New ${taskType} scheduled successfully.`,
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

      {/* ─── Luxury #151728 Midnight Header ─── */}
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
                name={isEditMode ? 'create-outline' : 'calendar-sharp'}
                size={16}
                color="#0284C7"
              />
            </View>
            <Text style={styles.headerTitleText}>
              {isEditMode
                ? `Edit ${semantics.taskEntitySingular}`
                : `Schedule New ${semantics.taskEntitySingular}`}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          {/* ── 1. Contact Association / CRM Contact Picker ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>ASSOCIATED CONTACT / CLIENT</Text>
            </View>

            {selectedContact ? (
              <View style={styles.attachedContactCard}>
                <View style={styles.attachedContactLeft}>
                  <View style={styles.contactAvatarCircle}>
                    <Ionicons name="person" size={14} color="#272944" />
                  </View>
                  <View style={styles.attachedContactDetails}>
                    <Text style={styles.attachedContactName} numberOfLines={1}>
                      {selectedContact.name}
                    </Text>
                    <Text style={styles.attachedContactMeta} numberOfLines={1}>
                      {selectedContact.phone ? `📞 ${selectedContact.phone}` : ''}
                      {selectedContact.project ? `  •  🏢 ${selectedContact.project}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleClearContact}
                  style={styles.detachContactBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.unattachedContactContainer}>
                <TouchableOpacity
                  style={styles.attachContactCTA}
                  onPress={() => setShowContactPicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={16} color="#0284C7" />
                  <Text style={styles.attachContactCTAText}>
                    Select Contact from CRM ({semantics.leadEntityPlural})
                  </Text>
                </TouchableOpacity>

                <View style={styles.orDividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerOrText}>OR ENTER MANUALLY</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Client / Lead Name"
                  placeholderTextColor="#94A3B8"
                  value={manualClientName}
                  onChangeText={(text) => {
                    setManualClientName(text);
                    setTitle(`${taskType} - ${text.trim() || 'Client'}`);
                  }}
                />
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Contact Phone Number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={manualPhone}
                  onChangeText={setManualPhone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Project / Requirement / Area"
                  placeholderTextColor="#94A3B8"
                  value={manualProject}
                  onChangeText={setManualProject}
                />
              </View>
            )}
          </View>

          {/* ── 2. Closed-Loop Existing Task Status (Visible if Contact Has Pending Task) ── */}
          {existingTaskStatus && (
            <View style={styles.existingTaskNoticeCard}>
              <View style={styles.existingTaskHeaderRow}>
                <Ionicons name="alert-circle" size={16} color="#D97706" />
                <Text style={styles.existingTaskTitle}>Pending Prior Task Detected</Text>
              </View>
              <Text style={styles.existingTaskSubtitle}>
                This contact has an active pending task. Select how to resolve the prior task:
              </Text>
              <View style={styles.existingTaskPillRow}>
                {(['Completed', 'Cancelled'] as const).map((statusChoice) => {
                  const isChoice = existingTaskSelected === statusChoice;
                  return (
                    <TouchableOpacity
                      key={statusChoice}
                      style={[
                        styles.existingStatusChoicePill,
                        isChoice && styles.existingStatusChoicePillSelected,
                      ]}
                      onPress={() => setExistingTaskSelected(statusChoice)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={statusChoice === 'Completed' ? 'checkmark-circle' : 'close-circle'}
                        size={15}
                        color={isChoice ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.existingStatusChoiceText,
                          isChoice && styles.existingStatusChoiceTextSelected,
                        ]}
                      >
                        Mark Prior {statusChoice}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── 3. Next Follow Up / Task Type Selector ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>NEXT FOLLOW UP TYPE</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <View style={styles.taskTypeRow}>
              {taskTypes.map((type) => {
                const isSelected = taskType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.taskTypeChip, isSelected && styles.taskTypeChipSelected]}
                    onPress={() => handleSelectTaskType(type)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.taskTypeChipText,
                        isSelected && styles.taskTypeChipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 4. Dynamic Conditional Fields Matching Web CRM ── */}

          {/* Call Back Reason (Shown when Call Back) */}
          {taskType === 'Call Back' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CALLBACK REASON</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScrollPills}
              >
                {CALLBACK_REASONS.map((reason) => {
                  const isSelected = callbackReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                      onPress={() => setCallbackReason(reason)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          isSelected && styles.reasonChipTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Site / Project Location (Shown when Site Visit) */}
          {taskType === 'Site Visit' && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>SITE / PROJECT LOCATION</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Site Office / Project Location"
                placeholderTextColor="#94A3B8"
                value={meetingLocation}
                onChangeText={setMeetingLocation}
              />
            </View>
          )}

          {/* Meeting Venue / Location (Shown when Meeting) */}
          {taskType === 'Meeting' && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>MEETING VENUE / LOCATION</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Head Office / Client Conference Room / Cafe"
                placeholderTextColor="#94A3B8"
                value={meetingLocation}
                onChangeText={setMeetingLocation}
              />
            </View>
          )}

          {/* Meeting Link / Platform (Shown when Online Demo) */}
          {taskType === 'Online Demo' && (
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>MEETING LINK / PLATFORM</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. https://meet.google.com/... or Zoom URL"
                placeholderTextColor="#94A3B8"
                value={demoLink}
                onChangeText={setDemoLink}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* ── 5. Scheduled Due Date & Time ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>NEXT FOLLOW UP DATE & TIME</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={[styles.input, styles.dateTriggerBox]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerLeft}>
                <Ionicons name="calendar-outline" size={17} color="#0284C7" />
                <Text style={[styles.dateTriggerText, !dueDate && styles.datePlaceholderText]}>
                  {dueDate || 'Select date & time...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 6. Assignee Selector (Assigned To) ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>ASSIGNED TO</Text>
            </View>
            <TouchableOpacity
              style={[styles.input, styles.dateTriggerBox]}
              onPress={() => setShowAssigneePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerLeft}>
                <Ionicons name="person-circle-outline" size={18} color="#475569" />
                <Text style={styles.dateTriggerText} numberOfLines={1}>
                  {assignedToName} {assignedTo ? `(${assignedTo})` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── 7. Priority Picker (4 Tiers matching Web & Backend) ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TASK PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(['Urgent', 'High', 'Medium', 'Low'] as const).map((p) => {
                const isSelected = priority === p;
                const pColor =
                  p === 'Urgent'
                    ? '#9333EA'
                    : p === 'High'
                    ? '#E11D48'
                    : p === 'Medium'
                    ? '#D97706'
                    : '#059669';

                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      isSelected && {
                        borderColor: pColor,
                        backgroundColor: `${pColor}15`,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: isSelected ? pColor : '#CBD5E1' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        isSelected && { color: pColor, fontWeight: '700' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 8. Task Title (Smart Auto-Generated / Editable) ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>TASK TITLE</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. Call Back - Client Name"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* ── 9. Notes & Instructions ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="Enter task details, client requests, agenda..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── 10. Submit Action Button ── */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Ionicons
                  name={isEditMode ? 'save-outline' : 'checkmark-circle-sharp'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.submitBtnText}>
                  {isEditMode ? 'Save Changes' : 'Schedule Task'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Calendar Date & Time Picker Modal ── */}
      <CalendarDatePickerModal
        visible={showDatePicker}
        title="Select Follow Up Date & Time"
        currentValue={dueDate}
        includeTime={true}
        minDate={new Date()}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formatted) => setDueDate(formatted)}
      />

      {/* ── Contact Picker Sub-Modal ── */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={() => setShowContactPicker(false)}
          />
          <View style={styles.pickerSheetCard}>
            <View style={styles.dragHandleBox}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.pickerHeaderRow}>
              <View>
                <Text style={styles.pickerTitle}>Select CRM Contact</Text>
                <Text style={styles.pickerSubtitle}>
                  Attach task to an existing {semantics.leadEntitySingular.toLowerCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closePickerBtn}
                onPress={() => setShowContactPicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search by name, phone, or project..."
                placeholderTextColor="#94A3B8"
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
                autoFocus
              />
              {contactSearchQuery ? (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {searchingContacts ? (
              <View style={styles.pickerLoadingBox}>
                <ActivityIndicator size="small" color="#272944" />
                <Text style={styles.pickerLoadingText}>Searching contacts...</Text>
              </View>
            ) : contactSearchResults.length === 0 ? (
              <View style={styles.pickerEmptyBox}>
                <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                <Text style={styles.pickerEmptyText}>
                  {contactSearchQuery
                    ? `No contacts found for "${contactSearchQuery}"`
                    : 'Type a name or number to find contacts.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={contactSearchResults}
                keyExtractor={(item) => item.id || item._id || String(Math.random())}
                contentContainerStyle={styles.pickerListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactResultItem}
                    onPress={() => handleSelectContact(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.contactResultAvatar}>
                      <Ionicons name="person" size={16} color="#272944" />
                    </View>
                    <View style={styles.contactResultInfo}>
                      <Text style={styles.contactResultName} numberOfLines={1}>
                        {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Client'}
                      </Text>
                      <Text style={styles.contactResultSub} numberOfLines={1}>
                        {item.phone || item.contactNo || 'No phone'}
                        {item.project || item.projectName ? `  •  🏢 ${item.project || item.projectName}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Assignee Picker Sub-Modal ── */}
      <Modal
        visible={showAssigneePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssigneePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={() => setShowAssigneePicker(false)}
          />
          <View style={styles.pickerSheetCard}>
            <View style={styles.dragHandleBox}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.pickerHeaderRow}>
              <View>
                <Text style={styles.pickerTitle}>Assign Task To</Text>
                <Text style={styles.pickerSubtitle}>Delegate schedule to yourself or a teammate</Text>
              </View>
              <TouchableOpacity
                style={styles.closePickerBtn}
                onPress={() => setShowAssigneePicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search teammates by name or email..."
                placeholderTextColor="#94A3B8"
                value={assigneeSearchQuery}
                onChangeText={setAssigneeSearchQuery}
              />
              {assigneeSearchQuery ? (
                <TouchableOpacity onPress={() => setAssigneeSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredAssignees.length > 0 ? filteredAssignees : [{ email: user?.email || '', name: user?.name || 'You' }]}
              keyExtractor={(item) => item.email}
              contentContainerStyle={styles.pickerListContent}
              renderItem={({ item }) => {
                const isSelected = assignedTo === item.email;
                return (
                  <TouchableOpacity
                    style={[styles.contactResultItem, isSelected && { backgroundColor: '#F0F9FF' }]}
                    onPress={() => {
                      setAssignedTo(item.email);
                      setAssignedToName(item.name || item.email);
                      setShowAssigneePicker(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.contactResultAvatar}>
                      <Ionicons name="person" size={16} color="#0284C7" />
                    </View>
                    <View style={styles.contactResultInfo}>
                      <Text style={styles.contactResultName} numberOfLines={1}>
                        {item.name} {item.email === user?.email ? '(You)' : ''}
                      </Text>
                      <Text style={styles.contactResultSub} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0284C7" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  headerBackBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  headerGreenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerStatusPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  requiredStar: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '900',
  },
  taskTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskTypeChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  taskTypeChipSelected: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  taskTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  taskTypeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  horizontalScrollPills: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reasonChip: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  reasonChipSelected: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    justifyContent: 'center',
  },
  textAreaInput: {
    height: 80,
    paddingTop: 10,
  },
  attachedContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
  },
  attachedContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  contactAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedContactDetails: {
    flex: 1,
  },
  attachedContactName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  attachedContactMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detachContactBtn: {
    padding: 4,
  },
  unattachedContactContainer: {
    gap: 6,
  },
  attachContactCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  attachContactCTAText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerOrText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  existingTaskNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  existingTaskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  existingTaskTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
  },
  existingTaskSubtitle: {
    fontSize: 11.5,
    color: '#92400E',
    marginBottom: 10,
  },
  existingTaskPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  existingStatusChoicePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  existingStatusChoicePillSelected: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  existingStatusChoiceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78350F',
  },
  existingStatusChoiceTextSelected: {
    color: '#FFFFFF',
  },
  dateTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateTriggerText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  datePlaceholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    backgroundColor: '#272944',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Contact Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  pickerSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dragHandleBox: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closePickerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  pickerLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  pickerLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
    paddingHorizontal: 20,
  },
  pickerEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  pickerListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  contactResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  contactResultAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactResultInfo: {
    flex: 1,
  },
  contactResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactResultSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
