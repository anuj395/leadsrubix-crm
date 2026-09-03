import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { callLogService, CallLogItem } from '../../services/callLogService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { getIndustrySemantics, getIndustryCallOutcomePresets, CallOutcomePreset } from '../../utils/industryLabels';

type FilterType = 'ALL' | 'ANSWERED' | 'MISSED' | 'INBOUND' | 'OUTBOUND';

interface CallLogsScreenProps {
  navigation?: any;
}

export const CallLogsScreen: React.FC<CallLogsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const semantics = useMemo(() => getIndustrySemantics(user?.industryId), [user?.industryId]);
  const outcomePresets = useMemo(() => getIndustryCallOutcomePresets(user?.industryId), [user?.industryId]);

  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');

  // Auto Post-Call Outcome Modal State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCallBuyer, setActiveCallBuyer] = useState<{ name: string; phone: string; project: string } | null>(null);

  const fetchCallLogs = useCallback(async () => {
    try {
      setLoading(true);
      const userAny = user as any;
      const data = await callLogService.getCallLogs(userAny?.id || userAny?._id, user?.role);
      setCallLogs(data);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCallLogs();
  };

  // Trigger Phone Dialer & Open Auto Post-Call Outcome Popup
  const handleInitiateCall = (buyerName: string, phone: string, project: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This contact does not have a valid phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to launch phone dialer.');
    });
    setActiveCallBuyer({ name: buyerName, phone, project });

    // Open Auto Post-Call Outcome Overlay after slight delay
    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1200);
  };

  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'No WhatsApp number available for this contact.');
      return;
    }
    const clean = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${name || 'Sir/Madam'}, thank you for contacting ${user?.organizationName || 'Leads Rubix'}. How can I assist you today?`
    );
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${message}`).catch(() => {
      Alert.alert('WhatsApp Not Installed', 'Please verify WhatsApp is installed on this device.');
    });
  };

  const handleSelectOutcome = (preset: CallOutcomePreset) => {
    if (!activeCallBuyer) return;

    const newLog: CallLogItem = {
      id: Date.now().toString(),
      buyerName: activeCallBuyer.name,
      phone: activeCallBuyer.phone,
      project: activeCallBuyer.project,
      type: 'Outbound',
      duration: '1m 30s',
      timestamp: 'Just now',
      outcome: preset.label,
      status: preset.label,
      badgeColor: preset.badgeColor,
      bgColor: preset.bgColor,
    };

    setCallLogs((prev) => [newLog, ...prev]);
    setPostCallModalVisible(false);
    setActiveCallBuyer(null);

    Alert.alert('Call Outcome Logged', `Recorded outcome: ${preset.label}`);
  };

  // Compute exact Web CRM counts
  const stats = useMemo(() => {
    const total = callLogs.length;
    const answered = callLogs.filter(
      (l) =>
        (l.status || l.outcome || '').toLowerCase() === 'answered' ||
        (l.status || l.outcome || '').toLowerCase().includes('site') ||
        (l.status || l.outcome || '').toLowerCase().includes('won') ||
        (l.status || l.outcome || '').toLowerCase().includes('sent') ||
        (l.status || l.outcome || '').toLowerCase().includes('consult') ||
        (l.status || l.outcome || '').toLowerCase().includes('booked')
    ).length;
    const missed = callLogs.filter(
      (l) =>
        (l.status || l.outcome || '').toLowerCase() === 'missed' ||
        (l.status || l.outcome || '').toLowerCase().includes('no answer') ||
        (l.status || l.outcome || '').toLowerCase().includes('lost') ||
        (l.status || l.outcome || '').toLowerCase().includes('dropped')
    ).length;
    const inbound = callLogs.filter((l) => (l.type || '').toLowerCase().includes('inbound')).length;
    const outbound = callLogs.filter((l) => (l.type || '').toLowerCase().includes('outbound')).length;

    return { total, answered, missed, inbound, outbound };
  }, [callLogs]);

  const filteredLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.buyerName && log.buyerName.toLowerCase().includes(q)) ||
        (log.phone && log.phone.includes(q)) ||
        (log.outcome && log.outcome.toLowerCase().includes(q)) ||
        (log.agent && log.agent.toLowerCase().includes(q)) ||
        (log.project && log.project.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedFilter === 'ANSWERED') {
        return (
          (log.status || log.outcome || '').toLowerCase() === 'answered' ||
          (log.status || log.outcome || '').toLowerCase().includes('site') ||
          (log.status || log.outcome || '').toLowerCase().includes('won') ||
          (log.status || log.outcome || '').toLowerCase().includes('sent') ||
          (log.status || log.outcome || '').toLowerCase().includes('consult') ||
          (log.status || log.outcome || '').toLowerCase().includes('booked')
        );
      }
      if (selectedFilter === 'MISSED') {
        return (
          (log.status || log.outcome || '').toLowerCase() === 'missed' ||
          (log.status || log.outcome || '').toLowerCase().includes('no answer') ||
          (log.status || log.outcome || '').toLowerCase().includes('lost') ||
          (log.status || log.outcome || '').toLowerCase().includes('dropped')
        );
      }
      if (selectedFilter === 'INBOUND') {
        return (log.type || '').toLowerCase().includes('inbound');
      }
      if (selectedFilter === 'OUTBOUND') {
        return (log.type || '').toLowerCase().includes('outbound');
      }

      return true;
    });
  }, [callLogs, searchQuery, selectedFilter]);

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: 'ALL', count: stats.total },
    { key: 'ANSWERED', label: 'ANSWERED', count: stats.answered },
    { key: 'MISSED', label: 'MISSED', count: stats.missed },
    { key: 'INBOUND', label: 'INBOUND', count: stats.inbound },
    { key: 'OUTBOUND', label: 'OUTBOUND', count: stats.outbound },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury #151728 Midnight Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.statusPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.statusPillText}>ACTIVE</Text>
          </View>
        </View>

        {/* Integrated Dynamic Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder={`Search ${semantics.leadEntitySingular.toLowerCase()}, number, ${semantics.agentEntity.toLowerCase()}, notes...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#151728" />}
      >
        {/* ─── Zone 2: Filter Chips ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterBar}
          contentContainerStyle={styles.statusFilterContent}
        >
          {filterTabs.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                onPress={() => setSelectedFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                  {tab.label}
                </Text>
                <View style={[styles.chipBadgeCircle, isSelected && styles.chipBadgeCircleSelected]}>
                  <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextSelected]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Zone 3: Call History Cards (Multi-Tenant Adaptive) ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#151728" />
            <Text style={styles.loadingText}>Fetching telephony & dialer logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyCard3D}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="call-outline" size={26} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>No Call Logs Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? `No call logs match "${searchQuery}". Try a different keyword.`
                : `No calls currently recorded in ${selectedFilter} category.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyCTA}
              onPress={() => (navigation?.navigate ? navigation.navigate('Leads') : null)}
              activeOpacity={0.88}
            >
              <Ionicons name="people-sharp" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCTAText}>View {semantics.leadEntityPlural} Pipeline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredLogs.map((log, index) => {
            const isOutbound = (log.type || log.direction || '').toLowerCase().includes('outbound');
            const initials = (log.buyerName || 'Contact')
              .split(' ')
              .map((n) => n.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <View key={log.id || index} style={styles.leadCard}>
                {/* Header Row: S.No + Avatar + Customer Name + Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarSquircle}>
                    <Text style={styles.avatarText}>{initials || 'CB'}</Text>
                    <View
                      style={[
                        styles.directionDot,
                        { backgroundColor: isOutbound ? '#1D4ED8' : '#047857' },
                      ]}
                    >
                      <Ionicons
                        name={isOutbound ? 'arrow-up-sharp' : 'arrow-down-sharp'}
                        size={8}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  <View style={styles.nameBlock}>
                    <Text style={styles.leadName} numberOfLines={1}>
                      {log.buyerName}
                    </Text>
                    <View style={styles.timeTagRow}>
                      <Ionicons name="time-outline" size={11} color="#64748B" />
                      <Text style={styles.timeTagText}>{log.timestamp}</Text>
                      <Text style={styles.dotSep}>•</Text>
                      <Text style={styles.durationTagText}>{log.duration}</Text>
                    </View>
                  </View>

                  {/* Status / Outcome Badge */}
                  <View style={[styles.stageBadge, { backgroundColor: log.bgColor || '#EFF6FF' }]}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: log.badgeColor || '#1D4ED8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stageBadgeText,
                        { color: log.badgeColor || '#1D4ED8' },
                      ]}
                    >
                      {log.outcome || log.status || 'Completed'}
                    </Text>
                  </View>
                </View>

                {/* Specs / Metadata Badges (Phone + Agent + Project/Dept + Dir) */}
                <View style={styles.specsRow}>
                  {log.phone ? (
                    <View style={styles.specPill}>
                      <Ionicons name="call-outline" size={11} color="#64748B" />
                      <Text style={styles.specPillText}>{log.phone}</Text>
                    </View>
                  ) : null}

                  {log.agent ? (
                    <View style={styles.specPill}>
                      <Ionicons name="person-outline" size={11} color="#64748B" />
                      <Text style={styles.specPillText} numberOfLines={1}>
                        {semantics.agentEntity}: {log.agent}
                      </Text>
                    </View>
                  ) : null}

                  {log.project ? (
                    <View style={styles.specPill}>
                      <Ionicons name="business-outline" size={11} color="#64748B" />
                      <Text style={styles.specPillText} numberOfLines={1}>
                        {log.project}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.specPill,
                      { backgroundColor: isOutbound ? '#EFF6FF' : '#ECFDF5' },
                    ]}
                  >
                    <Ionicons
                      name={isOutbound ? 'call-outline' : 'arrow-down-circle-outline'}
                      size={11}
                      color={isOutbound ? '#1D4ED8' : '#047857'}
                    />
                    <Text
                      style={[
                        styles.specPillText,
                        { color: isOutbound ? '#1D4ED8' : '#047857', fontWeight: '600' },
                      ]}
                    >
                      {isOutbound ? 'Outbound' : 'Inbound'}
                    </Text>
                  </View>
                </View>

                {/* Notes / Call Summary Strip (if notes exist) */}
                {log.notes ? (
                  <View style={styles.notesBox}>
                    <Ionicons name="document-text-outline" size={12} color="#64748B" />
                    <Text style={styles.notesText} numberOfLines={2}>
                      {log.notes}
                    </Text>
                  </View>
                ) : null}

                {/* Action Cockpit: Redial & WhatsApp */}
                <View style={styles.actionCockpit}>
                  <TouchableOpacity
                    style={styles.callCockpitBtn}
                    onPress={() => handleInitiateCall(log.buyerName, log.phone, log.project)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call-sharp" size={13} color="#FFFFFF" />
                    <Text style={styles.callCockpitText}>Redial Contact</Text>
                  </TouchableOpacity>

                  {log.phone ? (
                    <TouchableOpacity
                      style={styles.whatsappCockpitBtn}
                      onPress={() => handleOpenWhatsApp(log.phone, log.buyerName)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#15803D" />
                      <Text style={styles.whatsappCockpitText}>WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Dynamic Auto Post-Call Outcome Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={postCallModalVisible}
        onRequestClose={() => setPostCallModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="call" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Auto Post-Call Logger</Text>
                <Text style={styles.modalSubtitle}>
                  Select 1-tap outcome for call with {activeCallBuyer?.name || semantics.leadEntitySingular}:
                </Text>
              </View>
            </View>

            {/* Outcome Option Buttons (Industry Presets) */}
            <View style={styles.outcomeOptionsGrid}>
              {outcomePresets.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.outcomeOptionBtn, { backgroundColor: preset.bgColor, borderColor: preset.badgeColor }]}
                  onPress={() => handleSelectOutcome(preset)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.outcomeDot, { backgroundColor: preset.badgeColor }]} />
                  <Text style={[styles.outcomeOptionText, { color: preset.badgeColor }]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dismiss Modal Button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setPostCallModalVisible(false);
                setActiveCallBuyer(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Skip & Log Later</Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputControl: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  statusFilterBar: {
    marginBottom: 14,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  statusFilterContent: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  statusChipSelected: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chipBadgeCircle: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151728',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  emptyCTAText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  avatarText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#272944',
  },
  directionDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameBlock: {
    flex: 1,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  timeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  dotSep: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  durationTagText: {
    fontSize: 10.5,
    color: '#0EA5E9',
    fontWeight: '700',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  stageBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  specPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  actionCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callCockpitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151728',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  callCockpitText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  whatsappCockpitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  whatsappCockpitText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  outcomeOptionsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  outcomeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  outcomeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  outcomeOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
