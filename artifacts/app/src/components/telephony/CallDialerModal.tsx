import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadService, LeadItem } from '../../services/leadService';
import { theme } from '../../theme/theme';

interface CallDialerModalProps {
  visible: boolean;
  onClose: () => void;
  onCallInitiated: (caller: {
    contactId?: string;
    leadId?: string;
    customerName: string;
    phone: string;
    project?: string;
    stage?: string;
  }) => void;
  initialPhone?: string;
  initialName?: string;
  initialProject?: string;
}

const KEYPAD_BUTTONS = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export const CallDialerModal: React.FC<CallDialerModalProps> = ({
  visible,
  onClose,
  onCallInitiated,
  initialPhone = '',
  initialName = '',
  initialProject = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<{
    id?: string;
    name: string;
    phone: string;
    project?: string;
    stage?: string;
  } | null>(null);

  // Load leads for live search lookup
  useEffect(() => {
    if (visible) {
      if (initialPhone) {
        setPhoneNumber(initialPhone);
        if (initialName) {
          setSelectedLead({
            name: initialName,
            phone: initialPhone,
            project: initialProject,
          });
        }
      } else {
        setPhoneNumber('');
        setSelectedLead(null);
      }

      leadService
        .getLeads({ limit: 100 })
        .then((data) => setLeads(data))
        .catch(() => {});
    }
  }, [visible, initialPhone, initialName, initialProject]);

  // Dynamic matching contacts based on entered phone digits
  const matchingLeads = useMemo(() => {
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 2) return [];

    return leads
      .filter((lead) => {
        const leadPhone = (lead.phone || lead.contactNo || '').replace(/[^0-9]/g, '');
        const leadName = (lead.name || lead.firstName || '').toLowerCase();
        return leadPhone.includes(cleanDigits) || leadName.includes(phoneNumber.toLowerCase());
      })
      .slice(0, 4);
  }, [leads, phoneNumber]);

  const handleKeyPress = (digit: string) => {
    try {
      Vibration.vibrate(Platform.OS === 'ios' ? 10 : 20);
    } catch {}
    setPhoneNumber((prev) => prev + digit);
  };

  const handleLongPressZero = () => {
    try {
      Vibration.vibrate(Platform.OS === 'ios' ? 20 : 35);
    } catch {}
    setPhoneNumber((prev) => prev + '+');
  };

  const handleBackspace = () => {
    try {
      Vibration.vibrate(Platform.OS === 'ios' ? 10 : 20);
    } catch {}
    setPhoneNumber((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleClearAll = () => {
    setPhoneNumber('');
    setSelectedLead(null);
  };

  const handleSelectMatchingLead = (lead: LeadItem) => {
    const phone = lead.phone || lead.contactNo || '';
    setPhoneNumber(phone);
    setSelectedLead({
      id: lead.id,
      name: lead.name || lead.firstName || 'Buyer Contact',
      phone: phone,
      project: lead.project || '',
      stage: lead.stage || lead.status || '',
    });
  };

  const handleInitiateCall = () => {
    const clean = phoneNumber.trim();
    if (!clean) {
      Alert.alert('Enter Phone Number', 'Please enter a valid phone number to dial.');
      return;
    }

    const callerName = selectedLead?.name || 'Direct Dial Lead';
    const callerProject = selectedLead?.project || '';
    const contactId = selectedLead?.id;
    const stage = selectedLead?.stage;

    Linking.openURL(`tel:${clean}`).catch(() => {
      // Note: iOS/Android Simulators do not have cellular dialers. Proceed smoothly into disposition.
      console.log(`[Telephony] Cellular dialer not available on this environment for ${clean}`);
    });

    onClose();

    // Trigger disposition flow
    onCallInitiated({
      contactId,
      leadId: contactId,
      customerName: callerName,
      phone: clean,
      project: callerProject,
      stage,
    });
  };

  const handleOpenWhatsApp = () => {
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 5) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number for WhatsApp.');
      return;
    }
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => {
      Linking.openURL(`https://wa.me/${clean}`).catch(() => {
        Alert.alert('WhatsApp Error', 'Please verify WhatsApp is installed on this device.');
      });
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.dialerCard}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.dialerIconBadge}>
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Smart Dialer</Text>
                <Text style={styles.headerSub}>Auto-syncs duration & CRM logs</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Number Display Screen */}
          <View style={styles.displayScreen}>
            {selectedLead && (
              <View style={styles.selectedLeadBadge}>
                <Ionicons name="person-circle" size={14} color="#0284C7" />
                <Text style={styles.selectedLeadText} numberOfLines={1}>
                  {selectedLead.name} {selectedLead.project ? `• ${selectedLead.project}` : ''}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.displayPhoneText,
                phoneNumber.length > 12 && styles.displayPhoneTextSmall,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {phoneNumber || 'Enter Number'}
            </Text>
          </View>

          {/* Matching Contacts Auto-Suggest Dropdown */}
          {matchingLeads.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                {matchingLeads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    style={styles.suggestionChip}
                    onPress={() => handleSelectMatchingLead(lead)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person" size={12} color="#0284C7" />
                    <Text style={styles.suggestionChipName} numberOfLines={1}>
                      {lead.name || lead.firstName}
                    </Text>
                    <Text style={styles.suggestionChipPhone} numberOfLines={1}>
                      {lead.phone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Numeric Keypad Grid */}
          <View style={styles.keypadGrid}>
            {KEYPAD_BUTTONS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(item.digit)}
                onLongPress={item.digit === '0' ? handleLongPressZero : undefined}
                activeOpacity={0.65}
              >
                <Text style={styles.keyDigitText}>{item.digit}</Text>
                {item.sub ? <Text style={styles.keySubText}>{item.sub}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Controls Bar */}
          <View style={styles.actionRow}>
            {/* WhatsApp Direct Action */}
            <TouchableOpacity
              style={styles.auxActionBtn}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
            </TouchableOpacity>

            {/* Main Primary Green Call CTA */}
            <TouchableOpacity
              style={styles.mainCallBtn}
              onPress={handleInitiateCall}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Backspace / Clear Action */}
            <TouchableOpacity
              style={styles.auxActionBtn}
              onPress={handleBackspace}
              onLongPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="backspace-outline" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  dialerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dialerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayScreen: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 64,
  },
  selectedLeadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  selectedLeadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  displayPhoneText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  displayPhoneTextSmall: {
    fontSize: 20,
  },
  suggestionsContainer: {
    marginBottom: 10,
  },
  suggestionsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  suggestionChipName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  suggestionChipPhone: {
    fontSize: 10.5,
    color: '#64748B',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  keyBtn: {
    width: '30%',
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  keyDigitText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  keySubText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingHorizontal: 16,
  },
  auxActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
