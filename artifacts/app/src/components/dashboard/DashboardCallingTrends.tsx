import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallDurationBuckets, CallingTrendItem } from '../../services/analyticsService';
import { InfoGuideBadge } from '../ui/InfoGuideBadge';

interface Props {
  durations: CallDurationBuckets;
  trends: CallingTrendItem[];
}

export const DashboardCallingTrends: React.FC<Props> = ({ durations, trends }) => {
  const totalCalls =
    durations.duration0 +
    durations.duration0_30 +
    durations.duration31_60 +
    durations.duration61_120 +
    durations.durationAbove120;

  const buckets = [
    { label: '0s (Missed)', count: durations.duration0, color: '#E11D48' },
    { label: '1 - 30s', count: durations.duration0_30, color: '#D97706' },
    { label: '31 - 60s', count: durations.duration31_60, color: '#0284C7' },
    { label: '61 - 120s', count: durations.duration61_120, color: '#7C3AED' },
    { label: '> 120s (Pitch)', count: durations.durationAbove120, color: '#059669' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="call-sharp" size={15} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.title}>CALL ACTIVITY & DURATION</Text>
            <Text style={styles.subtitle}>
              {totalCalls} Total Outbound & Connected Calls
            </Text>
          </View>
        </View>

        <InfoGuideBadge
          title="Call Durations"
          description="Monitors team talk-time breakdown across key duration buckets: Missed, Brief (1-30s), Mid (31-60s), Deep Conversation (61-120s), and Sales Pitch (>120s)."
        />
      </View>

      <View style={styles.bucketList}>
        {buckets.map((b) => {
          const pct = totalCalls > 0 ? Math.round((b.count / totalCalls) * 100) : 0;
          const barWidth = Math.max(pct, b.count > 0 ? 8 : 2);

          return (
            <View key={b.label} style={styles.bucketRow}>
              <View style={styles.bucketLabelGroup}>
                <View style={[styles.dot, { backgroundColor: b.color }]} />
                <Text style={styles.bucketLabel}>{b.label}</Text>
              </View>

              <View style={styles.bucketBarTrack}>
                <View
                  style={[
                    styles.bucketBarFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: b.color,
                    },
                  ]}
                />
              </View>

              <Text style={styles.bucketCount}>{b.count}</Text>
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
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
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
  bucketList: {
    gap: 10,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bucketLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 96,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bucketLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  bucketBarTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  bucketBarFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  bucketCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    width: 28,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
