import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadService, LeadItem } from '../../services/leadService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const LeadsListScreen = ({ navigation }: any) => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const statusFilters = ['ALL', 'Fresh', 'Contacted', 'Qualified', 'Won', 'Lost'];

  const fetchLeadsData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadService.getLeads({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        q: searchQuery.trim() || undefined,
      });
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    fetchLeadsData();
  }, [fetchLeadsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeadsData();
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=${clean}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fresh':
        return { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284C7' };
      case 'contacted':
        return { bg: 'rgba(217, 119, 6, 0.12)', text: '#D97706' };
      case 'qualified':
        return { bg: 'rgba(124, 58, 237, 0.12)', text: '#7C3AED' };
      case 'won':
        return { bg: 'rgba(5, 150, 105, 0.12)', text: '#059669' };
      case 'lost':
        return { bg: 'rgba(225, 29, 72, 0.12)', text: '#E11D48' };
      default:
        return { bg: 'rgba(71, 85, 105, 0.12)', text: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={34} />
          <TouchableOpacity
            style={styles.addBtn3D}
            onPress={() => navigation.navigate('LeadForm')}
            activeOpacity={0.88}
          >
            <Ionicons name="add-sharp" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>New Lead</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>REAL ESTATE BUYER LEADS PIPELINE</Text>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder="Search leads by buyer name, phone, project..."
            placeholderTextColor="#94A3B8"
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand700} />
        }
      >
        {/* Animated AI Mascot Companion */}
        <AIAdvisorMascot screenName="LeadsList" />

        {/* Horizontal Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterBar}
          contentContainerStyle={styles.statusFilterContent}
        >
          {statusFilters.map((st) => {
            const isSelected = selectedStatus === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                onPress={() => setSelectedStatus(st)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lead List Items */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Fetching buyer leads pipeline...</Text>
          </View>
        ) : leads.length === 0 ? (
          <View style={styles.emptyCard3D}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="people-outline" size={28} color={theme.colors.brand700} />
            </View>
            <Text style={styles.emptyTitle}>No Buyer Leads Found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search query or status filter.</Text>
          </View>
        ) : (
          leads.map((lead) => {
            const stColor = getStatusColor(lead.status);

            return (
              <View key={lead.id} style={styles.leadCard3D}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{(lead.name || 'B').charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.leadInfoGroup}>
                    <Text style={styles.leadNameText}>{lead.name}</Text>
                    <Text style={styles.leadProjectText} numberOfLines={1}>
                      {lead.project} • {lead.createdAt}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: stColor.bg }]}>
                    <Text style={[styles.statusPillText, { color: stColor.text }]}>
                      {lead.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Lead Specifications Strip */}
                <View style={styles.leadSpecStrip}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>BUDGET</Text>
                    <Text style={[styles.specValue, theme.typography.tabularNumbers]}>{lead.budget}</Text>
                  </View>

                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>PROPERTY TYPE</Text>
                    <Text style={styles.specValue} numberOfLines={1}>{lead.propertyType}</Text>
                  </View>

                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>SOURCE</Text>
                    <Text style={styles.specValue} numberOfLines={1}>{lead.source}</Text>
                  </View>
                </View>

                {/* One-Tap Contact Buttons */}
                <View style={styles.actionFooterRow}>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(lead.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Call Buyer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => handleWhatsApp(lead.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => navigation.navigate('LeadDetails', { leadId: lead.id })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-forward-sharp" size={14} color={theme.colors.brand700} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTagPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
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
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputControl: {
    flex: 1,
    height: 48,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statusFilterBar: {
    marginBottom: 14,
  },
  statusFilterContent: {
    gap: 8,
    paddingRight: 16,
  },
  statusChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    marginTop: 12,
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  leadCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.18)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  leadInfoGroup: {
    flex: 1,
  },
  leadNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  leadProjectText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  leadSpecStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionFooterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  detailsBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
