import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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

  const kpis = [
    {
      key: 'totalLeads',
      label: 'Total Leads',
      value: metrics.totalLeads,
      icon: 'people-sharp' as const,
      color: '#272944',
      bgColor: 'rgba(39, 41, 68, 0.08)',
      desc: 'The total number of leads captured across all sources and campaigns.',
    },
    {
      key: 'fresh',
      label: 'Fresh Inquiries',
      value: metrics.fresh,
      icon: 'flash-sharp' as const,
      color: '#0284C7',
      bgColor: 'rgba(2, 132, 199, 0.10)',
      desc: 'Newly added leads that have not yet received a sales touchpoint.',
    },
    {
      key: 'callBack',
      label: 'Call Back',
      value: metrics.callBack,
      icon: 'call-sharp' as const,
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.10)',
      desc: 'Leads scheduled for follow-up communication at a specific time.',
    },
    {
      key: 'interested',
      label: 'Interested',
      value: metrics.interested,
      icon: 'thumbs-up-sharp' as const,
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.10)',
      desc: 'Prospects who have actively expressed high purchase intent.',
    },
    {
      key: 'closedWon',
      label: 'Closed Won',
      value: metrics.closedWon,
      icon: 'checkmark-done-circle-sharp' as const,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.10)',
      desc: 'Successfully converted opportunities resulting in finalized deal closures.',
    },
    {
      key: 'notInterested',
      label: 'Not Interested',
      value: metrics.notInterested,
      icon: 'close-circle-sharp' as const,
      color: '#E11D48',
      bgColor: 'rgba(225, 29, 72, 0.10)',
      desc: 'Leads who indicated no requirement at this stage.',
    },
    {
      key: 'closedLost',
      label: 'Closed Lost',
      value: metrics.closedLost,
      icon: 'trending-down-sharp' as const,
      color: '#64748B',
      bgColor: 'rgba(100, 116, 139, 0.10)',
      desc: 'Deals marked inactive, dropped, or lost to competitors.',
    },
    {
      key: 'completedVisits',
      label: semantics.completedVisits,
      value: metrics.completedVisits,
      icon: 'calendar-sharp' as const,
      color: '#0D9488',
      bgColor: 'rgba(13, 148, 136, 0.10)',
      desc: semantics.completedVisitsTooltip,
    },
    {
      key: 'scheduledVisits',
      label: semantics.scheduledVisits,
      value: metrics.scheduledVisits,
      icon: 'time-sharp' as const,
      color: '#EA580C',
      bgColor: 'rgba(234, 88, 12, 0.10)',
      desc: semantics.scheduledVisitsTooltip,
    },
  ];

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => (
        <TouchableOpacity
          key={kpi.key}
          style={styles.card}
          onPress={() => onSelectKpi?.(kpi.key, kpi.label)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: kpi.bgColor }]}>
              <Ionicons name={kpi.icon} size={16} color={kpi.color} />
            </View>
            <InfoGuideBadge title={kpi.label} description={kpi.desc} />
          </View>

          <Text style={styles.kpiValue}>{kpi.value}</Text>
          <Text style={styles.kpiLabel} numberOfLines={2}>
            {kpi.label}
          </Text>

          <View style={styles.drilldownHintRow}>
            <Text style={styles.drilldownText}>View List</Text>
            <Ionicons name="chevron-forward-sharp" size={10} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 112,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  drilldownHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  drilldownText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
