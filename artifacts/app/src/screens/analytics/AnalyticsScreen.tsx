import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const AnalyticsScreen = () => {
  const funnelStages = [
    { stage: 'Fresh Buyer Inquiries', count: 142, pct: '100%', color: '#0284C7' },
    { stage: 'Site Visits Scheduled', count: 68, pct: '48%', color: '#D97706' },
    { stage: 'Negotiation & Offers', count: 32, pct: '22%', color: '#7C3AED' },
    { stage: 'Unit Bookings Closed', count: 19, pct: '13%', color: '#059669' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerLogoRow}>
          <CompanyLogo variant="white" height={34} />
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>REAL ESTATE SALES ANALYTICS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Analytics" />

        {/* Revenue Performance Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox3D}>
            <View style={styles.statBoxHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                <Ionicons name="cash-outline" size={18} color="#059669" />
              </View>
              <Text style={[styles.statBadgeText, { color: '#059669' }]}>Revenue</Text>
            </View>
            <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>₹4.2 Cr</Text>
            <Text style={styles.statLabelText}>Closed Bookings Value</Text>
          </View>

          <View style={styles.statBox3D}>
            <View style={styles.statBoxHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#0284C7" />
              </View>
              <Text style={[styles.statBadgeText, { color: '#0284C7' }]}>Velocity</Text>
            </View>
            <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>18.4%</Text>
            <Text style={styles.statLabelText}>Lead Conversion Rate</Text>
          </View>
        </View>

        {/* Sales Conversion Funnel */}
        <View style={styles.chartCard3D}>
          <Text style={styles.chartTitle}>Sales Pipeline Conversion Funnel</Text>
          <Text style={styles.chartSubtitle}>Stage velocity from fresh inquiry to booking</Text>

          <View style={styles.funnelList}>
            {funnelStages.map((item, idx) => (
              <View key={idx} style={styles.funnelRow}>
                <View style={styles.funnelMetaRow}>
                  <Text style={styles.funnelStageText}>{item.stage}</Text>
                  <Text style={[styles.funnelCountText, theme.typography.tabularNumbers]}>
                    {item.count} ({item.pct})
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: item.pct as any, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
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
  headerLogoRow: {
    marginBottom: 8,
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox3D: {
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
  statBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabelText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  chartCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 20,
    fontWeight: '500',
  },
  funnelList: {
    gap: 16,
  },
  funnelRow: {
    gap: 6,
  },
  funnelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelStageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  funnelCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
});
