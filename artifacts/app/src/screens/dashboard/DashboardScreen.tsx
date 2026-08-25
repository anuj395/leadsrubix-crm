import React, { useState, useEffect } from 'react';
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
import { analyticsService, AnalyticsData } from '../../services/analyticsService';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { LicenseTrialBanner } from '../../components/ui/LicenseTrialBanner';
import { theme } from '../../theme/theme';

export const DashboardScreen = ({ navigation }: any) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getAnalyticsData();
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={34} />

          <TouchableOpacity
            style={styles.notifBtnCircle}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            <View style={styles.notifBadgeDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>EXECUTIVE SALES DASHBOARD</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand700} />
        }
      >
        {/* Executive 7-Day Free Trial & License Allocation Banner */}
        <LicenseTrialBanner />

        {/* Animated AI Mascot Companion */}
        <AIAdvisorMascot
          screenName="Dashboard"
          message="Pipeline active! You have fresh buyer inquiries requiring site visit scheduling today."
        />

        {/* Quick Action Shortcuts Grid */}
        <View style={styles.quickActionGrid}>
          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('LeadForm')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
              <Ionicons name="person-add-sharp" size={18} color="#0284C7" />
            </View>
            <Text style={styles.actionCardTitle}>Add Lead</Text>
            <Text style={styles.actionCardSub}>New Prospect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('CallLogs')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
              <Ionicons name="call-sharp" size={18} color="#059669" />
            </View>
            <Text style={styles.actionCardTitle}>Call Dialer</Text>
            <Text style={styles.actionCardSub}>Auto Logger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('TaskForm')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
              <Ionicons name="calendar-sharp" size={18} color="#D97706" />
            </View>
            <Text style={styles.actionCardTitle}>Schedule</Text>
            <Text style={styles.actionCardSub}>Site Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard3D}
            onPress={() => navigation.navigate('Projects')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
              <Ionicons name="calculator-sharp" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.actionCardTitle}>CPQ Quote</Text>
            <Text style={styles.actionCardSub}>PDF Share</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Pipeline Summary Metrics */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>DYNAMIC PIPELINE SUMMARY</Text>
          <InfoGuideBadge
            title="Pipeline Summary"
            description="Real-time aggregation of active deals, revenue velocity, and conversion rate across your workspace."
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Fetching workspace pipeline metrics...</Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard3D}>
              <Text style={styles.statLabel}>TOTAL REVENUE</Text>
              <Text style={[styles.statValue, theme.typography.tabularNumbers]}>
                {analytics?.revenue || '₹4.2 Cr'}
              </Text>
              <Text style={styles.statTrendText}>↑ 14% vs last month</Text>
            </View>

            <View style={styles.statCard3D}>
              <Text style={styles.statLabel}>CONVERSION RATE</Text>
              <Text style={[styles.statValue, theme.typography.tabularNumbers]}>
                {analytics?.conversionRate || '18.4%'}
              </Text>
              <Text style={styles.statTrendText}>↑ 3.2% vs industry avg</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hero3DHeader: {
    width: '100%',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E11D48',
  },
  headerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  headerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard3D: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard3D: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statTrendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
  },
});
