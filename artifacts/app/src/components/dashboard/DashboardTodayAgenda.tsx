import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '../../services/taskService';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { theme } from '../../theme/theme';
import { openWhatsApp } from '../../utils/whatsappHelper';

interface Props {
  tasks: TaskItem[];
  industryId?: string;
  organizationName?: string;
  onViewAll: () => void;
  onTaskPress: (task: TaskItem) => void;
  onCallTask?: (task: TaskItem) => void;
  onToggleTask?: (task: TaskItem) => void;
}

export const DashboardTodayAgenda: React.FC<Props> = ({
  tasks,
  industryId,
  organizationName,
  onViewAll,
  onTaskPress,
  onCallTask,
  onToggleTask,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const pendingTasks = React.useMemo(() => {
    return tasks
      .filter((t) => !t.isCompleted)
      .sort((a, b) => {
        const pOrder: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
        const pa = pOrder[a.priority] || 2;
        const pb = pOrder[b.priority] || 2;
        return pa - pb;
      })
      .slice(0, 3);
  }, [tasks]);

  const handleCall = (task: TaskItem) => {
    if (onCallTask) {
      onCallTask(task);
      return;
    }
    const phone = task.phone || (task as any).contactNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    const orgSuffix = organizationName ? ` from ${organizationName}` : '';
    const text = `Hi ${name || 'Sir/Madam'}, connecting regarding your scheduled ${semantics.taskEntitySingular.toLowerCase()} / follow-up${orgSuffix}.`;
    openWhatsApp(phone, text);
  };

  const getSmartTime = (task: TaskItem): { text: string; isOverdue: boolean } => {
    const raw = task.rawDueDate;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        const isPast = d.getTime() < now.getTime();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isToday = d.toDateString() === now.toDateString();

        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = d.toDateString() === tomorrow.toDateString();

        if (isToday) {
          return { text: `Today at ${timeStr}`, isOverdue: isPast };
        }
        if (isTomorrow) {
          return { text: `Tomorrow at ${timeStr}`, isOverdue: false };
        }
        if (isPast) {
          const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
          return { text: `${dateStr} at ${timeStr}`, isOverdue: true };
        }
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return { text: `${dateStr} at ${timeStr}`, isOverdue: false };
      }
    }

    const str = task.dueDate || 'Today';
    const isOverdue = str.toLowerCase().includes('yesterday') || str.toLowerCase().includes('ago');
    return { text: str, isOverdue };
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-sharp" size={15} color="#D97706" />
          </View>
          <View>
            <Text style={styles.title}>TODAY'S SCHEDULE & {semantics.visitsDesc.toUpperCase()}</Text>
            <Text style={styles.subtitle}>
              {pendingTasks.length} {pendingTasks.length === 1 ? 'Action' : 'Actions'} Scheduled
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward-sharp" size={12} color={theme.colors.brand700} />
        </TouchableOpacity>
      </View>

      {pendingTasks.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done-circle-sharp" size={26} color="#10B981" />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up For Today</Text>
          <Text style={styles.emptyText}>
            No pending {semantics.siteVisit ? `${semantics.siteVisit.toLowerCase()}s` : 'tasks'} or follow-ups requiring immediate attention.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color="#334155" />
            <Text style={styles.emptyActionBtnText}>Manage Schedule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {pendingTasks.map((t) => {
            const smartTime = getSmartTime(t);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.taskItem,
                  smartTime.isOverdue && styles.taskItemOverdue,
                ]}
                onPress={() => onTaskPress(t)}
                activeOpacity={0.85}
              >
                {/* 1-Tap Circular Completion Toggle */}
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => onToggleTask?.(t)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={t.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={t.isCompleted ? '#10B981' : smartTime.isOverdue ? '#F43F5E' : '#94A3B8'}
                  />
                </TouchableOpacity>

                {/* Priority Left Accent */}
                <View
                  style={[
                    styles.priorityBar,
                    {
                      backgroundColor:
                        smartTime.isOverdue
                          ? '#E11D48'
                          : t.priority === 'High'
                          ? '#E11D48'
                          : t.priority === 'Medium'
                          ? '#D97706'
                          : '#059669',
                    },
                  ]}
                />

                {/* Center Content: Title, Lead Name, Project, Time */}
                <View style={styles.taskBody}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.taskTitle,
                        t.isCompleted && styles.taskTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                    {smartTime.isOverdue && !t.isCompleted && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>OVERDUE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.taskMetaRow}>
                    <Text style={styles.leadName} numberOfLines={1}>
                      {t.leadName || 'Client'}
                    </Text>
                    {t.project ? (
                      <>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.projectText} numberOfLines={1}>
                          {t.project}
                        </Text>
                      </>
                    ) : null}
                  </View>

                  <View style={styles.timeRow}>
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={smartTime.isOverdue ? '#E11D48' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.timeText,
                        smartTime.isOverdue && styles.timeTextOverdue,
                      ]}
                    >
                      {smartTime.text}
                    </Text>
                  </View>
                </View>

                {/* Right Action Buttons */}
                {t.phone ? (
                  <View style={styles.actionsGroup}>
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleWhatsApp(t.phone, t.leadName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall(t)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward-sharp" size={14} color="#94A3B8" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  list: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskItemOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  checkboxTouch: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBar: {
    width: 3.5,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  taskBody: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#F87171',
  },
  overdueBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  leadName: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: '600',
    maxWidth: 120,
  },
  projectText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  dot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  timeTextOverdue: {
    color: '#E11D48',
    fontWeight: '700',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whatsappBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
});
