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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../ui/CompanyLogo';
import { theme } from '../../theme/theme';

export type LegalTab = 'privacy' | 'terms' | 'permissions';

interface PrivacyPolicyModalProps {
  visible: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  React.useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const handleOpenExternal = async () => {
    const url =
      activeTab === 'terms'
        ? 'https://leadsrubix.com/terms-of-service'
        : 'https://leadsrubix.com/privacy-policy';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.warn('Could not open external legal URL:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#151728" />

        {/* Executive Midnight Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <CompanyLogo variant="white" height={26} />
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerTitle}>Legal & Compliance Hub</Text>
          <Text style={styles.headerSubtitle}>
            Leads Rubix CRM Enterprise Data Protection & Guidelines
          </Text>

          {/* Segmented Control Tabs */}
          <View style={styles.segmentBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'privacy' && styles.tabButtonActive]}
              onPress={() => setActiveTab('privacy')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={activeTab === 'privacy' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}
              >
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'terms' && styles.tabButtonActive]}
              onPress={() => setActiveTab('terms')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="newspaper"
                size={14}
                color={activeTab === 'terms' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
                Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'permissions' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('permissions')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="key"
                size={14}
                color={activeTab === 'permissions' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[styles.tabText, activeTab === 'permissions' && styles.tabTextActive]}
              >
                Permissions
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Document Content Scroll View */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'privacy' && (
            <View style={styles.docSection}>
              <View style={styles.lastUpdatedPill}>
                <Text style={styles.lastUpdatedText}>Effective Date: September 2026</Text>
              </View>

              <Text style={styles.sectionHeading}>1. Enterprise Overview</Text>
              <Text style={styles.bodyParagraph}>
                Leads Rubix CRM (&quot;Leads Rubix&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides an enterprise multi-tenant customer relationship management platform designed for corporate clients, business teams, and authorized enterprise users. We are deeply committed to protecting the privacy, confidentiality, and integrity of all client and personal data entrusted to us.
              </Text>

              <Text style={styles.sectionHeading}>2. Information We Collect</Text>
              <Text style={styles.bodyParagraph}>
                In providing our CRM services, we collect information solely for legitimate enterprise sales and operational purposes:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • <Text style={styles.boldText}>Account &amp; Work Credentials:</Text> Work email address, full name, phone number, enterprise organization ID, and role designation.
                </Text>
                <Text style={styles.bulletItem}>
                  • <Text style={styles.boldText}>Customer Lead Data:</Text> Prospective client names, inquiry channels, notes, meeting logs, and deal values entered by authorized users.
                </Text>
                <Text style={styles.bulletItem}>
                  • <Text style={styles.boldText}>Field Geolocation:</Text> Precise GPS latitude and longitude coordinates captured exclusively during authorized site visit check-ins and meeting audits.
                </Text>
                <Text style={styles.bulletItem}>
                  • <Text style={styles.boldText}>Attachments &amp; Photos:</Text> Images of property blueprints, deal agreements, and KYC documents selected by you for upload.
                </Text>
                <Text style={styles.bulletItem}>
                  • <Text style={styles.boldText}>Telephony &amp; Voice Disposition:</Text> Timestamps, duration, call status outcomes, and optional voice notes for CRM activity timelines.
                </Text>
              </View>

              <Text style={styles.sectionHeading}>3. Multi-Tenant Data Isolation &amp; Security</Text>
              <Text style={styles.bodyParagraph}>
                Every organization operating on Leads Rubix CRM is strictly isolated using dedicated workspace partition keys. Data from one organization is never accessible to, shared with, or commingled with any other organization. All communications are protected via 256-bit TLS/SSL encryption in transit and AES-256 encryption at rest.
              </Text>

              <Text style={styles.sectionHeading}>4. Zero Sale of Personal Data</Text>
              <Text style={styles.bodyParagraph}>
                We do NOT sell, rent, monetize, or trade any personal information, customer leads, or business records to third parties or advertising networks. Data is processed exclusively to deliver CRM capabilities to your organization.
              </Text>

              <Text style={styles.sectionHeading}>5. User Rights &amp; Account Deletion</Text>
              <Text style={styles.bodyParagraph}>
                Under Apple App Store guidelines, GDPR, and global data protection regulations, users have the right to access, rectify, export, and delete their account data. You may request permanent account and personal data deletion directly within the Profile screen in this app or by contacting our Data Protection Officer at privacy@leadsrubix.com.
              </Text>

              <Text style={styles.sectionHeading}>6. Contact &amp; Governance</Text>
              <Text style={styles.bodyParagraph}>
                For privacy inquiries or compliance requests, please reach out to:
                {'\n'}Email: privacy@leadsrubix.com | info@leadsrubix.com
                {'\n'}Digital Rubix Technologies Pvt. Ltd.
              </Text>
            </View>
          )}

          {activeTab === 'terms' && (
            <View style={styles.docSection}>
              <View style={styles.lastUpdatedPill}>
                <Text style={styles.lastUpdatedText}>Terms Version: 2.1 (Enterprise)</Text>
              </View>

              <Text style={styles.sectionHeading}>1. Enterprise Service Agreement</Text>
              <Text style={styles.bodyParagraph}>
                By downloading, accessing, or using the Leads Rubix CRM mobile application, you agree to be bound by these Terms of Service. If you are using this app on behalf of an employer or corporate organization, you represent that you have the authority to bind that entity.
              </Text>

              <Text style={styles.sectionHeading}>2. Permitted Commercial Use</Text>
              <Text style={styles.bodyParagraph}>
                Leads Rubix CRM is licensed for enterprise B2B sales management, lead routing, customer relationship tracking, and authorized team collaboration. Commercial subscriptions are provisioned through corporate agreements on our web portal (https://web.leadsrubix.com).
              </Text>

              <Text style={styles.sectionHeading}>3. Account Confidentiality</Text>
              <Text style={styles.bodyParagraph}>
                You are responsible for safeguarding your work credentials and for all activities that occur under your account. You agree to notify your organization administrator immediately upon learning of any unauthorized access or security breach.
              </Text>

              <Text style={styles.sectionHeading}>4. Prohibited Conduct</Text>
              <Text style={styles.bodyParagraph}>
                You agree not to reverse engineer, decompile, or tamper with the application, nor transmit any malicious code, unsolicited bulk communications, or unlawful content through the platform.
              </Text>

              <Text style={styles.sectionHeading}>5. Service Availability &amp; SLAs</Text>
              <Text style={styles.bodyParagraph}>
                While we strive for 99.9% uptime and redundant cloud infrastructure, Leads Rubix CRM is provided on an &quot;as is&quot; and &quot;as available&quot; basis subject to scheduled maintenance windows and standard enterprise service level commitments.
              </Text>
            </View>
          )}

          {activeTab === 'permissions' && (
            <View style={styles.docSection}>
              <View style={styles.lastUpdatedPill}>
                <Text style={styles.lastUpdatedText}>iOS Device Permissions Transparency</Text>
              </View>

              <Text style={styles.bodyParagraph}>
                In compliance with Apple App Store Review Guideline 5.1.1, below is the transparent technical rationale for each device permission requested by Leads Rubix CRM:
              </Text>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="location" size={18} color="#38BDF8" />
                  <Text style={styles.permTitle}>NSLocationWhenInUseUsageDescription</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Verifies physical coordinates when a sales executive logs a site visit, property tour, or client meeting check-in. Coordinates are only requested upon explicit check-in actions and are never tracked continuously in the background.
                </Text>
              </View>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="people" size={18} color="#10B981" />
                  <Text style={styles.permTitle}>NSContactsUsageDescription</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Enables the user to quickly select a prospective client contact from their device address book when creating a new CRM lead, eliminating redundant manual typing. Your address book is never synced in bulk or harvested.
                </Text>
              </View>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="camera" size={18} color="#F59E0B" />
                  <Text style={styles.permTitle}>NSCameraUsageDescription</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Allows you to take photos of paper contracts, property developments, identity cards, or physical business cards to attach to a deal record.
                </Text>
              </View>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="images" size={18} color="#6366F1" />
                  <Text style={styles.permTitle}>NSPhotoLibraryUsageDescription</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Allows users to select existing photos, PDFs, or document scans from their photo library to upload as deal attachments.
                </Text>
              </View>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="mic" size={18} color="#8B5CF6" />
                  <Text style={styles.permTitle}>NSMicrophoneUsageDescription</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Used for recording voice disposition notes and call logs after client interactions.
                </Text>
              </View>

              <View style={styles.permissionCard}>
                <View style={styles.permHeaderRow}>
                  <Ionicons name="notifications" size={18} color="#EA580C" />
                  <Text style={styles.permTitle}>Remote Notifications</Text>
                </View>
                <Text style={styles.permRationale}>
                  <Text style={styles.boldText}>Why Needed:</Text> Dispatches real-time alerts via Apple Push Notification service (APNs) and AWS SNS for inbound leads, callback reminders, and supervisor assignments.
                </Text>
              </View>
            </View>
          )}

          {/* External Link & Footer CTA */}
          <View style={styles.externalLinkBox}>
            <Text style={styles.externalDesc}>
              Want to view the complete legal documents in your web browser?
            </Text>
            <TouchableOpacity
              style={styles.openExternalBtn}
              onPress={handleOpenExternal}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              <Text style={styles.openExternalText}>Open Official Document in Browser</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    marginBottom: 16,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#272944',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  docSection: {
    gap: 12,
  },
  lastUpdatedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 6,
  },
  lastUpdatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  bodyParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  bulletList: {
    gap: 8,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 8,
  },
  permHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  permTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  permRationale: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  externalLinkBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 10,
  },
  externalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#272944',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  openExternalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
