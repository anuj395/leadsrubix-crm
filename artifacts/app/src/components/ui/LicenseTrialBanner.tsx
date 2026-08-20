import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { licenseService, LicenseStatus } from '../../services/licenseService';
import { InfoGuideBadge } from './InfoGuideBadge';
import { theme } from '../../theme/theme';

export const LicenseTrialBanner: React.FC = () => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    licenseService.getLicenseStatus().then(setLicenseInfo).catch(console.error);
  }, []);

  const handleUpgradeRequest = async (type: 'online' | 'offline') => {
    await licenseService.requestUpgrade(type === 'online' ? 'online_gateway' : 'offline_invoice', 25);
    setModalVisible(false);

    Alert.alert(
      'Upgrade Request Submitted',
      type === 'online'
        ? 'Redirecting to secure online payment gateway for license addition...'
        : 'Offline invoice request generated. Our accounts team will contact you shortly.',
      [{ text: 'OK' }]
    );
  };

  if (!licenseInfo) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.topRow}>
        <View style={styles.pillBadge}>
          <Ionicons name="time-sharp" size={12} color="#D97706" />
          <Text style={styles.pillText}>
            {licenseInfo.isTrial ? `${licenseInfo.trialDaysRemaining} DAYS TRIAL REMAINING` : 'ENTERPRISE PLAN'}
          </Text>
        </View>

        <InfoGuideBadge
          title="Trial & License Allocation"
          description="Every new client workspace receives a 7-Day Enterprise Trial with 10 User Licenses. Upgrade anytime via online payment or offline invoice."
        />
      </View>

      <View style={styles.contentRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planName}>{licenseInfo.planName}</Text>
          <Text style={styles.seatInfo}>
            {licenseInfo.usedLicenses} of {licenseInfo.allocatedLicenses} User Licenses Active
          </Text>
        </View>

        <TouchableOpacity style={styles.upgradeBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="card-sharp" size={14} color="#FFFFFF" />
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade Options Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPGRADE WORKSPACE LICENSES</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-sharp" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Select your preferred license payment method:</Text>

            <TouchableOpacity style={styles.optionCard} onPress={() => handleUpgradeRequest('online')} activeOpacity={0.8}>
              <Ionicons name="flash-sharp" size={22} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Instant Online Upgrade</Text>
                <Text style={styles.optionDesc}>Credit Card / NetBanking / UPI instant activation</Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={() => handleUpgradeRequest('offline')} activeOpacity={0.8}>
              <Ionicons name="document-text-sharp" size={22} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Offline Purchase Order / Invoice</Text>
                <Text style={styles.optionDesc}>Generate GST Invoice for Wire Transfer / Cheque</Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderBottomWidth: 3,
    borderBottomColor: '#F59E0B',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  seatInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  upgradeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.1,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  optionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
