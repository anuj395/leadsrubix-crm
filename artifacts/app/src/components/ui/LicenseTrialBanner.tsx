import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Platform,
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
    await licenseService.requestUpgrade(
      type === 'online' ? 'online_gateway' : 'offline_invoice',
      licenseInfo?.allocatedLicenses || 10
    );
    setModalVisible(false);

    Alert.alert(
      'Upgrade Request Submitted',
      type === 'online'
        ? 'Redirecting to secure online payment gateway for license addition...'
        : 'Offline invoice request generated. Our accounts team will contact you shortly.',
      [{ text: 'OK' }]
    );
  };

  if (
    !licenseInfo ||
    (!licenseInfo.isTrial && !licenseInfo.isGracePeriod) ||
    licenseInfo.trialDaysRemaining <= 0
  ) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerLeftGroup}>
        <View style={styles.hourglassBadge}>
          <Ionicons name="hourglass-outline" size={17} color="#FFFFFF" />
        </View>
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.planName}>{licenseInfo.planName}</Text>
            <InfoGuideBadge
              title={licenseInfo.isTrial ? 'Trial Period Active' : 'Grace Period Active'}
              description={
                licenseInfo.isTrial
                  ? `Your workspace is currently in active trial mode with ${licenseInfo.trialDaysRemaining} days remaining. Renew anytime to maintain uninterrupted access.`
                  : `Your trial has concluded with ${licenseInfo.trialDaysRemaining} days grace period remaining. Please renew your subscription.`
              }
            />
          </View>
          <Text style={styles.seatInfo}>
            {licenseInfo.trialDaysRemaining} {licenseInfo.trialDaysRemaining === 1 ? 'day' : 'days'} remaining
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.upgradeBtnText}>Renew Subscription</Text>
      </TouchableOpacity>

      {/* Upgrade Options Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RENEW / UPGRADE SUBSCRIPTION</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-sharp" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Select your preferred payment method:</Text>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleUpgradeRequest('online')}
              activeOpacity={0.8}
            >
              <Ionicons name="flash-sharp" size={22} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Instant Online Upgrade</Text>
                <Text style={styles.optionDesc}>
                  Credit Card / NetBanking / UPI instant activation
                </Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleUpgradeRequest('offline')}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-sharp" size={22} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Offline Purchase Order / Invoice</Text>
                <Text style={styles.optionDesc}>
                  Generate GST Invoice for Wire Transfer / Cheque
                </Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hourglassBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  seatInfo: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  upgradeBtn: {
    backgroundColor: '#272944',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  optionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
