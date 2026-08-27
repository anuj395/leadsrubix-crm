import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { theme } from '../../theme/theme';

export const LeadDetailScreen = ({ route, navigation }: any) => {
  const lead = route?.params?.lead || {};

  const leadName = lead.first_name || lead.name || lead.contact_person || 'Unnamed Lead';
  const phone = lead.contact_no || lead.mobile_number || lead.phone || '';
  const email = lead.email_id || itemEmail(lead) || '';
  const company = lead.company_name || lead.industry || 'Direct Lead';
  const status = lead.lead_status || lead.status || 'Fresh';
  const source = lead.lead_source || lead.source || 'Website Inquiry';
  const notes = lead.notes || lead.description || 'No additional notes provided for this lead contact.';

  function itemEmail(item: any) {
    return item.email || '';
  }

  const handleCall = () => {
    if (!phone) {
      Alert.alert('No Phone Number', 'No valid phone number available for this contact.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone dialer.');
    });
  };

  const handleWhatsApp = () => {
    if (!phone) {
      Alert.alert('No Phone Number', 'No valid phone number available for this contact.');
      return;
    }
    const cleanNum = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanNum}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Please verify WhatsApp is installed on your device.');
    });
  };

  const handleEmail = () => {
    if (!email) {
      Alert.alert('No Email', 'No email address available for this contact.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Unable to open mail application.');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Navigation Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Lead Details</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('LeadForm', { lead })}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Contact Hero Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLetter}>{leadName.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.profileName}>{leadName}</Text>
          <Text style={styles.profileCompany}>{company}</Text>

          <View style={styles.statusBadgeWrapper}>
            <StatusBadge status={status} size="md" />
          </View>

          {/* Action Button Matrix */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleCall} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn} onPress={handleEmail} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.colors.cyan }]}>
                <Ionicons name="mail" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('TaskForm', { leadId: lead._id || lead.id, leadName })}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: theme.colors.amber }]}>
                <Ionicons name="calendar" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Detailed Information Grid Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeader}>Contact Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{phone || 'Not Provided'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{email || 'Not Provided'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="compass-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Lead Source</Text>
              <Text style={styles.detailValue}>{source}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Organization ID</Text>
              <Text style={styles.detailValue}>{lead.organizationId || 'default-org-01'}</Text>
            </View>
          </View>
        </View>

        {/* Notes & Activity History Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeader}>Lead Notes & Summary</Text>
          <Text style={styles.notesBody}>{notes}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(39, 41, 68, 0.2)',
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  profileCompany: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadgeWrapper: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickActionBtn: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextGroup: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  notesBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
