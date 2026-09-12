import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadService, LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { ChangeOwnerModal } from '../../components/leads/ChangeOwnerModal';
import { ConvertLeadModal } from '../../components/leads/ConvertLeadModal';
import { safeStorage } from '../../utils/safeStorage';
import { theme } from '../../theme/theme';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { openEmail } from '../../utils/emailHelper';

type PresetFilter = 'all' | 'my_leads' | 'due_today' | 'unassigned';
type SortOption = 'newest' | 'callback' | 'oldest' | 'name';

export const LeadsListScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const cacheKey = `@leads_cache_${user?.organizationId || (user as any)?.organization_id || 'default'}`;

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 1-Click Smart Quick View Pills (No duplicates with stages)
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('all');

  // Pipeline Stage Filter
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Sort State
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Multi-select & Bulk Operations State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReassignVisible, setBulkReassignVisible] = useState(false);

  // Convert to Deal Modal State
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<LeadItem | null>(null);

  // Post-Call Telephony Disposition State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

  const searchInputRef = useRef<TextInput>(null);

  // Debounce search input by 300ms for smooth 60fps typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus search if navigated with route params
  useEffect(() => {
    if (route?.params?.search) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [route?.params?.search]);

  // Sync stage filter when navigating from Analytics or external widgets
  useEffect(() => {
    const rawFilter = route?.params?.filter;
    const directStage = route?.params?.stage;
    const directAssociate = route?.params?.associate || (typeof rawFilter === 'object' ? rawFilter?.associate : null);

    if (directAssociate) {
      setSearchQuery(String(directAssociate));
    }

    const filterStr = directStage
      ? String(directStage).toLowerCase()
      : typeof rawFilter === 'object'
      ? String(rawFilter?.stage || rawFilter?.filter || '').toLowerCase()
      : String(rawFilter || '').toLowerCase();

    if (filterStr) {
      if (filterStr === 'all') setSelectedStatus('ALL');
      else if (filterStr.includes('fresh') || filterStr.includes('new') || filterStr.includes('applicant')) setSelectedStatus('Fresh');
      else if (filterStr.includes('callback') || filterStr.includes('call_back') || filterStr.includes('follow')) setSelectedStatus('Callbacks');
      else if (filterStr.includes('interested') && !filterStr.includes('not')) setSelectedStatus('Interested');
      else if (filterStr.includes('won') || filterStr.includes('converted') || filterStr.includes('deal')) setSelectedStatus(semantics.wonLabel || 'Converted');
      else if (filterStr.includes('lost') || filterStr.includes('notinterested') || filterStr.includes('not_interested')) setSelectedStatus('Lost');
    }
  }, [route?.params, semantics.wonLabel]);

  // ─── 0ms Instant Boot: Stale-While-Revalidate Caching ───
  useEffect(() => {
    let isMounted = true;
    const loadCachedLeads = async () => {
      try {
        const cached = await safeStorage.getItem(cacheKey);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        // Cache read error ignored
      }
    };
    loadCachedLeads();
    return () => {
      isMounted = false;
    };
  }, [cacheKey]);

  // Fetch Fresh Leads Data
  const fetchLeadsData = useCallback(async () => {
    try {
      const data = await leadService.getLeads();
      setLeads(data);
      safeStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.warn('[LeadsListScreen] Failed to load leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchLeadsData();
  }, [fetchLeadsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeadsData();
  };

  // ─── Capitalize Name Helper ───
  const capitalizeWords = (str?: string) => {
    if (!str || !str.trim()) return 'Lead';
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ─── Metrics Computation Synchronized with Web CRM ───
  const { filterCounts, stageCounts } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const myEmail = String(user?.email || '').toLowerCase().trim();
    const myUid = String(user?.id || user?._id || '').toLowerCase().trim();

    let myLeadsCount = 0;
    let dueTodayCount = 0;
    let unassignedCount = 0;

    let fresh = 0;
    let callbacks = 0;
    let interested = 0;
    let converted = 0;
    let lost = 0;

    leads.forEach((l) => {
      const st = (l.stage || l.status || '').toUpperCase().trim();
      const isDeal =
        Boolean(l.isConverted || l.is_converted || l.convertedToDeal) ||
        st.includes('DEAL') ||
        st.includes('WON') ||
        st.includes('BOOKED') ||
        st.includes('CONVERT');

      const isCallback =
        st.includes('CALLBACK') ||
        st.includes('RESCHEDULE') ||
        st.includes('CALL_BACK');

      const isInterested =
        (st.includes('INTEREST') && !st.includes('NOT')) ||
        st.includes('QUALIF') ||
        st.includes('VISIT');

      const isLost =
        st.includes('LOST') ||
        st.includes('NOT_INTEREST') ||
        st.includes('REFUSED');

      // Stage distributions
      if (isDeal) converted++;
      else if (isCallback) callbacks++;
      else if (isInterested) interested++;
      else if (isLost) lost++;
      else fresh++;

      // Preset filters metrics
      const ownerEmail = String(l.contactOwnerEmail || l.assignedTo || '').toLowerCase().trim();
      const ownerId = String(l.contactOwnerId || '').toLowerCase().trim();
      const creatorId = String(l.createdBy || '').toLowerCase().trim();

      if ((ownerEmail && ownerEmail === myEmail) || (myUid && (ownerId === myUid || creatorId === myUid))) {
        myLeadsCount++;
      }

      if (!ownerEmail && !ownerId) {
        unassignedCount++;
      }

      if (l.rawFollowUpDate) {
        const fDate = new Date(l.rawFollowUpDate);
        if (!isNaN(fDate.getTime()) && fDate.toISOString().split('T')[0] === todayStr) {
          dueTodayCount++;
        }
      }
    });

    return {
      filterCounts: {
        all: leads.length,
        myLeads: myLeadsCount,
        dueToday: dueTodayCount,
        unassigned: unassignedCount,
      },
      stageCounts: {
        total: leads.length,
        fresh,
        callbacks,
        interested,
        converted,
        lost,
      },
    };
  }, [leads, user]);

  // Pipeline Stage Tabs (Clean, non-duplicated labels)
  const statusFilters = useMemo(() => [
    { key: 'ALL', label: 'ALL', count: stageCounts.total },
    { key: 'Fresh', label: 'FRESH INBOUND', count: stageCounts.fresh },
    { key: 'Callbacks', label: 'CALLBACKS', count: stageCounts.callbacks },
    { key: 'Interested', label: 'INTERESTED', count: stageCounts.interested },
    { key: 'Converted', label: (semantics.wonLabel || 'DEALS / CONVERTED').toUpperCase(), count: stageCounts.converted },
    { key: 'Lost', label: 'LOST', count: stageCounts.lost },
  ], [stageCounts, semantics.wonLabel]);

  // ─── Filter & Sort Processing ───
  const filteredAndSortedLeads = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const myEmail = String(user?.email || '').toLowerCase().trim();
    const myUid = String(user?.id || user?._id || '').toLowerCase().trim();
    const q = debouncedSearch.toLowerCase().trim();

    // 1. Filter
    const filtered = leads.filter((l) => {
      const st = (l.stage || l.status || '').toUpperCase().trim();
      const isDeal =
        Boolean(l.isConverted || l.is_converted || l.convertedToDeal) ||
        st.includes('DEAL') ||
        st.includes('WON') ||
        st.includes('BOOKED') ||
        st.includes('CONVERT');

      const isCallback =
        st.includes('CALLBACK') ||
        st.includes('RESCHEDULE') ||
        st.includes('CALL_BACK');

      const isInterested =
        (st.includes('INTEREST') && !st.includes('NOT')) ||
        st.includes('QUALIF') ||
        st.includes('VISIT');

      const isLost =
        st.includes('LOST') ||
        st.includes('NOT_INTEREST') ||
        st.includes('REFUSED');

      // A. Stage Tab Filter
      if (selectedStatus === 'Converted' && !isDeal) return false;
      if (selectedStatus === 'Callbacks' && (isDeal || !isCallback)) return false;
      if (selectedStatus === 'Interested' && (isDeal || !isInterested)) return false;
      if (selectedStatus === 'Lost' && (isDeal || !isLost)) return false;
      if (selectedStatus === 'Fresh' && (isDeal || isCallback || isInterested || isLost)) return false;

      // B. 1-Click Smart Preset Filter Pills
      if (presetFilter === 'my_leads') {
        const ownerEmail = String(l.contactOwnerEmail || l.assignedTo || '').toLowerCase().trim();
        const ownerId = String(l.contactOwnerId || '').toLowerCase().trim();
        const creatorId = String(l.createdBy || '').toLowerCase().trim();
        const isMine = (ownerEmail && ownerEmail === myEmail) || (myUid && (ownerId === myUid || creatorId === myUid));
        if (!isMine) return false;
      }
      if (presetFilter === 'due_today') {
        if (!l.rawFollowUpDate) return false;
        const fDate = new Date(l.rawFollowUpDate);
        if (isNaN(fDate.getTime()) || fDate.toISOString().split('T')[0] !== todayStr) return false;
      }
      if (presetFilter === 'unassigned') {
        const ownerEmail = String(l.contactOwnerEmail || l.assignedTo || '').trim();
        const ownerId = String(l.contactOwnerId || '').trim();
        if (ownerEmail || ownerId) return false;
      }

      // C. Search Query Filter (Matching multiple fields)
      if (q) {
        const nameMatch = l.name && l.name.toLowerCase().includes(q);
        const phoneMatch = l.phone && l.phone.includes(q);
        const altPhoneMatch = l.alternateNo && l.alternateNo.includes(q);
        const emailMatch = l.email && l.email.toLowerCase().includes(q);
        const projectMatch = (l.project || l.projectName) && (l.project || l.projectName)?.toLowerCase().includes(q);
        const locMatch = l.location && l.location.toLowerCase().includes(q);
        const sourceMatch = l.source && l.source.toLowerCase().includes(q);
        const ownerMatch = (l.contactOwnerEmail || l.assignedTo || l.contactOwnerName) && (l.contactOwnerEmail || l.assignedTo || l.contactOwnerName)?.toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !altPhoneMatch && !emailMatch && !projectMatch && !locMatch && !sourceMatch && !ownerMatch) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      if (selectedSort === 'newest') {
        const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
        const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (selectedSort === 'oldest') {
        const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
        const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
        return timeA - timeB;
      }
      if (selectedSort === 'callback') {
        const timeA = a.rawFollowUpDate ? new Date(a.rawFollowUpDate).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.rawFollowUpDate ? new Date(b.rawFollowUpDate).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      }
      if (selectedSort === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [leads, selectedStatus, presetFilter, debouncedSearch, selectedSort, user]);

  // ─── Multi-Select Helpers ───
  const toggleLeadSelection = (id: string) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedLeads.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(filteredAndSortedLeads.map((l) => l.id));
      setIsSelectionMode(true);
    }
  };

  const handleBulkCopy = async () => {
    const selectedList = leads.filter((l) => selectedIds.includes(l.id));
    if (selectedList.length === 0) return;

    let text = `📋 *${semantics.leadEntityPlural} Export (${selectedList.length} Selected)*\n\n`;
    selectedList.forEach((lead, index) => {
      text += `*${index + 1}. ${capitalizeWords(lead.name)}*\n`;
      if (lead.phone) text += `• Phone: ${lead.phone}\n`;
      if (lead.email) text += `• Email: ${lead.email}\n`;
      if (lead.project || lead.projectName) text += `• Project: ${lead.project || lead.projectName}\n`;
      text += `• Stage: ${lead.stage || lead.status || 'Fresh'}\n`;
      if (lead.createdAtFull || lead.createdAt) text += `• Punch Time: ${lead.createdAtFull || lead.createdAt}\n`;
      if (lead.nextFollowUpDateTime) text += `• Callback: ${lead.nextFollowUpDateTime}\n`;
      text += `\n`;
    });

    try {
      await Share.share({ message: text.trim(), title: `${selectedList.length} Leads Export` });
    } catch (err) {
      console.warn('Bulk share error:', err);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Confirm Deletion',
      `Delete ${selectedIds.length} selected ${semantics.leadEntityPlural.toLowerCase()} permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await leadService.bulkDeleteLeads(selectedIds);
            if (success) {
              Alert.alert('Deleted', `${selectedIds.length} leads deleted successfully.`);
              setSelectedIds([]);
              setIsSelectionMode(false);
              fetchLeadsData();
            } else {
              Alert.alert('Error', 'Failed to delete selected leads.');
            }
          },
        },
      ]
    );
  };

  // ─── Direct Lead Actions ───
  const handleCall = (targetLead: LeadItem) => {
    const phone = targetLead.phone || targetLead.contactNo;
    if (!phone) {
      Alert.alert('No Phone Number', 'No contact number available for this buyer.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      console.log(`[Telephony] Native dialer not available on simulator for ${phone}`);
    });

    setActiveCaller({
      contactId: targetLead.id,
      leadId: targetLead.id,
      customerName: capitalizeWords(targetLead.name) || 'Buyer Contact',
      phone: phone,
      project: targetLead.project || targetLead.projectName || '',
      stage: targetLead.stage || targetLead.status || '',
    });

    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1000);
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    const message = `Hello ${capitalizeWords(name) || 'Sir/Madam'}, thank you for contacting ${user?.organizationName || 'Leads Rubix'}. How can I assist you today?`;
    openWhatsApp(phone, message);
  };

  const handleEmail = (email?: string, name?: string) => {
    const subject = `Regarding your inquiry with ${user?.organizationName || 'Leads Rubix'}`;
    const body = `Hello ${capitalizeWords(name) || 'Sir/Madam'},\n\nThank you for reaching out to ${user?.organizationName || 'Leads Rubix'}. How can we assist you with your inquiry today?\n\nBest regards,\n${user?.name || 'Sales Team'}`;
    openEmail(email, subject, body);
  };

  const handleOpenConvertModal = (targetLead: LeadItem) => {
    setSelectedLeadForConvert(targetLead);
    setConvertModalVisible(true);
  };

  // ─── Helpers for SLA Urgency & Overdue Callbacks ───
  const getSLAUrgency = (lead: LeadItem) => {
    if (lead.isConverted) {
      return { label: 'DEAL WON', bg: '#ECFDF5', text: '#059669', icon: 'trophy' as const };
    }
    if (lead.lastContactedAt || (lead.stage && lead.stage.toUpperCase() !== 'FRESH')) {
      return { label: 'Responded', bg: '#F0FDF4', text: '#16A34A', icon: 'checkmark-circle' as const };
    }
    if (!lead.rawCreatedAt) return null;
    const elapsedMin = Math.floor((Date.now() - new Date(lead.rawCreatedAt).getTime()) / 60000);
    if (elapsedMin < 0) return null;

    if (elapsedMin < 15) {
      return { label: '< 15m Urgent', bg: '#FEF2F2', text: '#DC2626', icon: 'flame' as const };
    }
    if (elapsedMin < 120) {
      return { label: `${Math.round(elapsedMin / 60)}h ago`, bg: '#FFFBEB', text: '#D97706', icon: 'time' as const };
    }
    const days = Math.floor(elapsedMin / 1440);
    return {
      label: days > 0 ? `${days}d waiting` : `${Math.floor(elapsedMin / 60)}h waiting`,
      bg: '#F8FAFC',
      text: '#64748B',
      icon: 'hourglass-outline' as const,
    };
  };

  const getCallbackMeta = (lead: LeadItem) => {
    if (!lead.rawFollowUpDate) return null;
    const fd = new Date(lead.rawFollowUpDate);
    if (isNaN(fd.getTime())) return null;

    const now = Date.now();
    const isPast = fd.getTime() < now;
    const isToday = fd.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
    const timeStr = fd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isPast && !isToday) {
      const diffHours = Math.round((now - fd.getTime()) / 3600000);
      const label = diffHours > 24 ? `${Math.floor(diffHours / 24)}d overdue` : `${diffHours}h overdue`;
      return {
        text: `⚠️ Callback Overdue (${label})`,
        bg: '#FEF2F2',
        border: '#FECDD3',
        textCol: '#DC2626',
        icon: 'alert-circle' as const,
      };
    }
    if (isToday) {
      return {
        text: `⏰ Callback Due Today • ${timeStr}`,
        bg: '#FFFBEB',
        border: '#FDE68A',
        textCol: '#B45309',
        icon: 'alarm-outline' as const,
      };
    }
    return {
      text: `📅 Scheduled: ${fd.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${timeStr}`,
      bg: '#F1F5F9',
      border: '#E2E8F0',
      textCol: '#475569',
      icon: 'calendar-outline' as const,
    };
  };

  const getStageMeta = (status: string, isConverted?: boolean) => {
    const st = (status || '').toUpperCase().trim();
    if (isConverted || st.includes('DEAL') || st.includes('WON') || st.includes('BOOKED') || st.includes('CONVERT')) {
      return {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#047857',
        avatarBg: '#D1FAE5',
        avatarText: '#047857',
        dot: '#10B981',
        label: (semantics.wonLabel || 'DEAL WON').toUpperCase(),
      };
    }
    if (st.includes('CALLBACK') || st.includes('RESCHEDULE') || st.includes('CALL_BACK')) {
      return {
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#B45309',
        avatarBg: '#FEF3C7',
        avatarText: '#B45309',
        dot: '#F59E0B',
        label: 'CALLBACK',
      };
    }
    if ((st.includes('INTEREST') && !st.includes('NOT')) || st.includes('QUALIF') || st.includes('VISIT')) {
      return {
        bg: '#F5F3FF',
        border: '#DDD6FE',
        text: '#6D28D9',
        avatarBg: '#EDE9FE',
        avatarText: '#6D28D9',
        dot: '#8B5CF6',
        label: 'INTERESTED',
      };
    }
    if (st.includes('LOST') || st.includes('NOT_INTEREST') || st.includes('REFUSED')) {
      return {
        bg: '#FFF1F2',
        border: '#FECDD3',
        text: '#BE123C',
        avatarBg: '#FFE4E6',
        avatarText: '#BE123C',
        dot: '#F43F5E',
        label: 'LOST',
      };
    }
    return {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      avatarBg: '#DBEAFE',
      avatarText: '#1D4ED8',
      dot: '#3B82F6',
      label: (semantics.freshLabel.split(' ')[0] || 'FRESH').toUpperCase(),
    };
  };

  const formatSource = (src?: string) => {
    if (!src) return 'Direct';
    const s = src.toLowerCase();
    if (s.includes('facebook') || s.includes('fb')) return 'Facebook';
    if (s.includes('google')) return 'Google';
    if (s.includes('website') || s.includes('web')) return 'Website';
    if (s.includes('instagram') || s.includes('insta')) return 'Instagram';
    if (s.includes('self')) return 'Self Gen';
    if (s.includes('walk')) return 'Walk-in';
    if (s.includes('referral') || s.includes('refer')) return 'Referral';
    return src.length > 10 ? src.substring(0, 9) + '..' : src;
  };

  // ─── Render Lead Item Card ───
  const renderLeadCard = ({ item: lead }: { item: LeadItem }) => {
    const meta = getStageMeta(lead.stage || lead.status, lead.isConverted);
    const sla = getSLAUrgency(lead);
    const callbackMeta = getCallbackMeta(lead);
    const isSelected = selectedIds.includes(lead.id);
    const inqCount = lead.inquiryCount || 1;

    // Requirement: only show if meaningful (do not show generic "Leads" or "Data")
    const rawReq = lead.project || lead.projectName || lead.propertyType || '';
    const isMeaningfulReq = rawReq && rawReq.toLowerCase() !== 'leads' && rawReq.toLowerCase() !== 'data';
    const requirement = isMeaningfulReq ? rawReq : '';

    // Owner display resolution
    const myEmail = String(user?.email || '').toLowerCase();
    const leadOwnerEmail = String(lead.contactOwnerEmail || lead.assignedTo || '').toLowerCase();
    let ownerDisplay = 'Unassigned';
    if (lead.contactOwnerName) {
      ownerDisplay = lead.contactOwnerName;
    } else if (leadOwnerEmail) {
      ownerDisplay = leadOwnerEmail === myEmail ? 'You' : capitalizeWords(leadOwnerEmail.split('@')[0]);
    }

    return (
      <TouchableOpacity
        style={[styles.leadCardContainer, isSelected && styles.leadCardSelected]}
        onPress={() => {
          if (isSelectionMode) {
            toggleLeadSelection(lead.id);
          } else {
            navigation.navigate('LeadDetail', { leadId: lead.id, lead });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
          }
          toggleLeadSelection(lead.id);
        }}
        activeOpacity={0.88}
      >
        <View style={styles.cardInnerLayout}>
          {/* Checkbox (Inside the card smoothly) */}
          {isSelectionMode && (
            <TouchableOpacity
              style={styles.inlineCheckbox}
              onPress={() => toggleLeadSelection(lead.id)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? '#0284C7' : '#94A3B8'}
              />
            </TouchableOpacity>
          )}

          <View style={styles.cardContentBody}>
            {/* Top Row: Avatar Initials, Name, Repeat Pill, Source, SLA, Stage Pill */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarPill, { backgroundColor: meta.avatarBg }]}>
                <Text style={[styles.avatarInitials, { color: meta.avatarText }]}>
                  {(lead.name || 'IN').substring(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.nameGroup}>
                <View style={styles.nameWithBadgesRow}>
                  <Text style={styles.leadNameText} numberOfLines={1}>
                    {capitalizeWords(lead.name)}
                  </Text>
                  {inqCount > 1 && (
                    <View style={styles.repeatBadge}>
                      <Ionicons name="repeat" size={10} color="#7C3AED" />
                      <Text style={styles.repeatBadgeText}>{inqCount} Inq</Text>
                    </View>
                  )}
                </View>

                {/* Micro Meta: Source + SLA Urgency */}
                <View style={styles.microMetaRow}>
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipText}>{formatSource(lead.source)}</Text>
                  </View>
                  {sla && (
                    <View style={[styles.slaBadge, { backgroundColor: sla.bg }]}>
                      <Ionicons name={sla.icon} size={10} color={sla.text} />
                      <Text style={[styles.slaBadgeText, { color: sla.text }]}>{sla.label}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stage Pill */}
              <View style={[styles.stageBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <View style={[styles.stageDot, { backgroundColor: meta.dot }]} />
                <Text style={[styles.stageBadgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
            </View>

            {/* Middle Row: Phone & Email */}
            <View style={styles.contactDetailsRow}>
              {lead.phone ? (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleCall(lead)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={12} color="#272944" />
                  <Text style={styles.phoneText}>{lead.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {lead.email ? (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleEmail(lead.email, lead.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail" size={12} color="#64748B" />
                  <Text style={styles.emailText} numberOfLines={1}>{lead.email}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Requirement / Project & Budget Chips (Cleaned: no empty "Leads" label) */}
            {(requirement || lead.budget) ? (
              <View style={styles.requirementRow}>
                {requirement ? (
                  <View style={styles.requirementChip}>
                    <Ionicons name="business-outline" size={11} color="#0284C7" />
                    <Text style={styles.requirementChipText} numberOfLines={1}>
                      {requirement}
                    </Text>
                  </View>
                ) : null}

                {lead.budget ? (
                  <View style={styles.budgetChip}>
                    <Text style={styles.budgetChipText}>{lead.budget}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Scheduled Callback Alert Pill (Overdue or Due Today) */}
            {callbackMeta && (
              <View
                style={[
                  styles.callbackAlertPill,
                  { backgroundColor: callbackMeta.bg, borderColor: callbackMeta.border },
                ]}
              >
                <Ionicons name={callbackMeta.icon} size={12} color={callbackMeta.textCol} />
                <Text style={[styles.callbackAlertText, { color: callbackMeta.textCol }]}>
                  {callbackMeta.text}
                </Text>
              </View>
            )}

            {/* Bottom Meta & 1-Tap Action Cockpit */}
            <View style={styles.cardFooterRow}>
              <View style={styles.footerMetaGroup}>
                <Text style={styles.punchTimeText}>
                  Punch: {lead.createdAt || 'Recently'}
                </Text>
                <View style={styles.ownerPill}>
                  <Ionicons
                    name="person-outline"
                    size={10.5}
                    color={ownerDisplay !== 'Unassigned' ? '#475569' : '#DC2626'}
                  />
                  <Text
                    style={[
                      styles.ownerPillText,
                      ownerDisplay === 'Unassigned' && { color: '#DC2626', fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {ownerDisplay === 'Unassigned' ? 'Unassigned' : `Assigned: ${ownerDisplay}`}
                  </Text>
                </View>
              </View>

              {/* 1-Tap Uniform Circular Action Cockpit */}
              <View style={styles.actionCockpit}>
                {/* Convert to Deal Button */}
                {!lead.isConverted && (
                  <TouchableOpacity
                    style={styles.circleActionBtnDeal}
                    onPress={() => handleOpenConvertModal(lead)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trophy" size={14} color="#059669" />
                  </TouchableOpacity>
                )}

                {lead.phone ? (
                  <TouchableOpacity
                    style={styles.circleActionBtnCall}
                    onPress={() => handleCall(lead)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}

                {lead.phone ? (
                  <TouchableOpacity
                    style={styles.circleActionBtnWhatsApp}
                    onPress={() => handleWhatsApp(lead.phone, lead.name)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.circleActionBtnShare}
                  onPress={() => {
                    const text = `📌 *${semantics.leadEntitySingular}: ${capitalizeWords(lead.name)}*\n• Phone: ${lead.phone || 'N/A'}\n• Requirement: ${requirement || 'N/A'}\n• Stage: ${lead.stage || 'Fresh'}\n• Owner: ${ownerDisplay}`;
                    Share.share({ message: text });
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="share-social-outline" size={14} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Contextual Empty State ───
  const renderEmptyState = () => {
    let title = 'Pipeline is Clear';
    let subtitle = `No ${semantics.leadEntityPlural.toLowerCase()} in ${selectedStatus} stage.`;
    let iconName = 'checkmark-done-circle-outline';
    let iconColor = '#059669';

    if (debouncedSearch) {
      title = 'No Results Found';
      subtitle = `No leads match "${debouncedSearch}". Try checking keywords.`;
      iconName = 'search-outline';
      iconColor = '#64748B';
    } else if (presetFilter === 'due_today') {
      title = 'All Caught Up!';
      subtitle = 'No scheduled follow-ups or callbacks due today.';
      iconName = 'alarm-outline';
      iconColor = '#F59E0B';
    } else if (presetFilter === 'unassigned') {
      title = 'Unassigned Pool Empty';
      subtitle = 'All leads are currently assigned to sales agents.';
      iconName = 'people-outline';
      iconColor = '#10B981';
    } else if (presetFilter === 'my_leads') {
      title = 'No Active Leads';
      subtitle = 'You currently have no active leads assigned to your account.';
      iconName = 'person-outline';
      iconColor = '#6366F1';
    }

    return (
      <View style={styles.emptyCardContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName as any} size={32} color={iconColor} />
        </View>
        <Text style={styles.emptyTitleText}>{title}</Text>
        <Text style={styles.emptySubtitleText}>{subtitle}</Text>
        <TouchableOpacity
          style={styles.emptyCreateBtn}
          onPress={() => navigation.navigate('LeadForm')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.emptyCreateBtnText}>Create New {semantics.leadEntitySingular}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isAllSelected = filteredAndSortedLeads.length > 0 && selectedIds.length === filteredAndSortedLeads.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#272944" />

      {/* ─── Hero Luxury Header (Executive #272944 Navy) ─── */}
      <View style={styles.luxuryHeader}>
        {isSelectionMode ? (
          <View style={styles.headerSelectionRow}>
            {/* Left: Close button + Selection Count Pill */}
            <View style={styles.headerSelectionLeft}>
              <TouchableOpacity
                style={styles.headerCloseBtn}
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleSelectAll}
                style={[
                  styles.headerSelectionCountPill,
                  isAllSelected && styles.headerSelectionCountPillAll,
                ]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={
                    isAllSelected
                      ? 'checkmark-circle'
                      : selectedIds.length > 0
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={15}
                  color={selectedIds.length > 0 ? '#38BDF8' : '#94A3B8'}
                />
                <Text style={styles.headerSelectionCountText}>
                  {isAllSelected
                    ? `All (${selectedIds.length})`
                    : `${selectedIds.length} Selected`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right: Unified Action Buttons */}
            <View style={styles.headerSelectionActions}>
              <TouchableOpacity
                style={[styles.headerActionBtn, selectedIds.length === 0 && styles.headerBtnDisabled]}
                onPress={handleBulkCopy}
                disabled={selectedIds.length === 0}
                activeOpacity={0.75}
              >
                <Ionicons name="copy-outline" size={13} color="#E2E8F0" />
                <Text style={styles.headerActionBtnText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerActionBtnReassign, selectedIds.length === 0 && styles.headerBtnDisabled]}
                onPress={() => setBulkReassignVisible(true)}
                disabled={selectedIds.length === 0}
                activeOpacity={0.8}
              >
                <Ionicons name="people" size={13} color="#FFFFFF" />
                <Text style={styles.headerActionBtnTextReassign}>Reassign</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerActionBtnDelete, selectedIds.length === 0 && styles.headerBtnDisabled]}
                onPress={handleBulkDelete}
                disabled={selectedIds.length === 0}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={14} color="#F87171" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.headerTopRow}>
            <CompanyLogo variant="white" height={28} />

            <TouchableOpacity
              style={styles.selectLeadsBtn}
              onPress={() => {
                setIsSelectionMode(true);
                if (filteredAndSortedLeads.length > 0 && selectedIds.length === 0) {
                  setSelectedIds([filteredAndSortedLeads[0].id]);
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkbox-outline" size={15} color="#FFFFFF" />
              <Text style={styles.selectLeadsBtnText}>Select</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar (High-Contrast White Card) */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search" size={16} color="#64748B" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInputControl}
            placeholder={`Search by name, phone, project...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── Smart Quick View Pills (Row 1: Compact, Non-duplicated) ─── */}
      <View style={styles.presetFilterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetFilterScroll}
        >
          <TouchableOpacity
            style={[styles.presetPill, presetFilter === 'all' && styles.presetPillActive]}
            onPress={() => setPresetFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.presetPillText, presetFilter === 'all' && styles.presetPillTextActive]}>
              All Leads ({filterCounts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetPill, presetFilter === 'my_leads' && styles.presetPillActive]}
            onPress={() => setPresetFilter('my_leads')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="star"
              size={11.5}
              color={presetFilter === 'my_leads' ? '#FFFFFF' : '#F59E0B'}
            />
            <Text style={[styles.presetPillText, presetFilter === 'my_leads' && styles.presetPillTextActive]}>
              My Leads ({filterCounts.myLeads})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.presetPill,
              presetFilter === 'due_today' && styles.presetPillActiveAmber,
            ]}
            onPress={() => setPresetFilter('due_today')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="alarm"
              size={11.5}
              color={presetFilter === 'due_today' ? '#FFFFFF' : '#D97706'}
            />
            <Text
              style={[
                styles.presetPillText,
                presetFilter === 'due_today' && styles.presetPillTextActive,
              ]}
            >
              Due Today ({filterCounts.dueToday})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.presetPill,
              presetFilter === 'unassigned' && styles.presetPillActivePurple,
            ]}
            onPress={() => setPresetFilter('unassigned')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-outline"
              size={11.5}
              color={presetFilter === 'unassigned' ? '#FFFFFF' : '#7C3AED'}
            />
            <Text
              style={[
                styles.presetPillText,
                presetFilter === 'unassigned' && styles.presetPillTextActive,
              ]}
            >
              Unassigned ({filterCounts.unassigned})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── Pipeline Stage Tabs (Row 2: ALL | FRESH INBOUND | CALLBACKS | INTERESTED | DEALS | LOST) ─── */}
      <View style={styles.stageTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageTabsScroll}
        >
          {statusFilters.map((tab) => {
            const isSelected = selectedStatus.toLowerCase() === tab.key.toLowerCase();
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.stageChip, isSelected && styles.stageChipSelected]}
                onPress={() => setSelectedStatus(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.stageChipText, isSelected && styles.stageChipTextSelected]}>
                  {tab.label}
                </Text>
                <View style={[styles.stageBadgeCircle, isSelected && styles.stageBadgeCircleSelected]}>
                  <Text style={[styles.stageBadgeCircleText, isSelected && styles.stageBadgeCircleTextSelected]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Results Summary Bar + Sort Selector (Compact) ─── */}
      <View style={styles.summarySortBar}>
        <Text style={styles.resultsCountText}>
          Showing <Text style={{ fontWeight: '700', color: '#0F172A' }}>{filteredAndSortedLeads.length}</Text> {semantics.leadEntityPlural.toLowerCase()}
        </Text>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical" size={13} color="#272944" />
          <Text style={styles.sortButtonText}>
            {selectedSort === 'newest'
              ? 'Newest'
              : selectedSort === 'callback'
              ? 'Callback Due'
              : selectedSort === 'oldest'
              ? 'Oldest'
              : 'Name (A-Z)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Virtualized FlatList (60 FPS Performance) ─── */}
      {loading && leads.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#272944" />
          <Text style={styles.loadingText}>Fetching {semantics.leadEntityPlural.toLowerCase()}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedLeads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand700}
            />
          }
        />
      )}

      {/* ─── Sort Selector Modal ─── */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sortModalBackdrop}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortModalSheet}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort {semantics.leadEntityPlural}</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sortOptionRow, selectedSort === 'newest' && styles.sortOptionActive]}
              onPress={() => {
                setSelectedSort('newest');
                setSortModalVisible(false);
              }}
            >
              <View style={styles.sortOptionLabelGroup}>
                <Ionicons name="time" size={18} color={selectedSort === 'newest' ? '#272944' : '#64748B'} />
                <Text style={[styles.sortOptionText, selectedSort === 'newest' && styles.sortOptionTextActive]}>
                  Newest First (Punch Date)
                </Text>
              </View>
              {selectedSort === 'newest' && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOptionRow, selectedSort === 'callback' && styles.sortOptionActive]}
              onPress={() => {
                setSelectedSort('callback');
                setSortModalVisible(false);
              }}
            >
              <View style={styles.sortOptionLabelGroup}>
                <Ionicons name="alarm" size={18} color={selectedSort === 'callback' ? '#272944' : '#64748B'} />
                <Text style={[styles.sortOptionText, selectedSort === 'callback' && styles.sortOptionTextActive]}>
                  Callback Due Soonest (Urgent)
                </Text>
              </View>
              {selectedSort === 'callback' && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOptionRow, selectedSort === 'oldest' && styles.sortOptionActive]}
              onPress={() => {
                setSelectedSort('oldest');
                setSortModalVisible(false);
              }}
            >
              <View style={styles.sortOptionLabelGroup}>
                <Ionicons name="hourglass-outline" size={18} color={selectedSort === 'oldest' ? '#272944' : '#64748B'} />
                <Text style={[styles.sortOptionText, selectedSort === 'oldest' && styles.sortOptionTextActive]}>
                  Oldest First
                </Text>
              </View>
              {selectedSort === 'oldest' && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOptionRow, selectedSort === 'name' && styles.sortOptionActive]}
              onPress={() => {
                setSelectedSort('name');
                setSortModalVisible(false);
              }}
            >
              <View style={styles.sortOptionLabelGroup}>
                <Ionicons name="text-outline" size={18} color={selectedSort === 'name' ? '#272944' : '#64748B'} />
                <Text style={[styles.sortOptionText, selectedSort === 'name' && styles.sortOptionTextActive]}>
                  Lead Name (A to Z)
                </Text>
              </View>
              {selectedSort === 'name' && <Ionicons name="checkmark-sharp" size={18} color="#272944" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Bulk Reassign Modal ─── */}
      <ChangeOwnerModal
        visible={bulkReassignVisible}
        leadIds={selectedIds}
        onClose={() => setBulkReassignVisible(false)}
        onSuccess={() => {
          setSelectedIds([]);
          setIsSelectionMode(false);
          fetchLeadsData();
        }}
      />

      {/* ─── Floating Action Button (FAB) for 1-Thumb Quick Lead Creation ─── */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.floatingActionBtn}
          onPress={() => navigation.navigate('LeadForm')}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ─── 1-Tap Convert to Deal Modal ─── */}
      {selectedLeadForConvert && (
        <ConvertLeadModal
          visible={convertModalVisible}
          lead={selectedLeadForConvert}
          onClose={() => {
            setConvertModalVisible(false);
            setSelectedLeadForConvert(null);
          }}
          onSuccess={() => {
            fetchLeadsData();
          }}
        />
      )}

      {/* ─── Post-Call Telephony Disposition Modal ─── */}
      <PostCallDispositionModal
        visible={postCallModalVisible}
        onClose={() => {
          setPostCallModalVisible(false);
          setActiveCaller(null);
        }}
        caller={activeCaller}
        onSuccess={() => {
          fetchLeadsData();
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
  // ─── Zone 1: Executive #272944 Navy Header ───
  luxuryHeader: {
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  selectLeadsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  selectLeadsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addLeadBtnText: {
    color: '#272944',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputControl: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },

  // ─── Zone 2: 1-Click Smart Quick View Pills ───
  presetFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  presetFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5.5,
  },
  presetPillActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
    shadowColor: '#272944',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  presetPillActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  presetPillActivePurple: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  presetPillTextActive: {
    color: '#FFFFFF',
  },

  // ─── Zone 3: Pipeline Stage Tabs ───
  stageTabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stageTabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5.5,
  },
  stageChipSelected: {
    backgroundColor: '#272944',
    borderColor: '#272944',
    shadowColor: '#272944',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  stageChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  stageChipTextSelected: {
    color: '#FFFFFF',
  },
  stageBadgeCircle: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5.5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  stageBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  stageBadgeCircleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  stageBadgeCircleTextSelected: {
    color: '#FFFFFF',
  },

  // ─── Zone 4: Results Summary & Sort Bar ───
  summarySortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.15)',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#272944',
  },

  // ─── Zone 5: Virtualized Lead Cards ───
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  leadCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  leadCardSelected: {
    borderColor: '#0284C7',
    borderWidth: 1.5,
    backgroundColor: '#F0F7FF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInnerLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inlineCheckbox: {
    paddingRight: 10,
    alignSelf: 'flex-start',
    paddingTop: 5,
    justifyContent: 'center',
  },
  cardContentBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  avatarInitials: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  nameGroup: {
    flex: 1,
  },
  nameWithBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 2.5,
  },
  repeatBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C3AED',
  },
  microMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sourceChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  slaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 5,
    gap: 3,
  },
  slaBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3.5,
    marginLeft: 6,
  },
  stageDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  stageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Contact items
  contactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  phoneText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#272944',
  },
  emailText: {
    fontSize: 11,
    color: '#64748B',
    maxWidth: 160,
    flexShrink: 1,
  },

  // Requirement row
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  requirementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 3.5,
    maxWidth: '75%',
  },
  requirementChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0369A1',
  },
  budgetChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  budgetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },

  // Callback Alert Pill
  callbackAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    gap: 4,
    marginTop: 6,
  },
  callbackAlertText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Bottom Footer & Action Cockpit
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  footerMetaGroup: {
    flex: 1,
  },
  punchTimeText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1.5,
  },
  ownerPillText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
    maxWidth: 120,
    flexShrink: 1,
  },

  // 1-Tap Uniform 32x32 Circular Cockpit
  actionCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  circleActionBtnDeal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  circleActionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  circleActionBtnWhatsApp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  circleActionBtnShare: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Floating Action Button (FAB) ───
  floatingActionBtn: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 92 : 80,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ─── Loading & Empty States ───
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  emptySubtitleText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272944',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ─── Contextual Top Selection Header (Gmail / HubSpot Standard) ───
  headerSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerSelectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSelectionCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerSelectionCountPillAll: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  headerSelectionCountText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  headerSelectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  headerActionBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActionBtnReassign: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    backgroundColor: '#0284C7',
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 3.5,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActionBtnTextReassign: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActionBtnDelete: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  headerBtnDisabled: {
    opacity: 0.35,
  },

  // ─── Sort Modal Bottom Sheet ───
  sortModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sortModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 5,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
  },
  sortOptionLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sortOptionTextActive: {
    color: '#272944',
    fontWeight: '700',
  },
});
