import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { callLogService, CallLogItem } from '../../services/callLogService';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

const OUTCOME_PRESETS = [
  { label: 'Site Visit Confirmed', badgeColor: '#059669', bgColor: 'rgba(5, 150, 105, 0.12)' },
  { label: 'Price Matrix Sent', badgeColor: '#0284C7', bgColor: 'rgba(2, 132, 199, 0.12)' },
  { label: 'Callback Required', badgeColor: '#D97706', bgColor: 'rgba(217, 119, 6, 0.12)' },
  { label: 'Not Interested', badgeColor: '#E11D48', bgColor: 'rgba(225, 29, 72, 0.12)' },
];

export const CallLogsScreen = () => {
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auto Post-Call Outcome Modal State
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [activeCallBuyer, setActiveCallBuyer] = useState<{ name: string; phone: string; project: string } | null>(null);

  const fetchCallLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callLogService.getCallLogs();
      setCallLogs(data);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCallLogs();
  };

  // Trigger Phone Dialer & Open Auto Post-Call Outcome Popup
  const handleInitiateCall = (buyerName: string, phone: string, project: string) => {
    Linking.openURL(`tel:${phone}`);
    setActiveCallBuyer({ name: buyerName, phone, project });

    // Open Auto Post-Call Outcome Overlay after slight delay
    setTimeout(() => {
      setPostCallModalVisible(true);
    }, 1200);
  };

  const handleSelectOutcome = (preset: typeof OUTCOME_PRESETS[0]) => {
    if (!activeCallBuyer) return;

    const newLog: CallLogItem = {
      id: Date.now().toString(),
      buyerName: activeCallBuyer.name,
      phone: activeCallBuyer.phone,
      project: activeCallBuyer.project,
      type: 'Outbound Call',
      duration: '1m 30s',
      timestamp: 'Just now',
      outcome: preset.label,
      badgeColor: preset.badgeColor,
      bgColor: preset.bgColor,
    };

    setCallLogs((prev) => [newLog, ...prev]);
    setPostCallModalVisible(false);
    setActiveCallBuyer(null);

    Alert.alert('Call Outcome Logged', `Recorded outcome: ${preset.label}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerLogoRow}>
          <CompanyLogo variant="white" height={34} />
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>AUTO-LOGGING TELEPHONY & CALL ACTIVITY</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand700} />
        }
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot
          screenName="CallLogs"
          message="Tap any call button to dial out — the auto post-call popup will prompt you for 1-tap outcome logging!"
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>RECENT CALL ACTIVITY</Text>
          <InfoGuideBadge
            title="Auto Post-Call Telephony"
            description="Initiate calls directly. As soon as you dial out, the post-call popup automatically prompts you to select a 1-tap outcome."
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand700} />
            <Text style={styles.loadingText}>Loading call logs & telephony records...</Text>
          </View>
        ) : (
          callLogs.map((log) => (
            <View key={log.id} style={styles.callCard3D}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.callTypeBadge, { backgroundColor: log.bgColor }]}>
                  <Ionicons
                    name={
                      log.type.includes('Outbound')
                        ? 'call-outline'
                        : log.type.includes('Inbound')
                        ? 'arrow-down-circle-outline'
                        : 'close-circle-outline'
                    }
                    size={20}
                    color={log.badgeColor}
                  />
                </View>

                <View style={styles.buyerInfoGroup}>
                  <Text style={styles.buyerNameText}>{log.buyerName}</Text>
                  <Text style={styles.buyerPhoneText}>
                    {log.phone} • {log.project}
                  </Text>
                </View>

                <View style={[styles.outcomePill, { backgroundColor: log.bgColor }]}>
                  <Text style={[styles.outcomePillText, { color: log.badgeColor }]}>
                    {log.outcome}
                  </Text>
                </View>
              </View>

              {/* Call Details Strip & 1-Tap Redial Trigger */}
              <View style={styles.cardFooterRow}>
                <Text style={styles.durationText}>
                  {log.type} • {log.duration} • {log.timestamp}
                </Text>

                <TouchableOpacity
                  style={styles.redialBtn}
                  onPress={() => handleInitiateCall(log.buyerName, log.phone, log.project)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={12} color="#FFFFFF" />
                  <Text style={styles.redialBtnText}>Call Buyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Auto Post-Call Outcome Popup Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={postCallModalVisible}
          onRequestClose={() => setPostCallModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard3D}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.telephonyIconBadge}>
                  <Ionicons name="call" size={20} color={theme.colors.brand700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Auto Post-Call Logger</Text>
                  <Text style={styles.modalSubtitle}>
                    Select 1-tap outcome for call with {activeCallBuyer?.name}:
                  </Text>
                </View>
              </View>

              {/* Outcome Option Buttons */}
              <View style={styles.outcomeOptionsGrid}>
                {OUTCOME_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.outcomeOptionBtn, { borderColor: preset.badgeColor }]}
                    onPress={() => handleSelectOutcome(preset)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.outcomeDot, { backgroundColor: preset.badgeColor }]} />
                    <Text style={styles.outcomeOptionText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => {
                  setPostCallModalVisible(false);
                  setActiveCallBuyer(null);
                }}
              >
                <Text style={styles.dismissBtnText}>Skip Logging</Text>
              </TouchableOpacity>
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
  headerLogoRow: {
    marginBottom: 8,
  },
  headerTagPill: {
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
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
  callCard3D: {
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
  callTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  buyerInfoGroup: {
    flex: 1,
  },
  buyerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  buyerPhoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  outcomePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  outcomePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  redialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  redialBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  telephonyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  outcomeOptionsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  outcomeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  outcomeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  outcomeOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
