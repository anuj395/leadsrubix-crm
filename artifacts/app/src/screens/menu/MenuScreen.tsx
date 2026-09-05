import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';

export const MenuScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();

  const displayName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.name || user?.email || ''
  const userInitials = displayName
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to securely log out of Leads Rubix CRM?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

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

        {/* User Identity Command Bar */}
        <TouchableOpacity
          style={styles.userProfileCard}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitials || 'AC'}</Text>
          </View>

          <View style={styles.userInfoGroup}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText}>{displayName}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#60A5FA" />
              </View>
            </View>
            <Text style={styles.userRoleText}>
              {(user?.role || 'Administrator').toUpperCase()} • Leads Rubix Workspace
            </Text>
          </View>

          <View style={styles.profileChevronBtn}>
            <Ionicons name="chevron-forward-sharp" size={16} color="#CBD5E1" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── SECTION 1: COMMUNICATIONS & DIALER ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>COMMUNICATIONS & DIALER</Text>
            <InfoGuideBadge
              title="Calling & Alerts"
              description="Access incoming/outgoing call logs, recordings, and real-time push alerts."
            />
          </View>

          <View style={styles.cardGroup}>
            {/* Call Telephony */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('CallLogs')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="call-sharp" size={20} color="#1E293B" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Call Telephony & Logs</Text>
                <Text style={styles.actionSubtitle}>
                  Auto-logging dialer, duration & history
                </Text>
              </View>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>Auto Sync</Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Notifications */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="notifications-sharp" size={20} color="#EA580C" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Notifications & Alerts</Text>
                <Text style={styles.actionSubtitle}>
                  Real-time SLA triggers & activity feed
                </Text>
              </View>
              <View style={[styles.tagPill, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.tagPillText, { color: '#1D4ED8' }]}>Live</Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SECTION 2: ACCOUNT & SECURITY ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACCOUNT & SECURITY</Text>
            <InfoGuideBadge
              title="Account & Security"
              description="Manage your profile, change password, biometric lock, and mobile app preferences."
            />
          </View>

          <View style={styles.cardGroup}>
            {/* Profile & Account */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="person-circle-sharp" size={20} color="#1D4ED8" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Profile & Organization</Text>
                <Text style={styles.actionSubtitle}>
                  Role permissions, stats & hierarchy
                </Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Update Password */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('UpdatePassword')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="key-sharp" size={20} color="#059669" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Update Password</Text>
                <Text style={styles.actionSubtitle}>
                  Change security credentials & access key
                </Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SECTION 3: SIGN OUT COCKPIT ─── */}
        <TouchableOpacity
          style={styles.signOutCard}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <View style={styles.signOutIconBox}>
            <Ionicons name="log-out-outline" size={20} color="#E11D48" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.signOutTitle}>Log Out of Workspace</Text>
            <Text style={styles.signOutSub}>End active mobile session securely</Text>
          </View>
          <Ionicons name="chevron-forward-sharp" size={16} color="#F43F5E" />
        </TouchableOpacity>

        {/* App Version Footer */}
        <AppVersionFooter />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  luxuryHeader: {
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
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
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  userInfoGroup: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    padding: 1,
  },
  userRoleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  profileChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextGroup: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 66,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
    gap: 12,
  },
  signOutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BE123C',
  },
  signOutSub: {
    fontSize: 11,
    color: '#E11D48',
    opacity: 0.8,
    marginTop: 1,
  },
});
