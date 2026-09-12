import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';

type TaskFilterKey = 'ALL' | 'MY_TASKS' | 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'DONE';

export const TasksScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Status Filter Tabs matching Leads Screen
  const [activeFilter, setActiveFilter] = useState<TaskFilterKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Task Detail Modal State
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);

  // Post-Call Telephony Disposition State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

  // Handle route params (e.g. if navigated from Analytics KPI cards or tables)
  useEffect(() => {
    const rawFilter = route?.params?.filter;
    const directAssociate = route?.params?.associate || (typeof rawFilter === 'object' ? rawFilter?.associate : null);
    if (directAssociate) {
      setSearchQuery(String(directAssociate));
    }

    const f = typeof rawFilter === 'object'
      ? String(rawFilter?.filter || rawFilter?.taskType || '').toLowerCase()
      : String(rawFilter || '').toLowerCase();

    if (f.includes('completed') || f.includes('done')) setActiveFilter('DONE');
    else if (f.includes('overdue')) setActiveFilter('OVERDUE');
    else if (f.includes('today')) setActiveFilter('TODAY');
    else if (f.includes('upcoming') || f.includes('scheduled') || f.includes('pending')) setActiveFilter('UPCOMING');
  }, [route?.params]);

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
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: nextState, urgency: nextState ? 'COMPLETED' : 'TODAY' } : t))
    );
    await taskService.toggleTaskCompletion(task.id, nextState);
    fetchTasksData();
  };

  const handleCall = (task: TaskItem) => {
    const phone = task.phone || (task as any).contactNumber;
    if (!phone) {
      Alert.alert('No Contact Number', 'No phone number available for this task client.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
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

  // Metrics computation matching Leads screen
  const counts = useMemo(() => {
    let today = 0;
    let overdue = 0;
    let upcoming = 0;
    let done = 0;
    let myTasks = 0;
    const myEmail = (user?.email || '').toLowerCase().trim();
    const myUid = String(user?.id || (user as any)?._id || '').toLowerCase().trim();

    tasks.forEach((t) => {
      const owner = (t.assignedTo || t.contactOwnerEmail || '').toLowerCase().trim();
      const ownerId = String((t as any).assignedToId || (t as any).userId || '').toLowerCase().trim();
      if ((myEmail && owner.includes(myEmail)) || (myUid && ownerId === myUid)) {
        myTasks++;
      }
      if (t.isCompleted || t.urgency === 'COMPLETED') {
        done++;
      } else if (t.urgency === 'OVERDUE') {
        overdue++;
      } else if (t.urgency === 'TODAY') {
        today++;
      } else {
        upcoming++;
      }
    });
    return { total: tasks.length, myTasks, today, overdue, upcoming, done };
  }, [tasks, user]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (activeFilter === 'MY_TASKS') {
        const myEmail = (user?.email || '').toLowerCase().trim();
        const myUid = String(user?.id || (user as any)?._id || '').toLowerCase().trim();
        const owner = (t.assignedTo || t.contactOwnerEmail || '').toLowerCase().trim();
        const ownerId = String((t as any).assignedToId || (t as any).userId || '').toLowerCase().trim();
        const isMine = (myEmail && owner.includes(myEmail)) || (myUid && ownerId === myUid);
        if (!isMine) return false;
      } else if (activeFilter === 'TODAY') {
        if (t.isCompleted || t.urgency !== 'TODAY') return false;
      } else if (activeFilter === 'OVERDUE') {
        if (t.isCompleted || t.urgency !== 'OVERDUE') return false;
      } else if (activeFilter === 'UPCOMING') {
        if (t.isCompleted || t.urgency !== 'UPCOMING') return false;
      } else if (activeFilter === 'DONE') {
        if (!t.isCompleted && t.urgency !== 'COMPLETED') return false;
      }
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
          (t.type && t.type.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, activeFilter, searchQuery, user]);

  const formatSource = (src?: string) => {
    if (!src) return 'DIRECT';
    const s = src.toLowerCase();
    if (s.includes('facebook') || s.includes('fb')) return 'FACEBOOK';
    if (s.includes('google')) return 'GOOGLE';
    if (s.includes('website') || s.includes('web')) return 'WEBSITE';
    if (s.includes('instagram') || s.includes('insta')) return 'INSTAGRAM';
    if (s.includes('self')) return 'SELF GEN';
    if (s.includes('walk')) return 'WALK-IN';
    if (s.includes('referral') || s.includes('refer')) return 'REFERRAL';
    return src.length > 9 ? src.substring(0, 8).toUpperCase() : src.toUpperCase();
  };

  const getTaskTypeMeta = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('call')) {
      return { icon: 'call' as const, bg: 'rgba(39, 41, 68, 0.08)', color: '#272944', label: 'CALL' };
    }
    if (t.includes('meet')) {
      return { icon: 'people' as const, bg: '#F5F3FF', color: '#7C3AED', label: 'MEETING' };
    }
    if (t.includes('visit') || t.includes('site')) {
      return { icon: 'business' as const, bg: '#EFF6FF', color: '#1D4ED8', label: 'SITE VISIT' };
    }
    if (t.includes('email') || t.includes('mail')) {
      return { icon: 'mail' as const, bg: '#ECFDF5', color: '#059669', label: 'EMAIL' };
    }
    if (t.includes('whatsapp')) {
      return { icon: 'logo-whatsapp' as const, bg: '#F0FDF4', color: '#16A34A', label: 'WHATSAPP' };
    }
    return { icon: 'calendar-outline' as const, bg: 'rgba(39, 41, 68, 0.08)', color: '#272944', label: 'TASK' };
  };

  const filterTabs = [
    { key: 'ALL' as const, label: 'ALL', count: counts.total, isOverdue: false, icon: null },
    { key: 'MY_TASKS' as const, label: 'MY TASKS', count: counts.myTasks, isOverdue: false, icon: 'star' as const },
    { key: 'TODAY' as const, label: 'TODAY', count: counts.today, isOverdue: false, icon: 'time' as const },
    { key: 'OVERDUE' as const, label: 'OVERDUE', count: counts.overdue, isOverdue: true, icon: 'alert-circle' as const },
    { key: 'UPCOMING' as const, label: 'UPCOMING', count: counts.upcoming, isOverdue: false, icon: 'calendar-outline' as const },
    { key: 'DONE' as const, label: 'DONE', count: counts.done, isOverdue: false, icon: 'checkmark-circle-outline' as const },
  ];

  // ─── Task Card Renderer (Harmonized with LeadsListScreen Card Standard) ───
  const renderTaskItem = ({ item }: { item: TaskItem }) => {
    const typeMeta = getTaskTypeMeta(item.type);
    const myEmail = (user?.email || '').toLowerCase().trim();
    const ownerEmail = (item.assignedTo || item.contactOwnerEmail || '').toLowerCase().trim();
    const ownerDisplay = ownerEmail
      ? (myEmail && ownerEmail.includes(myEmail) ? 'You' : ownerEmail.split('@')[0])
      : 'Unassigned';

    return (
      <TouchableOpacity
        style={styles.taskCardContainer}
        onPress={() => setSelectedTaskForDetail(item)}
        activeOpacity={0.88}
      >
        <View style={styles.cardInnerLayout}>
          <View style={styles.cardContentBody}>
            {/* Top Row: Type Avatar Icon, Task Title, Source & Type Chip, Urgency Status Pill */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarPill, { backgroundColor: typeMeta.bg }]}>
                <Ionicons name={typeMeta.icon as any} size={15} color={typeMeta.color} />
              </View>

              <View style={styles.nameGroup}>
                <View style={styles.nameWithBadgesRow}>
                  <Text
                    style={[styles.taskTitleText, item.isCompleted && styles.taskTitleCompleted]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>

                {/* Micro Meta: Source + Task Type Chip */}
                <View style={styles.microMetaRow}>
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipText}>{formatSource(item.source)}</Text>
                  </View>
                  <View style={styles.typeChip}>
                    <Text style={styles.typeChipText}>{typeMeta.label}</Text>
                  </View>
                </View>
              </View>

              {/* Urgency Status Pill */}
              {item.isCompleted ? (
                <View style={[styles.stageBadge, styles.stageBadgeDone]}>
                  <View style={[styles.stageDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.stageBadgeText, styles.stageBadgeTextDone]}>DONE</Text>
                </View>
              ) : item.urgency === 'OVERDUE' ? (
                <View style={[styles.stageBadge, styles.stageBadgeOverdue]}>
                  <View style={[styles.stageDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.stageBadgeText, styles.stageBadgeTextOverdue]}>
                    {item.urgencyLabel || 'OVERDUE'}
                  </Text>
                </View>
              ) : item.urgency === 'TODAY' ? (
                <View style={[styles.stageBadge, styles.stageBadgeToday]}>
                  <View style={[styles.stageDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.stageBadgeText, styles.stageBadgeTextToday]}>TODAY</Text>
                </View>
              ) : (
                <View style={[styles.stageBadge, styles.stageBadgeUpcoming]}>
                  <View style={[styles.stageDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.stageBadgeText, styles.stageBadgeTextUpcoming]}>UPCOMING</Text>
                </View>
              )}
            </View>

            {/* Callback Reason / Notes Pill */}
            {(item.callbackReason || item.call_back_reason) ? (
              <View style={styles.callbackAlertPill}>
                <Ionicons name="chatbox-ellipses-outline" size={11} color="#B45309" />
                <Text style={styles.callbackAlertText} numberOfLines={1}>
                  {item.callbackReason || item.call_back_reason}
                </Text>
              </View>
            ) : null}

            {/* Client & Project Details Row */}
            {item.leadName ? (
              <View style={styles.contactDetailsRow}>
                <View style={styles.contactItem}>
                  <Ionicons name="person" size={12} color="#272944" />
                  <Text style={styles.clientNameText} numberOfLines={1}>
                    {item.leadName}
                  </Text>
                </View>

                {item.project ? (
                  <View style={styles.projectChip}>
                    <Ionicons name="business-outline" size={11} color="#0369A1" />
                    <Text style={styles.projectChipText} numberOfLines={1}>
                      {item.project}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Bottom Footer & Uniform 1-Tap Action Cockpit */}
            <View style={styles.cardFooterRow}>
              <View style={styles.footerMetaGroup}>
                <View style={styles.dueDateRow}>
                  <Ionicons
                    name="alarm-outline"
                    size={11}
                    color={item.urgency === 'OVERDUE' && !item.isCompleted ? '#DC2626' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.dueDateText,
                      item.urgency === 'OVERDUE' && !item.isCompleted && styles.dueDateTextOverdue,
                    ]}
                    numberOfLines={1}
                  >
                    {item.dueDate || 'No due date'}
                  </Text>
                </View>
                <View style={styles.ownerPill}>
                  <Ionicons name="person-outline" size={10.5} color="#475569" />
                  <Text style={styles.ownerPillText} numberOfLines={1}>
                    {ownerDisplay === 'You' ? 'Assigned: You' : `Assigned: ${ownerDisplay}`}
                  </Text>
                </View>
              </View>

              {/* 1-Tap Uniform 32x32 Action Cockpit */}
              <View style={styles.actionCockpit}>
                {/* 1-Tap Completion Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.circleActionBtnToggle,
                    item.isCompleted && styles.circleActionBtnToggleCompleted,
                  ]}
                  onPress={() => handleToggleTask(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={item.isCompleted ? 'checkmark' : 'ellipse-outline'}
                    size={15}
                    color={item.isCompleted ? '#FFFFFF' : '#94A3B8'}
                  />
                </TouchableOpacity>

                {item.phone ? (
                  <TouchableOpacity
                    style={styles.circleActionBtnCall}
                    onPress={() => handleCall(item)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}

                {item.phone ? (
                  <TouchableOpacity
                    style={styles.circleActionBtnWhatsApp}
                    onPress={() => handleWhatsApp(item.phone, item.leadName)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="logo-whatsapp" size={14.5} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.circleActionBtnDetail}
                  onPress={() => setSelectedTaskForDetail(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chevron-forward" size={14} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Empty State (Harmonized with LeadsListScreen) ───
  const renderEmptyState = () => {
    if (loading) return null;
    let title = `No ${semantics.taskEntityPlural} Found`;
    let subtitle = `All scheduled ${semantics.taskEntityPlural.toLowerCase()} are up to date.`;
    let iconName = 'checkmark-done-circle-outline';
    let iconColor = '#059669';

    if (searchQuery) {
      title = 'No Results Found';
      subtitle = `No ${semantics.taskEntityPlural.toLowerCase()} match "${searchQuery}". Try keywords.`;
      iconName = 'search-outline';
      iconColor = '#64748B';
    } else if (activeFilter === 'OVERDUE') {
      title = 'Zero Overdue!';
      subtitle = `Great job! Zero overdue ${semantics.taskEntityPlural.toLowerCase()} right now.`;
      iconName = 'shield-checkmark-outline';
      iconColor = '#10B981';
    } else if (activeFilter === 'TODAY') {
      title = 'Schedule Clear';
      subtitle = `No ${semantics.taskEntityPlural.toLowerCase()} scheduled for today.`;
      iconName = 'alarm-outline';
      iconColor = '#F59E0B';
    } else if (activeFilter === 'DONE') {
      title = 'No Completed Tasks';
      subtitle = `Completed ${semantics.taskEntityPlural.toLowerCase()} will appear here.`;
      iconName = 'checkmark-circle-outline';
      iconColor = '#64748B';
    } else if (activeFilter === 'MY_TASKS') {
      title = 'No Assigned Tasks';
      subtitle = 'You have no scheduled tasks assigned to your account.';
      iconName = 'person-outline';
      iconColor = '#6366F1';
    }

    return (
      <View style={styles.emptyCardContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName as any} size={32} color={iconColor} />
        </View>
        <Text style={styles.emptyTitleText}>{title}</Text>
        <Text style={styles.emptySubtitleText}>{subtitle}</Text>
        <TouchableOpacity
          style={styles.emptyCreateBtn}
          onPress={() => navigation.navigate('TaskForm')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.emptyCreateBtnText}>Schedule New {semantics.taskEntitySingular}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#272944" />

      {/* ─── Hero Luxury Header (Executive #272944 Navy) ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.headerRightControls}>
            <TouchableOpacity
              style={styles.newTaskCTA}
              onPress={() => navigation.navigate('TaskForm')}
              activeOpacity={0.88}
            >
              <Ionicons name="add" size={16} color="#272944" />
              <Text style={styles.newTaskCTAText}>Add {semantics.taskEntitySingular}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar (High-Contrast White Card) */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search" size={16} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder={`Search ${semantics.taskEntityPlural.toLowerCase()}, clients, notes...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── Zone 2: 6-Tab Dynamic Filter Dock ─── */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContainer}
        >
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.statusChip,
                  tab.isOverdue && tab.count > 0 && !isSelected && styles.statusChipOverdueInactive,
                  isSelected &&
                    (tab.isOverdue ? styles.statusChipSelectedOverdue : styles.statusChipSelected),
                ]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
              >
                {tab.icon && (
                  <Ionicons
                    name={tab.icon as any}
                    size={11.5}
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : tab.isOverdue && tab.count > 0
                        ? '#DC2626'
                        : tab.key === 'MY_TASKS'
                        ? '#F59E0B'
                        : '#64748B'
                    }
                  />
                )}
                <Text
                  style={[
                    styles.statusChipText,
                    tab.isOverdue && tab.count > 0 && !isSelected && styles.statusChipTextOverdue,
                    isSelected && styles.statusChipTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.chipBadgeCircle,
                    tab.isOverdue && tab.count > 0 && !isSelected && styles.chipBadgeCircleOverdue,
                    isSelected && styles.chipBadgeCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBadgeText,
                      tab.isOverdue && tab.count > 0 && !isSelected && styles.chipBadgeTextOverdue,
                      isSelected && styles.chipBadgeTextSelected,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Zone 3: Results Summary & Sort Bar ─── */}
      <View style={styles.summarySortBar}>
        <Text style={styles.resultsCountText}>
          Showing <Text style={{ fontWeight: '700', color: '#0F172A' }}>{filteredTasks.length}</Text> {semantics.taskEntityPlural.toLowerCase()}
        </Text>

        <View style={styles.sortButton}>
          <Ionicons name="funnel" size={11.5} color="#272944" />
          <Text style={styles.sortButtonText}>
            {activeFilter === 'ALL'
              ? 'All Tasks'
              : activeFilter === 'MY_TASKS'
              ? 'My Tasks'
              : activeFilter === 'TODAY'
              ? 'Due Today'
              : activeFilter === 'OVERDUE'
              ? 'Overdue'
              : activeFilter === 'UPCOMING'
              ? 'Upcoming'
              : 'Done'}
          </Text>
        </View>
      </View>

      {/* ─── Zone 4: Virtualized Task List (60 FPS Performance) ─── */}
      {loading && tasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#272944" />
          <Text style={styles.loadingText}>Fetching {semantics.taskEntityPlural.toLowerCase()} & schedule...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#272944"
              colors={['#272944']}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Floating Action Button (FAB) for 1-Thumb Quick Task Creation */}
      <TouchableOpacity
        style={styles.floatingActionBtn}
        onPress={() => navigation.navigate('TaskForm')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Task Lifecycle Detail Bottom Sheet Modal */}
      <TaskDetailModal
        visible={Boolean(selectedTaskForDetail)}
        task={selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        onRefresh={fetchTasksData}
        onCall={(t) => handleCall(t)}
        onEdit={(t) => {
          setSelectedTaskForDetail(null);
          navigation.navigate('TaskForm', { task: t });
        }}
        onViewLead={(t) => {
          setSelectedTaskForDetail(null);
          navigation.navigate('LeadDetail', {
            leadId: t.leadId || t.id,
            lead: {
              id: t.leadId || t.id,
              name: t.leadName,
              phone: t.phone,
              email: t.email,
              project: t.project,
              source: t.source,
            },
          });
        }}
        organizationName={user?.organizationName || 'Leads Rubix'}
        userName={user?.name || 'Executive'}
      />

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
  // ─── Zone 1: Executive #272944 Navy Header ───
  luxuryHeader: {
    width: '100%',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  newTaskCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  newTaskCTAText: {
    color: '#272944',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ─── Search Bar (High-Contrast White Card) ───
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
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
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },

  // ─── Zone 2: Filter Tabs Dock ───
  filterScrollWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5.5,
  },
  statusChipOverdueInactive: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  statusChipSelected: {
    backgroundColor: '#272944',
    borderColor: '#272944',
    shadowColor: '#272944',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  statusChipSelectedOverdue: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  statusChipTextOverdue: {
    color: '#DC2626',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  chipBadgeCircle: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5.5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  chipBadgeCircleOverdue: {
    backgroundColor: '#FEE2E2',
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  chipBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextOverdue: {
    color: '#DC2626',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },

  // ─── Zone 3: Results Summary & Sort Bar ───
  summarySortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.15)',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#272944',
  },

  // ─── Zone 4: Virtualized Task List ───
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  taskCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInnerLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContentBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  nameGroup: {
    flex: 1,
  },
  nameWithBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  taskTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  microMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sourceChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  sourceChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  typeChip: {
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  typeChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#272944',
  },

  // Urgency Status Badge
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3.5,
    marginLeft: 6,
  },
  stageDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  stageBadgeDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stageBadgeTextDone: {
    color: '#047857',
  },
  stageBadgeOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  stageBadgeTextOverdue: {
    color: '#DC2626',
  },
  stageBadgeToday: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  stageBadgeTextToday: {
    color: '#B45309',
  },
  stageBadgeUpcoming: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  stageBadgeTextUpcoming: {
    color: '#1D4ED8',
  },
  stageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Callback / Notes alert pill
  callbackAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 4,
    marginTop: 6,
  },
  callbackAlertText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    flexShrink: 1,
  },

  // Contact / Client Details
  contactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientNameText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#272944',
    maxWidth: 150,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 3,
    maxWidth: 140,
  },
  projectChipText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#0369A1',
  },

  // Card Footer Row & Action Cockpit
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  footerMetaGroup: {
    flex: 1,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  dueDateText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '500',
  },
  dueDateTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1.5,
  },
  ownerPillText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
    maxWidth: 130,
  },

  // 1-Tap Uniform 32x32 Circular Cockpit
  actionCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  circleActionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  circleActionBtnWhatsApp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  circleActionBtnDetail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Floating Action Button (FAB) ───
  floatingActionBtn: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 92 : 80,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ─── Loading & Empty States ───
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  emptySubtitleText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272944',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
