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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  analyticsService,
  AnalyticsDashboardState,
} from '../../services/analyticsService';
import { taskService, TaskItem } from '../../services/taskService';
import { leadService, LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { LicenseTrialBanner } from '../../components/ui/LicenseTrialBanner';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
import { DashboardActionCockpit } from '../../components/dashboard/DashboardActionCockpit';
import { DashboardQuickKpis } from '../../components/dashboard/DashboardQuickKpis';
import { DashboardTodayAgenda } from '../../components/dashboard/DashboardTodayAgenda';
import { DashboardRecentLeads } from '../../components/dashboard/DashboardRecentLeads';
import { theme } from '../../theme/theme';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsDashboardState | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchDashboardData = useCallback(async (isPullRefresh = false) => {
    try {
      if (!isPullRefresh) setLoading(true);
      const [analyticsRes, tasksRes, leadsRes] = await Promise.all([
        analyticsService.getAnalyticsData({
          industryId: user?.industryId,
          organizationId: user?.organizationId,
        }),
        taskService.getTasks(),
        leadService.getLeads({ limit: 5 }),
      ]);
      setData(analyticsRes);
      setTasks(tasksRes);
      setLeads(leadsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const handleKpiSelect = (kpiKey: string, label: string) => {
    if (kpiKey === 'completedVisits' || kpiKey === 'scheduledVisits') {
      navigation.navigate('Tasks', { filter: kpiKey, title: label });
    } else {
      navigation.navigate('Leads', { filter: kpiKey, title: label });
    }
  };

  const handleCockpitAction = (screen: 'Leads' | 'Tasks', params?: any) => {
    navigation.navigate(screen, params);
  };

  const userDisplayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Executive';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* Zone 1: Executive Greeting & Hero Header */}
      <View style={styles.heroHeader}>
        {/* Subtle Ambient Glows */}
        <View style={styles.headerAmbientGlow} />

        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.notifBtnCircle}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              <View style={styles.notifBadgeDot} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingRow}>
          <View style={styles.userAvatarInitials}>
            <Text style={styles.avatarInitialsText}>
              {(user?.name || 'A').slice(0, 2).toUpperCase()}
            </Text>
            <View style={styles.avatarOnlineDot} />
          </View>

          <View style={styles.greetingTextCol}>
            <Text style={styles.greetingLabel}>
              {getGreeting()}, {userDisplayName}
            </Text>
            <Text style={styles.organizationLabel} numberOfLines={1}>
              {(user as any)?.organizationName || data?.organizationName || 'Leads Rubix Workspace'}
            </Text>
          </View>

          <View style={styles.headerTagPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.headerTagText}>ACTIVE</Text>
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
        {/* Zone 2: Dynamic Subscription / Trial Status Banner */}
        <LicenseTrialBanner />

        {/* Zone 3: Today's Action Command Cockpit (Fresh, Visits, Follow-ups) */}
        {data && (
          <DashboardActionCockpit
            metrics={data.cards}
            industryId={user?.industryId || data.industryId}
            onNavigateAction={handleCockpitAction}
          />
        )}

        {/* Loading State or Operational Views */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Fetching daily agenda…</Text>
          </View>
        ) : (
          data && (
            <>
              {/* Zone 4: 4-Card Quick KPI Overview */}
              <DashboardQuickKpis
                metrics={data.cards}
                industryId={user?.industryId || data.industryId}
                onSelectKpi={handleKpiSelect}
              />

              {/* Zone 5: Today's Schedule & Actionable Follow-up List */}
              <DashboardTodayAgenda
                tasks={tasks}
                industryId={user?.industryId || data.industryId}
                onViewAll={() => navigation.navigate('Tasks')}
                onTaskPress={(t) => navigation.navigate('Tasks')}
              />

              {/* Zone 6: Fresh Incoming Leads Queue */}
              <DashboardRecentLeads
                leads={leads}
                industryId={user?.industryId || data.industryId}
                onViewAll={() => navigation.navigate('Leads')}
                onLeadPress={(l) => navigation.navigate('LeadDetail', { id: l.id })}
              />
            </>
          )
        )}

        {/* Zone 7: Standard App Version Footer */}
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  headerAmbientGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F43F5E',
    borderWidth: 1.5,
    borderColor: '#151728',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userAvatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#151728',
  },
  greetingTextCol: {
    flex: 1,
    marginRight: 10,
  },
  greetingLabel: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  organizationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    gap: 5,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerTagText: {
    color: '#34D399',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
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
