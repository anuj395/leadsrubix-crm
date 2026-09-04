import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService, NotificationItem } from '../../services/notificationService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';

type FilterType = 'ALL' | 'UNREAD' | 'LEADS' | 'TASKS';

export const NotificationsScreen = ({ navigation }: { navigation?: any }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const fetchNotifs = async () => {
    try {
      const data = await notificationService.getNotifications();
      if (data && data.length > 0) {
        setNotifications(data);
      } else {
        // Fallback realistic notification items
        setNotifications([
          {
            id: '1',
            title: 'New Lead Created',
            body: 'A new lead "dkankda" has been added to your workspace.',
            timestamp: '2 Sep at 3:29 PM',
            type: 'lead_assigned',
            isRead: false,
          },
          {
            id: '2',
            title: 'New Lead Created',
            body: 'A new lead "Test two" has been added to your workspace.',
            timestamp: '2 Sep at 3:23 PM',
            type: 'lead_assigned',
            isRead: false,
          },
          {
            id: '3',
            title: 'New Lead Created',
            body: 'A new lead "Test One" has been added to your workspace.',
            timestamp: '2 Sep at 3:22 PM',
            type: 'lead_assigned',
            isRead: true,
          },
          {
            id: '4',
            title: 'Site Visit Follow-up Due',
            body: 'Scheduled follow-up for client "Test One" is due today.',
            timestamp: '2 Sep at 1:42 PM',
            type: 'task_due',
            isRead: true,
          },
          {
            id: '5',
            title: 'Workspace Synchronized',
            body: 'Telemetry and call telephony channels are active and syncing.',
            timestamp: '26 Aug at 3:59 PM',
            type: 'system_alert',
            isRead: true,
          },
        ]);
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifs();
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const toggleReadStatus = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  // Counts
  const counts = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const leads = notifications.filter((n) => n.type === 'lead_assigned' || (n.title || '').toLowerCase().includes('lead')).length;
    const tasks = notifications.filter((n) => n.type === 'task_due' || (n.title || '').toLowerCase().includes('task') || (n.title || '').toLowerCase().includes('visit')).length;
    return { total, unread, leads, tasks };
  }, [notifications]);

  // Filtered and Searched list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (activeFilter === 'UNREAD' && item.isRead) return false;
      if (activeFilter === 'LEADS' && !(item.type === 'lead_assigned' || (item.title || '').toLowerCase().includes('lead'))) {
        return false;
      }
      if (activeFilter === 'TASKS' && !(item.type === 'task_due' || (item.title || '').toLowerCase().includes('task') || (item.title || '').toLowerCase().includes('visit'))) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesBody = item.body.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBody) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const getIconMeta = (type: string, title: string) => {
    const t = (type || '').toLowerCase();
    const ttl = (title || '').toLowerCase();

    if (t === 'lead_assigned' || ttl.includes('lead')) {
      return { name: 'person-add' as const, color: '#2563EB', bg: '#EFF6FF', label: 'LEAD' };
    }
    if (t === 'task_due' || ttl.includes('task') || ttl.includes('visit') || ttl.includes('due')) {
      return { name: 'calendar' as const, color: '#D97706', bg: '#FFFBEB', label: 'TASK' };
    }
    if (t === 'call_reminder' || ttl.includes('call')) {
      return { name: 'call' as const, color: '#059669', bg: '#ECFDF5', label: 'CALL' };
    }
    return { name: 'notifications' as const, color: '#7C3AED', bg: '#F5F3FF', label: 'SYSTEM' };
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const meta = getIconMeta(item.type, item.title);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.isRead && styles.unreadNotificationCard]}
        onPress={() => toggleReadStatus(item.id)}
        activeOpacity={0.88}
      >
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.name} size={20} color={meta.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && (
                <View style={styles.newBadgePill}>
                  <View style={styles.newPulseDot} />
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.timeText}>{item.timestamp}</Text>
          </View>
          <Text style={styles.bodyText}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury Midnight #151728 Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={markAllAsRead}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done-sharp" size={15} color="#38BDF8" />
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder="Search alerts, leads, tasks..."
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

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#151728"
          />
        }
        ListHeaderComponent={
          /* ─── Filter Pills Bar (Matching Leads / Tasks / Call Logs) ─── */
          <View style={styles.filterBarContainer}>
            {[
              { key: 'ALL' as FilterType, label: 'ALL', count: counts.total },
              { key: 'UNREAD' as FilterType, label: 'UNREAD', count: counts.unread },
              { key: 'LEADS' as FilterType, label: 'LEADS', count: counts.leads },
              { key: 'TASKS' as FilterType, label: 'TASKS', count: counts.tasks },
            ].map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.chipBadgeCircle, isSelected && styles.chipBadgeCircleSelected]}>
                    <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextSelected]}>
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#151728" />
              <Text style={styles.loadingText}>Loading notification updates...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard3D}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="notifications-off-outline" size={28} color="#64748B" />
              </View>
              <Text style={styles.emptyTitle}>No Notifications Found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No alerts match "${searchQuery}". Try a different keyword.`
                  : activeFilter === 'UNREAD'
                  ? 'All notifications have been read. You are all caught up!'
                  : 'You have no recent notification alerts in your CRM workspace.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ─── Zone 1: Luxury Midnight Header ───
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
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 5,
  },
  markReadText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
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

  // ─── Filter Pills ───
  filterBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  chipBadgeCircle: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },

  // ─── List & Cards ───
  listContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'flex-start',
  },
  unreadNotificationCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    shadowOpacity: 0.08,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  titleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  newBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 4,
    marginLeft: 6,
  },
  newPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
  },
  newBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  bodyText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginTop: 2,
  },

  // ─── Loading & Empty States ───
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
