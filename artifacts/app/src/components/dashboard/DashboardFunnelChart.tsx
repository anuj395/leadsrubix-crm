import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { FunnelStage } from '../../services/analyticsService';
import { InfoGuideBadge } from '../ui/InfoGuideBadge';

interface Props {
  stages: FunnelStage[];
  conversionRate: string;
  revenue: string;
}

export const DashboardFunnelChart: React.FC<Props> = ({
  stages,
  conversionRate,
  revenue,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>SALES PIPELINE CONVERSION</Text>
          <Text style={styles.subtitle}>Funnel progression velocity</Text>
        </View>
        <InfoGuideBadge
          title="Conversion Funnel"
          description="Visualizes lead drop-off and conversion rates through key pipeline milestones: Inquiry → Contacted → Qualified/Visit → Won."
        />
      </View>

      <View style={styles.summaryBarRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>TOTAL REVENUE</Text>
          <Text style={styles.summaryValue}>{revenue}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>CONVERSION RATE</Text>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{conversionRate}</Text>
        </View>
      </View>

      <View style={styles.funnelList}>
        {stages.map((stage, idx) => {
          const rawPct = parseInt(stage.pct, 10) || 0;
          const barWidthPct = Math.max(rawPct, 6); // Min visual bar

          return (
            <View key={stage.stage} style={styles.stageItem}>
              <View style={styles.stageTopRow}>
                <View style={styles.stageTitleRow}>
                  <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                  <Text style={styles.stageName}>{stage.stage}</Text>
                </View>
                <View style={styles.stageStatsRow}>
                  <Text style={styles.stageCount}>{stage.count}</Text>
                  <Text style={styles.stagePct}>({stage.pct})</Text>
                </View>
              </View>

              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidthPct}%`,
                      backgroundColor: stage.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  summaryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  funnelList: {
    gap: 12,
  },
  stageItem: {},
  stageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  stageName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stageStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stagePct: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
