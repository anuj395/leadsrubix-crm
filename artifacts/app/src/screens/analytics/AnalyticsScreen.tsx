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
import {
  DashboardTimeFilter,
  TimeRangeFilter,
} from '../../components/dashboard/DashboardTimeFilter';
import { DashboardKpiGrid } from '../../components/dashboard/DashboardKpiGrid';
import { DashboardFunnelChart } from '../../components/dashboard/DashboardFunnelChart';
import { DashboardCallingTrends } from '../../components/dashboard/DashboardCallingTrends';
import {
  DashboardFeedbackSummary,
  GroupByMode,
} from '../../components/dashboard/DashboardFeedbackSummary';
import { theme } from '../../theme/theme';

export const AnalyticsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsDashboardState | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupByMode>('team');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateDateRange = (filter: TimeRangeFilter) => {
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
    async (filter: TimeRangeFilter, group: GroupByMode, isPullRefresh = false) => {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#272944" />

      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportReport}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={15} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>BI & PERFORMANCE ANALYTICS</Text>
            <Text style={styles.headerSub}>Deep pipeline velocity, attribution & calling insights</Text>
          </View>
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
        {/* Section Header & Time Range Filter */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>TIME-RANGE AGGREGATION</Text>
            <Text style={styles.sectionSub}>Select reporting timeframe</Text>
          </View>
          <InfoGuideBadge
            title="Time Range Filter"
            description="Dynamically filters KPI metrics, conversion velocity, channel attribution, and calling talk-time by selected timeframe."
          />
        </View>

        <DashboardTimeFilter
          activeFilter={timeFilter}
          onChange={(newF) => setTimeFilter(newF)}
        />

        {/* Loading State or Full BI Views */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Compiling BI reports…</Text>
          </View>
        ) : (
          data && (
            <>
              {/* 9-Card Interactive KPI Matrix */}
              <DashboardKpiGrid
                metrics={data.cards}
                industryId={user?.industryId || data.industryId}
                onSelectKpi={handleKpiSelect}
              />

              {/* Multi-Channel & Associate Attribution Breakdown */}
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

              {/* Sales Pipeline Conversion Funnel */}
              <DashboardFunnelChart
                stages={data.funnelStages}
                conversionRate={data.conversionRate}
                revenue={data.revenue}
              />

              {/* Calling Trends & Duration Distribution */}
              <DashboardCallingTrends
                durations={data.callDurations}
                trends={data.callingTrends}
              />
            </>
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
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    gap: 6,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  titleRow: {
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
