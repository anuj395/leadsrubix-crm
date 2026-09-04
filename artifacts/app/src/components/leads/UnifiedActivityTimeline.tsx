import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  tasks: any[];
  calls: any[];
  notes: any[];
  filter: 'all' | 'calls' | 'tasks';
  onFilterChange: (filter: 'all' | 'calls' | 'tasks') => void;
  onRefresh?: () => void;
}

export const UnifiedActivityTimeline: React.FC<Props> = ({
  tasks,
  calls,
  notes,
  filter,
  onFilterChange,
}) => {
  // Combine items into single chronological activity list
  const combinedActivities = React.useMemo(() => {
    const list: any[] = [];

    tasks.forEach((t) => {
      const reasonVal =
        t.callbackReason ||
        t.callBackReason ||
        t.callback_reason ||
        t.call_back_reason ||
        t.notIntReason ||
        t.lostReason ||
        t.reason ||
        '';

      const rawType = t.taskType || t.task_type || t.type || 'Call Back';
      let titleStr = rawType.toLowerCase().startsWith('follow-up')
        ? rawType
        : `Follow-up: ${rawType}`;
      if (reasonVal && !titleStr.includes(`(${reasonVal})`)) {
        titleStr = `${titleStr} (${reasonVal})`;
      }

      list.push({
        id: t._id || t.id,
        type: 'task',
        title: titleStr,
        reason: reasonVal,
        time: t.dueDate ? new Date(t.dueDate).toLocaleString() : 'Scheduled',
        status: t.status || 'PENDING',
        notes: t.notes || t.description || '',
        rawDate: t.dueDate ? new Date(t.dueDate).getTime() : 0,
      });
    });

    calls.forEach((c) => {
      list.push({
        id: c._id || c.id,
        type: 'call',
        title: `Call (${c.type || 'Outgoing'} - ${c.status || 'Connected'})`,
        time: c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Recent',
        status: c.duration || '0s',
        notes: c.remark || '',
        rawDate: c.createdAt ? new Date(c.createdAt).getTime() : 0,
      });
    });

    notes.forEach((n) => {
      list.push({
        id: n._id || n.id,
        type: 'note',
        title: `Note: ${n.note || n.content || ''}`,
        time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent',
        status: n.userEmail || 'System',
        rawDate: n.createdAt ? new Date(n.createdAt).getTime() : 0,
      });
    });

    list.sort((a, b) => b.rawDate - a.rawDate);

    if (filter === 'calls') return list.filter((i) => i.type === 'call');
    if (filter === 'tasks') return list.filter((i) => i.type === 'task');
    return list;
  }, [tasks, calls, notes, filter]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.filterTabs}>
          {(['all', 'calls', 'tasks'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => onFilterChange(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f.toUpperCase()} ({f === 'all' ? combinedActivities.length : f === 'calls' ? calls.length : tasks.length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {combinedActivities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Activity Logs Found</Text>
          <Text style={styles.emptySub}>Future follow-ups & call logs will appear in this timeline.</Text>
        </View>
      ) : (
        combinedActivities.map((act, idx) => (
          <View key={act.id || idx} style={styles.timelineItem}>
            <View style={styles.timelineIconDot}>
              <Ionicons
                name={
                  act.type === 'call'
                    ? 'call-sharp'
                    : act.type === 'task'
                    ? 'calendar-sharp'
                    : 'document-text-sharp'
                }
                size={14}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineTitle}>{act.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {act.reason ? (
                    <View style={styles.reasonBadge}>
                      <Text style={styles.reasonBadgeText}>Reason: {act.reason}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.timelineStatusBadge}>{act.status}</Text>
                </View>
              </View>

              {act.notes ? <Text style={styles.timelineNotes}>{act.notes}</Text> : null}
              <Text style={styles.timelineTime}>{act.time}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#151728',
    borderColor: '#151728',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timelineIconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timelineStatusBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reasonBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reasonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  timelineNotes: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  timelineTime: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
