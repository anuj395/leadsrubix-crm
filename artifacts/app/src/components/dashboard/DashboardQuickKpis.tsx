import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardMetrics } from '../../services/analyticsService';
import { getIndustrySemantics } from '../../utils/industryLabels';

interface Props {
  metrics: CardMetrics;
  industryId?: string;
  onSelectKpi: (filterKey: string, label: string) => void;
}

export const DashboardQuickKpis: React.FC<Props> = ({
  metrics,
  industryId,
  onSelectKpi,
}) => {
  const semantics = getIndustrySemantics(industryId);

  const kpiItems = [
    {
      key: 'totalLeads',
      label: `Total ${semantics.leadEntityPlural}`,
      value: metrics.totalLeads,
      icon: 'people-sharp' as const,
      color: '#272944',
      bg: 'rgba(39, 41, 68, 0.08)',
    },
    {
      key: 'callBack',
      label: semantics.inPipelineLabel,
      value: metrics.callBack + metrics.interested,
      icon: 'sync-sharp' as const,
      color: '#D97706',
      bg: 'rgba(217, 119, 6, 0.08)',
    },
    {
      key: 'completedVisits',
      label: semantics.completedVisits,
      value: metrics.completedVisits + metrics.scheduledVisits,
      icon: 'calendar-sharp' as const,
      color: '#7C3AED',
      bg: 'rgba(124, 58, 237, 0.08)',
    },
    {
      key: 'closedWon',
      label: semantics.wonLabel,
      value: metrics.closedWon,
      icon: 'trophy-sharp' as const,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
    },
  ];

  return (
    <View style={styles.grid}>
      {kpiItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.card}
          onPress={() => onSelectKpi(item.key, item.label)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={15} color={item.color} />
            </View>
            <Ionicons name="arrow-forward-sharp" size={12} color="#94A3B8" />
          </View>

          <Text style={styles.kpiValue}>{item.value}</Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {item.label}
          </Text>
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
    marginBottom: 14,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  kpiLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
