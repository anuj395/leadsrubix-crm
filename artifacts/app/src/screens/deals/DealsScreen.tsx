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
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: 'INR',
    contactName: '',
    accountName: '',
    expectedCloseDate: '',
    stageId: '',
    notes: '',
  });

  // Stage Update Modal
  const [selectedDealForStage, setSelectedDealForStage] = useState<Deal | null>(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);
  const [pendingLostStage, setPendingLostStage] = useState<Stage | null>(null);
  const [lostReasonText, setLostReasonText] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

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
        const accountMatch = (d.accountName || d.account_name || '').toLowerCase().includes(q);
        if (!titleMatch && !contactMatch && !accountMatch) return false;
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
    if (customerType === 'B2B' && !form.accountName.trim()) {
      Alert.alert('Validation Error', 'Please enter the Company / Corporate Name for B2B deals.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Deal> = {
        title: form.title.trim(),
        amount: Number(form.amount) || 0,
        currency: form.currency,
        accountName: customerType === 'B2B' ? form.accountName.trim() : undefined,
        account_name: customerType === 'B2B' ? form.accountName.trim() : undefined,
        contactName: form.contactName.trim(),
        expectedCloseDate: form.expectedCloseDate.trim(),
        pipelineId: selectedPipeline?._id || selectedPipeline?.id,
        stageId: form.stageId || stages[0]?.stageId || stages[0]?.stage_id || 'qual',
        notes: form.notes.trim(),
      };
      await dealsService.createDeal(payload);
      Alert.alert('Success', 'Deal created successfully!');
      setCreateModalOpen(false);
      setForm({ title: '', amount: '', currency: 'INR', contactName: '', accountName: '', expectedCloseDate: '', stageId: '', notes: '' });
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create deal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDealStage = (deal: Deal) => {
    setSelectedDealForStage(deal);
    setStageModalOpen(true);
  };

  const handleSelectStage = async (stage: Stage) => {
    if (!selectedDealForStage) return;
    const isLost = stage.isLost || stage.is_lost || stage.name.toUpperCase().includes('LOST');
    if (isLost) {
      setPendingLostStage(stage);
      setStageModalOpen(false);
      setLostReasonText('');
      setLostReasonModalOpen(true);
      return;
    }

    setUpdatingStage(true);
    const dealId = (selectedDealForStage._id || selectedDealForStage.id) as string;
    const stId = stage.stageId || stage.stage_id || stage.name;
    try {
      await dealsService.updateDealStage(dealId, stId, undefined, stage.name, stage.probability);
      setDeals((prev) =>
        prev.map((d) =>
          (d._id || d.id) === dealId
            ? { ...d, stageId: stId, stage: stage.name, probability: stage.probability }
            : d
        )
      );
      setStageModalOpen(false);
      setSelectedDealForStage(null);
      Alert.alert('Success', `Deal moved to ${stage.name}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update deal stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleConfirmLost = async () => {
    if (!selectedDealForStage || !pendingLostStage) return;
    setUpdatingStage(true);
    const dealId = (selectedDealForStage._id || selectedDealForStage.id) as string;
    const stId = pendingLostStage.stageId || pendingLostStage.stage_id || pendingLostStage.name;
    const reason = lostReasonText.trim() || 'Closed Lost';
    const lostName = pendingLostStage.name || 'Closed Lost';
    try {
      await dealsService.updateDealStage(dealId, stId, reason, lostName, 0);
      setDeals((prev) =>
        prev.map((d) =>
          (d._id || d.id) === dealId
            ? { ...d, stageId: stId, stage: lostName, probability: 0, lostReason: reason }
            : d
        )
      );
      setLostReasonModalOpen(false);
      setPendingLostStage(null);
      setSelectedDealForStage(null);
      setLostReasonText('');
      Alert.alert('Success', `Deal marked as ${lostName}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update deal stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const renderDealCard = ({ item }: { item: Deal }) => {
    const stageObj = stages.find((s) => (s.stageId || s.stage_id) === (item.stageId || item.stage_id || item.stage));
    const stageColor = stageObj?.color || '#3B82F6';
    const stageName = stageObj?.name || item.stage || 'Pipeline';
    const company = item.accountName || item.account_name;
    const contact = item.contactName || item.contact_name;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleOpenDealStage(item)}
        style={styles.dealCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <Text style={styles.dealTitle} numberOfLines={1}>
              {item.title || item.name || 'Untitled Deal'}
            </Text>
            {Boolean(company) && (
              <View style={[styles.contactRow, { marginTop: 3 }]}>
                <Ionicons name="business" size={13} color="#475569" />
                <Text style={[styles.contactText, { fontWeight: '600', color: '#1E293B' }]} numberOfLines={1}>
                  {company}
                </Text>
              </View>
            )}
            {Boolean(contact) && (
              <View style={[styles.contactRow, { marginTop: Boolean(company) ? 2 : 3 }]}>
                <Ionicons name="person-outline" size={13} color="#2563EB" />
                <Text style={[styles.contactText, { color: '#2563EB' }]} numberOfLines={1}>
                  {contact}
                </Text>
              </View>
            )}
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
      </TouchableOpacity>
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
              {/* Customer Type Selector */}
              <Text style={styles.fieldLabel}>CUSTOMER TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.stageTab,
                    customerType === 'B2C' && styles.stageTabActive,
                    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }
                  ]}
                  onPress={() => setCustomerType('B2C')}
                >
                  <Text style={[styles.stageTabText, customerType === 'B2C' && styles.stageTabTextActive]}>
                    👤 Direct (B2C)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stageTab,
                    customerType === 'B2B' && styles.stageTabActive,
                    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }
                  ]}
                  onPress={() => setCustomerType('B2B')}
                >
                  <Text style={[styles.stageTabText, customerType === 'B2B' && styles.stageTabTextActive]}>
                    🏢 Corporate (B2B)
                  </Text>
                </TouchableOpacity>
              </View>

              {customerType === 'B2B' && (
                <>
                  <Text style={styles.fieldLabel}>COMPANY / CORPORATE NAME *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Reliance Retail Ventures Ltd"
                    value={form.accountName}
                    onChangeText={(t) => setForm((p) => ({ ...p, accountName: t }))}
                  />
                </>
              )}

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

      {/* Modal: Update Deal Stage */}
      <Modal visible={stageModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedDealForStage?.title || selectedDealForStage?.name || 'Update Deal Stage'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {formatAmount(selectedDealForStage?.amount, selectedDealForStage?.currency)}
                  {Boolean(selectedDealForStage?.accountName || selectedDealForStage?.account_name) && ` • 🏢 ${selectedDealForStage?.accountName || selectedDealForStage?.account_name}`}
                  {Boolean(selectedDealForStage?.contactName || selectedDealForStage?.contact_name) && ` • 👤 ${selectedDealForStage?.contactName || selectedDealForStage?.contact_name}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStageModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>MOVE TO PIPELINE STAGE</Text>

            {updatingStage ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>Updating stage...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {stages.map((st) => {
                  const stId = st.stageId || st.stage_id || st.name;
                  const currentStId = selectedDealForStage?.stageId || selectedDealForStage?.stage_id || selectedDealForStage?.stage;
                  const isCurrent = currentStId === stId || currentStId === st.name;

                  return (
                    <TouchableOpacity
                      key={stId}
                      style={[
                        styles.stageSelectItem,
                        isCurrent && styles.stageSelectItemCurrent
                      ]}
                      onPress={() => handleSelectStage(st)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color || '#3B82F6' }} />
                        <View>
                          <Text style={[styles.stageSelectText, isCurrent && { fontWeight: '700', color: '#1E293B' }]}>
                            {st.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            Win probability: {st.probability}%
                          </Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 16 }]}
              onPress={() => setStageModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Capture Lost Reason on Mobile */}
      <Modal visible={lostReasonModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Mark Deal as Lost</Text>
              <TouchableOpacity onPress={() => setLostReasonModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
              Select or specify why this opportunity was closed lost:
            </Text>

            {/* Quick Reason Chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['Price / Budget Constraint', 'Competitor Chosen', 'Client Unresponsive', 'Project Dropped'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    lostReasonText === reason && styles.reasonChipActive
                  ]}
                  onPress={() => setLostReasonText(reason)}
                >
                  <Text style={[styles.reasonChipText, lostReasonText === reason && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>CUSTOM REMARKS (OPTIONAL)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 60 }]}
              placeholder="Additional feedback or notes..."
              multiline
              value={lostReasonText}
              onChangeText={setLostReasonText}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLostReasonModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmLost}
                disabled={updatingStage}
              >
                {updatingStage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Closed Lost</Text>
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
  stageSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  stageSelectItemCurrent: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  stageSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  reasonChipActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  reasonChipTextActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
});
