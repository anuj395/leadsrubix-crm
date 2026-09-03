import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  analyticsService,
  AnalyticsDashboardState,
} from '../../services/analyticsService';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
import { DashboardKpiGrid } from '../../components/dashboard/DashboardKpiGrid';
import { DashboardFunnelChart } from '../../components/dashboard/DashboardFunnelChart';
import { DashboardCallingTrends } from '../../components/dashboard/DashboardCallingTrends';
import {
  DashboardFeedbackSummary,
  GroupByMode,
} from '../../components/dashboard/DashboardFeedbackSummary';
import { DashboardTasksAnalytics } from '../../components/dashboard/DashboardTasksAnalytics';
import { theme } from '../../theme/theme';

export type TimeFilterType = 'all' | '7d' | '30d' | 'today';
export type AnalyticsTabType = 'contacts' | 'tasks' | 'calling';

export const AnalyticsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsDashboardState | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [groupBy, setGroupBy] = useState<GroupByMode>('team');
  const [activeTab, setActiveTab] = useState<AnalyticsTabType>('contacts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateDateRange = (filter: TimeFilterType) => {
    const now = new Date();
    if (filter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return { startDate: todayStr, endDate: todayStr };
    }
    if (filter === '7d') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return {
        startDate: past.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    if (filter === '30d') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return {
        startDate: past.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    return {};
  };

  const fetchAnalytics = useCallback(
    async (filter: TimeFilterType, group: GroupByMode, isPullRefresh = false) => {
      try {
        if (!isPullRefresh) setLoading(true);
        const dateParams = calculateDateRange(filter);
        const res = await analyticsService.getAnalyticsData({
          ...dateParams,
          groupBy: group,
          industryId: user?.industryId,
          organizationId: user?.organizationId,
        });
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchAnalytics(timeFilter, groupBy);
  }, [timeFilter, groupBy, fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(timeFilter, groupBy, true);
  };

  const handleKpiSelect = (kpiKey: string, label: string) => {
    if (kpiKey === 'scheduledVisits' || kpiKey === 'completedVisits') {
      navigation?.navigate('Tasks', { filter: kpiKey, title: label });
    } else {
      navigation?.navigate('Leads', { filter: kpiKey, title: label });
    }
  };

  const handleExportReport = () => {
    Alert.alert(
      'Export Executive BI Report',
      'Full workspace conversion metrics, channel attribution, and talk-time duration reports exported to CSV / Excel dataset.',
      [{ text: 'OK' }]
    );
  };

  const timeFilterOptions: { key: TimeFilterType; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'today', label: 'Today' },
    { key: 'all', label: 'All Time' },
  ];

  const tabs: { key: AnalyticsTabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'contacts', label: 'Contacts', icon: 'people-outline' },
    { key: 'tasks', label: 'Tasks & Visits', icon: 'calendar-outline' },
    { key: 'calling', label: 'Calling BI', icon: 'call-outline' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Hero Header ─── */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.topRightRow}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportReport}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={14} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.headerTitle}>Analytics Overview</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            Performance metrics and activities for your organization.
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
        {/* ─── Top Controls & Filter Segment Bar ─── */}
        <View style={styles.controlsBar}>
          {/* Time range pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePillsScroll}>
            {timeFilterOptions.map((opt) => {
              const isActive = timeFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setTimeFilter(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {timeFilter !== 'all' && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => setTimeFilter('all')}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={12} color="#64748B" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ─── Key Metrics Horizontal Overview ─── */}
        {data && (
          <DashboardKpiGrid
            metrics={data.cards}
            industryId={user?.industryId || data.industryId}
            onSelectKpi={handleKpiSelect}
          />
        )}

        {/* ─── 3 Web-Aligned Main Navigation Tabs ─── */}
        <View style={styles.tabNavContainer}>
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Tab Content Views ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Compiling analytics…</Text>
          </View>
        ) : (
          data && (
            <View style={styles.tabContentArea}>
              {/* Tab 1: Contacts Overview */}
              {activeTab === 'contacts' && (
                <>
                  <DashboardFeedbackSummary
                    feedbackList={data.feedbackSummary}
                    groupBy={groupBy}
                    onGroupByChange={(mode) => setGroupBy(mode)}
                    onItemPress={(row) => {
                      navigation?.navigate('Leads', {
                        associate: row.associate,
                        title: `${row.associate} Leads`,
                      });
                    }}
                  />

                  <DashboardFunnelChart
                    stages={data.funnelStages}
                    conversionRate={data.conversionRate}
                    revenue={data.revenue}
                  />
                </>
              )}

              {/* Tab 2: Tasks & Meetings */}
              {activeTab === 'tasks' && (
                <DashboardTasksAnalytics
                  tasks={data.completedTasks || []}
                  industryId={user?.industryId || data.industryId}
                  onAssociatePress={(associate) => {
                    navigation?.navigate('Tasks', {
                      associate,
                      title: `${associate} Tasks`,
                    });
                  }}
                />
              )}

              {/* Tab 3: Calling Analytics */}
              {activeTab === 'calling' && (
                <DashboardCallingTrends
                  durations={data.callDurations}
                  trends={data.callingTrends}
                />
              )}
            </View>
          )
        )}

        {/* Standard App Version Footer */}
        <AppVersionFooter />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 18,
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 6,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  adminBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  adminBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  controlsBar: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  timePillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8.5,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 5,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#151728',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContentArea: {
    paddingHorizontal: 16,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
