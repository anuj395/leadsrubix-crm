import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { callLogService, CallLogItem } from '../../services/callLogService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';

const OUTCOME_PRESETS = [
  { label: 'Site Visit Confirmed', badgeColor: '#047857', bgColor: '#ECFDF5' },
  { label: 'Callback Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
  { label: 'Price Matrix Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
  { label: 'Not Interested / Lost', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
];

type FilterType = 'ALL' | 'ANSWERED' | 'MISSED' | 'INBOUND' | 'OUTBOUND';

export const CallLogsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
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
      `Hello ${name || 'Sir/Madam'}, thank you for contacting Leads Rubix. How can I assist you today?`
    );
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${message}`).catch(() => {
      Alert.alert('WhatsApp Not Installed', 'Please verify WhatsApp is installed on this device.');
    });
  };

  const handleSelectOutcome = (preset: typeof OUTCOME_PRESETS[0]) => {
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
        (l.status || l.outcome || '').toLowerCase().includes('sent')
    ).length;
    const missed = callLogs.filter(
      (l) =>
        (l.status || l.outcome || '').toLowerCase() === 'missed' ||
        (l.status || l.outcome || '').toLowerCase().includes('no answer') ||
        (l.status || l.outcome || '').toLowerCase().includes('lost')
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
          (log.status || log.outcome || '').toLowerCase().includes('sent')
        );
      }
      if (selectedFilter === 'MISSED') {
        return (
          (log.status || log.outcome || '').toLowerCase() === 'missed' ||
          (log.status || log.outcome || '').toLowerCase().includes('no answer') ||
          (log.status || log.outcome || '').toLowerCase().includes('lost')
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

      {/* ─── Zone 1: Luxury #151728 Midnight Header (Identical to Leads) ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.statusPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.statusPillText}>ACTIVE</Text>
          </View>
        </View>

        {/* Integrated Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder="Search customer, number, agent, notes..."
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
        {/* ─── Zone 2: Filter Chips (Exact Leads & Tasks Match) ─── */}
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

        {/* ─── Zone 3: Call History Cards (Matching Web CRM Schema) ─── */}
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
              <Text style={styles.emptyCTAText}>View Leads Pipeline</Text>
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

                {/* Specs / Metadata Badges (Phone + Agent + Dir) */}
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
                        Agent: {log.agent}
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

      {/* Auto Post-Call Outcome Popup Modal */}
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
                  Select 1-tap outcome for call with {activeCallBuyer?.name}:
                </Text>
              </View>
            </View>

            {/* Outcome Option Buttons */}
            <View style={styles.outcomeOptionsGrid}>
              {OUTCOME_PRESETS.map((preset, idx) => (
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

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => {
                setPostCallModalVisible(false);
                setActiveCallBuyer(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Skip Outcome Logging</Text>
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
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: 'rgba(5, 150, 105, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
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
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 2,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  statusFilterBar: {
    marginBottom: 12,
  },
  statusFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statusChipSelected: {
    backgroundColor: '#1E2238',
    borderColor: '#1E2238',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  chipBadgeCircle: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
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
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard3D: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  emptyIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2238',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  emptyCTAText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  leadCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarSquircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  directionDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameBlock: {
    flex: 1,
    marginRight: 8,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  timeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeTagText: {
    fontSize: 11,
    color: '#64748B',
  },
  dotSep: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  durationTagText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    borderColor: '#E2E8F0',
    gap: 4,
  },
  specPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
  },
  actionCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callCockpitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2238',
    paddingVertical: 8.5,
    borderRadius: 10,
    gap: 6,
  },
  callCockpitText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  whatsappCockpitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 8.5,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  whatsappCockpitText: {
    color: '#15803D',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  outcomeOptionsGrid: {
    gap: 8,
    marginBottom: 16,
  },
  outcomeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  outcomeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  outcomeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissBtnText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
