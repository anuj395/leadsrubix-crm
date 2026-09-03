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
import { getIndustrySemantics, getIndustryCallOutcomePresets } from '../../utils/industryLabels';
import { CallDialerModal, PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { openWhatsApp } from '../../utils/whatsappHelper';

type FilterType = 'ALL' | 'ANSWERED' | 'MISSED' | 'INBOUND' | 'OUTBOUND';

interface CallLogsScreenProps {
  navigation?: any;
}

export const CallLogsScreen: React.FC<CallLogsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const semantics = useMemo(() => getIndustrySemantics(user?.industryId), [user?.industryId]);

  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');

  // Telephony & Post-Call State
  const [dialerModalVisible, setDialerModalVisible] = useState(false);
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

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

  // Trigger Phone Dialer & Open Auto Post-Call Disposition
  const handleInitiateCall = (buyerName: string, phone: string, project: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This contact does not have a valid phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      // Note: Simulator has no cellular dialer hardware
      console.log(`[Telephony] Native dialer not available on simulator for ${phone}`);
    });
    setActiveCaller({ customerName: buyerName, phone, project });

    // Open Auto Post-Call Outcome Overlay after slight delay
    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1000);
  };

  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    const message = `Hello ${name || 'Sir/Madam'}, thank you for contacting ${user?.organizationName || 'Leads Rubix'}. How can I assist you today?`;
    openWhatsApp(phone, message);
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

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerDialerTrigger}
              onPress={() => setDialerModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="keypad" size={14} color="#38BDF8" />
              <Text style={styles.headerDialerTriggerText}>Dialer</Text>
            </TouchableOpacity>

            <View style={styles.statusPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.statusPillText}>ACTIVE</Text>
            </View>
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
          filteredLogs.map((log) => {
            const isOut = (log.type || log.direction || '').toLowerCase().includes('out');
            return (
              <View key={log.id} style={styles.callCard3D}>
                <View style={styles.callCardTopRow}>
                  <View style={styles.callCardAvatarGroup}>
                    <View style={[styles.callTypeIconCircle, { backgroundColor: isOut ? '#EFF6FF' : '#F0FDF4' }]}>
                      <Ionicons
                        name={isOut ? 'call' : 'call-outline'}
                        size={16}
                        color={isOut ? '#2563EB' : '#16A34A'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.callerNameText} numberOfLines={1}>
                        {log.buyerName}
                      </Text>
                      <View style={styles.callerPhoneRow}>
                        <Text style={styles.callerPhoneText}>{log.phone}</Text>
                        {log.project ? (
                          <Text style={styles.callerProjectText} numberOfLines={1}>
                            • {log.project}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statusBadgePill, { backgroundColor: log.bgColor }]}>
                    <Text style={[styles.statusBadgePillText, { color: log.badgeColor }]}>
                      {log.outcome || log.status}
                    </Text>
                  </View>
                </View>

                {/* Meta details (Duration, Time, Agent) */}
                <View style={styles.callCardMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#64748B" />
                    <Text style={styles.metaItemText}>{log.duration}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.metaItemText}>{log.timestamp}</Text>
                  </View>
                  {log.agent ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={13} color="#64748B" />
                      <Text style={styles.metaItemText} numberOfLines={1}>
                        {log.agent}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Notes if available */}
                {log.notes ? (
                  <View style={styles.callNotesBox}>
                    <Ionicons name="document-text-outline" size={13} color="#64748B" />
                    <Text style={styles.callNotesText} numberOfLines={2}>
                      {log.notes}
                    </Text>
                  </View>
                ) : null}

                {/* Cockpit Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.redialCockpitBtn}
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

      {/* Floating Action Button (FAB) to Open Dialer */}
      <TouchableOpacity
        style={styles.fabDialerBtn}
        onPress={() => setDialerModalVisible(true)}
        activeOpacity={0.88}
      >
        <Ionicons name="keypad" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* In-App Numeric Call Dialer Modal */}
      <CallDialerModal
        visible={dialerModalVisible}
        onClose={() => setDialerModalVisible(false)}
        onCallInitiated={(caller) => {
          setActiveCaller(caller);
          setTimeout(() => {
            setPostCallModalVisible(true);
          }, 1000);
        }}
      />

      {/* Post-Call Disposition & Logging Modal */}
      <PostCallDispositionModal
        visible={postCallModalVisible}
        onClose={() => {
          setPostCallModalVisible(false);
          setActiveCaller(null);
        }}
        caller={activeCaller}
        onSuccess={() => {
          fetchCallLogs();
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
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDialerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    gap: 5,
  },
  headerDialerTriggerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
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
  callCard3D: {
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
  callCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  callCardAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  callTypeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  callerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  callerPhoneText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  callerProjectText: {
    fontSize: 11,
    color: '#0EA5E9',
    fontWeight: '600',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  statusBadgePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  callCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
    paddingVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  callNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  callNotesText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  redialCockpitBtn: {
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
  fabDialerBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 76,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
