import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskService, TaskItem } from '../../services/taskService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { openEmail } from '../../utils/emailHelper';

export const TasksScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Post-Call Telephony Disposition State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

  // Handle route params (e.g. if navigated from Analytics KPI cards)
  useEffect(() => {
    if (route?.params?.filter) {
      const f = String(route.params.filter).toLowerCase();
      if (f.includes('completed')) setActiveFilter('COMPLETED');
      else if (f.includes('scheduled') || f.includes('pending')) setActiveFilter('PENDING');
    }
  }, [route?.params?.filter]);

  const fetchTasksData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasksData();
  }, [fetchTasksData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasksData();
  };

  const handleToggleTask = async (task: TaskItem) => {
    const nextState = !task.isCompleted;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: nextState } : t))
    );
    await taskService.toggleTaskCompletion(task.id, nextState);
  };

  const handleCall = (task: TaskItem) => {
    const phone = task.phone || (task as any).contactNumber;
    if (!phone) {
      Alert.alert('No Contact Number', 'No phone number available for this task client.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      // Note: Simulator has no cellular dialer hardware
      console.log(`[Telephony] Native dialer not available on simulator for ${phone}`);
    });

    setActiveCaller({
      contactId: task.contactId || (task as any).leadId,
      leadId: (task as any).leadId || task.contactId,
      customerName: task.leadName || (task as any).customerName || 'Task Client',
      phone: phone,
      project: task.project || '',
      stage: 'Answered',
    });

    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1000);
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    const message = `Hello ${name || 'Sir/Madam'}, this is regarding our scheduled follow-up / appointment from ${user?.organizationName || 'Leads Rubix'}.`;
    openWhatsApp(phone, message);
  };

  const handleEmail = (email?: string, name?: string) => {
    const subject = `Regarding your appointment with ${user?.organizationName || 'Leads Rubix'}`;
    const body = `Hello ${name || 'Sir/Madam'},\n\nFollowing up on our scheduled appointment from ${user?.organizationName || 'Leads Rubix'}.\n\nBest regards,\n${user?.name || 'Executive'}`;
    openEmail(email, subject, body);
  };

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    tasks.forEach((t) => {
      if (t.isCompleted) completed++;
      else pending++;
    });
    return { total: tasks.length, pending, completed };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (activeFilter === 'PENDING') return !t.isCompleted;
      if (activeFilter === 'COMPLETED') return t.isCompleted;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.leadName && t.leadName.toLowerCase().includes(q)) ||
          (t.project && t.project.toLowerCase().includes(q)) ||
          (t.phone && t.phone.includes(q)) ||
          (t.type && t.type.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, activeFilter, searchQuery]);

  const getTaskIcon = (type?: string, title?: string) => {
    const s = `${type || ''} ${title || ''}`.toLowerCase();
    if (s.includes('visit') || s.includes('site')) {
      return { name: 'location' as const, color: '#7C3AED', bg: '#F5F3FF' };
    }
    if (s.includes('call') || s.includes('phone')) {
      return { name: 'call' as const, color: '#0284C7', bg: '#EFF6FF' };
    }
    if (s.includes('meet') || s.includes('demo') || s.includes('consult')) {
      return { name: 'calendar' as const, color: '#D97706', bg: '#FFFBEB' };
    }
    return { name: 'checkmark-circle' as const, color: '#059669', bg: '#ECFDF5' };
  };

  const formatSource = (src?: string) => {
    if (!src) return 'Direct';
    const s = src.toLowerCase();
    if (s.includes('facebook') || s.includes('fb')) return 'Facebook';
    if (s.includes('google')) return 'Google';
    if (s.includes('website') || s.includes('web')) return 'Website';
    if (s.includes('instagram') || s.includes('insta')) return 'Instagram';
    if (s.includes('self')) return 'Self Gen';
    if (s.includes('walk')) return 'Walk-in';
    if (s.includes('referral') || s.includes('refer')) return 'Referral';
    return src.length > 9 ? src.substring(0, 8) + '..' : src;
  };

  const getPriorityMeta = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') {
      return { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' };
    }
    if (p === 'medium') {
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' };
    }
    return { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury Midnight #151728 Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.statusPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.statusPillText}>SCHEDULE</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder={`Search ${semantics.taskEntityPlural.toLowerCase()}, ${semantics.leadEntitySingular.toLowerCase()}, notes...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand700}
          />
        }
      >
        {/* ─── Task Filter Chips (Matching Leads / Web CRM) ─── */}
        <View style={styles.filterBarContainer}>
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            const count =
              filter === 'ALL'
                ? counts.total
                : filter === 'PENDING'
                ? counts.pending
                : counts.completed;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                  {filter}
                </Text>
                <View style={[styles.chipBadgeCircle, isSelected && styles.chipBadgeCircleSelected]}>
                  <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Task List Items ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#151728" />
            <Text style={styles.loadingText}>Fetching {semantics.taskEntityPlural.toLowerCase()} & schedule...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard3D}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="calendar-outline" size={28} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>No {semantics.taskEntityPlural} Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? `No ${semantics.taskEntityPlural.toLowerCase()} match "${searchQuery}". Try a different keyword.`
                : activeFilter === 'COMPLETED'
                ? `No completed ${semantics.taskEntityPlural.toLowerCase()} yet.`
                : `All scheduled ${semantics.taskEntityPlural.toLowerCase()} are up to date.`}
            </Text>
          </View>
        ) : (
          filteredTasks.map((item) => {
            const priorityMeta = getPriorityMeta(item.priority);

            return (
              <View key={item.id} style={styles.taskCardRow}>
                {/* Left Vertical Source Badge */}
                <View style={styles.sourceVerticalContainer}>
                  <Text style={styles.sourceVerticalText} numberOfLines={1}>
                    {formatSource(item.source)}
                  </Text>
                </View>

                {/* Main Card Body (Press opens Lead Details) */}
                <TouchableOpacity
                  style={styles.taskCardBody}
                  onPress={() => {
                    navigation.navigate('LeadDetail', {
                      leadId: item.leadId || item.id,
                      lead: {
                        id: item.leadId || item.id,
                        name: item.leadName,
                        phone: item.phone,
                        email: item.email,
                        project: item.project,
                        source: item.source,
                      },
                    });
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.taskInfoSection}>
                    <View style={styles.nameHeaderRow}>
                      <Text
                        style={[styles.taskTitleText, item.isCompleted && styles.taskTitleCompleted]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.miniStatusPill,
                          {
                            backgroundColor: item.isCompleted ? '#ECFDF5' : '#FFFBEB',
                            borderColor: item.isCompleted ? '#A7F3D0' : '#FDE68A',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniStatusDot,
                            { backgroundColor: item.isCompleted ? '#10B981' : '#F59E0B' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.miniStatusText,
                            { color: item.isCompleted ? '#047857' : '#B45309' },
                          ]}
                        >
                          {item.isCompleted ? 'DONE' : 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {item.leadName ? (
                      <View style={styles.contactItemRow}>
                        <Ionicons name="person" size={11} color="#272944" />
                        <Text style={styles.clientText} numberOfLines={1}>
                          {item.leadName}
                          {item.phone ? `  •  ${item.phone}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {item.dueDate ? (
                      <View style={styles.contactItemRow}>
                        <Ionicons name="time-outline" size={11} color="#64748B" />
                        <Text style={styles.dueDateText} numberOfLines={1}>
                          {item.dueDate}
                          {item.project ? `  •  ${item.project}` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right Quick Action Icons Cockpit (Call | WhatsApp) */}
                  <View style={styles.rightActionCockpit}>
                    {item.phone ? (
                      <TouchableOpacity
                        style={styles.circleActionBtnCall}
                        onPress={() => handleCall(item)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : null}

                    {item.email ? (
                      <>
                        <View style={styles.actionDividerLine} />
                        <TouchableOpacity
                          style={styles.circleActionBtnMail}
                          onPress={() => handleEmail(item.email, item.leadName)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="mail" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {item.phone ? (
                      <>
                        <View style={styles.actionDividerLine} />
                        <TouchableOpacity
                          style={styles.circleActionBtnWhatsApp}
                          onPress={() => handleWhatsApp(item.phone, item.leadName)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Post-Call Disposition & Logging Modal */}
      <PostCallDispositionModal
        visible={postCallModalVisible}
        onClose={() => {
          setPostCallModalVisible(false);
          setActiveCaller(null);
        }}
        caller={activeCaller}
        onSuccess={() => {
          fetchTasksData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  luxuryHeader: {
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  newTaskCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newTaskCTAText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputControl: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 2,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ─── Filter Pills ───
  filterBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  statusChipSelected: {
    backgroundColor: '#1E2238',
    borderColor: '#1E2238',
    shadowColor: '#1E2238',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  chipBadgeCircle: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  chipBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },

  // ─── Reference Compact Horizontal Task Card ───
  taskCardRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 70,
  },
  sourceVerticalContainer: {
    backgroundColor: '#272944',
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sourceVerticalText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    transform: [{ rotate: '-90deg' }],
    width: 75,
    textAlign: 'center',
  },
  taskCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  taskInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    maxWidth: 150,
  },
  taskTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  miniStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3.5,
  },
  miniStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  miniStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    marginTop: 2.5,
  },
  clientText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.1,
  },
  dueDateText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    maxWidth: 165,
  },
  rightActionCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  circleActionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtnMail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtnWhatsApp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtnToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtnToggleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionDividerLine: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 1,
  },

  // ─── Empty State ───
  emptyCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },

  // ─── Loading ───
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
