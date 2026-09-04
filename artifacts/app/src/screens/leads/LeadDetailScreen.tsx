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
  FlatList,
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
import { getDynamicDefaultOptions } from './LeadFormScreen';
import {
  CallbackModal,
  NotInterestedModal,
  InterestedModal,
  ConvertLeadModal,
  LostModal,
  RescheduleModal,
  LogCallModal,
  NotesModal,
  ChangeOwnerModal,
  UnifiedActivityTimeline,
  CreateTaskModal,
} from '../../components/leads';

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
  const [lostModalVisible, setLostModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [changeOwnerModalVisible, setChangeOwnerModalVisible] = useState(false);

  // Form States for Modals
  const [submittingAction, setSubmittingAction] = useState(false);

  // Resource Attachments Upload & Sub-tab State
  const [notesSubTab, setNotesSubTab] = useState<'notes' | 'attachments'>('notes');
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [attachType, setAttachType] = useState<'photo' | 'video' | 'file'>('photo');
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [uploadingAttach, setUploadingAttach] = useState(false);

  const handleOpenAttachModal = (type: 'photo' | 'video' | 'file') => {
    setAttachType(type);
    setAttachName('');
    setAttachUrl('');
    setAttachModalVisible(true);
  };

  const handleUploadAttachment = async () => {
    if (!attachUrl.trim()) {
      Alert.alert('Required Field', 'Please enter a Resource URL or file link.');
      return;
    }

    try {
      setUploadingAttach(true);
      const leadId = lead.id || lead._id;
      const payload = {
        name: attachName.trim() || `${attachType === 'photo' ? 'Photo' : attachType === 'video' ? 'Video' : 'Document'} Attachment`,
        type: attachType,
        url: attachUrl.trim(),
      };

      await apiClient.post(`/contacts/${leadId}/attachments`, payload);
      Alert.alert('Success', 'Attachment uploaded successfully!');
      setAttachModalVisible(false);
      loadLeadDetails();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttach(false);
    }
  };

  const handleDeleteAttachment = (attachId: string) => {
    Alert.alert('Delete Attachment', 'Are you sure you want to delete this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const leadId = lead.id || lead._id;
            await apiClient.delete(`/contacts/${leadId}/attachments/${attachId}`);
            Alert.alert('Success', 'Attachment deleted successfully!');
            loadLeadDetails();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete attachment');
          }
        },
      },
    ]);
  };

  // 1. Call Back Modal Form
  const [callBackReason, setCallBackReason] = useState('Busy in Meeting');
  const [callBackDate, setCallBackDate] = useState('2026-09-05, 10:00 AM');
  const [callBackNote, setCallBackNote] = useState('');
  const [showCallBackDatePicker, setShowCallBackDatePicker] = useState(false);

  // 2. Not Interested Modal Form
  const [notInterestedReason, setNotInterestedReason] = useState('Budget Mismatch');
  const [notInterestedNote, setNotInterestedNote] = useState('');

  // 3. Interested Modal Form (Matching Web CRM InterestedDetails.tsx 1:1)
  const [interestedCustomerName, setInterestedCustomerName] = useState(lead.name || lead.firstName || 'Inquiry Contact');
  const [interestedAlternateNo, setInterestedAlternateNo] = useState((lead as any).alternateNo || (lead as any).alternate_no || '');
  const [interestedLocation, setInterestedLocation] = useState(lead.location || 'Noida Sector 18');
  const [interestedProject, setInterestedProject] = useState(lead.project || lead.projectName || 'Sunrise Park');
  const [interestedTaskType, setInterestedTaskType] = useState('Call Back');
  const [interestedBudget, setInterestedBudget] = useState(lead.budget || 'Rs.40 Lacs - Rs.50 Lacs');
  const [interestedNextFollowUp, setInterestedNextFollowUp] = useState('2026-09-05, 11:00 AM');
  const [interestedPropertyType, setInterestedPropertyType] = useState(lead.propertyType || 'Residential Properties');
  const [interestedPropertyStage, setInterestedPropertyStage] = useState((lead as any).propertyStage || 'Under Construction');
  const [interestedPropertySubType, setInterestedPropertySubType] = useState((lead as any).propertySubType || 'Apartment');
  const [interestedSource, setInterestedSource] = useState(lead.source || 'Website');
  const [interestedNote, setInterestedNote] = useState('');

  // Dynamic API Dropdown Options & Picker Modal States
  const [dynamicApiOptions, setDynamicApiOptions] = useState<Record<string, string[]>>({});
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    fieldKey: string;
    fieldLabel: string;
    options: string[];
    currentValue: string;
    setter: (val: string) => void;
  }>({
    visible: false,
    fieldKey: '',
    fieldLabel: '',
    options: [],
    currentValue: '',
    setter: () => {},
  });
  const [pickerSearch, setPickerSearch] = useState('');
  const [showInterestedDatePicker, setShowInterestedDatePicker] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInterestedDynamicOptions = async () => {
      try {
        const finalIndustry = user?.industryId || 'temp0001';
        const finalRole = user?.role || 'admin';
        const finalOrg = user?.organizationId;

        // 1. Resolve screen config for interested screen (matching InterestedDetails.tsx)
        await apiClient
          .post('/screens/resolve', {
            screenKey: 'interested',
            industryCode: finalIndustry,
            industry_code: finalIndustry,
            roleKey: finalRole,
            role_key: finalRole,
            organizationId: finalOrg,
            organization_id: finalOrg,
          })
          .catch(() => null);

        // 2. Fetch options from backend endpoints
        const orgParam = finalOrg ? `?organizationId=${encodeURIComponent(finalOrg)}` : '';
        const indParam = finalIndustry ? `&industryId=${encodeURIComponent(finalIndustry)}` : '';
        const querySuffix = `${orgParam}${orgParam ? indParam : indParam ? `?${indParam.substring(1)}` : ''}`;

        const endpoints = [
          { key: 'projectName', url: `options/projectName${querySuffix}` },
          { key: 'projectName', url: `options/resourceProjects?display=projectName${indParam}` },
          { key: 'projectName', url: `projects${querySuffix}` },
          { key: 'location', url: `options/location${querySuffix}` },
          { key: 'location', url: `options/resourceLocations?display=locationName${indParam}` },
          { key: 'propertyType', url: `options/propertyType${querySuffix}` },
          { key: 'propertyType', url: `options/resourcePropertyTypes?display=propertyType${indParam}` },
          { key: 'propertyStage', url: `options/propertyStage${querySuffix}` },
          { key: 'propertyStage', url: `options/resourcePropertyStages?display=stage${indParam}` },
          { key: 'propertySubType', url: `options/propertySubType${querySuffix}` },
          { key: 'budget', url: `options/budget${querySuffix}` },
          { key: 'budget', url: `options/resourceBudgets?display=budget${indParam}` },
          { key: 'leadSource', url: `options/source${querySuffix}` },
          { key: 'leadSource', url: `options/resourceLeadSources?display=leadSource${indParam}` },
          { key: 'source', url: `options/source${querySuffix}` },
        ];

        const loadedOptions: Record<string, string[]> = {};

        await Promise.allSettled(
          endpoints.map(async ({ key, url }) => {
            try {
              const res = await apiClient.get(url);
              const raw = res.data?.items || res.data?.data || res.data || [];
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
                  loadedOptions[key] = Array.from(
                    new Set([...(loadedOptions[key] || []), ...strVals])
                  );
                }
              }
            } catch {
              // Ignore
            }
          })
        );

        if (isMounted) {
          setDynamicApiOptions(loadedOptions);
        }
      } catch (err) {
        console.warn('Failed loading dynamic options for interested screen:', err);
      }
    };

    fetchInterestedDynamicOptions();
    return () => {
      isMounted = false;
    };
  }, [user?.industryId, user?.role, user?.organizationId]);

  const getOptionsForField = useCallback(
    (fieldKey: string): string[] => {
      const apiVals =
        dynamicApiOptions[fieldKey] ||
        dynamicApiOptions[fieldKey === 'source' ? 'leadSource' : fieldKey];
      const defaults = getDynamicDefaultOptions(user?.industryId);
      const defVals =
        defaults[fieldKey] ||
        defaults[fieldKey === 'projectName' ? 'project' : fieldKey] ||
        [];

      const merged = Array.from(new Set([...(apiVals || []), ...defVals]));
      if (merged.length > 0) return merged;

      if (fieldKey === 'taskType') return ['Call Back', 'Site Visit', 'Meeting'];
      if (fieldKey === 'propertyStage')
        return ['Under Construction', 'Ready to Move', 'Pre Launch', 'Resale'];
      return [];
    },
    [dynamicApiOptions, user?.industryId]
  );

  const filteredPickerOptions = useMemo(() => {
    if (!pickerSearch.trim()) return pickerModal.options;
    const query = pickerSearch.toLowerCase().trim();
    return pickerModal.options.filter((o) => o.toLowerCase().includes(query));
  }, [pickerModal.options, pickerSearch]);

  const openFieldPicker = (
    fieldKey: string,
    fieldLabel: string,
    currentVal: string,
    setter: (val: string) => void
  ) => {
    const options = getOptionsForField(fieldKey);
    setPickerSearch('');
    setPickerModal({
      visible: true,
      fieldKey,
      fieldLabel,
      options,
      currentValue: currentVal,
      setter,
    });
  };

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
      let contactNotes: any[] = [];
      const res = await apiClient.get(`/contacts/${leadId}`).catch(() => null);
      if (res?.data) {
        const d = res.data?.item || res.data;
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

        if (Array.isArray(d.notesList)) contactNotes = [...d.notesList];
        if (d.notes && typeof d.notes === 'string' && d.notes.trim()) {
          contactNotes.push({ content: d.notes.trim(), author: 'System', createdAt: d.createdAt || new Date().toISOString() });
        }
        if (Array.isArray(d.attachments)) setAttachments(d.attachments);
      }

      // Fetch Resource Notes (Matching Web CRM 1:1)
      const notesRes = (await apiClient.get('/resources/resourceNotes', { params: { contactId: leadId, contact_id: leadId, pageSize: 200 } }).catch(() => null))
        || (await apiClient.get('/resources/notes', { params: { contactId: leadId, contact_id: leadId, pageSize: 200 } }).catch(() => null));

      let fetchedNotes: any[] = [];
      if (notesRes?.data) {
        const rawNotes = notesRes.data?.items || (Array.isArray(notesRes.data) ? notesRes.data : []);
        if (Array.isArray(rawNotes)) {
          const targetIdStr = String(leadId || '').trim();
          fetchedNotes = rawNotes.filter((n: any) => {
            const nContactId = String(n.contactId || n.contact_id || n.leadId || '').trim();
            return nContactId === targetIdStr;
          });
        }
      }

      // Merge and normalize all notes
      const combinedNotes = [...fetchedNotes, ...contactNotes];
      const seenContent = new Set<string>();
      const normalizedNotes: any[] = [];

      for (let i = 0; i < combinedNotes.length; i++) {
        const n = combinedNotes[i];
        const content = typeof n === 'string' ? n : (n.content || n.note || n.notes || n.text || n.description || n.remark || '');
        if (!content || !content.trim()) continue;
        const key = content.trim().toLowerCase();
        if (seenContent.has(key)) continue;
        seenContent.add(key);

        normalizedNotes.push({
          id: typeof n === 'object' && (n._id || n.id) ? (n._id || n.id) : `note-${i}`,
          content: content.trim(),
          author: typeof n === 'object' ? (n.userEmail || n.user_email || n.userName || n.user_name || n.createdBy || n.created_by || n.author || 'dev@digitalrubix.com') : 'dev@digitalrubix.com',
          createdAt: typeof n === 'object' ? (n.createdAt || n.created_at || n.date || n.updatedAt || new Date().toISOString()) : new Date().toISOString(),
        });
      }

      setNotesList(normalizedNotes);

      // Fetch Tasks associated
      const tasksRes = await apiClient.get('/tasks', { params: { contactId: leadId, contact_id: leadId } }).catch(() => null);
      if (tasksRes?.data) {
        const rawTasks = tasksRes.data?.items || tasksRes.data?.tasks || tasksRes.data || [];
        if (Array.isArray(rawTasks)) {
          const targetIdStr = String(leadId || '').trim();
          const targetNameStr = String(lead.name || lead.firstName || '').toLowerCase().trim();
          const matchedTasks = rawTasks.filter((t: any) => {
            const tContactId = String(t.contactId || t.contact_id || t.leadId || '').trim();
            const tCustName = String(t.customerName || t.customer_name || '').toLowerCase().trim();
            return (tContactId && tContactId === targetIdStr) || (targetNameStr && tCustName && tCustName === targetNameStr);
          });
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

  const normalizedStage = String(stage || '').toUpperCase().trim();
  const isFresh = !normalizedStage || normalizedStage.includes('FRESH') || normalizedStage.includes('NEW');
  const isCallback = normalizedStage.includes('CALLBACK') || normalizedStage.includes('CALL_BACK');
  const isInterested = normalizedStage.includes('INTEREST') || normalizedStage.includes('QUALIF') || normalizedStage.includes('VISIT') || normalizedStage.includes('MEET') || normalizedStage.includes('FOLLOW');
  const isClosedLost =
    ['NOT INTERESTED', 'NOTINTERESTED', 'NOT_INTERESTED', 'LOST', 'DROP', 'CLOSED LOST', 'CLOSED_LOST', 'JUNK'].includes(normalizedStage.replace(/_/g, ' ')) ||
    normalizedStage.includes('LOST') ||
    normalizedStage.includes('NOT_INTEREST') ||
    normalizedStage.includes('REFUSED');
  const isConverted = Boolean(lead?.isConverted || lead?.is_converted || normalizedStage.includes('CONVERT') || normalizedStage.includes('WON') || normalizedStage.includes('DEAL') || dealsList.length > 0);

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
        `Updated interested details: ${interestedProject} | ${interestedBudget} | ${interestedLocation} - ${interestedNote}`
      );
      await apiClient.put(`/leads/${leadId}`, {
        customerName: interestedCustomerName,
        alternateNo: interestedAlternateNo,
        location: interestedLocation,
        project: interestedProject,
        projectName: interestedProject,
        budget: interestedBudget,
        propertyType: interestedPropertyType,
        propertyStage: interestedPropertyStage,
        propertySubType: interestedPropertySubType,
        source: interestedSource,
        notes: interestedNote,
        stage: 'INTERESTED',
        status: 'INTERESTED',
      }).catch(() => null);

      // Create Follow-up Task matching Web CRM 1:1
      await apiClient.post('/tasks', {
        contactId: leadId,
        leadId: leadId,
        title: `Follow-up: ${interestedTaskType}`,
        type: interestedTaskType,
        taskType: interestedTaskType,
        dueDate: interestedNextFollowUp,
        notes: interestedNote,
        status: 'PENDING',
        customerName: interestedCustomerName,
        leadName: interestedCustomerName,
        phone: phone,
        project: interestedProject,
        location: interestedLocation,
        budget: interestedBudget,
        source: interestedSource,
      }).catch(() => null);

      setLead((prev) => ({
        ...prev,
        status: 'INTERESTED',
        stage: 'INTERESTED',
        name: interestedCustomerName,
        project: interestedProject,
        budget: interestedBudget,
        location: interestedLocation,
        propertyType: interestedPropertyType,
        source: interestedSource,
      }));
      setInterestedModalVisible(false);
      Alert.alert('Success', 'Lead updated to Interested and follow-up task created!');
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
      let reasonVal =
        t.reason ||
        t.callbackReason ||
        t.callBackReason ||
        t.callback_reason ||
        t.call_back_reason ||
        t.notIntReason ||
        t.lostReason ||
        '';

      // Smart Fallback: Extract reason from notes/note/description text if not explicitly present
      if (!reasonVal) {
        const notesText = String(t.notes || t.description || t.note || t.content || '').toLowerCase();
        if (notesText.includes('on request') || notesText.includes('onrequest')) reasonVal = 'On Request';
        else if (notesText.includes('not picked') || notesText.includes('no picked')) reasonVal = 'Not Picked';
        else if (notesText.includes('not reachable')) reasonVal = 'Not Reachable';
        else if (notesText.includes('switched off')) reasonVal = 'Switched Off';
        else if (notesText.includes('busy')) reasonVal = 'Busy in Meeting';
        else if (notesText.includes('driving')) reasonVal = 'Driving';
        else if (notesText.includes('travel')) reasonVal = 'Customer Travel';
        else if (notesText.includes('budget')) reasonVal = 'Budget Mismatch';
      }

      const rawType = t.taskType || t.task_type || t.type || 'Call Back';
      let baseTypeStr = rawType.toLowerCase().startsWith('follow-up')
        ? rawType
        : `Follow-up: ${rawType}`;

      let cleanTitle = (t.title || baseTypeStr).replace(/\s*\([^)]*\)/g, '').trim();
      if (!cleanTitle.toLowerCase().startsWith('follow-up')) {
        cleanTitle = `Follow-up: ${cleanTitle}`;
      }

      if (reasonVal && !cleanTitle.toLowerCase().includes(reasonVal.toLowerCase())) {
        cleanTitle = `${cleanTitle} (${reasonVal})`;
      }

      list.push({
        id: t.id || t._id || `task-${idx}`,
        type: 'task',
        title: cleanTitle,
        reason: reasonVal,
        status: t.isCompleted || t.status === 'COMPLETED' || t.status === 'Completed' ? 'Completed' : 'Pending',
        dueDate: formatDateStr(t.dueDate || t.due_date || t.nextFollowUpDateTime) || '12/09/2026',
        author: t.author || user?.name || 'Anuj Chauhan',
        timestamp: formatDateTimeStr(t.createdAt || t.created_at) || '02/09/2026, 15:29:30',
        note: t.notes || t.description || t.note,
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

    return list;
  }, [tasks, calls, user]);

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

          {!isClosedLost && (
            <TouchableOpacity
              style={styles.headerEditBtn}
              onPress={() => navigation.navigate('LeadForm', { lead })}
              activeOpacity={0.88}
            >
              <Ionicons name="create-outline" size={14} color="#FFFFFF" />
              <Text style={styles.headerEditBtnText}>Edit Lead</Text>
            </TouchableOpacity>
          )}
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
        </View>

        <View style={styles.statusFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterContent}
          >
            {[
              { key: 'timeline', label: 'ACTIVITY', count: unifiedActivities.length },
              { key: 'profile', label: 'OVERVIEW', count: undefined },
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

        {/* ─── Web CRM 1:1 Stage-Aware Executive Action Cockpit ─── */}
        {!isClosedLost && (
          <View style={styles.actionCockpitBar}>
            <TouchableOpacity style={styles.actionItem} onPress={handleCall} activeOpacity={0.75}>
              <View style={[styles.actionCircle, { backgroundColor: '#EEF0F8', borderColor: '#C8CDDC' }]}>
                <Ionicons name="call" size={20} color="#272944" />
              </View>
              <Text style={styles.actionItemLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp} activeOpacity={0.75}>
              <View style={[styles.actionCircle, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="logo-whatsapp" size={21} color="#16A34A" />
              </View>
              <Text style={styles.actionItemLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                WhatsApp
              </Text>
            </TouchableOpacity>

            {/* Dynamic Stage Action Buttons matching Web CRM 1:1 */}
            {(isFresh || isCallback) && (
              <>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setInterestedModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Ionicons name="thumbs-up" size={20} color="#16A34A" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#047857' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Interested
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setCallBackModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                    <Ionicons name="time" size={20} color="#EA580C" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#C2410C' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {isCallback ? 'Re-Call Back' : 'Call Back'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setNotInterestedModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#FEF2F2', borderColor: '#FECDD3' }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#B91C1C' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Not Int.
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isInterested && (
              <>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setCreateTaskModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#1D4ED8' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Create Task
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setRescheduleModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#EA580C" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#C2410C' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Re-Schedule
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => setLostModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionCircle, { backgroundColor: '#FEF2F2', borderColor: '#FECDD3' }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text
                    style={[styles.actionItemLabel, { color: '#B91C1C' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Lost
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

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
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                          <Text style={styles.taskTitleText}>
                            {act.title}
                          </Text>

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

                          {act.reason ? (
                            <View style={styles.activityReasonBadge}>
                              <Text style={styles.activityReasonBadgeText}>Reason: {act.reason}</Text>
                            </View>
                          ) : null}
                        </View>

                        {act.dueDate ? (
                          <View style={styles.dueDateRow}>
                            <Ionicons name="time-outline" size={12} color="#EA580C" />
                            <Text style={styles.dueDateText}>Due: {act.dueDate}</Text>
                          </View>
                        ) : null}
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
                </View>

                {dealsList.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Ionicons name="briefcase-outline" size={36} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No active deals created yet</Text>
                    <Text style={styles.emptySubtext}>
                      Convert this lead from the action bar to link a monetary pipeline deal.
                    </Text>
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
            {/* Sub-Tab Filter Pills (50/50 Split) */}
            <View style={styles.subTabRow}>
              <TouchableOpacity
                style={[styles.subTabPill, notesSubTab === 'notes' && styles.subTabPillSelected]}
                onPress={() => setNotesSubTab('notes')}
                activeOpacity={0.8}
              >
                <Text style={[styles.subTabPillText, notesSubTab === 'notes' && styles.subTabPillTextSelected]}>
                  Notes ({notesList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabPill, notesSubTab === 'attachments' && styles.subTabPillSelected]}
                onPress={() => setNotesSubTab('attachments')}
                activeOpacity={0.8}
              >
                <Text style={[styles.subTabPillText, notesSubTab === 'attachments' && styles.subTabPillTextSelected]}>
                  Attachments ({attachments.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notes List Card */}
            {notesSubTab === 'notes' && (
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
                      <Text style={styles.sectionActionText}>Add Note</Text>
                    </TouchableOpacity>
                  </View>

                  {notesList.length === 0 ? (
                    <Text style={styles.noItemsText}>No client notes recorded yet.</Text>
                  ) : (
                    <ScrollView
                      style={{ maxHeight: 320 }}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {notesList.map((n, idx) => (
                        <View key={idx} style={styles.noteItemCard}>
                          <Text style={styles.noteContentText}>{n.content}</Text>
                          <View style={styles.noteFooterRow}>
                            <Text style={styles.noteAuthorText}>
                              {n.author.includes('@') ? n.author : `By ${n.author}`}
                            </Text>
                            <Text style={styles.noteTimestampText}>
                              {new Date(n.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}

            {/* Resource Attachments Card */}
            {notesSubTab === 'attachments' && (
              <View style={styles.profileCard3D}>
                <View style={styles.cardInnerPadding}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                      <Ionicons name="attach-outline" size={16} color="#7C3AED" />
                      <Text style={styles.cardSectionTitle}>Resource Attachments</Text>
                    </View>
                  </View>

                  {/* 3 Action Buttons in full width row */}
                  <View style={styles.attachButtonsRow}>
                    <TouchableOpacity
                      style={styles.attachTypeBtn}
                      onPress={() => handleOpenAttachModal('photo')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image-outline" size={13} color="#16A34A" />
                      <Text style={styles.attachTypeBtnText}>Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.attachTypeBtn}
                      onPress={() => handleOpenAttachModal('video')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="videocam-outline" size={13} color="#9333EA" />
                      <Text style={styles.attachTypeBtnText}>Video</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.attachTypeBtn}
                      onPress={() => handleOpenAttachModal('file')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={13} color="#2563EB" />
                      <Text style={styles.attachTypeBtnText}>Document</Text>
                    </TouchableOpacity>
                  </View>

                  {attachments.length === 0 ? (
                    <View style={styles.emptyAttachmentsBox}>
                      <Ionicons name="cloud-upload-outline" size={40} color="#CBD5E1" />
                      <Text style={styles.emptyAttachText}>No Attachments uploaded yet.</Text>
                      <Text style={styles.emptyAttachSubtext}>Click Photo, Video, or Document above to upload.</Text>
                    </View>
                  ) : (
                    attachments.map((a: any, idx: number) => {
                      const attachId = a._id || a.id || String(idx);
                      const isPhoto = a.type === 'photo';
                      const isVideo = a.type === 'video';
                      return (
                        <View key={attachId} style={styles.attachmentCardRow}>
                          <View style={[styles.attachmentAvatar, isPhoto ? styles.avatarPhoto : isVideo ? styles.avatarVideo : styles.avatarDoc]}>
                            <Ionicons
                              name={isPhoto ? 'image-outline' : isVideo ? 'videocam-outline' : 'document-text-outline'}
                              size={18}
                              color="#FFFFFF"
                            />
                          </View>

                          <View style={styles.attachmentInfoGroup}>
                            <Text style={styles.attachmentTitleText} numberOfLines={1}>
                              {a.name || 'Attachment'}
                            </Text>
                            <Text style={styles.attachmentMetaText}>
                              {a.size ? `${(a.size / 1024 / 1024).toFixed(2)} MB • ` : ''}
                              {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : 'Uploaded'}
                            </Text>
                          </View>

                          <View style={styles.attachmentActionsGroup}>
                            {a.url ? (
                              <TouchableOpacity
                                style={styles.viewAttachBtn}
                                onPress={() => Linking.openURL(a.url).catch(() => Alert.alert('Error', 'Cannot open URL'))}
                              >
                                <Ionicons name="open-outline" size={14} color="#2563EB" />
                                <Text style={styles.viewAttachBtnText}>View</Text>
                              </TouchableOpacity>
                            ) : null}

                            <TouchableOpacity
                              style={styles.deleteAttachBtn}
                              onPress={() => handleDeleteAttachment(attachId)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── MODULAR COMPONENT MODALS (Matching Web CRM Structure 1:1) ─── */}
      <CallbackModal
        visible={callBackModalVisible}
        lead={lead}
        onClose={() => setCallBackModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'CALLBACK', status: 'CALLBACK' }));
          loadLeadDetails();
        }}
      />
      <NotInterestedModal
        visible={notInterestedModalVisible}
        lead={lead}
        onClose={() => setNotInterestedModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'NOT INTERESTED', status: 'NOT INTERESTED' }));
          loadLeadDetails();
        }}
      />
      <InterestedModal
        visible={interestedModalVisible}
        lead={lead}
        onClose={() => setInterestedModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'INTERESTED', status: 'INTERESTED' }));
          loadLeadDetails();
        }}
      />
      <ConvertLeadModal
        visible={dealModalVisible}
        lead={lead}
        onClose={() => setDealModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'CONVERTED', status: 'CONVERTED' }));
          loadLeadDetails();
        }}
      />
      <LostModal
        visible={lostModalVisible}
        lead={lead}
        onClose={() => setLostModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'LOST', status: 'LOST' }));
          loadLeadDetails();
        }}
      />
      <RescheduleModal
        visible={rescheduleModalVisible}
        lead={lead}
        onClose={() => setRescheduleModalVisible(false)}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, stage: 'INTERESTED', status: 'INTERESTED' }));
          loadLeadDetails();
        }}
      />
      <CreateTaskModal
        visible={createTaskModalVisible}
        lead={lead}
        tasksData={tasks}
        onClose={() => setCreateTaskModalVisible(false)}
        onSuccess={loadLeadDetails}
      />
      <LogCallModal
        visible={logCallModalVisible}
        lead={lead}
        onClose={() => setLogCallModalVisible(false)}
        onSuccess={loadLeadDetails}
      />
      <NotesModal
        visible={noteModalVisible}
        lead={lead}
        onClose={() => setNoteModalVisible(false)}
        onSuccess={loadLeadDetails}
      />
      <ChangeOwnerModal
        visible={changeOwnerModalVisible}
        lead={lead}
        onClose={() => setChangeOwnerModalVisible(false)}
        onSuccess={loadLeadDetails}
      />

      {/* ─── UPLOAD ATTACHMENT MODAL (Matching Web CRM 1:1) ─── */}
      <Modal visible={attachModalVisible} transparent animationType="slide" onRequestClose={() => setAttachModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle}>
                  Upload {attachType === 'photo' ? 'Photo' : attachType === 'video' ? 'Video' : 'Document'} Attachment
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>Attachment Title / Name</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={attachName}
                  onChangeText={setAttachName}
                  placeholder="e.g. Site Visit Photos, ID Proof, Agreement"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.modalInputLabel}>
                  Resource URL / File Link <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={attachUrl}
                  onChangeText={setAttachUrl}
                  placeholder="https://..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAttachModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleUploadAttachment}
                disabled={uploadingAttach}
              >
                {uploadingAttach ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Upload</Text>
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

      {/* Calendar Date Picker Modal for Interested Follow Up Date */}
      <CalendarDatePickerModal
        visible={showInterestedDatePicker}
        title="Select Interested Follow Up Date & Time"
        currentValue={interestedNextFollowUp}
        includeTime={true}
        onClose={() => setShowInterestedDatePicker(false)}
        onSelectDate={(formatted) => {
          setInterestedNextFollowUp(formatted);
        }}
      />

      {/* Dynamic Dropdown Options Picker Modal */}
      <Modal
        visible={pickerModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%', paddingBottom: 20 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select {pickerModal.fieldLabel}</Text>
                <Text style={styles.modalSubtitle}>{filteredPickerOptions.length} options available</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
                style={styles.modalCloseBtn}
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
              renderItem={({ item }) => {
                const isSelected = pickerModal.currentValue === item;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => {
                      if (pickerModal.setter) {
                        pickerModal.setter(item);
                      }
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
                      if (pickerModal.setter) {
                        pickerModal.setter(pickerSearch.trim());
                      }
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
      </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
    justifyContent: 'space-around',
    marginHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 4,
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
    paddingHorizontal: 1,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  actionItemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 12,
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
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    marginBottom: 12,
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
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
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
    color: '#2563EB',
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
    color: '#2563EB',
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
  chipOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  requiredStar: {
    color: '#EF4444',
  },
  modalTitleGroup: {
    flex: 1,
    paddingRight: 10,
  },

  /* SUB-TAB FILTER PILLS */
  subTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subTabPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  subTabPillSelected: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  subTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* RESOURCE ATTACHMENTS STYLES */
  attachButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  attachTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  attachTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  emptyAttachmentsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAttachText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptyAttachSubtext: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  attachmentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarPhoto: {
    backgroundColor: '#16A34A',
  },
  avatarVideo: {
    backgroundColor: '#9333EA',
  },
  avatarDoc: {
    backgroundColor: '#2563EB',
  },
  attachmentInfoGroup: {
    flex: 1,
    paddingRight: 8,
  },
  attachmentTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attachmentActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  viewAttachBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteAttachBtn: {
    padding: 6,
  },
  activityReasonBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityReasonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
});

