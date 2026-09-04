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
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadService, LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { PostCallDispositionModal, PostCallCallerInfo } from '../../components/telephony';
import { theme } from '../../theme/theme';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { openEmail } from '../../utils/emailHelper';

export const LeadsListScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterScrollProgress, setFilterScrollProgress] = useState(0);

  // Post-Call Disposition State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCaller, setActiveCaller] = useState<PostCallCallerInfo | null>(null);

  // Sync filter when navigating from Analytics or other screens
  useEffect(() => {
    if (route?.params?.filter) {
      const f = String(route.params.filter).toLowerCase();
      if (f.includes('fresh')) setSelectedStatus('Fresh');
      else if (f.includes('callback') || f.includes('call_back')) setSelectedStatus('Callbacks');
      else if (f.includes('interested') && !f.includes('not')) setSelectedStatus('Interested');
      else if (f.includes('won') || f.includes('converted') || f.includes('closedwon')) setSelectedStatus(semantics.wonLabel || 'Converted');
      else if (f.includes('lost') || f.includes('notinterested') || f.includes('not_interested') || f.includes('closedlost')) setSelectedStatus('Lost');
    }
  }, [route?.params?.filter, semantics.wonLabel]);

  // Exact Web CRM Stages with dynamic Won/Converted label
  const statusFilters = ['ALL', 'Fresh', 'Callbacks', 'Interested', semantics.wonLabel || 'Converted', 'Lost'];

  const fetchLeadsData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadService.getLeads({
        q: searchQuery.trim() || undefined,
      });
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchLeadsData();
  }, [fetchLeadsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeadsData();
  };

  // Metrics computation synchronized with Web CRM stages
  const counts = useMemo(() => {
    let fresh = 0;
    let callbacks = 0;
    let interested = 0;
    let converted = 0;
    let lost = 0;

    leads.forEach((l) => {
      const st = (l.stage || l.status || '').toUpperCase().trim();
      const isDeal =
        st.includes('DEAL') ||
        st.includes('WON') ||
        st.includes('BOOKED') ||
        st.includes('CONVERT');
      if (isDeal) {
        converted++;
      } else if (
        st.includes('CALLBACK') ||
        st.includes('RESCHEDULE') ||
        st.includes('CALL_BACK') ||
        st.includes('CONTACT')
      ) {
        callbacks++;
      } else if (
        (st.includes('INTEREST') && !st.includes('NOT')) ||
        st.includes('QUALIF') ||
        st.includes('VISIT')
      ) {
        interested++;
      } else if (
        st.includes('LOST') ||
        st.includes('NOT_INTEREST') ||
        st.includes('REFUSED')
      ) {
        lost++;
      } else {
        fresh++;
      }
    });

    return { total: leads.length, fresh, callbacks, interested, converted, lost };
  }, [leads]);

  // Dynamic filter matching Web CRM tabs
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (selectedStatus !== 'ALL') {
      result = result.filter((l) => {
        const st = (l.stage || l.status || '').toUpperCase().trim();
        const isDeal =
          st.includes('DEAL') ||
          st.includes('WON') ||
          st.includes('BOOKED') ||
          st.includes('CONVERT');

        if (selectedStatus === 'Converted') return isDeal;
        if (selectedStatus === 'Callbacks') {
          return (
            st.includes('CALLBACK') ||
            st.includes('RESCHEDULE') ||
            st.includes('CALL_BACK') ||
            st.includes('CONTACT')
          );
        }
        if (selectedStatus === 'Interested') {
          return (
            (st.includes('INTEREST') && !st.includes('NOT')) ||
            st.includes('QUALIF') ||
            st.includes('VISIT')
          );
        }
        if (selectedStatus === 'Lost') {
          return (
            st.includes('LOST') ||
            st.includes('NOT_INTEREST') ||
            st.includes('REFUSED')
          );
        }
        if (selectedStatus === 'Fresh') {
          return (
            !isDeal &&
            !st.includes('CALLBACK') &&
            !st.includes('RESCHEDULE') &&
            !st.includes('INTEREST') &&
            !st.includes('LOST') &&
            !st.includes('CONTACT') &&
            !st.includes('QUALIF')
          );
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.alternateNo && l.alternateNo.includes(q)) ||
          (l.project && l.project.toLowerCase().includes(q)) ||
          (l.location && l.location.toLowerCase().includes(q))
      );
    }

    return result;
  }, [leads, selectedStatus, searchQuery]);

  const handleCall = (targetLead: LeadItem) => {
    const phone = targetLead.phone || targetLead.contactNo;
    if (!phone) {
      Alert.alert('No Phone Number', 'No contact number available for this buyer.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      // Note: Simulator has no cellular dialer hardware
      console.log(`[Telephony] Native dialer not available on simulator for ${phone}`);
    });

    setActiveCaller({
      contactId: targetLead.id,
      leadId: targetLead.id,
      customerName: targetLead.name || targetLead.firstName || 'Buyer Contact',
      phone: phone,
      project: targetLead.project || '',
      stage: targetLead.stage || targetLead.status || '',
    });

    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1000);
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    const message = `Hello ${name || 'Sir/Madam'}, thank you for contacting ${user?.organizationName || 'Leads Rubix'}. How can I assist you with your ${semantics.leadEntitySingular.toLowerCase()} inquiry today?`;
    openWhatsApp(phone, message);
  };

  const handleEmail = (email?: string, name?: string) => {
    const subject = `Regarding your inquiry with ${user?.organizationName || 'Leads Rubix'}`;
    const body = `Hello ${name || 'Sir/Madam'},\n\nThank you for reaching out to ${user?.organizationName || 'Leads Rubix'}. How can we assist you with your property inquiry today?\n\nBest regards,\n${user?.name || 'Sales Team'}`;
    openEmail(email, subject, body);
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

  const getStageMeta = (status: string) => {
    const st = (status || '').toUpperCase().trim();
    if (
      st.includes('DEAL') ||
      st.includes('WON') ||
      st.includes('BOOKED') ||
      st.includes('CONVERT')
    ) {
      return {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#047857',
        avatarBg: '#ECFDF5',
        avatarText: '#047857',
        dot: '#10B981',
        label: (semantics.wonLabel || 'CONVERTED').toUpperCase(),
      };
    }
    if (
      st.includes('CALLBACK') ||
      st.includes('RESCHEDULE') ||
      st.includes('CALL_BACK') ||
      st.includes('CONTACT')
    ) {
      return {
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#B45309',
        avatarBg: '#FFFBEB',
        avatarText: '#B45309',
        dot: '#F59E0B',
        label: 'CALLBACK',
      };
    }
    if (
      (st.includes('INTEREST') && !st.includes('NOT')) ||
      st.includes('QUALIF') ||
      st.includes('VISIT')
    ) {
      return {
        bg: '#F5F3FF',
        border: '#DDD6FE',
        text: '#6D28D9',
        avatarBg: '#F5F3FF',
        avatarText: '#6D28D9',
        dot: '#8B5CF6',
        label: 'INTERESTED',
      };
    }
    if (
      st.includes('LOST') ||
      st.includes('NOT_INTEREST') ||
      st.includes('REFUSED')
    ) {
      return {
        bg: '#FFF1F2',
        border: '#FECDD3',
        text: '#BE123C',
        avatarBg: '#FFF1F2',
        avatarText: '#BE123C',
        dot: '#F43F5E',
        label: 'LOST',
      };
    }
    return {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      avatarBg: '#EFF6FF',
      avatarText: '#1D4ED8',
      dot: '#3B82F6',
      label: (semantics.freshLabel.split(' ')[0] || 'FRESH').toUpperCase(),
    };
  };

  const getStageCount = (st: string) => {
    const s = st.toLowerCase();
    if (s === 'all') return counts.total;
    if (s === 'fresh') return counts.fresh;
    if (s === 'callbacks') return counts.callbacks;
    if (s === 'interested') return counts.interested;
    if (s === 'converted' || s === (semantics.wonLabel || '').toLowerCase()) return counts.converted;
    if (s === 'lost') return counts.lost;
    return 0;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Hero Luxury Header (Matching Dashboard Aesthetic) ─── */}
      <View style={styles.luxuryHeader}>
        {/* Top Branding Row (Pixel-identical to Dashboard) */}
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <TouchableOpacity
            style={styles.newLeadCTA}
            onPress={() => navigation.navigate('LeadForm')}
            activeOpacity={0.88}
          >
            <Ionicons name="add-sharp" size={15} color="#FFFFFF" />
            <Text style={styles.newLeadCTAText}>Add {semantics.leadEntitySingular}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-sharp" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputControl}
            placeholder={`Search name, phone, ${semantics.leadEntitySingular.toLowerCase()}, project...`}
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
        {/* ─── Pipeline Stage Filter Chips (Exact Web CRM Match) ─── */}
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>PIPELINE STAGES</Text>
          <View style={styles.swipeHintPill}>
            <Ionicons name="swap-horizontal" size={11} color="#0284C7" />
            <Text style={styles.swipeHintText}>Swipe for more</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterBar}
          contentContainerStyle={styles.statusFilterContent}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const maxScroll = contentSize.width - layoutMeasurement.width;
            if (maxScroll > 0) {
              setFilterScrollProgress(Math.min(1, Math.max(0, contentOffset.x / maxScroll)));
            }
          }}
          scrollEventThrottle={16}
        >
          {statusFilters.map((st) => {
            const isSelected = selectedStatus.toLowerCase() === st.toLowerCase();
            const count = getStageCount(st);

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
                <View style={[styles.chipBadgeCircle, isSelected && styles.chipBadgeCircleSelected]}>
                  <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Micro Track Bar Indicator */}
        <View style={styles.scrollTrackContainer}>
          <View style={styles.scrollTrackBg}>
            <View
              style={[
                styles.scrollTrackThumb,
                { left: `${filterScrollProgress * 65}%` },
              ]}
            />
          </View>
        </View>

        {/* ─── Zone 4: Lead List Items ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#151728" />
            <Text style={styles.loadingText}>Fetching {semantics.leadEntityPlural.toLowerCase()} & inquiries...</Text>
          </View>
        ) : filteredLeads.length === 0 ? (
          <View style={styles.emptyCard3D}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="checkmark-done-sharp" size={26} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>Pipeline is Clear</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? `No ${semantics.leadEntityPlural.toLowerCase()} match "${searchQuery}". Try a different keyword.`
                : `No ${semantics.leadEntityPlural.toLowerCase()} currently in ${selectedStatus.toUpperCase()} stage.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyCTA}
              onPress={() => navigation.navigate('LeadForm')}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCTAText}>Create New {semantics.leadEntitySingular}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredLeads.map((lead) => {
            const meta = getStageMeta(lead.stage || lead.status);

            return (
              <View key={lead.id} style={styles.leadCardRow}>
                {/* Left Vertical Source Badge */}
                <View style={styles.sourceVerticalContainer}>
                  <Text style={styles.sourceVerticalText} numberOfLines={1}>
                    {formatSource(lead.source)}
                  </Text>
                </View>

                {/* Main Card Body (Tap opens Lead Details) */}
                <TouchableOpacity
                  style={styles.leadCardBody}
                  onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id, lead })}
                  activeOpacity={0.75}
                >
                  <View style={styles.leadInfoSection}>
                    <View style={styles.nameHeaderRow}>
                      <Text style={styles.leadNameText} numberOfLines={1}>
                        {lead.name}
                      </Text>
                      <View
                        style={[
                          styles.miniStatusPill,
                          { backgroundColor: meta.bg, borderColor: meta.border },
                        ]}
                      >
                        <View style={[styles.miniStatusDot, { backgroundColor: meta.dot }]} />
                        <Text style={[styles.miniStatusText, { color: meta.text }]}>
                          {meta.label}
                        </Text>
                      </View>
                    </View>

                    {lead.phone ? (
                      <View style={styles.contactItemRow}>
                        <Ionicons name="call" size={11} color="#272944" />
                        <Text style={styles.phoneText} numberOfLines={1}>
                          {lead.phone}
                        </Text>
                      </View>
                    ) : null}

                    {lead.email ? (
                      <TouchableOpacity
                        style={styles.contactItemRow}
                        onPress={() => handleEmail(lead.email, lead.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="mail-outline" size={11} color="#64748B" />
                        <Text style={styles.emailText} numberOfLines={1}>
                          {lead.email}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {!lead.phone && !lead.email ? (
                      <Text style={styles.leadSubDetailText} numberOfLines={1}>
                        {lead.project ? `${lead.project} • ` : ''}{lead.createdAt}
                      </Text>
                    ) : null}
                  </View>

                  {/* Right Quick Action Icons Cockpit (Call | Email | WhatsApp) */}
                  <View style={styles.rightActionCockpit}>
                    {lead.phone ? (
                      <TouchableOpacity
                        style={styles.circleActionBtnCall}
                        onPress={() => handleCall(lead)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : null}

                    {lead.email ? (
                      <>
                        <View style={styles.actionDividerLine} />
                        <TouchableOpacity
                          style={styles.circleActionBtnMail}
                          onPress={() => handleEmail(lead.email, lead.name)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="mail" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {lead.phone ? (
                      <>
                        <View style={styles.actionDividerLine} />
                        <TouchableOpacity
                          style={styles.circleActionBtnWhatsApp}
                          onPress={() => handleWhatsApp(lead.phone, lead.name)}
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
          fetchLeadsData();
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
  // ─── Zone 1: Midnight Luxury Header ───
  luxuryHeader: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerStatusPill: {
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
  headerGreenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  headerStatusPillText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  newLeadCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 5,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  newLeadCTAText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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

  // ─── Scrollable Body ───
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 90,
  },

  // ─── Pipeline Stage Filter Chips ───
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  swipeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  swipeHintText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.2,
  },
  statusFilterBar: {
    marginBottom: 6,
  },
  statusFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  scrollTrackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  scrollTrackBg: {
    width: 42,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  scrollTrackThumb: {
    width: 15,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0284C7',
    position: 'absolute',
    top: 0,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusChipSelected: {
    backgroundColor: '#151728',
    borderColor: '#151728',
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
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipBadgeCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
  },

  // ─── Reference Compact Horizontal Lead Card ───
  leadCardRow: {
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
    fontWeight: '700',
    letterSpacing: 0.4,
    transform: [{ rotate: '-90deg' }],
    width: 75,
    textAlign: 'center',
  },
  leadCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  leadInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  leadNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    maxWidth: 150,
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    marginTop: 2.5,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.1,
  },
  emailText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    maxWidth: 165,
  },
  leadSubDetailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
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
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151728',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptyCTAText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
