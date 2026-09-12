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
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dealsService, Deal, Pipeline, Stage } from '../../services/dealsService';
import { DealFormModal } from '../../components/deals/DealFormModal';
import { LostReasonModal } from '../../components/deals/LostReasonModal';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KANBAN_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

export const DealsScreen = ({ navigation }: { navigation?: any }) => {
  const { user } = useAuth();

  // Pipelines & Active Selection
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false);

  // Deals Data & Filtering
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeStageId, setActiveStageId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'valueHigh' | 'closeDate'>('newest');
  const [sortModalOpen, setSortModalOpen] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: Kanban vs List
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Add / Edit Modal State
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Stage Transition & Closed Lost Modal State
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedDealForStage, setSelectedDealForStage] = useState<Deal | null>(null);
  const [pendingLostStage, setPendingLostStage] = useState<Stage | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Fetch initial pipelines and deals
  const fetchData = async () => {
    try {
      const pipeData = await dealsService.listPipelines();
      if (pipeData && pipeData.length > 0) {
        setPipelines(pipeData);
        const currentPipeId = selectedPipeline?._id || selectedPipeline?.id;
        const matched = pipeData.find((p) => (p._id || p.id) === currentPipeId) || pipeData[0];
        setSelectedPipeline(matched);

        const dealData = await dealsService.listDeals({ pipelineId: matched._id || matched.id });
        setDeals(dealData);
      } else {
        const dealData = await dealsService.listDeals();
        setDeals(dealData);
      }
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
    setPipelinePickerOpen(false);
    setLoading(true);
    try {
      const dealData = await dealsService.listDeals({ pipelineId: pipe._id || pipe.id });
      setDeals(dealData);
    } finally {
      setLoading(false);
    }
  };

  const stages: Stage[] = useMemo(() => {
    if (selectedPipeline?.stages && selectedPipeline.stages.length > 0) {
      return [...selectedPipeline.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [
      { stageId: 'NEW_ENQUIRY', name: 'New Enquiry', probability: 10, color: '#3B82F6', order: 1 },
      { stageId: 'CONTACTED', name: 'Contacted', probability: 25, color: '#8B5CF6', order: 2 },
      { stageId: 'PROPOSAL_SENT', name: 'Proposal Sent', probability: 50, color: '#F59E0B', order: 3 },
      { stageId: 'NEGOTIATION', name: 'Negotiation', probability: 75, color: '#EC4899', order: 4 },
      { stageId: 'WON', name: 'Closed Won', probability: 100, color: '#10B981', order: 5, isWon: true },
      { stageId: 'LOST', name: 'Closed Lost', probability: 0, color: '#EF4444', order: 6, isLost: true },
    ];
  }, [selectedPipeline]);

  // Format currency in Indian standard
  const formatAmount = (amt?: number, curr = 'INR') => {
    if (typeof amt !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr || 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Compact Indian Currency abbreviation for KPI bar (e.g. ₹1.2 Cr, ₹45 L, ₹85 K)
  const formatCompactINR = (val: number): string => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)} K`;
    return `₹${val}`;
  };

  // 5 Executive Calculated KPIs matching Web CRM 1:1
  const metrics = useMemo(() => {
    let totalVal = 0;
    let weightedVal = 0;
    let wonVal = 0;
    let wonCount = 0;
    let lostCount = 0;

    deals.forEach((d) => {
      const amt = Number(d.amount || 0);
      const prob = Number(d.probability || 0);
      totalVal += amt;
      weightedVal += (amt * prob) / 100;

      const stageKey = String(d.stageId || d.stage_id || d.stage || '').toUpperCase();
      if (stageKey === 'WON' || stageKey.includes('WON') || stageKey.includes('BOOKED')) {
        wonVal += amt;
        wonCount++;
      } else if (stageKey === 'LOST' || stageKey.includes('LOST') || stageKey.includes('DROP')) {
        lostCount++;
      }
    });

    const closedTotal = wonCount + lostCount;
    const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

    return {
      totalCount: deals.length,
      totalVal,
      weightedVal,
      wonVal,
      winRate,
    };
  }, [deals]);

  // Filter & sort deals for List View
  const filteredDeals = useMemo(() => {
    let res = deals.filter((d) => {
      // Stage filter
      if (activeStageId !== 'ALL') {
        const dStage = d.stageId || d.stage_id || d.stage;
        if (dStage !== activeStageId) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (d.title || d.name || '').toLowerCase().includes(q);
        const contactMatch = (d.contactName || d.contact_name || '').toLowerCase().includes(q);
        const accountMatch = (d.accountName || d.account_name || '').toLowerCase().includes(q);
        const ownerMatch = (d.ownerName || d.owner_name || '').toLowerCase().includes(q);
        const phoneMatch = (d.contactPhone || d.contact_phone || '').toLowerCase().includes(q);
        if (!titleMatch && !contactMatch && !accountMatch && !ownerMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort order
    if (sortBy === 'valueHigh') {
      res.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else if (sortBy === 'closeDate') {
      res.sort((a, b) => {
        const dateA = new Date(a.expectedCloseDate || a.expected_close_date || '2099-01-01').getTime();
        const dateB = new Date(b.expectedCloseDate || b.expected_close_date || '2099-01-01').getTime();
        return dateA - dateB;
      });
    } else {
      // newest first
      res.sort((a, b) => {
        const dateA = new Date(a.createdAt || '').getTime();
        const dateB = new Date(b.createdAt || '').getTime();
        return dateB - dateA;
      });
    }

    return res;
  }, [deals, activeStageId, searchQuery, sortBy]);

  // Handle Stage Movement Trigger
  const handleOpenStageModal = (deal: Deal) => {
    setSelectedDealForStage(deal);
    setStageModalOpen(true);
  };

  const executeStageUpdate = async (deal: Deal, stage: Stage) => {
    setUpdatingStage(true);
    const dealId = (deal._id || deal.id) as string;
    const stId = stage.stageId || stage.stage_id || stage.name;

    // Optimistic Update
    setDeals((prev) =>
      prev.map((d) =>
        (d._id || d.id) === dealId
          ? { ...d, stageId: stId, stage: stage.name, probability: stage.probability }
          : d
      )
    );

    try {
      await dealsService.updateDealStage(dealId, stId, undefined, stage.name, stage.probability);
      setStageModalOpen(false);
      setSelectedDealForStage(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update deal stage.');
      fetchData();
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleSelectStage = async (stage: Stage) => {
    if (!selectedDealForStage) return;
    const isLost = stage.isLost || stage.is_lost || stage.name.toUpperCase().includes('LOST');

    if (isLost) {
      setPendingLostStage(stage);
      setStageModalOpen(false);
      setLostModalOpen(true);
      return;
    }

    const isWon = stage.isWon || stage.is_won || stage.name.toUpperCase().includes('WON');
    if (isWon) {
      Alert.alert(
        '🎉 Mark Deal as Won?',
        `Are you sure you want to mark "${selectedDealForStage.title || selectedDealForStage.name}" as Closed Won?\n\nThis will record ${formatAmount(selectedDealForStage.amount, selectedDealForStage.currency)} in booked commercial revenue and update the contact lifecycle status.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Won',
            style: 'default',
            onPress: () => executeStageUpdate(selectedDealForStage, stage),
          },
        ]
      );
      return;
    }

    await executeStageUpdate(selectedDealForStage, stage);
  };

  const handleConfirmLost = async (reason: string, remarks?: string) => {
    if (!selectedDealForStage || !pendingLostStage) return;
    setUpdatingStage(true);
    const dealId = (selectedDealForStage._id || selectedDealForStage.id) as string;
    const stId = pendingLostStage.stageId || pendingLostStage.stage_id || pendingLostStage.name;
    const lostName = pendingLostStage.name || 'Closed Lost';
    const finalReason = reason;

    // Optimistic Update
    setDeals((prev) =>
      prev.map((d) =>
        (d._id || d.id) === dealId
          ? { ...d, stageId: stId, stage: lostName, probability: 0, lostReason: finalReason }
          : d
      )
    );

    try {
      await dealsService.updateDealStage(dealId, stId, finalReason, lostName, 0);
      setLostModalOpen(false);
      setPendingLostStage(null);
      setSelectedDealForStage(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark deal as lost.');
      fetchData();
    } finally {
      setUpdatingStage(false);
    }
  };

  // Open Edit Deal
  const handleOpenEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealModalOpen(true);
  };

  // Open Create Deal
  const handleOpenCreateDeal = () => {
    setEditingDeal(null);
    setDealModalOpen(true);
  };

  // Delete Deal Handler with confirmation
  const handleDeleteDeal = (deal: Deal) => {
    Alert.alert(
      'Delete Deal',
      `Are you sure you want to delete "${deal.title || deal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const dealId = String(deal._id || deal.id);
            setDeals((prev) => prev.filter((d) => (d._id || d.id) !== dealId));
            try {
              await dealsService.deleteDeal(dealId);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete deal from server.');
              fetchData();
            }
          },
        },
      ]
    );
  };

  // Direct Communication Handlers
  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number provided on this deal.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number provided on this deal.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const handleEmail = (email?: string) => {
    if (!email) {
      Alert.alert('No Email', 'No contact email address provided on this deal.');
      return;
    }
    Linking.openURL(`mailto:${email.trim()}`);
  };

  const formatCloseDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const clean = String(dateStr).split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (!isNaN(monthIdx) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
          return `${day} ${months[monthIdx]} ${year}`;
        }
      }
      return clean;
    } catch (e) {
      return String(dateStr).split('T')[0];
    }
  };

  // Reusable Deal Card Renderer
  const renderDealCard = (deal: Deal, isKanban = false) => {
    const stageObj = stages.find(
      (s) => (s.stageId || s.stage_id) === (deal.stageId || deal.stage_id || deal.stage)
    );
    const stageColor = stageObj?.color || '#272944';
    const stageName = stageObj?.name || deal.stage || 'Pipeline';
    const company = deal.accountName || deal.account_name;
    const contact = deal.contactName || deal.contact_name;
    const phone = deal.contactPhone || deal.contact_phone;
    const email = deal.contactEmail || deal.contact_email;
    const contactId = deal.contactId || deal.contact_id;
    const owner = deal.ownerName || deal.owner_name;
    const lostReasonText = deal.lostReason || deal.lost_reason;

    const rawCloseDate = deal.expectedCloseDate || deal.expected_close_date;
    const isOverdue =
      Boolean(rawCloseDate) &&
      new Date(rawCloseDate!).getTime() < Date.now() - 24 * 60 * 60 * 1000 &&
      !stageName.toUpperCase().includes('WON') &&
      !stageName.toUpperCase().includes('LOST');

    return (
      <View
        key={deal._id || deal.id}
        style={[styles.dealCard, isKanban && styles.dealCardKanban]}
      >
        {/* Card Header: Title & Stage */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => handleOpenEditDeal(deal)} activeOpacity={0.7}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {deal.title || deal.name || 'Untitled Opportunity'}
              </Text>
            </TouchableOpacity>

            {Boolean(company) && (
              <View style={styles.metaRow}>
                <Ionicons name="business" size={12} color="#475569" />
                <Text style={styles.companyText} numberOfLines={1}>
                  {company}
                </Text>
              </View>
            )}
          </View>

          {/* Clickable Stage Badge */}
          <TouchableOpacity
            style={[styles.stageBadge, { backgroundColor: `${stageColor}1A`, borderColor: stageColor }]}
            onPress={() => handleOpenStageModal(deal)}
            activeOpacity={0.75}
          >
            <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
            <Text style={[styles.stageBadgeText, { color: stageColor }]} numberOfLines={1}>
              {stageName.toUpperCase()}
            </Text>
            <Ionicons name="chevron-down" size={11} color={stageColor} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Contact Info & Direct Communication Actions */}
        {Boolean(contact) && (
          <View style={styles.contactBar}>
            <TouchableOpacity
              style={styles.contactInfoRow}
              onPress={() => {
                if (contactId && navigation?.navigate) {
                  navigation.navigate('LeadDetail', { leadId: contactId });
                }
              }}
              disabled={!Boolean(contactId)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={13} color="#272944" />
              <Text
                style={[
                  styles.contactNameText,
                  Boolean(contactId) && styles.contactNameTextClickable,
                ]}
                numberOfLines={1}
              >
                {contact}
              </Text>
              {Boolean(contactId) && (
                <Ionicons name="open-outline" size={11} color="#64748B" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <View style={styles.contactActionsRow}>
              {Boolean(phone) && (
                <>
                  <TouchableOpacity
                    style={styles.miniCircleCallBtn}
                    onPress={() => handleCall(phone)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="call" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniCircleWhatsAppBtn}
                    onPress={() => handleWhatsApp(phone)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="logo-whatsapp" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
              {Boolean(email) && (
                <TouchableOpacity
                  style={styles.miniCircleEmailBtn}
                  onPress={() => handleEmail(email)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="mail" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Visual Lost Reason Badge if Lost */}
        {Boolean(lostReasonText) && (
          <View style={styles.lostReasonCardBadge}>
            <Ionicons name="alert-circle" size={12} color="#DC2626" />
            <Text style={styles.lostReasonCardText} numberOfLines={1}>
              Reason: {lostReasonText}
            </Text>
          </View>
        )}

        {/* Value, Probability & Close Date */}
        <View style={styles.metricsBox}>
          <View>
            <Text style={styles.metricLabel}>DEAL VALUE</Text>
            <Text style={styles.dealAmountValue}>{formatAmount(deal.amount, deal.currency)}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metricLabel}>WIN PROBABILITY</Text>
            <View style={styles.probBadge}>
              <Text style={styles.probBadgeText}>{deal.probability ?? 10}%</Text>
            </View>
          </View>
        </View>

        {/* Footer Meta & Action Dock */}
        <View style={styles.cardFooterRow}>
          <View style={styles.footerMetaGroup}>
            {Boolean(rawCloseDate) && (
              <View style={[styles.closeDatePill, isOverdue && styles.closeDatePillOverdue]}>
                <Ionicons
                  name="calendar-outline"
                  size={11}
                  color={isOverdue ? '#DC2626' : '#64748B'}
                />
                <Text style={[styles.closeDateText, isOverdue && styles.closeDateTextOverdue]}>
                  {formatCloseDate(rawCloseDate)}
                  {isOverdue ? ' (Overdue)' : ''}
                </Text>
              </View>
            )}

            {Boolean(owner) && (
              <View style={styles.ownerPill}>
                <Ionicons name="person-circle-outline" size={12} color="#272944" />
                <Text style={styles.ownerText} numberOfLines={1}>
                  {owner}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Edit / Delete Action Menu */}
          <View style={styles.actionMenuRow}>
            <TouchableOpacity
              style={styles.cardActionIconBtn}
              onPress={() => handleOpenEditDeal(deal)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={15} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardActionIconBtn}
              onPress={() => handleDeleteDeal(deal)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Executive Luxury Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Interactive Pipeline Selector Trigger */}
          <TouchableOpacity
            style={styles.pipelineSelectorBtn}
            onPress={() => setPipelinePickerOpen(true)}
            activeOpacity={0.8}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.pipelineSubhead}>SALES PIPELINE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.pipelineTitleText} numberOfLines={1}>
                  {selectedPipeline?.name || 'Standard Pipeline'}
                </Text>
                <Ionicons name="chevron-down" size={15} color="#94A3B8" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addDealCTA}
            onPress={handleOpenCreateDeal}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addDealCTAText}>Deal</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Zone 2: 5-Metric Executive KPI Cockpit Bar ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiScrollContainer}
        >
          {/* Card 1: Total Pipeline Value */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL PIPELINE</Text>
            <Text style={styles.kpiValMain}>{formatCompactINR(metrics.totalVal)}</Text>
            <Text style={styles.kpiSubLabel}>{metrics.totalCount} Deals Total</Text>
          </View>

          {/* Card 2: Weighted Revenue */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WEIGHTED REVENUE</Text>
            <Text style={[styles.kpiValMain, { color: '#60A5FA' }]}>
              {formatCompactINR(metrics.weightedVal)}
            </Text>
            <Text style={styles.kpiSubLabel}>Probability Sized</Text>
          </View>

          {/* Card 3: Closed Won Value */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CLOSED WON</Text>
            <Text style={[styles.kpiValMain, { color: '#34D399' }]}>
              {formatCompactINR(metrics.wonVal)}
            </Text>
            <Text style={styles.kpiSubLabel}>Booked Value</Text>
          </View>

          {/* Card 4: Win Conversion Rate */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WIN CONVERSION</Text>
            <Text style={[styles.kpiValMain, { color: '#FBBF24' }]}>{metrics.winRate}%</Text>
            <Text style={styles.kpiSubLabel}>Won vs Closed</Text>
          </View>
        </ScrollView>
      </View>

      {/* ─── Zone 3: View Toggle & Search Toolbar ─── */}
      <View style={styles.toolbarRow}>
        {/* View Mode Switcher: Kanban vs List */}
        <View style={styles.viewModeSwitcher}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'kanban' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('kanban')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid-outline"
              size={15}
              color={viewMode === 'kanban' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.viewModeText, viewMode === 'kanban' && styles.viewModeTextActive]}>
              Kanban
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === 'list' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
              List ({deals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & Sort Actions for List mode */}
        {viewMode === 'list' && (
          <TouchableOpacity
            style={styles.sortTriggerBtn}
            onPress={() => setSortModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-vertical" size={15} color="#272944" />
            <Text style={styles.sortTriggerText}>Sort</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input Bar (Visible in List view) */}
      {viewMode === 'list' && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={17} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals by title, company, contact or owner..."
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
      )}

      {/* Stage Filter Tabs (Visible in List view) */}
      {viewMode === 'list' && (
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            <TouchableOpacity
              style={[styles.stageTab, activeStageId === 'ALL' && styles.stageTabActive]}
              onPress={() => setActiveStageId('ALL')}
            >
              <Text
                style={[styles.stageTabText, activeStageId === 'ALL' && styles.stageTabTextActive]}
              >
                All ({deals.length})
              </Text>
            </TouchableOpacity>

            {stages.map((st) => {
              const stId = String(st.stageId || st.stage_id || st.name);
              const count = deals.filter(
                (d) => String(d.stageId || d.stage_id || d.stage) === stId
              ).length;
              const isActive = activeStageId === stId;
              return (
                <TouchableOpacity
                  key={stId}
                  style={[styles.stageTab, isActive && styles.stageTabActive]}
                  onPress={() => setActiveStageId(stId)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: st.color || '#272944',
                      }}
                    />
                    <Text
                      style={[styles.stageTabText, isActive && styles.stageTabTextActive]}
                    >
                      {st.name} ({count})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── Zone 4: Main Content (Kanban Board vs List View) ─── */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#272944" />
          <Text style={styles.loadingText}>Fetching Pipeline Deals...</Text>
        </View>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kanbanScrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#272944" />}
        >
          {stages.map((st) => {
            const stId = String(st.stageId || st.stage_id || st.name);
            const stageDeals = deals.filter(
              (d) => String(d.stageId || d.stage_id || d.stage) === stId
            );
            const stageSum = stageDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

            return (
              <View key={stId} style={styles.kanbanColumn}>
                {/* Column Header */}
                <View style={styles.kanbanColumnHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.stageDotLarge, { backgroundColor: st.color || '#272944' }]} />
                    <Text style={styles.kanbanColumnTitle} numberOfLines={1}>
                      {st.name}
                    </Text>
                  </View>
                  <View style={styles.kanbanCountBadge}>
                    <Text style={styles.kanbanCountText}>{stageDeals.length}</Text>
                  </View>
                </View>

                {/* Column Total Value Banner */}
                <View style={styles.columnTotalBar}>
                  <Text style={styles.columnTotalText}>{formatCompactINR(stageSum)}</Text>
                  <Text style={styles.columnProbText}>{st.probability}% win</Text>
                </View>

                {/* Column Cards List */}
                <ScrollView
                  style={styles.kanbanCardsScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  {stageDeals.length === 0 ? (
                    <View style={styles.kanbanEmptyState}>
                      <Ionicons name="folder-open-outline" size={28} color="#CBD5E1" />
                      <Text style={styles.kanbanEmptyText}>No deals in {st.name}</Text>
                    </View>
                  ) : (
                    stageDeals.map((deal) => renderDealCard(deal, true))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* LIST VIEW */
        <FlatList
          data={filteredDeals}
          keyExtractor={(item) => String(item._id || item.id || Math.random())}
          renderItem={({ item }) => renderDealCard(item, false)}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#272944" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Deals Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'No deals match your search criteria.' : 'Tap + Deal button above to create a new opportunity.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Modal 1: Comprehensive Add / Edit Deal Wizard ─── */}
      <DealFormModal
        visible={dealModalOpen}
        editingDeal={editingDeal}
        pipelines={pipelines}
        defaultPipelineId={selectedPipeline?._id || selectedPipeline?.id}
        industryCode={user?.industryId}
        onClose={() => setDealModalOpen(false)}
        onSuccess={(savedDeal) => {
          setDealModalOpen(false);
          fetchData();
        }}
      />

      {/* ─── Modal 2: Closed Lost Standard Reasons ─── */}
      <LostReasonModal
        visible={lostModalOpen}
        deal={selectedDealForStage}
        stage={pendingLostStage}
        loading={updatingStage}
        onClose={() => {
          setLostModalOpen(false);
          setPendingLostStage(null);
        }}
        onConfirm={handleConfirmLost}
      />

      {/* ─── Modal 3: Update Deal Stage ─── */}
      <Modal visible={stageModalOpen} animationType="slide" transparent onRequestClose={() => setStageModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedDealForStage?.title || selectedDealForStage?.name || 'Move Deal Stage'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {formatAmount(selectedDealForStage?.amount, selectedDealForStage?.currency)}
                  {Boolean(selectedDealForStage?.accountName || selectedDealForStage?.account_name) &&
                    ` • 🏢 ${selectedDealForStage?.accountName || selectedDealForStage?.account_name}`}
                  {Boolean(selectedDealForStage?.contactName || selectedDealForStage?.contact_name) &&
                    ` • 👤 ${selectedDealForStage?.contactName || selectedDealForStage?.contact_name}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStageModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.stageSelectHeading}>SELECT TARGET PIPELINE STAGE</Text>

            {updatingStage ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#272944" />
                <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>Updating stage...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {stages.map((st) => {
                  const stId = String(st.stageId || st.stage_id || st.name);
                  const currentStId = String(
                    selectedDealForStage?.stageId || selectedDealForStage?.stage_id || selectedDealForStage?.stage
                  );
                  const isCurrent = currentStId === stId || currentStId === st.name;

                  return (
                    <TouchableOpacity
                      key={stId}
                      style={[styles.stageSelectItem, isCurrent && styles.stageSelectItemCurrent]}
                      onPress={() => handleSelectStage(st)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.stageDotLarge, { backgroundColor: st.color || '#272944' }]} />
                        <View>
                          <Text style={[styles.stageSelectText, isCurrent && { fontWeight: '700', color: '#1E293B' }]}>
                            {st.name}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                            Win probability: {st.probability}%
                          </Text>
                        </View>
                      </View>
                      {isCurrent && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setStageModalOpen(false)}>
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal 4: Pipeline Switcher Bottom Sheet ─── */}
      <Modal visible={pipelinePickerOpen} animationType="slide" transparent onRequestClose={() => setPipelinePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sales Pipelines</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Select an organization pipeline to view opportunities
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPipelinePickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {pipelines.map((pipe) => {
                const pipeId = String(pipe._id || pipe.id);
                const isSelected = (selectedPipeline?._id || selectedPipeline?.id) === pipeId;
                return (
                  <TouchableOpacity
                    key={pipeId}
                    style={[styles.pipelineItemRow, isSelected && styles.pipelineItemRowSelected]}
                    onPress={() => handleSelectPipeline(pipe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pipeIconBox, isSelected && styles.pipeIconBoxSelected]}>
                      <Ionicons name="git-branch-outline" size={18} color={isSelected ? '#272944' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pipelineItemTitle, isSelected && { color: '#272944', fontWeight: '700' }]}>
                        {pipe.name}
                      </Text>
                      <Text style={styles.pipelineItemSub}>
                        {pipe.stages?.length || 0} Stages • {pipe.isDefault || pipe.is_default ? 'Default' : 'Custom'}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Modal 5: Sort Options Modal ─── */}
      <Modal visible={sortModalOpen} animationType="slide" transparent onRequestClose={() => setSortModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Opportunities</Text>
              <TouchableOpacity onPress={() => setSortModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { key: 'newest', label: 'Recently Created (Newest First)', icon: 'time-outline' },
              { key: 'valueHigh', label: 'Highest Deal Value (₹ High to Low)', icon: 'cash-outline' },
              { key: 'closeDate', label: 'Upcoming Expected Close Date', icon: 'calendar-outline' },
            ].map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.pipelineItemRow, isSelected && styles.pipelineItemRowSelected]}
                  onPress={() => {
                    setSortBy(opt.key as any);
                    setSortModalOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon as any} size={18} color={isSelected ? '#272944' : '#64748B'} />
                  <Text style={[styles.pipelineItemTitle, isSelected && { color: '#272944', fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
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
  luxuryHeader: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
  },
  pipelineSelectorBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pipelineSubhead: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  pipelineTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 180,
  },
  addDealCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272944',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 3,
  },
  addDealCTAText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiScrollContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  kpiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 124,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  kpiValMain: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },
  kpiSubLabel: {
    fontSize: 10.5,
    color: '#CBD5E1',
    marginTop: 2,
    fontWeight: '500',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    gap: 5,
  },
  viewModeBtnActive: {
    backgroundColor: '#272944',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  sortTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272944',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  tabsWrapper: {
    marginBottom: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stageTab: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageTabActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  stageTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stageTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* ─── Kanban Board Styling ─── */
  kanbanScrollContainer: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 30,
    gap: 12,
  },
  kanbanColumn: {
    width: KANBAN_CARD_WIDTH,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kanbanColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kanbanColumnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 190,
  },
  stageDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kanbanCountBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  kanbanCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  columnTotalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  columnTotalText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
  },
  columnProbText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  kanbanCardsScroll: {
    maxHeight: '100%',
  },
  kanbanEmptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kanbanEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ─── Deal Card (Shared) ─── */
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  dealCardKanban: {
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  companyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 6,
  },
  contactNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#272944',
  },
  contactNameTextClickable: {
    fontWeight: '700',
    color: '#272944',
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniCircleCallBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCircleWhatsAppBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCircleEmailBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lostReasonCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lostReasonCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  metricsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  dealAmountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  probBadge: {
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 2,
  },
  probBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#272944',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  closeDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closeDatePillOverdue: {
    backgroundColor: '#FEF2F2',
  },
  closeDateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  closeDateTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(39, 41, 68, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownerText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#272944',
  },
  actionMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List View Container */
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageSelectHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
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
    borderColor: '#272944',
    backgroundColor: 'rgba(39, 41, 68, 0.05)',
  },
  stageSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  cancelModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  pipelineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    gap: 10,
  },
  pipelineItemRowSelected: {
    backgroundColor: 'rgba(39, 41, 68, 0.05)',
    borderColor: '#272944',
  },
  pipeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeIconBoxSelected: {
    backgroundColor: 'rgba(39, 41, 68, 0.1)',
  },
  pipelineItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  pipelineItemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
});
