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
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dealsService, Deal, Pipeline, Stage } from '../../services/dealsService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

export const DealsScreen = ({ navigation }: { navigation?: any }) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [activeStageId, setActiveStageId] = useState<string>('ALL');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Deal Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: 'INR',
    contactName: '',
    expectedCloseDate: '',
    stageId: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const pipeData = await dealsService.listPipelines();
      let activePipe = pipeData[0] || null;
      if (pipeData.length > 0) {
        setPipelines(pipeData);
        setSelectedPipeline(activePipe);
      }

      const dealData = await dealsService.listDeals(activePipe ? { pipelineId: activePipe._id || activePipe.id } : undefined);
      setDeals(dealData);
    } catch (e) {
      console.warn('Failed to load deals data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectPipeline = async (pipe: Pipeline) => {
    setSelectedPipeline(pipe);
    setActiveStageId('ALL');
    setLoading(true);
    try {
      const dealData = await dealsService.listDeals({ pipelineId: pipe._id || pipe.id });
      setDeals(dealData);
    } finally {
      setLoading(false);
    }
  };

  const stages: Stage[] = selectedPipeline?.stages || [
    { stageId: 'qual', name: 'Qualification', probability: 20, color: '#3B82F6', order: 1 },
    { stageId: 'demo', name: 'Demo Scheduled', probability: 40, color: '#8B5CF6', order: 2 },
    { stageId: 'proposal', name: 'Proposal Sent', probability: 70, color: '#F59E0B', order: 3 },
    { stageId: 'won', name: 'Closed Won', probability: 100, color: '#10B981', order: 4, isWon: true },
    { stageId: 'lost', name: 'Closed Lost', probability: 0, color: '#EF4444', order: 5, isLost: true },
  ];

  const formatAmount = (amt?: number, curr = 'INR') => {
    if (typeof amt !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr || 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Stage filter
      if (activeStageId !== 'ALL') {
        const dStage = d.stageId || d.stage_id || d.stage;
        if (dStage !== activeStageId) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (d.title || d.name || '').toLowerCase().includes(q);
        const contactMatch = (d.contactName || d.contact_name || '').toLowerCase().includes(q);
        if (!titleMatch && !contactMatch) return false;
      }

      return true;
    });
  }, [deals, activeStageId, searchQuery]);

  const totalValue = useMemo(() => {
    return filteredDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredDeals]);

  const handleCreateDeal = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a deal title.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Deal> = {
        title: form.title.trim(),
        amount: Number(form.amount) || 0,
        currency: form.currency,
        contactName: form.contactName.trim(),
        expectedCloseDate: form.expectedCloseDate.trim(),
        pipelineId: selectedPipeline?._id || selectedPipeline?.id,
        stageId: form.stageId || stages[0]?.stageId || stages[0]?.stage_id || 'qual',
        notes: form.notes.trim(),
      };
      await dealsService.createDeal(payload);
      Alert.alert('Success', 'Deal created successfully!');
      setCreateModalOpen(false);
      setForm({ title: '', amount: '', currency: 'INR', contactName: '', expectedCloseDate: '', stageId: '', notes: '' });
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create deal.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDealCard = ({ item }: { item: Deal }) => {
    const stageObj = stages.find((s) => (s.stageId || s.stage_id) === (item.stageId || item.stage_id || item.stage));
    const stageColor = stageObj?.color || '#3B82F6';
    const stageName = stageObj?.name || item.stage || 'Pipeline';

    return (
      <View style={styles.dealCard}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <Text style={styles.dealTitle} numberOfLines={1}>
              {item.title || item.name || 'Untitled Deal'}
            </Text>
            {item.contactName ? (
              <View style={styles.contactRow}>
                <Ionicons name="person-outline" size={13} color="#64748B" />
                <Text style={styles.contactText} numberOfLines={1}>
                  {item.contactName}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.stageBadge, { backgroundColor: `${stageColor}1A`, borderColor: stageColor }]}>
            <Text style={[styles.stageBadgeText, { color: stageColor }]}>{stageName.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>DEAL VALUE</Text>
            <Text style={styles.amountValue}>{formatAmount(item.amount, item.currency)}</Text>
          </View>

          {item.expectedCloseDate || item.expected_close_date ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.closeDateLabel}>EXPECTED CLOSE</Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={13} color="#64748B" />
                <Text style={styles.closeDateValue}>
                  {item.expectedCloseDate || item.expected_close_date}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deals & Pipeline</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Summary Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PIPELINE VALUE</Text>
            <Text style={styles.statValue}>{formatAmount(totalValue)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DEALS COUNT</Text>
            <Text style={styles.statValue}>{filteredDeals.length} Deals</Text>
          </View>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search deals by title or contact..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stage Selector Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.stageTab, activeStageId === 'ALL' && styles.stageTabActive]}
            onPress={() => setActiveStageId('ALL')}
          >
            <Text style={[styles.stageTabText, activeStageId === 'ALL' && styles.stageTabTextActive]}>
              All ({deals.length})
            </Text>
          </TouchableOpacity>

          {stages.map((st) => {
            const stId = st.stageId || st.stage_id || st.name;
            const count = deals.filter((d) => (d.stageId || d.stage_id || d.stage) === stId).length;
            const isActive = activeStageId === stId;
            return (
              <TouchableOpacity
                key={stId}
                style={[styles.stageTab, isActive && styles.stageTabActive]}
                onPress={() => setActiveStageId(stId)}
              >
                <Text style={[styles.stageTabText, isActive && styles.stageTabTextActive]}>
                  {st.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching Pipeline Deals...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderDealCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Deals Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'No deals match your search criteria.' : 'Tap + button above to add a new deal.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal: Create New Deal */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Deal</Text>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>DEAL TITLE *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Enterprise CRM Software License"
                value={form.title}
                onChangeText={(t) => setForm((p) => ({ ...p, title: t }))}
              />

              <Text style={styles.fieldLabel}>DEAL AMOUNT (INR)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 250000"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(t) => setForm((p) => ({ ...p, amount: t }))}
              />

              <Text style={styles.fieldLabel}>CONTACT / CLIENT NAME</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Rajesh Sharma"
                value={form.contactName}
                onChangeText={(t) => setForm((p) => ({ ...p, contactName: t }))}
              />

              <Text style={styles.fieldLabel}>EXPECTED CLOSE DATE</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="YYYY-MM-DD"
                value={form.expectedCloseDate}
                onChangeText={(t) => setForm((p) => ({ ...p, expectedCloseDate: t }))}
              />

              <Text style={styles.fieldLabel}>NOTES</Text>
              <TextInput
                style={[styles.fieldInput, { height: 70 }]}
                placeholder="Add extra deal requirements or notes..."
                multiline
                value={form.notes}
                onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateDeal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Deal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  tabsWrapper: {
    marginTop: 12,
    marginBottom: 6,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stageTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageTabActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  stageTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stageTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleGroup: {
    flex: 1,
    marginRight: 8,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  closeDateLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  closeDateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
