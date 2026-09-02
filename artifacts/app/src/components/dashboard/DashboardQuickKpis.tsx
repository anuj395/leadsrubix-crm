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
          style={[styles.card, { borderLeftColor: item.color }]}
          onPress={() => onSelectKpi(item.key, item.label)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={16} color={item.color} />
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-forward-sharp" size={13} color="#94A3B8" />
            </View>
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
    gap: 10,
    marginBottom: 16,
  },
  card: {
    width: '48.4%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  kpiLabel: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
