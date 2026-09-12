import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ActivityFilterType = 'all' | 'calls' | 'tasks' | 'notes' | 'deals' | 'stage';

interface Props {
  tasks?: any[];
  calls?: any[];
  notes?: any[];
  deals?: any[];
  inquiries?: any[];
  stageHistory?: any[];
  filter?: ActivityFilterType;
  onFilterChange?: (filter: ActivityFilterType) => void;
  onRefresh?: () => void;
}

export const UnifiedActivityTimeline: React.FC<Props> = ({
  tasks = [],
  calls = [],
  notes = [],
  deals = [],
  inquiries = [],
  stageHistory = [],
  filter = 'all',
  onFilterChange,
}) => {
  // Combine all 6 activity streams into single chronological timeline
  const combinedActivities = React.useMemo(() => {
    const list: any[] = [];

    // 1. Tasks
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

      const isCompleted = String(t.status || '').toUpperCase() === 'COMPLETED';
      const isCancelled = String(t.status || '').toUpperCase() === 'CANCELLED';

      list.push({
        id: t._id || t.id,
        type: 'task',
        title: titleStr,
        reason: reasonVal,
        time: t.dueDate ? new Date(t.dueDate).toLocaleString() : 'Scheduled',
        status: isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Pending',
        notes: t.notes || t.description || '',
        rawDate: t.dueDate ? new Date(t.dueDate).getTime() : t.createdAt ? new Date(t.createdAt).getTime() : 0,
      });
    });

    // 2. Calls
    calls.forEach((c) => {
      const durationStr = c.duration ? (typeof c.duration === 'number' ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : String(c.duration)) : '0s';
      list.push({
        id: c._id || c.id,
        type: 'call',
        title: `Call (${c.type || c.callType || 'Outgoing'} - ${c.status || c.callStatus || 'Connected'})`,
        time: c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Recent',
        status: durationStr,
        notes: c.remark || c.notes || '',
        rawDate: c.createdAt ? new Date(c.createdAt).getTime() : 0,
      });
    });

    // 3. Notes
    notes.forEach((n) => {
      const txt = typeof n === 'string' ? n : (n.content || n.note || n.notes || n.text || n.description || '');
      if (!txt.trim()) return;
      list.push({
        id: n._id || n.id,
        type: 'note',
        title: 'Note Added',
        time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent',
        status: n.author || n.userName || 'Saved',
        notes: txt,
        rawDate: n.createdAt ? new Date(n.createdAt).getTime() : 0,
      });
    });

    // 4. Deals
    deals.forEach((d) => {
      const amt = d.amount != null ? `₹${Number(d.amount).toLocaleString('en-IN')}` : '₹0';
      list.push({
        id: d._id || d.id,
        type: 'deal',
        title: `Deal: ${d.title || d.name || 'Sales Opportunity'}`,
        time: d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Recent',
        status: `${d.stage || 'New'} (${amt})`,
        notes: d.notes ? `Strategy: ${d.notes}` : '',
        rawDate: d.createdAt ? new Date(d.createdAt).getTime() : 0,
      });
    });

    // 5. Inquiries
    inquiries.forEach((inq, idx) => {
      const proj = inq.project_name || inq.projectName || inq.subject || inq.property_type || inq.propertyType;
      const src = inq.source || 'Inbound';
      const bud = inq.budget;
      const nTxt = inq.notes || inq.description || '';
      list.push({
        id: inq._id || inq.inquiry_id || `inq-${idx}`,
        type: 'inquiry',
        title: proj ? `Inbound Inquiry: ${proj}` : `Inbound Lead (${src})`,
        time: inq.created_at || inq.createdAt ? new Date(inq.created_at || inq.createdAt).toLocaleString() : 'Recent',
        status: inq.status || 'INBOUND',
        notes: nTxt ? (bud ? `Budget: ${bud}\nNotes: ${nTxt}` : nTxt) : (bud ? `Budget: ${bud}` : ''),
        rawDate: inq.created_at || inq.createdAt ? new Date(inq.created_at || inq.createdAt).getTime() : 0,
      });
    });

    // 6. Stage History
    stageHistory.forEach((s, idx) => {
      const isInitial = (!s.fromStage && !s.from_stage) || s.reason === 'Initial Lead Registration';
      const titleStr = isInitial ? `Lead Registered (${s.stage || s.toStage || 'FRESH'})` : `Stage Changed to ${s.stage || s.toStage}`;
      const otherR = s.otherReason || s.other_reason;
      const rStr = s.reason ? (otherR ? `Reason: ${s.reason} (${otherR})` : `Reason: ${s.reason}`) : '';
      list.push({
        id: s._id || `stage-${idx}`,
        type: 'stage',
        title: titleStr,
        time: s.timestamp || s.createdAt ? new Date(s.timestamp || s.createdAt).toLocaleString() : 'Recent',
        status: s.stage || s.toStage || 'Updated',
        notes: rStr,
        author: s.changedBy || s.changed_by || s.createdBy || 'System',
        rawDate: s.timestamp || s.createdAt ? new Date(s.timestamp || s.createdAt).getTime() : 0,
      });
    });

    list.sort((a, b) => b.rawDate - a.rawDate);

    if (filter === 'calls') return list.filter((i) => i.type === 'call');
    if (filter === 'tasks') return list.filter((i) => i.type === 'task');
    if (filter === 'notes') return list.filter((i) => i.type === 'note');
    if (filter === 'deals') return list.filter((i) => i.type === 'deal');
    if (filter === 'stage') return list.filter((i) => i.type === 'stage');
    return list;
  }, [tasks, calls, notes, deals, inquiries, stageHistory, filter]);

  const getIconName = (type: string) => {
    switch (type) {
      case 'call': return 'call';
      case 'task': return 'calendar';
      case 'note': return 'document-text';
      case 'deal': return 'briefcase';
      case 'inquiry': return 'mail';
      case 'stage': return 'swap-horizontal';
      default: return 'time-outline';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'call': return '#0284C7';
      case 'task': return '#D97706';
      case 'note': return '#059669';
      case 'deal': return '#4F46E5';
      case 'inquiry': return '#16A34A';
      case 'stage': return '#DB2777';
      default: return '#64748B';
    }
  };

  const getDotBg = (type: string) => {
    switch (type) {
      case 'call': return '#E0F2FE';
      case 'task': return '#FEF3C7';
      case 'note': return '#ECFDF5';
      case 'deal': return '#EEF2FF';
      case 'inquiry': return '#DCFCE7';
      case 'stage': return '#FDF2F8';
      default: return '#F1F5F9';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {(['all', 'calls', 'tasks', 'notes', 'deals', 'stage'] as const).map((f) => {
            const count = f === 'all'
              ? combinedActivities.length
              : f === 'calls'
              ? calls.length
              : f === 'tasks'
              ? tasks.length
              : f === 'notes'
              ? notes.length
              : f === 'deals'
              ? deals.length
              : stageHistory.length;

            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => onFilterChange?.(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f.toUpperCase()} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {combinedActivities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Activity Logs Found</Text>
          <Text style={styles.emptySub}>Future follow-ups, notes, stage transitions & call logs will appear in this timeline.</Text>
        </View>
      ) : (
        combinedActivities.map((act, idx) => (
          <View key={act.id || idx} style={styles.timelineItem}>
            <View style={[styles.timelineIconDot, { backgroundColor: getDotBg(act.type) }]}>
              <Ionicons
                name={getIconName(act.type) as any}
                size={14}
                color={getIconColor(act.type)}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                {act.author ? <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#64748B' }}>By {act.author}</Text> : <View />}
                <Text style={styles.timelineTime}>{act.time}</Text>
              </View>
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
    backgroundColor: '#272944',
    borderColor: '#272944',
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
    backgroundColor: '#272944',
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
    color: '#272944',
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
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
