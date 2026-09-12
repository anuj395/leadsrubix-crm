import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { safeStorage } from '../../utils/safeStorage';
import { DynamicAnalyticsRenderer } from '../../components/dashboard/DynamicAnalyticsRenderer';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

// Main Analytics executive dashboard screen with instant cache & dynamic baseline
type TimeFilterType = '7d' | '30d' | '90d' | 'today' | 'all' | 'custom';

interface AnalyticsScreenProps {
  navigation?: any;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const mainScrollRef = React.useRef<ScrollView>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [groupBy, setGroupBy] = useState<'team' | 'source' | 'teamWise'>('team');

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

  // Custom date selection
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePickerTarget, setDatePickerTarget] = useState<'startDate' | 'endDate' | null>(null);

  // Dynamic config & data state
  const [dashboardConfig, setDashboardConfig] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  const cacheKey = `@analytics_cache_${user?.organizationId || 'default'}`;

  const dataRef = React.useRef<any>(null);
  dataRef.current = data;

  // 1. Initial Load: Instant render from AsyncStorage cache if available
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedRaw = await safeStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.data) {
            setData(cached.data);
            setDashboardConfig(cached.config);
            setLoading(false);
          }
        }
      } catch (err) {
        // Cache miss or parse failure is safe to ignore
      }
    };
    loadCachedData();
  }, [cacheKey]);

  // 2. Fetch fresh analytics from API server
  const fetchAnalytics = useCallback(
    async (filter: TimeFilterType, group: 'team' | 'source' | 'teamWise', isRefresh = false) => {
      // Only show full-screen spinner if we have zero data rendered yet
      if (!isRefresh && !dataRef.current) {
        setLoading(true);
      }

      try {
        let dateParams: { startDate?: string; endDate?: string } = {};

        if (filter === 'today') {
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          dateParams = { startDate: todayStr, endDate: todayStr };
        } else if (filter === '7d') {
          const now = new Date();
          const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateParams = { startDate: past.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
        } else if (filter === '30d') {
          const now = new Date();
          const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateParams = { startDate: past.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
        } else if (filter === '90d') {
          const now = new Date();
          const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateParams = { startDate: past.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
        } else if (filter === 'custom' && (startDate || endDate)) {
          dateParams = { startDate: startDate || undefined, endDate: endDate || undefined };
        }

        const [dashData, configData] = await Promise.all([
          analyticsService.getAnalyticsData({
            ...dateParams,
            groupBy: group,
            industryId: user?.industryId,
            organizationId: user?.organizationId,
          }),
          analyticsService.getDashboardConfig({
            industryId: user?.industryId,
            organizationId: user?.organizationId,
          }),
        ]);

        setData(dashData);
        setDashboardConfig(configData);

        // Cache successful response
        safeStorage.setItem(
          cacheKey,
          JSON.stringify({ data: dashData, config: configData, ts: Date.now() })
        );
      } catch (err) {
        console.error('[AnalyticsScreen] fetch error:', err);
        if (!dataRef.current) {
          setData({
            cards: {
              totalLeads: 0,
              fresh: 0,
              callBack: 0,
              interested: 0,
              closedWon: 0,
              notInterested: 0,
              closedLost: 0,
              completedVisits: 0,
              scheduledVisits: 0,
            },
            contacts: { feedbackSummary: [], callBackReasons: [], chartData: [] },
            tasks: { completedTasks: [], pendingTasks: [], completedChartData: [], pendingChartData: [] },
            callLogs: { callLogSummary: [], callingTrends: [] },
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.industryId, user?.organizationId, startDate, endDate, cacheKey]
  );

  useEffect(() => {
    fetchAnalytics(timeFilter, groupBy);
  }, [timeFilter, groupBy, fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(timeFilter, groupBy, true);
  };

  // Human-readable active filter label
  const activeFilterLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} ~ ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (timeFilter === '7d') return '7 Days';
    if (timeFilter === '30d') return '30 Days';
    if (timeFilter === '90d') return '90 Days';
    if (timeFilter === 'today') return 'Today';
    return 'All Time';
  }, [timeFilter, startDate, endDate]);

  const hasActiveFilter = timeFilter !== 'all' || Boolean(startDate);

  const handleGroupByChange = (newGroup: 'team' | 'source' | 'teamWise') => {
    setGroupBy(newGroup);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const selectFilterOption = (optKey: TimeFilterType) => {
    if (optKey === 'custom') {
      setFilterModalVisible(false);
      setDatePickerTarget('startDate');
      return;
    }
    setTimeFilter(optKey);
    setStartDate('');
    setEndDate('');
    setFilterModalVisible(false);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleResetFilter = () => {
    setTimeFilter('all');
    setStartDate('');
    setEndDate('');
    setFilterModalVisible(false);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ─── Hero Executive Header ─── */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={26} />

          {/* Filter Action Trigger & Clear Pill */}
          <View style={styles.headerFilterPillRow}>
            <TouchableOpacity
              style={[styles.headerFilterBtn, hasActiveFilter && styles.headerFilterBtnActive]}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="funnel-outline"
                size={12}
                color={hasActiveFilter ? '#38BDF8' : '#FFFFFF'}
              />
              <Text style={[styles.headerFilterBtnText, hasActiveFilter && styles.headerFilterBtnTextActive]}>
                {activeFilterLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#94A3B8" />
            </TouchableOpacity>

            {hasActiveFilter && (
              <TouchableOpacity
                style={styles.clearFilterIconBtn}
                onPress={handleResetFilter}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.headerTitle}>Analytics Overview</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>{(user?.role || 'ADMIN').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            Real-time business intelligence & conversion funnel metrics
          </Text>
        </View>
      </View>

      <ScrollView
        ref={mainScrollRef}
        scrollsToTop={true}
        contentContainerStyle={[
          styles.scrollContent,
          { flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 120 : 100 },
        ]}
        showsVerticalScrollIndicator={true}
        directionalLockEnabled={true}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical={true}
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand700}
          />
        }
      >
        {loading && !data ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#272944" />
            <Text style={styles.loadingText}>Loading Analytics Engine...</Text>
          </View>
        ) : data?.showAnalytics === false ? (
          /* Disabled State for Organizations with show_analytics: false */
          <View style={styles.disabledContainer}>
            <View style={styles.disabledIconCircle}>
              <Ionicons name="lock-closed-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.disabledTitle}>Analytics Disabled</Text>
            <Text style={styles.disabledDesc}>
              {data.message || 'Analytics access has been turned off by your organization administrator.'}
            </Text>
            <TouchableOpacity style={styles.disabledRetryBtn} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.disabledRetryText}>Check Access Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DynamicAnalyticsRenderer
            dashboardConfig={dashboardConfig}
            data={data}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            industryId={user?.industryId || 'temp0001'}
          />
        )}
      </ScrollView>

      {/* ─── Executive Time Filter Modal / Sheet ─── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.filterSheetContainer}>
            <View style={styles.filterSheetHeader}>
              <View style={styles.filterSheetTitleRow}>
                <Ionicons name="calendar-outline" size={18} color="#272944" />
                <Text style={styles.filterSheetTitle}>Filter Time Range</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptionsList}>
              {[
                { key: 'all' as TimeFilterType, label: 'All Time', desc: 'Complete historical analytics', icon: 'flash-outline' },
                { key: 'today' as TimeFilterType, label: 'Today', desc: 'Current calendar day activities', icon: 'today-outline' },
                { key: '7d' as TimeFilterType, label: 'Last 7 Days', desc: 'Trailing 7 days performance', icon: 'time-outline' },
                { key: '30d' as TimeFilterType, label: 'Last 30 Days', desc: 'Trailing 30 days performance', icon: 'calendar-number-outline' },
                { key: '90d' as TimeFilterType, label: 'Last 90 Days', desc: 'Trailing quarter performance', icon: 'bar-chart-outline' },
                { key: 'custom' as TimeFilterType, label: 'Custom Date Range', desc: 'Pick custom start and end dates', icon: 'calendar-outline' },
              ].map((item) => {
                const isSelected =
                  item.key === 'custom'
                    ? timeFilter === 'custom' || startDate !== ''
                    : timeFilter === item.key && !startDate;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.filterOptionRow, isSelected && styles.filterOptionRowActive]}
                    onPress={() => selectFilterOption(item.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.filterOptionIconCircle, isSelected && styles.filterOptionIconCircleActive]}>
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isSelected ? '#FFFFFF' : '#272944'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.filterOptionLabel, isSelected && styles.filterOptionLabelActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.filterOptionDesc}>{item.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#272944" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reset Filter Button */}
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={handleResetFilter}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={14} color="#EF4444" />
              <Text style={styles.resetFilterBtnText}>Reset to All Time</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers for Custom Range with End Date >= Start Date validation */}
      {datePickerTarget === 'startDate' && (
        <CalendarDatePickerModal
          visible={true}
          currentValue={startDate || new Date().toISOString().split('T')[0]}
          onClose={() => setDatePickerTarget(null)}
          onSelectDate={(d: string) => {
            setStartDate(d);
            setDatePickerTarget('endDate');
            setTimeFilter('custom');
          }}
        />
      )}

      {datePickerTarget === 'endDate' && (
        <CalendarDatePickerModal
          visible={true}
          currentValue={endDate || startDate || new Date().toISOString().split('T')[0]}
          onClose={() => setDatePickerTarget(null)}
          onSelectDate={(d: string) => {
            // Swap if user selected an end date earlier than start date
            if (startDate && d < startDate) {
              setStartDate(d);
              setEndDate(startDate);
            } else {
              setEndDate(d);
            }
            setDatePickerTarget(null);
            setTimeFilter('custom');
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 18,
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
  headerFilterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 6,
  },
  headerFilterBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  headerFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerFilterBtnTextActive: {
    color: '#38BDF8',
  },
  clearFilterIconBtn: {
    padding: 2,
  },
  titleRow: {
    marginTop: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  disabledContainer: {
    margin: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disabledIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disabledTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  disabledDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  disabledRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272944',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledRetryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  filterOptionsList: {
    paddingVertical: 10,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionRowActive: {
    backgroundColor: '#EEF2F6',
    borderColor: '#272944',
  },
  filterOptionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionIconCircleActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  filterOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  filterOptionLabelActive: {
    color: '#272944',
    fontWeight: '800',
  },
  filterOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    marginTop: 8,
    gap: 6,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
