import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '../../services/taskService';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { theme } from '../../theme/theme';

interface Props {
  tasks: TaskItem[];
  industryId?: string;
  onViewAll: () => void;
  onTaskPress: (task: TaskItem) => void;
}

export const DashboardTodayAgenda: React.FC<Props> = ({
  tasks,
  industryId,
  onViewAll,
  onTaskPress,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const pendingTasks = tasks.filter((t) => !t.isCompleted).slice(0, 3);

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-sharp" size={14} color="#D97706" />
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
          <Ionicons name="checkmark-circle-outline" size={24} color="#059669" />
          <Text style={styles.emptyText}>No pending {semantics.visitsDesc.toLowerCase()} or follow-ups scheduled.</Text>
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
                <TouchableOpacity
                  style={styles.callActionBtn}
                  onPress={() => handleCall(t.phone)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={13} color="#FFFFFF" />
                </TouchableOpacity>
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityBar: {
    width: 3.5,
    height: 28,
    borderRadius: 2,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  leadName: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  dot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timeText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  callActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
