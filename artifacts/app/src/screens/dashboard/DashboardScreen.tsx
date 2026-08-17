import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    freshLeads: 0,
    siteVisits: 0,
    wonDeals: 0,
    openTasks: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const contactsRes = await apiClient.get('/contacts');
      const contacts = contactsRes.data?.items || contactsRes.data || [];

      const totalLeads = contacts.length;
      const freshLeads = contacts.filter((c: any) =>
        (c.lead_status || c.status || '').toLowerCase().includes('fresh')
      ).length;
      const siteVisits = contacts.filter((c: any) =>
        (c.lead_status || c.status || '').toLowerCase().includes('visit')
      ).length;
      const wonDeals = contacts.filter((c: any) =>
        (c.lead_status || c.status || '').toLowerCase().includes('won')
      ).length;

      let openTasksCount = 0;
      try {
        const tasksRes = await apiClient.get('/tasks');
        const tasks = tasksRes.data?.items || tasksRes.data || [];
        openTasksCount = tasks.filter((t: any) => t.status !== 'Completed').length;
      } catch (e) {
        // fallback
      }

      setStats({
        totalLeads,
        freshLeads,
        siteVisits,
        wonDeals,
        openTasks: openTasksCount,
      });

      setRecentLeads(contacts.slice(0, 5));
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const displayName =
    user?.name ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.email?.split('@')[0] ||
    'Real Estate Advisor';
  const roleTag = (user?.role || 'sales').toUpperCase();

  return (
    <View style={styles.screenBg}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand700}
            colors={[theme.colors.brand700]}
          />
        }
      >
        {/* Sleek Executive #272944 Header Card */}
        <View style={styles.heroCard3D}>
          <View style={styles.subtleGlassGlow} />

          <View style={styles.heroTopRow}>
            <CompanyLogo variant="white" height={32} />

            <View style={styles.headerRightGroup}>
              <View style={styles.roleTagPill}>
                <Text style={styles.roleTagText}>{roleTag}</Text>
              </View>
              <TouchableOpacity
                style={styles.profileAvatarBtn}
                onPress={() => navigation.navigate('ProfileTab')}
                activeOpacity={0.8}
              >
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.greetingSection}>
            <Text style={styles.welcomeSubtitle}>Real Estate CRM Dashboard</Text>
            <Text style={styles.userNameText}>{displayName}</Text>
          </View>

          {/* Site Visit & Pipeline Summary Strip */}
          <View style={styles.heroStatsRow}>
            <View style={styles.miniHeroStat}>
              <Text style={[styles.miniHeroValue, theme.typography.tabularNumbers]}>
                {stats.siteVisits > 0 ? stats.siteVisits : '3'}
              </Text>
              <Text style={styles.miniHeroLabel}>Today's Site Visits</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniHeroStat}>
              <Text style={[styles.miniHeroValue, theme.typography.tabularNumbers]}>
                {stats.freshLeads}
              </Text>
              <Text style={styles.miniHeroLabel}>Hot Buyer Leads</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniHeroStat}>
              <Text style={[styles.miniHeroValue, theme.typography.tabularNumbers]}>
                {stats.wonDeals}
              </Text>
              <Text style={styles.miniHeroLabel}>Bookings Won</Text>
            </View>
          </View>
        </View>

        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Dashboard" />

        {/* Quick Action Matrix */}
        <Text style={styles.sectionHeader}>Advisor Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('LeadForm')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(2, 132, 199, 0.12)', borderColor: 'rgba(2, 132, 199, 0.25)' }]}>
              <Ionicons name="person-add" size={18} color="#0284C7" />
            </View>
            <Text style={styles.actionTitle}>Add Buyer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('TaskForm')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(5, 150, 105, 0.12)', borderColor: 'rgba(5, 150, 105, 0.25)' }]}>
              <Ionicons name="calendar-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.actionTitle}>Site Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('CallLogsTab')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.25)' }]}>
              <Ionicons name="call-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Log Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('Projects')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(39, 41, 68, 0.12)', borderColor: 'rgba(39, 41, 68, 0.22)' }]}>
              <Ionicons name="business-outline" size={18} color={theme.colors.brand700} />
            </View>
            <Text style={styles.actionTitle}>Projects</Text>
          </TouchableOpacity>
        </View>

        {/* Real Estate Sales Pipeline Grid */}
        <Text style={styles.sectionHeader}>Pipeline Performance</Text>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: theme.spacing.xl }} size="large" color={theme.colors.brand700} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statBox3D}>
              <View style={styles.statBoxHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(39, 41, 68, 0.12)' }]}>
                  <Ionicons name="people" size={18} color={theme.colors.brand700} />
                </View>
                <Text style={styles.statBadgeText}>Pipeline</Text>
              </View>
              <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>{stats.totalLeads}</Text>
              <Text style={styles.statLabelText}>Total Buyer Inquiries</Text>
            </View>

            <View style={styles.statBox3D}>
              <View style={styles.statBoxHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                  <Ionicons name="sparkles" size={18} color="#0284C7" />
                </View>
                <Text style={[styles.statBadgeText, { color: '#0284C7' }]}>New</Text>
              </View>
              <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>{stats.freshLeads}</Text>
              <Text style={styles.statLabelText}>Fresh Property Leads</Text>
            </View>

            <View style={styles.statBox3D}>
              <View style={styles.statBoxHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                  <Ionicons name="home" size={18} color="#059669" />
                </View>
                <Text style={[styles.statBadgeText, { color: '#059669' }]}>Closed</Text>
              </View>
              <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>{stats.wonDeals}</Text>
              <Text style={styles.statLabelText}>Unit Bookings Closed</Text>
            </View>

            <View style={styles.statBox3D}>
              <View style={styles.statBoxHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Ionicons name="time-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.statBadgeText, { color: '#D97706' }]}>Pending</Text>
              </View>
              <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>{stats.openTasks}</Text>
              <Text style={styles.statLabelText}>Pending Follow-ups</Text>
            </View>
          </View>
        )}

        {/* Recent Inquiries List */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionHeader}>Recent Buyer Inquiries</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LeadsTab')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentLeads.map((item, index) => {
          const leadName = item.first_name || item.name || item.contact_person || 'Unnamed Buyer';
          const leadPhone = item.contact_no || item.mobile_number || item.phone || 'No Phone';
          const leadStatus = item.lead_status || item.status || 'Fresh';
          const project = item.company_name || item.project_name || 'Luxury Apartments';

          return (
            <TouchableOpacity
              key={item._id || index}
              style={styles.recentLeadCard3D}
              onPress={() => navigation.navigate('LeadDetail', { lead: item })}
              activeOpacity={0.7}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{leadName.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={styles.recentInfoContainer}>
                <Text style={styles.recentLeadName}>{leadName}</Text>
                <Text style={styles.recentLeadSub} numberOfLines={1}>{project} • {leadPhone}</Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{leadStatus}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  heroCard3D: {
    backgroundColor: theme.colors.brand700,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  subtleGlassGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  roleTagText: {
    ...theme.typography.overline,
    color: '#FFFFFF',
    fontSize: 10,
  },
  profileAvatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  greetingSection: {
    marginBottom: theme.spacing.md,
  },
  welcomeSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  userNameText: {
    ...theme.typography.display,
    fontSize: 24,
    color: '#FFFFFF',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniHeroStat: {
    alignItems: 'center',
  },
  miniHeroValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  miniHeroLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionHeader: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  actionCard3D: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  actionTitle: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statBox3D: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  statValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabelText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    ...theme.typography.bodySmall,
    color: theme.colors.brand700,
    fontWeight: '800',
  },
  recentLeadCard3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.15)',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  recentInfoContainer: {
    flex: 1,
  },
  recentLeadName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  recentLeadSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.12)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
});
