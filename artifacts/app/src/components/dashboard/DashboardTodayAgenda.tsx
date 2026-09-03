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
  onViewAll: () => void;
  onTaskPress: (task: TaskItem) => void;
  onCallTask?: (task: TaskItem) => void;
}

export const DashboardTodayAgenda: React.FC<Props> = ({
  tasks,
  industryId,
  onViewAll,
  onTaskPress,
  onCallTask,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const pendingTasks = tasks.filter((t) => !t.isCompleted).slice(0, 3);

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
    const text = `Hi ${name || 'Sir/Madam'}, connecting regarding your scheduled appointment / follow-up from Leads Rubix.`;
    openWhatsApp(phone, text);
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
            No pending {semantics.visitsDesc.toLowerCase()} or follow-ups requiring immediate attention.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={15} color="#272944" />
            <Text style={styles.emptyActionBtnText}>Manage Schedule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {pendingTasks.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.taskItem}
              onPress={() => onTaskPress(t)}
              activeOpacity={0.85}
            >
              <View style={styles.taskLeft}>
                <View
                  style={[
                    styles.priorityBar,
                    {
                      backgroundColor:
                        t.priority === 'High'
                          ? '#E11D48'
                          : t.priority === 'Medium'
                          ? '#D97706'
                          : '#059669',
                    },
                  ]}
                />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.leadName}>{t.leadName || 'Client'}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.timeText}>{t.dueDate}</Text>
                  </View>
                </View>
              </View>

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
          ))}
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
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  leadName: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: '600',
  },
  dot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
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
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272944',
  },
});
