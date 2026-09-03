import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskAnalyticsRow } from '../../services/analyticsService';
import { InfoGuideBadge } from '../ui/InfoGuideBadge';
import { getIndustrySemantics } from '../../utils/industryLabels';

interface Props {
  tasks: TaskAnalyticsRow[];
  industryId?: string;
  onAssociatePress?: (associate: string) => void;
}

export const DashboardTasksAnalytics: React.FC<Props> = ({
  tasks,
  industryId,
  onAssociatePress,
}) => {
  const semantics = getIndustrySemantics(industryId);

  // Calculate aggregate distribution
  let totalMeeting = 0;
  let totalCallBack = 0;
  let totalSiteVisit = 0;

  tasks.forEach((t) => {
    totalMeeting += t.meeting;
    totalCallBack += t.callBack;
    totalSiteVisit += t.siteVisit;
  });

  const totalTasks = totalMeeting + totalCallBack + totalSiteVisit;
  const meetingPct = totalTasks > 0 ? Math.round((totalMeeting / totalTasks) * 100) : 0;
  const callbackPct = totalTasks > 0 ? Math.round((totalCallBack / totalTasks) * 100) : 0;
  const visitPct = totalTasks > 0 ? Math.round((totalSiteVisit / totalTasks) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* ─── Card 1: Completed Tasks by Associate ─── */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>COMPLETED {semantics.taskEntityPlural.toUpperCase()} BY ASSOCIATE</Text>
            <Text style={styles.subtitle}>Execution volume per team member</Text>
          </View>
          <InfoGuideBadge
            title="Completed Tasks"
            description="Measures finished client touchpoints (Meetings, Calls, Site Visits) by each team member."
          />
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="clipboard-outline" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Completed {semantics.taskEntityPlural}</Text>
            <Text style={styles.emptySub}>No completed {semantics.taskEntityPlural.toLowerCase()} recorded for this timeframe.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {tasks.map((row, idx) => (
              <TouchableOpacity
                key={`${row.associate}-${idx}`}
                style={styles.taskRow}
                onPress={() => onAssociatePress?.(row.associate)}
                activeOpacity={0.8}
              >
                <View style={styles.associateTopRow}>
                  <View style={styles.associateInfo}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {row.associate.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.associateName}>{row.associate}</Text>
                      <Text style={styles.associateSub}>Sales Assignee</Text>
                    </View>
                  </View>

                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{row.total} Completed</Text>
                  </View>
                </View>

                {/* Sub-counts row */}
                <View style={styles.pillsRow}>
                  <View style={[styles.pill, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                    <Ionicons name="people" size={11} color="#059669" />
                    <Text style={[styles.pillText, { color: '#059669' }]}>
                      {semantics.meeting}: {row.meeting}
                    </Text>
                  </View>

                  <View style={[styles.pill, { backgroundColor: 'rgba(37, 99, 235, 0.10)' }]}>
                    <Ionicons name="call" size={11} color="#2563EB" />
                    <Text style={[styles.pillText, { color: '#2563EB' }]}>
                      Call Back: {row.callBack}
                    </Text>
                  </View>

                  <View style={[styles.pill, { backgroundColor: 'rgba(124, 58, 237, 0.10)' }]}>
                    <Ionicons name="calendar" size={11} color="#7C3AED" />
                    <Text style={[styles.pillText, { color: '#7C3AED' }]}>
                      {semantics.siteVisit}: {row.siteVisit}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ─── Card 2: Completed Tasks Distribution ─── */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>COMPLETED TASKS DISTRIBUTION</Text>
            <Text style={styles.subtitle}>Activity category breakdown</Text>
          </View>
          <InfoGuideBadge
            title="Distribution"
            description="Visual ratio of completed task types across Meetings, Calls, and Site Visits."
          />
        </View>

        {/* Multi-segment Progress Bar */}
        <View style={styles.distBarTrack}>
          {meetingPct > 0 && (
            <View
              style={[
                styles.distBarSegment,
                { width: `${meetingPct}%`, backgroundColor: '#10B981' },
              ]}
            />
          )}
          {callbackPct > 0 && (
            <View
              style={[
                styles.distBarSegment,
                { width: `${callbackPct}%`, backgroundColor: '#2563EB' },
              ]}
            />
          )}
          {visitPct > 0 && (
            <View
              style={[
                styles.distBarSegment,
                { width: `${visitPct}%`, backgroundColor: '#7C3AED' },
              ]}
            />
          )}
          {totalTasks === 0 && (
            <View
              style={[
                styles.distBarSegment,
                { width: '100%', backgroundColor: '#E2E8F0' },
              ]}
            />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendLabel}>Meeting ({totalMeeting})</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendLabel}>Call ({totalCallBack})</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
            <Text style={styles.legendLabel}>{semantics.siteVisit} ({totalSiteVisit})</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
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
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  list: {
    gap: 10,
  },
  taskRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  associateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  associateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  associateName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  associateSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  totalBadge: {
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#272944',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  distBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 12,
  },
  distBarSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
