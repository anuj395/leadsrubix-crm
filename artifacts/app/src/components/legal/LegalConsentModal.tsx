import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../ui/CompanyLogo';
import { theme } from '../../theme/theme';
import { safeStorage } from '../../utils/safeStorage';

interface LegalConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onViewPrivacyPolicy: (tab?: 'privacy' | 'terms' | 'permissions') => void;
}

const { width, height } = Dimensions.get('window');

export const LEGAL_CONSENT_KEY = '@leadsrubix_legal_consent_v1';

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  visible,
  onAccept,
  onViewPrivacyPolicy,
}) => {
  const [agreed, setAgreed] = useState(true);

  const handleConfirm = async () => {
    if (!agreed) return;
    try {
      await safeStorage.setItem(LEGAL_CONSENT_KEY, 'true');
      await safeStorage.setItem(`${LEGAL_CONSENT_KEY}_timestamp`, new Date().toISOString());
    } catch (e) {
      console.warn('Could not save legal consent state:', e);
    }
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="#0F101E" />

        {/* Ambient Glows */}
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.header}>
            <CompanyLogo variant="white" height={32} />
            <View style={styles.statusPill}>
              <View style={styles.greenDot} />
              <Text style={styles.statusText}>LEGAL & PRIVACY CONSENT</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Welcome to Leads Rubix</Text>
            <Text style={styles.subtitle}>
              Before you begin using your enterprise CRM workspace, please review how your business data and permissions are protected.
            </Text>

            {/* Permission Transparency Items */}
            <View style={styles.transparencyBox}>
              <Text style={styles.sectionHeader}>DATA & PERMISSION TRANSPARENCY</Text>

              <View style={styles.permissionItem}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Ionicons name="location" size={16} color="#38BDF8" />
                </View>
                <View style={styles.permissionTextGroup}>
                  <Text style={styles.permissionTitle}>Location Check-ins</Text>
                  <Text style={styles.permissionDesc}>
                    Captures precise coordinates during client site visits and fieldwork verification.
                  </Text>
                </View>
              </View>

              <View style={styles.permissionItem}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="people" size={16} color="#10B981" />
                </View>
                <View style={styles.permissionTextGroup}>
                  <Text style={styles.permissionTitle}>Client Contacts</Text>
                  <Text style={styles.permissionDesc}>
                    Allows you to select and attach contact details when logging prospective client inquiries.
                  </Text>
                </View>
              </View>

              <View style={styles.permissionItem}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Ionicons name="camera" size={16} color="#F59E0B" />
                </View>
                <View style={styles.permissionTextGroup}>
                  <Text style={styles.permissionTitle}>Camera & Documents</Text>
                  <Text style={styles.permissionDesc}>
                    Used solely for photographing and uploading deal contracts, property photos, and KYC documents.
                  </Text>
                </View>
              </View>

              <View style={styles.permissionItem}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Ionicons name="mic" size={16} color="#8B5CF6" />
                </View>
                <View style={styles.permissionTextGroup}>
                  <Text style={styles.permissionTitle}>Call Notes & Audio</Text>
                  <Text style={styles.permissionDesc}>
                    Enables voice-to-text disposition notes and call recording synchronization for CRM records.
                  </Text>
                </View>
              </View>

              <View style={styles.permissionItem}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                  <Ionicons name="notifications" size={16} color="#EA580C" />
                </View>
                <View style={styles.permissionTextGroup}>
                  <Text style={styles.permissionTitle}>Push Notifications</Text>
                  <Text style={styles.permissionDesc}>
                    Delivers real-time lead assignments, callback reminders, and team activity updates.
                  </Text>
                </View>
              </View>
            </View>

            {/* Enterprise Security Highlights */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={styles.securityText}>
                Bank-Grade Data Isolation • 256-Bit SSL Encryption • 100% Private & Protected
              </Text>
            </View>

            {/* Document Links */}
            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => onViewPrivacyPolicy('privacy')}
                activeOpacity={0.7}
                style={styles.linkButton}
              >
                <Ionicons name="document-text-outline" size={14} color="#38BDF8" />
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>

              <Text style={styles.linkDivider}>•</Text>

              <TouchableOpacity
                onPress={() => onViewPrivacyPolicy('terms')}
                activeOpacity={0.7}
                style={styles.linkButton}
              >
                <Ionicons name="newspaper-outline" size={14} color="#38BDF8" />
                <Text style={styles.linkText}>Terms of Service</Text>
              </TouchableOpacity>

              <Text style={styles.linkDivider}>•</Text>

              <TouchableOpacity
                onPress={() => onViewPrivacyPolicy('permissions')}
                activeOpacity={0.7}
                style={styles.linkButton}
              >
                <Ionicons name="key-outline" size={14} color="#38BDF8" />
                <Text style={styles.linkText}>Permissions</Text>
              </TouchableOpacity>
            </View>

            {/* Checkbox Agreement */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and agree to the Leads Rubix CRM{' '}
                <Text style={styles.highlightText} onPress={() => onViewPrivacyPolicy('terms')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.highlightText} onPress={() => onViewPrivacyPolicy('privacy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.acceptButton, !agreed && styles.acceptButtonDisabled]}
              onPress={handleConfirm}
              disabled={!agreed}
              activeOpacity={0.88}
            >
              <Text style={styles.acceptButtonText}>Accept & Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 30, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 44 : 24,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  dialogCard: {
    width: '100%',
    height: Math.min(height * 0.82, 720),
    maxHeight: height * 0.88,
    backgroundColor: '#151728',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
    display: 'flex',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#1A1C30',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 1.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  transparencyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTextGroup: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#A7F3D0',
    lineHeight: 15,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    textDecorationLine: 'underline',
  },
  linkDivider: {
    color: '#475569',
    fontSize: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  highlightText: {
    color: '#38BDF8',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#1A1C30',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#272944',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
