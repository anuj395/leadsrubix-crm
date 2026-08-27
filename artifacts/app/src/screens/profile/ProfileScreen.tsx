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
import { RolePermissionManager } from '../../components/ui/RolePermissionManager';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [roleManagerVisible, setRoleManagerVisible] = useState(false);

  // Setup completion progress state (75%)
  const [completedSteps, setCompletedSteps] = useState({
    orgDetails: true,
    industryTemplate: true,
    currencyConfig: true,
    customSubdomain: false,
    teamInvites: false,
  });

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalCount = Object.keys(completedSteps).length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const toggleChecklistStep = (key: keyof typeof completedSteps) => {
    setCompletedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
          <Text style={styles.headerTagText}>USER ACCOUNT & WORKSPACE ROLE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot
          screenName="Profile"
          message={`Welcome back ${user?.name || 'Anuj'}! Your workspace setup is ${progressPct}% complete.`}
        />

        {/* Workspace Onboarding Progress Bar Widget */}
        <View style={styles.progressCard3D}>
          <View style={styles.progressHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>WORKSPACE SETUP COMPLETION</Text>
              <Text style={styles.progressSubtext}>
                {completedCount} of {totalCount} Setup Tasks Completed
              </Text>
            </View>

            <View style={styles.pctBadgePill}>
              <Text style={styles.pctBadgeText}>{progressPct}%</Text>
            </View>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          {/* Setup Task Checklist */}
          <View style={styles.checklistGrid}>
            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleChecklistStep('orgDetails')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completedSteps.orgDetails ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={18}
                color={completedSteps.orgDetails ? '#059669' : '#94A3B8'}
              />
              <Text style={[styles.checkItemText, completedSteps.orgDetails && styles.checkItemDone]}>
                Register Organization & Industry
              </Text>
              <InfoGuideBadge
                title="Organization Details"
                description="Establishes your business workspace, tax region, and primary contact details."
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleChecklistStep('industryTemplate')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completedSteps.industryTemplate ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={18}
                color={completedSteps.industryTemplate ? '#059669' : '#94A3B8'}
              />
              <Text style={[styles.checkItemText, completedSteps.industryTemplate && styles.checkItemDone]}>
                Select Industry Pipeline Template
              </Text>
              <InfoGuideBadge
                title="Industry Pipeline"
                description="Auto-configures default sales stages and fields suited to your commercial sector."
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleChecklistStep('currencyConfig')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completedSteps.currencyConfig ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={18}
                color={completedSteps.currencyConfig ? '#059669' : '#94A3B8'}
              />
              <Text style={[styles.checkItemText, completedSteps.currencyConfig && styles.checkItemDone]}>
                Configure Default Currency (INR / USD / AED)
              </Text>
              <InfoGuideBadge
                title="Workspace Currency"
                description="Formats CPQ offer quotes and revenue BI charts in your local currency."
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completedSteps.customSubdomain ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={18}
                color={completedSteps.customSubdomain ? '#059669' : '#94A3B8'}
              />
              <Text style={[styles.checkItemText, completedSteps.customSubdomain && styles.checkItemDone]}>
                Map Custom Subdomain (client1.leadsrubix.com)
              </Text>
              <InfoGuideBadge
                title="Custom Subdomain"
                description="Provisions a dedicated URL for your team to access workspace logins."
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => setRoleManagerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completedSteps.teamInvites ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={18}
                color={completedSteps.teamInvites ? '#059669' : '#94A3B8'}
              />
              <Text style={[styles.checkItemText, completedSteps.teamInvites && styles.checkItemDone]}>
                Invite Team Members & Set Roles
              </Text>
              <InfoGuideBadge
                title="Team Roles"
                description="Assigns granular RBAC permissions to sales reps, advisors, and managers."
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard3D}>
          <View style={styles.avatarLargeCircle}>
            <Text style={styles.avatarLargeText}>
              {(user?.name || 'Anuj Chauhan').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.userNameText}>{user?.name || 'Anuj Chauhan'}</Text>
          <Text style={styles.userEmailText}>{user?.email || 'anuj@leadsrubix.com'}</Text>

          <View style={styles.roleBadgePill}>
            <Ionicons name="shield-checkmark-sharp" size={12} color="#059669" />
            <Text style={styles.roleBadgeText}>
              {(user?.role || 'Senior Sales Advisor').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Granular RBAC Role & Permission Matrix Shortcut */}
        <View style={styles.card3D}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>TEAM ROLE & PERMISSION MATRIX</Text>
            <InfoGuideBadge
              title="Role & Permission Matrix"
              description="Configure fine-grained field and module permissions for sales advisors, team leads, and administrators."
            />
          </View>

          <TouchableOpacity
            style={styles.manageRoleBtn3D}
            onPress={() => setRoleManagerVisible(true)}
            activeOpacity={0.88}
          >
            <Ionicons name="key-sharp" size={18} color="#FFFFFF" />
            <Text style={styles.manageRoleBtnText}>Manage Roles & Granular Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn3D}
          onPress={handleLogout}
          activeOpacity={0.88}
        >
          <Ionicons name="log-out-outline" size={18} color="#E11D48" />
          <Text style={styles.signOutBtnText}>Sign Out of Workspace</Text>
        </TouchableOpacity>

        {/* Role Manager Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={roleManagerVisible}
          onRequestClose={() => setRoleManagerVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRoleManagerVisible(false)}
              >
                <Ionicons name="close-sharp" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>ROLE & PERMISSION MANAGER</Text>
              <View style={{ width: 34 }} />
            </View>

            <RolePermissionManager />
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
  progressCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
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
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.9,
  },
  progressSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  pctBadgePill: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  checklistGrid: {
    gap: 10,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  checkItemText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  checkItemDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  profileCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
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
    borderWidth: 2,
    borderColor: 'rgba(39, 41, 68, 0.18)',
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  card3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  manageRoleBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  manageRoleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
