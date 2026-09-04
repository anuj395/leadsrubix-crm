import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardMetrics } from '../../services/analyticsService';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { InfoGuideBadge } from '../ui/InfoGuideBadge';

interface Props {
  metrics: CardMetrics;
  industryId?: string;
  onSelectKpi?: (filterKey: string, label: string) => void;
}

export const DashboardKpiGrid: React.FC<Props> = ({
  metrics,
  industryId,
  onSelectKpi,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const [scrollProgress, setScrollProgress] = useState(0);

  const kpis = [
    {
      key: 'totalLeads',
      label: `TOTAL ${semantics.leadEntityPlural.toUpperCase()}`,
      value: metrics.totalLeads,
      icon: 'people' as const,
      color: '#272944',
      bgColor: '#EEF2FF',
    },
    {
      key: 'fresh',
      label: semantics.freshLabel.toUpperCase(),
      value: metrics.fresh,
      icon: 'sparkles' as const,
      color: '#0284C7',
      bgColor: '#E0F2FE',
    },
    {
      key: 'callBack',
      label: 'CALL BACK',
      value: metrics.callBack,
      icon: 'call' as const,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      key: 'interested',
      label: 'INTERESTED',
      value: metrics.interested,
      icon: 'heart' as const,
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
    },
    {
      key: 'closedWon',
      label: semantics.wonLabel.toUpperCase(),
      value: metrics.closedWon,
      icon: 'checkmark-done-circle' as const,
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      key: 'notInterested',
      label: 'NOT INTERESTED',
      value: metrics.notInterested,
      icon: 'close-circle' as const,
      color: '#64748B',
      bgColor: '#F1F5F9',
    },
    {
      key: 'closedLost',
      label: 'CLOSED LOST',
      value: metrics.closedLost,
      icon: 'trending-down' as const,
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
    {
      key: 'completedVisits',
      label: semantics.completedVisits.toUpperCase(),
      value: metrics.completedVisits,
      icon: 'calendar' as const,
      color: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      key: 'scheduledVisits',
      label: semantics.scheduledVisits.toUpperCase(),
      value: metrics.scheduledVisits,
      icon: 'time' as const,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScroll = contentSize.width - layoutMeasurement.width;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, contentOffset.x / maxScroll)));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>KEY METRICS OVERVIEW</Text>
          <Text style={styles.sectionSub}>Live pipeline health & volume</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Visual Scroll Affordance Hint Pill */}
          <View style={styles.swipeHintPill}>
            <Ionicons name="swap-horizontal" size={11} color="#0284C7" />
            <Text style={styles.swipeHintText}>Swipe for more</Text>
          </View>
          <InfoGuideBadge
            title="Key Metrics"
            description="Real-time aggregation across all pipeline stages, site visits, and outcomes for the selected timeframe."
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {kpis.map((kpi) => (
          <TouchableOpacity
            key={kpi.key}
            style={styles.kpiCard}
            onPress={() => onSelectKpi?.(kpi.key, kpi.label)}
            activeOpacity={0.82}
          >
            {/* Micro Top Accent Strip */}
            <View style={[styles.topAccentBar, { backgroundColor: kpi.color }]} />

            <View style={styles.cardInnerPadding}>
              <View style={styles.kpiCardTop}>
                <View style={[styles.kpiIconBox, { backgroundColor: kpi.bgColor }]}>
                  <Ionicons name={kpi.icon} size={13} color={kpi.color} />
                </View>
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={9.5} color="#94A3B8" />
                </View>
              </View>

              <View style={styles.kpiBottomGroup}>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel} numberOfLines={1}>
                  {kpi.label}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Micro Track Bar Indicator */}
      <View style={styles.scrollTrackContainer}>
        <View style={styles.scrollTrackBg}>
          <View
            style={[
              styles.scrollTrackThumb,
              { left: `${scrollProgress * 65}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  swipeHintText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
  },
  sectionSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  scrollRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  kpiCard: {
    width: 114,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 2.5,
    width: '100%',
  },
  cardInnerPadding: {
    paddingVertical: 9,
    paddingHorizontal: 9,
  },
  kpiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiIconBox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiBottomGroup: {
    marginTop: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  scrollTrackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  scrollTrackBg: {
    width: 42,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  scrollTrackThumb: {
    width: 15,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0284C7',
    position: 'absolute',
    top: 0,
  },
});
