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
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  analyticsService,
  AnalyticsDashboardState,
} from '../../services/analyticsService';
import { taskService, TaskItem } from '../../services/taskService';
import { leadService, LeadItem } from '../../services/leadService';
import { callLogService, CallLogItem } from '../../services/callLogService';
import { useAuth } from '../../context/AuthContext';
import { safeStorage } from '../../utils/safeStorage';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
import { DashboardActionCockpit } from '../../components/dashboard/DashboardActionCockpit';
import { DashboardTodayAgenda } from '../../components/dashboard/DashboardTodayAgenda';
import { DashboardRecentLeads } from '../../components/dashboard/DashboardRecentLeads';
import { DashboardRecentCalls } from '../../components/dashboard/DashboardRecentCalls';
import { PostCallDispositionModal, PostCallCallerInfo, CallDialerModal } from '../../components/telephony';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';
import { theme } from '../../theme/theme';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsDashboardState | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Call Dialer & Post-Call Telephony Disposition State
  const [dialerModalVisible, setDialerModalVisible] = useState(false);
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // 1. Instant Boot: Load from AsyncStorage cache for 0ms initial render
  useEffect(() => {
    const loadCachedDashboard = async () => {
      try {
        const cacheKey = `@dashboard_cache_${user?.organizationId || 'default'}`;
        const cachedStr = await safeStorage.getItem(cacheKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached.data) setData(cached.data);
          if (Array.isArray(cached.tasks)) setTasks(cached.tasks);
          if (Array.isArray(cached.leads)) setLeads(cached.leads);
          if (Array.isArray(cached.recentCalls)) setRecentCalls(cached.recentCalls);
          setLoading(false);
        }
      } catch (e) {
        // Cache read error ignored
      }
    };
    loadCachedDashboard();
  }, [user?.organizationId]);

  const fetchDashboardData = useCallback(async (isPullRefresh = false) => {
    try {
      if (!isPullRefresh && !data) setLoading(true);
      const [analyticsRes, tasksRes, freshLeadsRes, fallbackLeadsRes, callLogsRes] = await Promise.all([
        analyticsService.getAnalyticsData({
          industryId: user?.industryId,
          organizationId: user?.organizationId,
        }),
        taskService.getTasks(),
        leadService.getLeads({ status: 'FRESH', limit: 5 }),
        leadService.getLeads({ limit: 5 }),
        callLogService.getCallLogs(user?.id, user?.role).catch(() => []),
      ]);

      const chosenLeads = freshLeadsRes && freshLeadsRes.length > 0 ? freshLeadsRes : fallbackLeadsRes;
      const logs = Array.isArray(callLogsRes) ? callLogsRes : [];
      const todayCalls = logs.filter((c: any) => {
        if (!c.timestamp && !c.createdAt) return false;
        const d = new Date(c.timestamp || c.createdAt);
        const now = new Date();
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
      const callsToDisplay = todayCalls.length > 0 ? todayCalls : logs.slice(0, 3);

      setData(analyticsRes);
      setTasks(tasksRes);
      setLeads(chosenLeads);
      setRecentCalls(callsToDisplay);

      // Persist to safeStorage for instant boot
      const cacheKey = `@dashboard_cache_${user?.organizationId || 'default'}`;
      safeStorage.setItem(cacheKey, JSON.stringify({
        data: analyticsRes,
        tasks: tasksRes,
        leads: chosenLeads,
        recentCalls: callsToDisplay,
      })).catch(() => {});
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, data]);

  useEffect(() => {
    fetchDashboardData();
    const unsub = navigation?.addListener?.('focus', () => {
      fetchDashboardData(true);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [fetchDashboardData, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const handleCockpitAction = (screen: 'Leads' | 'Tasks', params?: any) => {
    navigation.navigate(screen, params);
  };

  const handleToggleTask = async (task: TaskItem) => {
    const newCompleted = !task.isCompleted;
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: newCompleted } : t))
    );
    try {
      await taskService.toggleTaskCompletion(task.id, newCompleted);
    } catch (err) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !newCompleted } : t))
      );
    }
  };

  const handleCallFromLog = (call: CallLogItem) => {
    if (call.phone) {
      Linking.openURL(`tel:${call.phone}`).catch(() => {});
      setActiveCaller({
        contactId: call.id || call._id,
        leadId: call.id || call._id,
        customerName: call.buyerName || 'Contact',
        phone: call.phone,
        project: call.project || '',
        stage: call.stage || call.status || '',
      });
      setTimeout(() => {
        setPostCallModalVisible(true);
      }, 1000);
    }
  };

  const handleCallLead = (targetLead: LeadItem) => {
    const phone = targetLead.phone || targetLead.contactNo;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
      setActiveCaller({
        contactId: targetLead.id,
        leadId: targetLead.id,
        customerName: targetLead.name || targetLead.firstName || 'Lead',
        phone: phone,
        project: targetLead.project || '',
        stage: targetLead.stage || targetLead.status || '',
      });
      setTimeout(() => {
        setPostCallModalVisible(true);
      }, 1000);
    }
  };

  const handleCallTask = (task: TaskItem) => {
    const phone = task.phone || (task as any).contactNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
      setActiveCaller({
        contactId: task.contactId || task.leadId,
        leadId: task.leadId || task.contactId,
        customerName: task.leadName || (task as any).customerName || 'Task Client',
        phone: phone,
        project: task.project || '',
        stage: task.title || 'Follow-up',
      });
      setTimeout(() => {
        setPostCallModalVisible(true);
      }, 1000);
    }
  };

  const currentOrgName = (user as any)?.organizationName || data?.organizationName || '';
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
              {currentOrgName || 'Enterprise Workspace'}
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
        {/* Zone 2: Today's Action Command Cockpit (Urgent SLA Triage) */}
        {data && (
          <DashboardActionCockpit
            metrics={data.cards}
            industryId={user?.industryId || data.industryId}
            onNavigateAction={handleCockpitAction}
          />
        )}

        {/* Loading State or Operational Views */}
        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Fetching daily agenda…</Text>
          </View>
        ) : (
          data && (
            <>
              {/* Zone 3: Today's Schedule & Actionable Agenda */}
              <DashboardTodayAgenda
                tasks={tasks}
                industryId={user?.industryId || data.industryId}
                organizationName={currentOrgName}
                onViewAll={() => navigation.navigate('Tasks')}
                onTaskPress={(t) => {
                  setSelectedTaskForDetail(t);
                }}
                onCallTask={handleCallTask}
                onToggleTask={handleToggleTask}
              />

              {/* Zone 4: Fresh Incoming Leads Queue */}
              <DashboardRecentLeads
                leads={leads}
                industryId={user?.industryId || data.industryId}
                organizationName={currentOrgName}
                onViewAll={() => navigation.navigate('Leads')}
                onLeadPress={(l) =>
                  navigation.navigate('LeadDetail', {
                    leadId: l.id,
                    id: l.id,
                    lead: l,
                  })
                }
                onCallLead={handleCallLead}
                onAddLead={() => navigation.navigate('LeadForm')}
              />

              {/* Zone 5: Today's Call Activity Feed */}
              <DashboardRecentCalls
                calls={recentCalls}
                industryId={user?.industryId || data.industryId}
                organizationName={currentOrgName}
                onViewAll={() => navigation.navigate('CallLogs')}
                onRedial={handleCallFromLog}
                onOpenDialer={() => setDialerModalVisible(true)}
              />
            </>
          )
        )}

        {/* Zone 7: Standard App Version Footer */}
        <AppVersionFooter />
      </ScrollView>

      {/* In-App Quick Call Keypad Dialer Modal */}
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
          fetchDashboardData(true);
        }}
      />

      {/* Task Lifecycle Detail Bottom Sheet Modal */}
      <TaskDetailModal
        visible={Boolean(selectedTaskForDetail)}
        task={selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        onRefresh={() => {
          fetchDashboardData(true);
        }}
        onCall={(t) => {
          handleCallTask(t);
        }}
        onEdit={(t) => {
          setSelectedTaskForDetail(null);
          navigation.navigate('TaskForm', { task: t });
        }}
        onViewLead={(t) => {
          setSelectedTaskForDetail(null);
          if (t.leadId) {
            navigation.navigate('LeadDetail', {
              leadId: t.leadId,
              id: t.leadId,
              lead: { id: t.leadId, name: t.leadName, phone: t.phone, email: t.email, source: t.source },
            });
          }
        }}
        organizationName={currentOrgName}
        userName={user?.name || user?.email}
      />
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
