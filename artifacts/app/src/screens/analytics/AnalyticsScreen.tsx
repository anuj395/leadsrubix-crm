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
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { DynamicAnalyticsRenderer } from '../../components/dashboard/DynamicAnalyticsRenderer';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

type TimeFilterType = '7d' | '30d' | 'today' | 'all' | 'custom';

interface AnalyticsScreenProps {
  navigation?: any;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();

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

  const fetchAnalytics = useCallback(
    async (filter: TimeFilterType, group: 'team' | 'source' | 'teamWise', isRefresh = false) => {
      if (!isRefresh) setLoading(true);

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
      } catch (err) {
        console.error('[AnalyticsScreen] fetch error:', err);
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
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, startDate, endDate]
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
    if (timeFilter === 'today') return 'Today';
    return 'All Time';
  }, [timeFilter, startDate, endDate]);

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
  };

  const handleResetFilter = () => {
    setTimeFilter('all');
    setStartDate('');
    setEndDate('');
    setFilterModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ─── Hero Executive Header (Clean Without Top Export CSV) ─── */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={26} />

          {/* Filter Action Trigger Button */}
          <TouchableOpacity
            style={[styles.headerFilterBtn, (timeFilter !== 'all' || startDate !== '') && styles.headerFilterBtnActive]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="funnel-outline"
              size={12}
              color={(timeFilter !== 'all' || startDate !== '') ? '#38BDF8' : '#FFFFFF'}
            />
            <Text style={[styles.headerFilterBtnText, (timeFilter !== 'all' || startDate !== '') && styles.headerFilterBtnTextActive]}>
              {activeFilterLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#94A3B8" />
          </TouchableOpacity>
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand700}
          />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#272944" />
            <Text style={styles.loadingText}>Loading Analytics Engine...</Text>
          </View>
        ) : (
          <DynamicAnalyticsRenderer
            dashboardConfig={dashboardConfig}
            data={data}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            industryId={user?.industryId || 'temp0001'}
            onNavigateToLeads={(filterParams) => {
              if (navigation?.navigate) {
                navigation.navigate('Leads', { filter: filterParams });
              }
            }}
            onNavigateToTasks={(filterParams) => {
              if (navigation?.navigate) {
                navigation.navigate('Tasks', { filter: filterParams });
              }
            }}
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
                { key: 'custom' as TimeFilterType, label: 'Custom Date Range', desc: 'Pick start and end dates', icon: 'calendar-outline' },
              ].map((item) => {
                const isSelected = item.key === 'custom'
                  ? (timeFilter === 'custom' || startDate !== '')
                  : (timeFilter === item.key && !startDate);

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

      {/* Date Pickers for Custom Range */}
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
            setEndDate(d);
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
  headerFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerFilterBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  headerFilterBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerFilterBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
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
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  adminBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 3,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 120,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterSheetContainer: {
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
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  filterSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterOptionsList: {
    gap: 6,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterOptionRowActive: {
    backgroundColor: '#EEF2F6',
    borderColor: '#272944',
  },
  filterOptionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionIconCircleActive: {
    backgroundColor: '#272944',
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
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  resetFilterBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
});
