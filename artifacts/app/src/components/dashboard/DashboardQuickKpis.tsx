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
      bg: '#EEF2FF',
    },
    {
      key: 'callBack',
      label: semantics.inPipelineLabel,
      value: metrics.callBack + metrics.interested,
      icon: 'sync-sharp' as const,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      key: 'completedVisits',
      label: semantics.completedVisits,
      value: metrics.completedVisits + metrics.scheduledVisits,
      icon: 'calendar-sharp' as const,
      color: '#7C3AED',
      bg: '#EDE9FE',
    },
    {
      key: 'closedWon',
      label: semantics.wonLabel,
      value: metrics.closedWon,
      icon: 'trophy-sharp' as const,
      color: '#059669',
      bg: '#D1FAE5',
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
          {/* Top Accent Strip */}
          <View style={[styles.topAccentBar, { backgroundColor: item.color }]} />

          <View style={styles.cardInnerPadding}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View style={styles.arrowCircle}>
                <Ionicons name="chevron-forward-sharp" size={12} color="#94A3B8" />
              </View>
            </View>

            <Text style={styles.kpiValue}>{item.value}</Text>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              {item.label}
            </Text>
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
    gap: 10,
    marginBottom: 16,
  },
  card: {
    width: '48.4%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 3.5,
    width: '100%',
  },
  cardInnerPadding: {
    padding: 13,
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
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
