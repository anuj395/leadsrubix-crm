import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Leads Rubix CRM?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (logout) await logout();
        },
      },
    ]);
  };

  const initials = (user?.name || 'Anuj Chauhan')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury Midnight #151728 Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <View style={styles.statusPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.statusPillText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Profile & Organization</Text>
          <Text style={styles.headerSubtitleText}>User permissions, security & workspace role</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Executive Hero Card ─── */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials || 'AC'}</Text>
              <View style={styles.avatarPulseBadge} />
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user?.name || 'Anuj Chauhan'}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
              </View>
              <Text style={styles.userEmail}>{user?.email || 'anuj@leadsrubix.com'}</Text>

              <View style={styles.rolePillRow}>
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.adminBadgeText}>
                    {(user?.role || 'Admin').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.workspaceTag}>
                  <Text style={styles.workspaceTagText}>Workspace Owner</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>STATUS</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>Verified</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ACCESS LEVEL</Text>
              <Text style={styles.metricValue}>Super Admin</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SESSION</Text>
              <Text style={styles.metricValue}>Active Device</Text>
            </View>
          </View>
        </View>

        {/* ─── Organization & Workspace Details ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="business" size={18} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>ORGANIZATION DETAILS</Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Workspace Name</Text>
              <Text style={styles.infoVal}>Leads Rubix CRM</Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Commercial Sector</Text>
              <Text style={styles.infoVal}>Real Estate & High-Ticket</Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Default Currency</Text>
              <Text style={styles.infoVal}>INR (₹) - Indian Rupee</Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Deployment Version</Text>
              <Text style={styles.infoVal}>v1.0.0 Enterprise Edition</Text>
            </View>
          </View>
        </View>

        {/* ─── Sign Out ─── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          activeOpacity={0.88}
        >
          <Ionicons name="log-out-outline" size={18} color="#E11D48" />
          <Text style={styles.signOutBtnText}>Log Out of Workspace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ─── Header ───
  luxuryHeader: {
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 22,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusPill: {
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
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerTitleContainer: {
    paddingHorizontal: 2,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 3,
    fontWeight: '400',
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // ─── Hero Profile Card ───
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E2238',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#38BDF8',
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  avatarPulseBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  rolePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  adminBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  workspaceTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
  },
  workspaceTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },

  // ─── Metrics Bar ───
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginTop: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // ─── Section Cards ───
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  sectionDescription: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoKey: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // ─── Sign Out ───
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
});

