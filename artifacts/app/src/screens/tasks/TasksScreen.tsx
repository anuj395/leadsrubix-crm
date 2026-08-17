import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const TasksScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'All'>('Pending');

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/tasks');
      const items = res.data?.items || res.data || [];
      setTasks(items);
    } catch (err) {
      console.warn('Error fetching tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleToggleTask = async (task: any) => {
    const newStatus = task.completed || task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: newStatus, completed: !t.completed } : t))
      );
      await apiClient.put(`/tasks/${task._id}`, {
        ...task,
        status: newStatus,
        completed: newStatus === 'Completed',
      });
    } catch (err) {
      console.warn('Failed to update task:', err);
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.completed || t.status === 'Completed';
    if (activeTab === 'Pending') return !isCompleted;
    if (activeTab === 'Completed') return isCompleted;
    return true;
  });

  const renderTaskCard = ({ item }: { item: any }) => {
    const isCompleted = item.completed || item.status === 'Completed';
    const title = item.title || item.task_name || 'Untitled Site Visit / Follow-up';
    const dueDate = item.due_date || item.dueDate || 'Today, 5:00 PM';
    const leadName = item.leadName || item.associated_lead || 'General Sales Activity';
    const priority = item.priority || 'Medium';

    return (
      <View style={[styles.taskCard3D, isCompleted && styles.taskCardCompleted]}>
        <TouchableOpacity
          style={styles.checkboxTouch}
          onPress={() => handleToggleTask(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox3D, isCompleted && styles.checkbox3DChecked]}>
            {isCompleted && <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.taskTextContent}>
          <Text style={[styles.taskTitleText, isCompleted && styles.taskTitleTextCompleted]}>
            {title}
          </Text>

          <View style={styles.taskMetaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="time-outline" size={12} color="#64748B" />
              <Text style={styles.metaBadgeText}>{dueDate}</Text>
            </View>

            <View style={styles.metaBadge}>
              <Ionicons name="person-outline" size={12} color="#64748B" />
              <Text style={styles.metaBadgeText} numberOfLines={1}>{leadName}</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.priorityPill,
            priority === 'High' && styles.priorityHigh,
            priority === 'Low' && styles.priorityLow,
          ]}
        >
          <Text style={styles.priorityText}>{priority}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Sleek Executive #272944 Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={34} />

          <TouchableOpacity
            style={styles.addTaskBtnHeader}
            onPress={() => navigation.navigate('TaskForm')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addTaskBtnText}>New Task</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>SITE VISITS & BUYER FOLLOW-UPS</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {(['Pending', 'Completed', 'All'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content Stream */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.brand700} />
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<AIAdvisorMascot screenName="Tasks" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand700}
              colors={[theme.colors.brand700]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard3D}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done-circle" size={48} color={theme.colors.brand700} />
              </View>
              <Text style={styles.emptyTitle}>All Tasks Completed!</Text>
              <Text style={styles.emptySub}>
                Great job! You have no pending site visits or buyer follow-ups in this filter view.
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => navigation.navigate('TaskForm')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCreateBtnText}>+ Schedule Site Visit</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hero3DHeader: {
    width: '100%',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addTaskBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    gap: 4,
  },
  addTaskBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  headerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: theme.colors.brand700,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  taskCard3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  checkboxTouch: {
    paddingRight: 10,
  },
  checkbox3D: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox3DChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskTitleTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  priorityPill: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priorityHigh: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
  },
  priorityLow: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  emptyCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyCreateBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
