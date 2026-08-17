import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const LeadsListScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Buyers');

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get('/contacts');
      const items = res.data?.items || res.data || [];
      setLeads(items);
      setFilteredLeads(items);
    } catch (err) {
      console.warn('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  useEffect(() => {
    let result = leads;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.first_name || item.name || '').toLowerCase().includes(q) ||
          (item.contact_no || item.phone || '').includes(q) ||
          (item.company_name || item.project_name || '').toLowerCase().includes(q)
      );
    }

    if (selectedFilter !== 'All Buyers') {
      if (selectedFilter === 'Fresh Inquiries') {
        result = result.filter((item) =>
          (item.lead_status || item.status || '').toLowerCase().includes('fresh') ||
          (item.lead_status || item.status || '').toLowerCase().includes('new')
        );
      } else if (selectedFilter === 'Site Visit') {
        result = result.filter((item) =>
          (item.lead_status || item.status || '').toLowerCase().includes('visit') ||
          (item.lead_status || item.status || '').toLowerCase().includes('contact')
        );
      } else if (selectedFilter === 'Qualified') {
        result = result.filter((item) =>
          (item.lead_status || item.status || '').toLowerCase().includes('qualif')
        );
      } else if (selectedFilter === 'Won / Booked') {
        result = result.filter((item) =>
          (item.lead_status || item.status || '').toLowerCase().includes('won')
        );
      }
    }

    setFilteredLeads(result);
  }, [searchQuery, selectedFilter, leads]);

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number available for this buyer.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number available for WhatsApp.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  const renderLeadCard = ({ item }: { item: any }) => {
    const leadName =
      item.first_name || item.name || item.contact_person || 'Unnamed Buyer';
    const leadPhone = item.contact_no || item.phone || item.mobile_number || 'No Phone';
    const leadStatus = item.lead_status || item.status || 'Fresh';
    const projectName = item.company_name || item.project_name || 'Grand Horizon Towers';
    const source = item.lead_source || item.source || 'Website Inbound';
    const budget = item.budget || '₹75L - 1.2Cr';

    return (
      <TouchableOpacity
        style={styles.leadCard3D}
        onPress={() => navigation.navigate('LeadDetail', { lead: item })}
        activeOpacity={0.8}
      >
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.identityGroup}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{leadName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.buyerNameText}>{leadName}</Text>
              <Text style={styles.projectText} numberOfLines={1}>{projectName}</Text>
            </View>
          </View>

          <StatusBadge status={leadStatus} size="sm" />
        </View>

        {/* Real Estate Requirement Grid */}
        <View style={styles.reqGridBox}>
          <View style={styles.reqCol}>
            <Text style={styles.reqLabel}>TARGET BUDGET</Text>
            <Text style={[styles.reqValue, theme.typography.tabularNumbers]}>{budget}</Text>
          </View>

          <View style={styles.reqCol}>
            <Text style={styles.reqLabel}>SOURCE</Text>
            <Text style={styles.reqValue} numberOfLines={1}>{source}</Text>
          </View>

          <View style={styles.reqCol}>
            <Text style={styles.reqLabel}>PHONE</Text>
            <Text style={[styles.reqValue, theme.typography.tabularNumbers]}>{leadPhone}</Text>
          </View>
        </View>

        {/* Card Bottom Quick Actions Bar */}
        <View style={styles.cardFooterActions}>
          <TouchableOpacity
            style={styles.dialerBtnCall}
            onPress={() => handleCall(leadPhone)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.dialerBtnText}>Call Buyer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dialerBtnWhatsApp}
            onPress={() => handleWhatsApp(leadPhone)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
            <Text style={styles.dialerBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dialerBtnTask}
            onPress={() => navigation.navigate('TaskForm', { lead: item })}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color={theme.colors.brand700} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filterPills = ['All Buyers', 'Fresh Inquiries', 'Site Visit', 'Qualified', 'Won / Booked'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <CompanyLogo variant="dark" height={32} />
        <TouchableOpacity
          style={styles.addLeadBtn}
          onPress={() => navigation.navigate('LeadForm')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addLeadBtnText}>Add Buyer</Text>
        </TouchableOpacity>
      </View>

      {/* Sticky Search & Filter Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buyers by name, phone, or project..."
            placeholderTextColor={theme.colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Horizontal Stage Filter Bar */}
      <View style={styles.pillsScrollRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterPills}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedFilter(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: 8 }}
        />
      </View>

      {/* Buyer Pipeline Stream */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.brand700} />
      ) : (
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<AIAdvisorMascot screenName="Leads" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand700}
              colors={[theme.colors.brand700]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Buyer Inquiries Found</Text>
              <Text style={styles.emptySub}>No buyer leads match your active search or stage filter.</Text>
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
    backgroundColor: theme.colors.canvas,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  addLeadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  pillsScrollRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  leadCard3D: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.15)',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  buyerNameText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  projectText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  reqGridBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reqCol: {
    flex: 1,
  },
  reqLabel: {
    ...theme.typography.overline,
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  reqValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dialerBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  dialerBtnWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  dialerBtnTask: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dialerBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    ...theme.typography.bodySmall,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
