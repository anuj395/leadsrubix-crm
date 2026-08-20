import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { nurturingService, LIFECYCLE_STAGES, LifecycleStage } from '../../services/nurturingService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const LeadDetailsScreen = ({ route, navigation }: any) => {
  const { leadId } = route.params || {};

  const [lead, setLead] = useState({
    id: leadId || '1',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.k@gmail.com',
    status: 'Qualified Opportunity' as LifecycleStage,
    budget: '₹2.2 - 3.0 Cr',
    propertyType: '3 BHK Luxury Apartment',
    project: 'Grand Horizon Towers',
    source: '99acres Portal',
    assignedTo: 'Anuj Chauhan',
    createdAt: 'Yesterday, 4:30 PM',
  });

  const [rollbackModalVisible, setRollbackModalVisible] = useState(false);
  const [targetStage, setTargetStage] = useState<LifecycleStage | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const handleStageSelect = (stage: LifecycleStage) => {
    const currentIndex = LIFECYCLE_STAGES.indexOf(lead.status);
    const targetIndex = LIFECYCLE_STAGES.indexOf(stage);

    if (targetIndex < currentIndex) {
      // Backward rollback requires reason
      setTargetStage(stage);
      setRollbackModalVisible(true);
    } else {
      // Forward transition
      setLead((prev) => ({ ...prev, status: stage }));
      nurturingService.transitionStage({
        leadId: lead.id,
        fromStage: lead.status,
        toStage: stage,
      });
    }
  };

  const confirmRollback = () => {
    if (!rollbackReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for rolling back this lead stage.');
      return;
    }

    if (targetStage) {
      setLead((prev) => ({ ...prev, status: targetStage }));
      nurturingService.transitionStage({
        leadId: lead.id,
        fromStage: lead.status,
        toStage: targetStage,
        reason: rollbackReason.trim(),
      });
    }

    setRollbackModalVisible(false);
    setRollbackReason('');
  };

  const handleCall = () => {
    Linking.openURL(`tel:${lead.phone}`);
  };

  const handleWhatsApp = () => {
    const clean = lead.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={36} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>360° PROSPECT LIFECYCLE DETAILS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Companion */}
        <AIAdvisorMascot
          screenName="LeadDetails"
          message="Lead qualified! Schedule a site visit tour or generate a CPQ quotation to close deal."
        />

        {/* 3D Prospect Profile Card */}
        <View style={styles.profileCard3D}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{lead.name.charAt(0)}</Text>
            </View>

            <View style={styles.nameGroup}>
              <Text style={styles.nameText}>{lead.name}</Text>
              <Text style={styles.subtext}>{lead.email}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{lead.status}</Text>
            </View>
          </View>

          {/* Quick Call & WhatsApp Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
              <Ionicons name="call" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Call Prospect</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>WhatsApp Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SAP Lifecycle Stage Progression Bar */}
        <View style={styles.stageCard3D}>
          <View style={styles.stageHeaderRow}>
            <Text style={styles.sectionTitle}>LIFECYCLE NURTURING STAGE</Text>
            <InfoGuideBadge
              title="SAP Stage Transitions"
              description="Progress leads forward as deals advance, or roll back to earlier stages with mandatory reason tracking."
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageScroll}>
            {LIFECYCLE_STAGES.map((st) => {
              const isCurrent = lead.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.stageChip, isCurrent && styles.stageChipActive]}
                  onPress={() => handleStageSelect(st)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.stageChipText, isCurrent && styles.stageChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3D Prospect Specification Grid */}
        <View style={styles.specCard3D}>
          <Text style={styles.sectionTitle}>PROSPECT CRITERIA & ATTRIBUTES</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <View style={styles.labelRow}>
                <Text style={styles.gridLabel}>TARGET BUDGET</Text>
                <InfoGuideBadge title="Target Budget" description="Maximum budget allocated by the buyer for unit purchase." />
              </View>
              <Text style={[styles.gridValue, theme.typography.tabularNumbers]}>{lead.budget}</Text>
            </View>

            <View style={styles.gridCol}>
              <View style={styles.labelRow}>
                <Text style={styles.gridLabel}>PROPERTY TYPE</Text>
                <InfoGuideBadge title="Property Configuration" description="Preferred layout (e.g. 3 BHK, Penthouse, Commercial Office)." />
              </View>
              <Text style={styles.gridValue}>{lead.propertyType}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <View style={styles.labelRow}>
                <Text style={styles.gridLabel}>INTERESTED PROJECT</Text>
                <InfoGuideBadge title="Development Project" description="Selected property development location." />
              </View>
              <Text style={styles.gridValue}>{lead.project}</Text>
            </View>

            <View style={styles.gridCol}>
              <View style={styles.labelRow}>
                <Text style={styles.gridLabel}>INQUIRY SOURCE</Text>
                <InfoGuideBadge title="Lead Origin Channel" description="Original marketing portal or referral source." />
              </View>
              <Text style={styles.gridValue}>{lead.source}</Text>
            </View>
          </View>
        </View>

        {/* Rollback Reason Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={rollbackModalVisible}
          onRequestClose={() => setRollbackModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard3D}>
              <Text style={styles.modalTitle}>Backward Stage Rollback Reason</Text>
              <Text style={styles.modalSubtitle}>
                Rolling back from {lead.status} to {targetStage}. Please provide a mandatory reason:
              </Text>

              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason (e.g. Price negotiation requested)..."
                placeholderTextColor="#94A3B8"
                value={rollbackReason}
                onChangeText={setRollbackReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRollbackModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={confirmRollback}>
                  <Text style={styles.confirmBtnText}>Confirm Rollback</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  backBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgePill: {
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
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
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
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  nameGroup: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stageCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  stageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  stageScroll: {
    marginHorizontal: -4,
  },
  stageChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stageChipActive: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  stageChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  stageChipTextActive: {
    color: '#FFFFFF',
  },
  specCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 30, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: theme.colors.brand700,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
