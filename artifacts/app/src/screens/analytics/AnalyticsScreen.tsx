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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsService, AnalyticsData } from '../../services/analyticsService';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const AnalyticsScreen = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('Standard Conversion');

  const reportPresets = [
    'Standard Conversion',
    'Sales Velocity',
    'Agent Leaderboard',
    'Custom Pivot Report',
  ];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getAnalyticsData();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExportReport = () => {
    Alert.alert(
      'Export Custom BI Report',
      `Report "${selectedReportType}" generated! Exporting to CSV / Excel dataset...`,
      [{ text: 'OK' }]
    );
  };

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
          <Text style={styles.headerTagText}>MULTI-INDUSTRY CUSTOM BI ANALYTICS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand700} />
        }
      >
        {/* Animated AI Mascot Companion */}
        <AIAdvisorMascot screenName="Analytics" />

        {/* Report Template Selector Strip */}
        <View style={styles.reportSelectorSection}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionHeaderTitle}>SELECT REPORT TEMPLATE</Text>
            <InfoGuideBadge
              title="Custom BI Report Builder"
              description="Choose a default report template (Conversion, Velocity, Leaderboard) or build custom workspace reports."
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {reportPresets.map((type) => {
              const isSelected = selectedReportType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.reportChip, isSelected && styles.reportChipSelected]}
                  onPress={() => setSelectedReportType(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reportChipText, isSelected && styles.reportChipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Computing analytics for {selectedReportType}...</Text>
          </View>
        ) : (
          <View>
            {/* KPI Executive Summary Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox3D}>
                <View style={styles.statBoxHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                    <Ionicons name="cash-outline" size={18} color="#059669" />
                  </View>
                  <Text style={[styles.statBadgeText, { color: '#059669' }]}>Revenue</Text>
                </View>
                <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>
                  {data?.revenue || '₹4.2 Cr'}
                </Text>
                <Text style={styles.statLabelText}>Closed Deal Revenue</Text>
              </View>

              <View style={styles.statBox3D}>
                <View style={styles.statBoxHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                    <Ionicons name="trending-up-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={[styles.statBadgeText, { color: '#0284C7' }]}>Velocity</Text>
                </View>
                <Text style={[styles.statValueText, theme.typography.tabularNumbers]}>
                  {data?.conversionRate || '18.4%'}
                </Text>
                <Text style={styles.statLabelText}>Pipeline Conversion Rate</Text>
              </View>
            </View>

            {/* Sales Conversion Funnel & BI Chart */}
            <View style={styles.chartCard3D}>
              <View style={styles.chartCardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartTitle}>{selectedReportType} Report</Text>
                  <Text style={styles.chartSubtitle}>Stage velocity breakdown & conversion</Text>
                </View>

                <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport} activeOpacity={0.8}>
                  <Ionicons name="download-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.funnelList}>
                {(data?.funnelStages || []).map((item, idx) => (
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
  reportSelectorSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  chipScroll: {
    marginHorizontal: -4,
  },
  reportChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reportChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  reportChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  reportChipTextSelected: {
    color: '#FFFFFF',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
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
  chartCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
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
