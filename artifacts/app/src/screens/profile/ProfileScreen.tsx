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
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your CRM workspace?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const displayName =
    user?.name ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.email?.split('@')[0] ||
    'Real Estate Advisor';
  const email = user?.email || 'advisor@leadsrubix.com';
  const role = (user?.role || 'Senior Sales Advisor').toUpperCase();

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
          <Text style={styles.headerTagText}>ACCOUNT PROFILE & PERMISSIONS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Profile" message="Workspace permissions & security status active! Tap sign out to exit session." />

        {/* 3D Profile Avatar Card */}
        <View style={styles.profileCard3D}>
          <View style={styles.avatarLargeCircle}>
            <Text style={styles.avatarLargeLetter}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.profileNameText}>{displayName}</Text>
          <Text style={styles.profileEmailText}>{email}</Text>

          <View style={styles.roleBadgePill}>
            <Ionicons name="shield-checkmark" size={12} color="#059669" />
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
        </View>

        {/* Account Details Strip */}
        <Text style={styles.sectionHeaderTitle}>WORKSPACE METRICS</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox3D}>
            <Text style={[styles.metricValueText, theme.typography.tabularNumbers]}>142</Text>
            <Text style={styles.metricLabelText}>Assigned Buyer Leads</Text>
          </View>

          <View style={styles.metricBox3D}>
            <Text style={[styles.metricValueText, theme.typography.tabularNumbers]}>19</Text>
            <Text style={styles.metricLabelText}>Unit Deals Closed</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.signOutBtn3D}
          onPress={handleLogout}
          activeOpacity={0.88}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.signOutBtnText}>Sign Out of Workspace</Text>
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
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  avatarLargeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(39, 41, 68, 0.18)',
  },
  avatarLargeLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
    fontWeight: '500',
  },
  roleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1.1,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricBox3D: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  metricValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabelText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  signOutBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    height: 54,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#9F1239',
    gap: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
