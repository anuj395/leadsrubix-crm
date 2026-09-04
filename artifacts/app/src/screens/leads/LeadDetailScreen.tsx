import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';
import { theme } from '../../theme/theme';
import { apiClient } from '../../api/apiClient';
import { leadService, LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { openEmail } from '../../utils/emailHelper';

type DetailTabType = 'timeline' | 'profile' | 'deals' | 'notes';
type TimelineFilterType = 'all' | 'calls' | 'tasks';

export const LeadDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const initialLead: LeadItem = route?.params?.lead || {};
  const leadId = initialLead.id || initialLead._id || route?.params?.leadId || route?.params?.id || '';

  const [lead, setLead] = useState<LeadItem>(initialLead);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabType>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterType>('all');
  const [tabScrollProgress, setTabScrollProgress] = useState(0);

  // Post-Call Telephony Disposition State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

  // Related Data Lists
  const [tasks, setTasks] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [dealsList, setDealsList] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Modal States
  const [callBackModalVisible, setCallBackModalVisible] = useState(false);
  const [notInterestedModalVisible, setNotInterestedModalVisible] = useState(false);
  const [interestedModalVisible, setInterestedModalVisible] = useState(false);
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [logCallModalVisible, setLogCallModalVisible] = useState(false);

  // Form States for Modals
  const [submittingAction, setSubmittingAction] = useState(false);

  // 1. Call Back Modal Form
  const [callBackReason, setCallBackReason] = useState('Busy in Meeting');
  const [callBackDate, setCallBackDate] = useState('2026-09-05, 10:00 AM');
  const [callBackNote, setCallBackNote] = useState('');
  const [showCallBackDatePicker, setShowCallBackDatePicker] = useState(false);

  // 2. Not Interested Modal Form
  const [notInterestedReason, setNotInterestedReason] = useState('Budget Mismatch');
  const [notInterestedNote, setNotInterestedNote] = useState('');

  // 3. Interested Modal Form
  const [interestedProject, setInterestedProject] = useState(lead.project || lead.projectName || 'Test Project');
  const [interestedBudget, setInterestedBudget] = useState(lead.budget || 'Rs.40 Lacs - Rs.50 Lacs');
  const [interestedLocation, setInterestedLocation] = useState(lead.location || 'Noida Sector 18');
  const [interestedPropertyType, setInterestedPropertyType] = useState(lead.propertyType || 'Residential Properties');
  const [interestedNote, setInterestedNote] = useState('');

  // 4. Convert Deal Form
  const [dealTitle, setDealTitle] = useState(`${lead.name || 'Client'} - Deal`);
  const [dealAmount, setDealAmount] = useState('5000000');
  const [dealPipeline, setDealPipeline] = useState('Primary Sales Pipeline');

  // 5. Add Note Form
  const [newNoteContent, setNewNoteContent] = useState('');

  // 6. Log Call Form
  const [callType, setCallType] = useState('Outgoing');
  const [callStatus, setCallStatus] = useState('Connected');
  const [callDuration, setCallDuration] = useState('2m 30s');
  const [callRemark, setCallRemark] = useState('');

  // Fetch Full Contact/Lead Data
  const loadLeadDetails = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/contacts/${leadId}`).catch(() => null);
      if (res?.data) {
        const d = res.data;
        setLead((prev) => ({
          ...prev,
          name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || prev.name,
          phone: d.phone || d.contactNo || prev.phone,
          alternateNo: d.alternateNo || d.alternate_no || prev.alternateNo,
          email: d.email || d.emailId || prev.email,
          status: d.stage || d.status || prev.status,
          stage: d.stage || d.status || prev.stage,
          location: d.location || prev.location,
          project: d.projectName || d.project || prev.project,
          budget: d.budget || prev.budget,
          propertyType: d.propertyType || prev.propertyType,
          source: d.source || d.lead_source || prev.source,
          notes: d.notes || prev.notes,
          createdAt: d.createdAt || prev.createdAt,
        }));

        if (Array.isArray(d.notesList)) setNotesList(d.notesList);
        if (Array.isArray(d.attachments)) setAttachments(d.attachments);
      }

      // Fetch Tasks associated
      const tasksRes = await apiClient.get('/tasks').catch(() => null);
      if (tasksRes?.data) {
        const rawTasks = tasksRes.data?.items || tasksRes.data?.tasks || tasksRes.data || [];
        if (Array.isArray(rawTasks)) {
          const matchedTasks = rawTasks.filter(
            (t: any) =>
              (t.contactId && t.contactId === leadId) ||
              (t.leadId && t.leadId === leadId) ||
              (t.customerName && t.customerName.toLowerCase() === (lead.name || '').toLowerCase())
          );
          setTasks(matchedTasks);
        }
      }

      // Fetch Calls associated
      const callsRes = await apiClient.get('/call-logs').catch(() => null);
      if (callsRes?.data) {
        const rawCalls = callsRes.data?.items || callsRes.data?.callLogs || callsRes.data || [];
        if (Array.isArray(rawCalls)) {
          const matchedCalls = rawCalls.filter(
            (c: any) =>
              (c.contactId && c.contactId === leadId) ||
              (c.phone && c.phone === lead.phone) ||
              (c.leadName && c.leadName.toLowerCase() === (lead.name || '').toLowerCase())
          );
          setCalls(matchedCalls);
        }
      }
    } catch (e) {
      console.warn('Could not load full contact details:', e);
    } finally {
      setLoading(false);
    }
  }, [leadId, lead.name, lead.phone]);

  useEffect(() => {
    loadLeadDetails();
  }, [loadLeadDetails]);

  const leadName = lead.name || lead.firstName || 'Inquiry Contact';
  const phone = lead.phone || lead.contactNo || '';
  const email = lead.email || '';
  const stage = (lead.stage || lead.status || 'FRESH').toUpperCase();

  // Color mapping for Stage matching LeadsListScreen exactly
  const getStageMeta = (st: string) => {
    const s = (st || '').toUpperCase().trim();
    if (s.includes('WON') || s.includes('CONVERT') || s.includes('DEAL') || s.includes('BOOKED')) {
      return {
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        dot: '#10B981',
        avatarBg: '#ECFDF5',
        avatarText: '#047857',
        label: 'CONVERTED',
      };
    }
    if (s.includes('CALLBACK') || s.includes('RESCHEDULE') || s.includes('CALL_BACK')) {
      return {
        bg: '#FFFBEB',
        text: '#B45309',
        border: '#FDE68A',
        dot: '#F59E0B',
        avatarBg: '#FFFBEB',
        avatarText: '#B45309',
        label: 'CALLBACK',
      };
    }
    if (s.includes('INTEREST') && !s.includes('NOT')) {
      return {
        bg: '#F5F3FF',
        text: '#6D28D9',
        border: '#DDD6FE',
        dot: '#8B5CF6',
        avatarBg: '#F5F3FF',
        avatarText: '#6D28D9',
        label: 'INTERESTED',
      };
    }
    if (s.includes('LOST') || s.includes('NOT_INTEREST') || s.includes('REFUSED')) {
      return {
        bg: '#FFF1F2',
        text: '#BE123C',
        border: '#FECDD3',
        dot: '#F43F5E',
        avatarBg: '#FFF1F2',
        avatarText: '#BE123C',
        label: 'LOST',
      };
    }
    return {
      bg: '#EFF6FF',
      text: '#1D4ED8',
      border: '#BFDBFE',
      dot: '#3B82F6',
      avatarBg: '#EFF6FF',
      avatarText: '#1D4ED8',
      label: 'FRESH',
    };
  };

  const stageMeta = getStageMeta(stage);

  // Handlers for Direct Communication
  const handleCall = () => {
    if (!phone) {
      Alert.alert('No Phone Number', 'No valid phone number available for this contact.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      // Note: Simulator has no cellular dialer hardware
      console.log(`[Telephony] Native dialer not available on simulator for ${phone}`);
    });

    setActiveCaller({
      contactId: leadId,
      leadId: leadId,
      customerName: leadName,
      phone: phone,
      project: lead.project || '',
      stage: stage,
    });

    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1000);
  };

  const handleWhatsApp = () => {
    const msg = `Hello ${leadName}, thank you for contacting ${user?.organizationName || 'Leads Rubix'}. How can I assist you with your ${semantics.leadEntitySingular.toLowerCase()} inquiry today?`;
    openWhatsApp(phone, msg);
  };

  const handleEmail = () => {
    const subject = `Regarding your inquiry with ${user?.organizationName || 'Leads Rubix'}`;
    const body = `Hello ${leadName},\n\nThank you for reaching out to ${user?.organizationName || 'Leads Rubix'}. How can we assist you with your property inquiry today?\n\nBest regards,\n${user?.name || 'Sales Team'}`;
    openEmail(email, subject, body);
  };

  // Submit Handlers for Modals
  const submitCallBack = async () => {
    try {
      setSubmittingAction(true);
      await leadService.transitionLead(
        leadId,
        'CALL_BACK',
        `Call Back Scheduled: ${callBackReason} (${callBackDate}) - ${callBackNote}`
      );
      await apiClient.post('/tasks', {
        title: `Follow-up: Call Back (${callBackReason})`,
        leadName,
        contactNumber: phone,
        dueDate: callBackDate,
        priority: 'High',
        notes: callBackNote,
        status: 'PENDING',
      }).catch(() => null);

      setLead((prev) => ({ ...prev, status: 'CALL_BACK', stage: 'CALL_BACK' }));
      setCallBackModalVisible(false);
      Alert.alert('Success', 'Call Back scheduled successfully!');
      loadLeadDetails();
    } catch (e) {
      Alert.alert('Error', 'Failed to schedule Call Back.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitNotInterested = async () => {
    try {
      setSubmittingAction(true);
      await leadService.transitionLead(
        leadId,
        'LOST',
        `Marked Not Interested: ${notInterestedReason} - ${notInterestedNote}`
      );
      setLead((prev) => ({ ...prev, status: 'LOST', stage: 'LOST' }));
      setNotInterestedModalVisible(false);
      Alert.alert('Updated', 'Lead marked as Not Interested.');
      loadLeadDetails();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitInterested = async () => {
    try {
      setSubmittingAction(true);
      await leadService.transitionLead(
        leadId,
        'INTERESTED',
        `Updated details: ${interestedProject} | ${interestedBudget} | ${interestedLocation} - ${interestedNote}`
      );
      await apiClient.put(`/leads/${leadId}`, {
        project: interestedProject,
        budget: interestedBudget,
        location: interestedLocation,
        propertyType: interestedPropertyType,
      }).catch(() => null);

      setLead((prev) => ({
        ...prev,
        status: 'INTERESTED',
        stage: 'INTERESTED',
        project: interestedProject,
        budget: interestedBudget,
        location: interestedLocation,
        propertyType: interestedPropertyType,
      }));
      setInterestedModalVisible(false);
      Alert.alert('Success', 'Interested details saved successfully!');
      loadLeadDetails();
    } catch (e) {
      Alert.alert('Error', 'Failed to save details.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitConvertDeal = async () => {
    try {
      setSubmittingAction(true);
      await apiClient.post('/deals', {
        title: dealTitle,
        amount: Number(dealAmount) || 5000000,
        pipeline: dealPipeline,
        contactName: leadName,
        contactPhone: phone,
        contactId: leadId,
        stage: 'Negotiation',
      }).catch(() => null);

      await leadService.transitionLead(leadId, 'CONVERTED', `Converted to deal: ${dealTitle}`);
      setLead((prev) => ({ ...prev, status: 'CONVERTED', stage: 'CONVERTED' }));
      setDealsList((prev) => [
        ...prev,
        { title: dealTitle, amount: dealAmount, pipeline: dealPipeline, stage: 'Negotiation' },
      ]);
      setDealModalVisible(false);
      Alert.alert('Deal Created', 'Lead successfully converted to Deal!');
    } catch (e) {
      Alert.alert('Error', 'Failed to convert lead to deal.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      setSubmittingAction(true);
      const noteObj = {
        id: `note-${Date.now()}`,
        content: newNoteContent.trim(),
        createdAt: new Date().toISOString(),
        author: user?.name || user?.email || 'Anuj Chauhan',
      };
      setNotesList((prev) => [noteObj, ...prev]);
      await apiClient.post(`/contacts/${leadId}/notes`, { note: newNoteContent }).catch(() => null);
      setNewNoteContent('');
      setNoteModalVisible(false);
      Alert.alert('Note Added', 'Note saved to contact timeline.');
    } catch (e) {
      Alert.alert('Error', 'Failed to add note.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const submitLogCall = async () => {
    try {
      setSubmittingAction(true);
      const callObj = {
        id: `call-${Date.now()}`,
        callType,
        callStatus,
        duration: callDuration,
        remark: callRemark,
        createdAt: new Date().toISOString(),
        userName: user?.name || 'Anuj Chauhan',
      };
      setCalls((prev) => [callObj, ...prev]);
      await apiClient.post('/call-logs', {
        phone,
        leadName,
        contactId: leadId,
        callType,
        status: callStatus,
        duration: 150,
        notes: callRemark,
      }).catch(() => null);
      setCallRemark('');
      setLogCallModalVisible(false);
      Alert.alert('Call Logged', 'Call record added to timeline.');
    } catch (e) {
      Alert.alert('Error', 'Failed to log call.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Unified Timeline Items Construction
  const unifiedActivities = useMemo(() => {
    const list: any[] = [];

    const formatDateStr = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return dStr;
      }
    };

    const formatDateTimeStr = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        return d.toLocaleString([], {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch {
        return dStr;
      }
    };

    // Follow-up tasks
    tasks.forEach((t, idx) => {
      list.push({
        id: t.id || t._id || `task-${idx}`,
        type: 'task',
        title: t.title || `Follow-up: ${t.type || 'Call Back'}`,
        status: t.isCompleted || t.status === 'COMPLETED' ? 'Completed' : 'Pending',
        dueDate: formatDateStr(t.dueDate || t.due_date || t.nextFollowUpDateTime) || '12/09/2026',
        author: t.author || user?.name || 'Anuj Chauhan',
        timestamp: formatDateTimeStr(t.createdAt || t.created_at) || '02/09/2026, 15:29:30',
        note: t.notes || t.description,
      });
    });

    // Call logs
    calls.forEach((c, idx) => {
      list.push({
        id: c.id || c._id || `call-${idx}`,
        type: 'call',
        title: `Call: ${c.callType || 'Outgoing'} (${c.callStatus || c.status || 'Connected'})`,
        status: c.callStatus || 'Completed',
        dueDate: c.duration || '2m 15s',
        author: c.userName || user?.name || 'Anuj Chauhan',
        timestamp: formatDateTimeStr(c.createdAt || c.created_at) || '02/09/2026, 14:15:00',
        note: c.remark || c.notes,
      });
    });

    // Notes
    notesList.forEach((n, idx) => {
      list.push({
        id: n.id || `note-${idx}`,
        type: 'note',
        title: 'Note Added',
        status: 'Saved',
        dueDate: '',
        author: n.author || user?.name || 'Anuj Chauhan',
        timestamp: formatDateTimeStr(n.createdAt || n.created_at) || '02/09/2026, 12:00:00',
        note: n.content,
      });
    });

    return list;
  }, [tasks, calls, notesList, user]);

  // Filtered Activities based on Sub-pills
  const filteredActivities = useMemo(() => {
    if (timelineFilter === 'calls') return unifiedActivities.filter((a) => a.type === 'call');
    if (timelineFilter === 'tasks') return unifiedActivities.filter((a) => a.type === 'task');
    return unifiedActivities;
  }, [unifiedActivities, timelineFilter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury #151728 Midnight Header ─── */}
      <View style={styles.luxuryHeader}>
        {/* Top Branding Row (Identical to Leads / Tasks) */}
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={() => navigation.navigate('LeadForm', { lead })}
            activeOpacity={0.88}
          >
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
            <Text style={styles.headerEditBtnText}>Edit Lead</Text>
          </TouchableOpacity>
        </View>

        {/* Lead Identity Hero Strip inside Luxury Header */}
        <View style={styles.headerHeroStrip}>
          <View style={[styles.avatarCircle, { backgroundColor: stageMeta.avatarBg }]}>
            <Text style={[styles.avatarText, { color: stageMeta.avatarText }]}>
              {leadName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerHeroMeta}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerHeroTitle} numberOfLines={1}>
                {leadName}
              </Text>
              <View
                style={[
                  styles.headerStagePill,
                  { backgroundColor: stageMeta.bg, borderColor: stageMeta.border },
                ]}
              >
                <View style={[styles.headerStageDot, { backgroundColor: stageMeta.dot }]} />
                <Text style={[styles.headerStageText, { color: stageMeta.text }]}>
                  {stageMeta.label}
                </Text>
              </View>
            </View>
            {/* Contact Row: Phone & Email */}
            <View style={styles.headerContactRow}>
              {phone ? (
                <TouchableOpacity onPress={handleCall} style={styles.headerContactPill} activeOpacity={0.75}>
                  <Ionicons name="call" size={11} color="#60A5FA" />
                  <Text style={styles.headerContactPillText}>{phone}</Text>
                </TouchableOpacity>
              ) : null}

              {email ? (
                <TouchableOpacity onPress={handleEmail} style={styles.headerContactPill} activeOpacity={0.75}>
                  <Ionicons name="mail" size={11} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.headerContactPillText} numberOfLines={1}>
                    {email}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* ─── Status Filter Chips (Matching Leads & Tasks Screens) ─── */}
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>SECTION TABS</Text>
          <View style={styles.swipeHintPill}>
            <Ionicons name="swap-horizontal" size={11} color="#0284C7" />
            <Text style={styles.swipeHintText}>Swipe for more</Text>
          </View>
        </View>

        <View style={styles.statusFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterContent}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const maxScroll = contentSize.width - layoutMeasurement.width;
              if (maxScroll > 0) {
                setTabScrollProgress(Math.min(1, Math.max(0, contentOffset.x / maxScroll)));
              }
            }}
            scrollEventThrottle={16}
          >
            {[
              { key: 'timeline', label: 'ACTIVITY', count: unifiedActivities.length },
              { key: 'profile', label: 'OVERVIEW', count: undefined },
              { key: 'deals', label: 'DEALS', count: dealsList.length },
              { key: 'notes', label: 'NOTES', count: notesList.length },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                  onPress={() => setActiveTab(tab.key as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                    {tab.label}
                  </Text>
                  {tab.count !== undefined ? (
                    <View
                      style={[styles.chipBadgeCircle, isSelected && styles.chipBadgeCircleSelected]}
                    >
                      <Text
                        style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextSelected]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Micro Track Bar Indicator */}
        <View style={styles.scrollTrackContainer}>
          <View style={styles.scrollTrackBg}>
            <View
              style={[
                styles.scrollTrackThumb,
                { left: `${tabScrollProgress * 65}%` },
              ]}
            />
          </View>
        </View>

        {/* ─── Modern 5-Column Executive Quick Action Cockpit ─── */}
        <View style={styles.actionCockpitBar}>
          <TouchableOpacity style={styles.actionItem} onPress={handleCall} activeOpacity={0.75}>
            <View style={[styles.actionCircle, { backgroundColor: '#EEF0F8', borderColor: '#C8CDDC' }]}>
              <Ionicons name="call" size={20} color="#272944" />
            </View>
            <Text style={styles.actionItemLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleWhatsApp}
            activeOpacity={0.75}
          >
            <View style={[styles.actionCircle, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="logo-whatsapp" size={21} color="#16A34A" />
            </View>
            <Text style={styles.actionItemLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setCallBackModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionCircle, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Ionicons name="time" size={20} color="#EA580C" />
            </View>
            <Text style={styles.actionItemLabel}>Follow-up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setDealModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionCircle, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <Ionicons name="swap-horizontal" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.actionItemLabel}>Convert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setNotInterestedModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionCircle, { backgroundColor: '#FEF2F2', borderColor: '#FECDD3' }]}>
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.actionItemLabel}>Lost</Text>
          </TouchableOpacity>
        </View>

        {/* ─── TAB 1: Connected Vertical Activity Timeline ─── */}
        {activeTab === 'timeline' && (
          <View style={styles.tabContentContainer}>
            {/* Filter Pills & Add Quick Action Bar */}
            <View style={styles.timelineFilterBar}>
              <TouchableOpacity
                style={[styles.subFilterPill, timelineFilter === 'all' && styles.subFilterPillActive]}
                onPress={() => setTimelineFilter('all')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.subFilterPillText,
                    timelineFilter === 'all' && styles.subFilterPillTextActive,
                  ]}
                >
                  All ({unifiedActivities.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subFilterPill, timelineFilter === 'calls' && styles.subFilterPillActive]}
                onPress={() => setTimelineFilter('calls')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="call-outline"
                  size={12}
                  color={timelineFilter === 'calls' ? '#151728' : '#64748B'}
                />
                <Text
                  style={[
                    styles.subFilterPillText,
                    timelineFilter === 'calls' && styles.subFilterPillTextActive,
                  ]}
                >
                  Calls ({calls.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subFilterPill, timelineFilter === 'tasks' && styles.subFilterPillActive]}
                onPress={() => setTimelineFilter('tasks')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={timelineFilter === 'tasks' ? '#151728' : '#64748B'}
                />
                <Text
                  style={[
                    styles.subFilterPillText,
                    timelineFilter === 'tasks' && styles.subFilterPillTextActive,
                  ]}
                >
                  Tasks ({tasks.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAddTrigger}
                onPress={() => setNoteModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={13} color="#2563EB" />
                <Text style={styles.quickAddTriggerText}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {/* Activities List */}
            <View style={styles.timelineStream}>
              {filteredActivities.map((act) => (
                <View key={act.id} style={styles.activityCard3D}>
                  <View style={styles.cardInnerPadding}>
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.taskIconBox,
                          act.type === 'call' && { backgroundColor: '#EFF6FF' },
                          act.type === 'task' && { backgroundColor: '#FFFBEB' },
                          act.type === 'note' && { backgroundColor: '#ECFDF5' },
                        ]}
                      >
                        <Ionicons
                          name={
                            act.type === 'call'
                              ? 'call'
                              : act.type === 'task'
                              ? 'calendar'
                              : 'document-text'
                          }
                          size={18}
                          color={
                            act.type === 'call'
                              ? '#2563EB'
                              : act.type === 'task'
                              ? '#D97706'
                              : '#059669'
                          }
                        />
                      </View>

                      <View style={styles.taskInfoGroup}>
                        <Text style={styles.taskTitleText} numberOfLines={1}>
                          {act.title}
                        </Text>
                        {act.dueDate ? (
                          <View style={styles.dueDateRow}>
                            <Ionicons name="time-outline" size={12} color="#EA580C" />
                            <Text style={styles.dueDateText}>Due: {act.dueDate}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          act.status === 'Completed' || act.status === 'Saved'
                            ? styles.statusBadgeCompleted
                            : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            act.status === 'Completed' || act.status === 'Saved'
                              ? styles.statusBadgeTextCompleted
                              : styles.statusBadgeTextPending,
                          ]}
                        >
                          {act.status}
                        </Text>
                      </View>
                    </View>

                    {act.note ? (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteBoxText}>{act.note}</Text>
                      </View>
                    ) : null}

                    <View style={styles.cardFooterMeta}>
                      <Text style={styles.cardAuthorText}>By {act.author}</Text>
                      <Text style={styles.cardTimestampText}>{act.timestamp}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── TAB 2: Overview (Profile Information) ─── */}
        {activeTab === 'profile' && (
          <View style={styles.tabContentContainer}>
            {/* Property Requirement Card */}
            <View style={styles.profileCard3D}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="business-outline" size={16} color="#2563EB" />
                    <Text style={styles.cardSectionTitle}>{semantics.projectEntity.toUpperCase()} PREFERENCES</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sectionActionPill}
                    onPress={() => setInterestedModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={13} color="#2563EB" />
                    <Text style={styles.sectionActionText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileGrid}>
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>{semantics.projectEntity.toUpperCase()}</Text>
                    <Text style={styles.fieldValue}>
                      {lead.project || lead.projectName || 'General Inquiry'}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>BUDGET RANGE</Text>
                    <Text style={[styles.fieldValue, { color: '#059669', fontWeight: '700' }]}>
                      {lead.budget || 'Standard'}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>LOCATION / AREA</Text>
                    <Text style={styles.fieldValue}>{lead.location || 'Not Specified'}</Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>{semantics.projectEntity.toUpperCase()} TYPE</Text>
                    <Text style={styles.fieldValue}>
                      {lead.propertyType || 'Standard'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Lead Ownership & Details Card */}
            <View style={[styles.profileCard3D, { marginTop: 14 }]}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="person-circle-outline" size={16} color="#7C3AED" />
                    <Text style={styles.cardSectionTitle}>CLIENT & SOURCE METRICS</Text>
                  </View>
                </View>

                <View style={styles.profileGrid}>
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>CUSTOMER NAME</Text>
                    <Text style={styles.fieldValue}>{leadName}</Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                    <Text style={styles.fieldValue}>{phone || 'Not Provided'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.profileField}
                    onPress={email ? handleEmail : undefined}
                    activeOpacity={email ? 0.7 : 1}
                  >
                    <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {email ? <Ionicons name="mail-outline" size={13} color="#2563EB" /> : null}
                      <Text style={[styles.fieldValue, email ? { color: '#2563EB', textDecorationLine: 'underline' } : null]}>
                        {email || 'Not Provided'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>ALTERNATE NUMBER</Text>
                    <Text style={styles.fieldValue}>{lead.alternateNo || 'Not Provided'}</Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>LEAD SOURCE</Text>
                    <Text style={styles.fieldValue}>{lead.source || 'Self Generated'}</Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>ASSIGNED EXECUTIVE</Text>
                    <Text style={styles.fieldValue}>{user?.name || 'Anuj Chauhan'}</Text>
                  </View>
                </View>

                {lead.notes ? (
                  <View style={styles.notesSection}>
                    <Text style={styles.fieldLabel}>INQUIRY REMARKS</Text>
                    <Text style={styles.notesBodyText}>{lead.notes}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* ─── TAB 3: Deals & Pipeline ─── */}
        {activeTab === 'deals' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.profileCard3D}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="briefcase-outline" size={16} color="#059669" />
                    <Text style={styles.cardSectionTitle}>DEALS & PIPELINE</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sectionActionPill}
                    onPress={() => setDealModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={13} color="#2563EB" />
                    <Text style={styles.sectionActionText}>+ New Deal</Text>
                  </TouchableOpacity>
                </View>

                {dealsList.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Ionicons name="briefcase-outline" size={36} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No active deals created yet</Text>
                    <Text style={styles.emptySubtext}>
                      Click "+ New Deal" or "Convert" from the action bar to link a monetary pipeline deal.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyCTA}
                      onPress={() => setDealModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.emptyCTAText}>Create Deal Now</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  dealsList.map((d, idx) => (
                    <View key={idx} style={styles.dealItemCard}>
                      <View style={styles.dealHeaderRow}>
                        <Text style={styles.dealTitleText}>{d.title}</Text>
                        <Text style={styles.dealAmountText}>
                          ₹{Number(d.amount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.dealMetaRow}>
                        <Text style={styles.dealPipelineText}>{d.pipeline || 'Sales Pipeline'}</Text>
                        <View style={styles.dealStagePill}>
                          <Text style={styles.dealStageText}>{d.stage || 'Negotiation'}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ─── TAB 4: Notes & Files ─── */}
        {activeTab === 'notes' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.profileCard3D}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                    <Text style={styles.cardSectionTitle}>CONTACT NOTES & REMARKS</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sectionActionPill}
                    onPress={() => setNoteModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={13} color="#2563EB" />
                    <Text style={styles.sectionActionText}>+ Add Note</Text>
                  </TouchableOpacity>
                </View>

                {notesList.length === 0 ? (
                  <Text style={styles.noItemsText}>No client notes recorded yet.</Text>
                ) : (
                  notesList.map((n, idx) => (
                    <View key={idx} style={styles.noteItemCard}>
                      <Text style={styles.noteContentText}>{n.content}</Text>
                      <View style={styles.noteFooterRow}>
                        <Text style={styles.noteAuthorText}>By {n.author}</Text>
                        <Text style={styles.noteTimestampText}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[styles.profileCard3D, { marginTop: 14 }]}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="attach-outline" size={16} color="#7C3AED" />
                    <Text style={styles.cardSectionTitle}>ATTACHMENTS & FILES</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sectionActionPill}
                    onPress={() => Alert.alert('Upload Attachment', 'File upload options ready.')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cloud-upload-outline" size={13} color="#2563EB" />
                    <Text style={styles.sectionActionText}>+ Upload</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.noItemsText}>No attachments uploaded for this contact.</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 1: Call Back / Reschedule Details ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={callBackModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Call Back Details</Text>
              <TouchableOpacity
                onPress={() => setCallBackModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Call Back Reason *</Text>
            <View style={styles.modalPickerContainer}>
              {['Busy in Meeting', 'Call After 1 Hour', 'Call Tomorrow', 'Ringing No Response'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pickerChip, callBackReason === r && styles.pickerChipActive]}
                  onPress={() => setCallBackReason(r)}
                >
                  <Text
                    style={[styles.pickerChipText, callBackReason === r && styles.pickerChipTextActive]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Next Follow Up Date *</Text>
            <TouchableOpacity
              style={[styles.modalTextInput, styles.dateTriggerBox]}
              onPress={() => setShowCallBackDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerLeft}>
                <Ionicons name="calendar-sharp" size={17} color="#0284C7" />
                <Text style={styles.dateTriggerText}>
                  {callBackDate || 'Select follow up date & time...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.modalInputLabel}>Note</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
              value={callBackNote}
              onChangeText={setCallBackNote}
              placeholder="Add client discussion notes..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCallBackModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitCallBack}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Call Back</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 2: Not Interested (Mark Lost) Details ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={notInterestedModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Not Interested Details</Text>
              <TouchableOpacity
                onPress={() => setNotInterestedModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Not Interested Reason *</Text>
            <View style={styles.modalPickerContainer}>
              {[
                'Budget Mismatch',
                'Not Looking Now',
                'High Price',
                'Location Issue',
                'Already Purchased',
                'Fake Inquiry',
              ].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pickerChip, notInterestedReason === r && styles.pickerChipActive]}
                  onPress={() => setNotInterestedReason(r)}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      notInterestedReason === r && styles.pickerChipTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Enter Note</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
              value={notInterestedNote}
              onChangeText={setNotInterestedNote}
              placeholder="Provide reason remarks..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNotInterestedModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={submitNotInterested}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit & Mark Lost</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 3: Interested Stage Details Form ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={interestedModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Interested Stage Details</Text>
                <TouchableOpacity
                  onPress={() => setInterestedModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalInputLabel}>Project Name *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={interestedProject}
                onChangeText={setInterestedProject}
                placeholder="Project Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalInputLabel}>Budget Range *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={interestedBudget}
                onChangeText={setInterestedBudget}
                placeholder="e.g. Rs.40 Lacs - Rs.50 Lacs"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalInputLabel}>Location / Area *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={interestedLocation}
                onChangeText={setInterestedLocation}
                placeholder="e.g. Noida Sector 18"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalInputLabel}>Property Type *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={interestedPropertyType}
                onChangeText={setInterestedPropertyType}
                placeholder="Residential / Commercial"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalInputLabel}>Note</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                value={interestedNote}
                onChangeText={setInterestedNote}
                placeholder="Additional inquiry requirements..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setInterestedModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={submitInterested}
                  disabled={submittingAction}
                >
                  {submittingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Save Details</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 4: Convert to Deal ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={dealModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Convert to Pipeline Deal</Text>
              <TouchableOpacity
                onPress={() => setDealModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Deal Title *</Text>
            <TextInput
              style={styles.modalTextInput}
              value={dealTitle}
              onChangeText={setDealTitle}
              placeholder="e.g. 3BHK Unit Deal"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.modalInputLabel}>Deal Value (₹) *</Text>
            <TextInput
              style={styles.modalTextInput}
              value={dealAmount}
              onChangeText={setDealAmount}
              keyboardType="numeric"
              placeholder="5000000"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.modalInputLabel}>Pipeline</Text>
            <TextInput
              style={styles.modalTextInput}
              value={dealPipeline}
              onChangeText={setDealPipeline}
              placeholder="Primary Sales Pipeline"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDealModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#2563EB' }]}
                onPress={submitConvertDeal}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Deal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 5: Add Note ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Contact Note</Text>
              <TouchableOpacity
                onPress={() => setNoteModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Note Content *</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 95, textAlignVertical: 'top' }]}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              placeholder="Type client discussion or internal note here..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitAddNote}
                disabled={submittingAction || !newNoteContent.trim()}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 6: Log Call Details ─── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={logCallModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Log Call Activity</Text>
              <TouchableOpacity
                onPress={() => setLogCallModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Call Type</Text>
            <View style={styles.modalPickerContainer}>
              {['Outgoing', 'Incoming', 'Missed'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pickerChip, callType === t && styles.pickerChipActive]}
                  onPress={() => setCallType(t)}
                >
                  <Text style={[styles.pickerChipText, callType === t && styles.pickerChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Call Status</Text>
            <View style={styles.modalPickerContainer}>
              {['Connected', 'Busy', 'No Answer', 'Wrong Number'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pickerChip, callStatus === s && styles.pickerChipActive]}
                  onPress={() => setCallStatus(s)}
                >
                  <Text
                    style={[styles.pickerChipText, callStatus === s && styles.pickerChipTextActive]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Call Remark / Summary</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
              value={callRemark}
              onChangeText={setCallRemark}
              placeholder="Summary of conversation..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogCallModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitLogCall}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Log Call</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Date Picker Modal for Call Back Date */}
      <CalendarDatePickerModal
        visible={showCallBackDatePicker}
        title="Select Follow Up Date"
        currentValue={callBackDate}
        includeTime={true}
        onClose={() => setShowCallBackDatePicker(false)}
        onSelectDate={(formatted) => {
          setCallBackDate(formatted);
        }}
      />

      {/* Unified Telephony Post-Call Disposition Modal */}
      <PostCallDispositionModal
        visible={postCallModalVisible}
        onClose={() => {
          setPostCallModalVisible(false);
          setActiveCaller(null);
        }}
        caller={activeCaller}
        onSuccess={() => {
          loadLeadDetails();
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
  // ─── Zone 1: Midnight Luxury Header ───
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
    marginBottom: 16,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 5,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  headerEditBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerHeroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerHeroMeta: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerHeroTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  headerStagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  headerStageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStageText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerContactRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4.5,
    marginTop: 4,
  },
  headerContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerContactPillText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.90)',
    fontWeight: '600',
  },

  // ─── Scrollable Body ───
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 80,
  },

  // ─── Status Tabs Bar (Horizontal scrolling identical to LeadsListScreen) ───
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  filterSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  swipeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  scrollTrackContainer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -6,
  },
  scrollTrackBg: {
    width: 48,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrollTrackThumb: {
    width: 20,
    height: 3,
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },
  statusFilterBar: {
    marginBottom: 14,
  },
  statusFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusChipSelected: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  chipBadgeCircle: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },

  // ─── Modern 5-Column Executive Quick Action Cockpit ───
  actionCockpitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 5,
  },
  actionItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  cardInnerPadding: {
    padding: 16,
  },

  // ─── Tab Content Containers ───
  tabContentContainer: {
    paddingHorizontal: 16,
  },
  timelineFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  subFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    gap: 4,
  },
  subFilterPillActive: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  subFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  subFilterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickAddTrigger: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    gap: 4,
  },
  quickAddTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  timelineStream: {
    gap: 10,
  },
  activityCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskInfoGroup: {
    flex: 1,
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  statusBadgeTextCompleted: {
    color: '#059669',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  noteBoxText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  cardFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  cardAuthorText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardTimestampText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },

  // ─── Tab 2: Overview ───
  profileCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.4,
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
    gap: 4,
  },
  sectionActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileField: {
    width: '47%',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  notesSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesBodyText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginTop: 4,
  },

  // ─── Tab 3: Deals ───
  dealItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dealTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dealAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  dealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealPipelineText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dealStagePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dealStageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyCardBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  emptyCTA: {
    marginTop: 14,
    backgroundColor: '#151728',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
  },
  emptyCTAText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Tab 4: Notes ───
  noteItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  noteContentText: {
    fontSize: 12.5,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 6,
  },
  noteFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteAuthorText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  noteTimestampText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  noItemsText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 10,
  },

  // ─── Modals ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 10,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  dateTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickerChipActive: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  pickerChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pickerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    backgroundColor: '#151728',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

