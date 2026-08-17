import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const MenuScreen = ({ navigation }: any) => {
  const menuItems = [
    {
      id: 'Analytics',
      title: 'Sales Analytics',
      subtitle: 'Conversion funnel, pipeline & targets',
      icon: 'trending-up',
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
      screen: 'Analytics',
    },
    {
      id: 'CallLogs',
      title: 'Call Activity Logs',
      subtitle: 'Outbound & inbound call outcomes',
      icon: 'call-outline',
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
      screen: 'CallLogs',
    },
    {
      id: 'Projects',
      title: 'Projects & Inventory',
      subtitle: 'Real estate portfolio & unit listings',
      icon: 'business-outline',
      color: theme.colors.brand700,
      bgColor: 'rgba(39, 41, 68, 0.12)',
      screen: 'Projects',
    },
    {
      id: 'Integrations',
      title: 'Integrations & Webhooks',
      subtitle: 'WhatsApp, Facebook Leads & APIs',
      icon: 'cube-outline',
      color: '#0284C7',
      bgColor: 'rgba(2, 132, 199, 0.12)',
      screen: 'Integrations',
    },
    {
      id: 'Notifications',
      title: 'Notifications & Alerts',
      subtitle: 'System updates & lead assignments',
      icon: 'notifications-outline',
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.12)',
      screen: 'Notifications',
    },
    {
      id: 'Settings',
      title: 'Settings & Security',
      subtitle: 'Account preferences & API status',
      icon: 'settings-outline',
      color: '#475569',
      bgColor: 'rgba(71, 85, 105, 0.12)',
      screen: 'Settings',
    },
    {
      id: 'Profile',
      title: 'Account Profile',
      subtitle: 'User details & workspace settings',
      icon: 'person-outline',
      color: theme.colors.brand700,
      bgColor: 'rgba(39, 41, 68, 0.12)',
      screen: 'Profile',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Sleek #272944 Executive Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.subtleGlassGlow} />

        <View style={styles.headerLogoRow}>
          <CompanyLogo variant="white" height={36} />
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>REAL ESTATE CRM WORKSPACE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Menu" />

        <Text style={styles.sectionHeaderTitle}>ENTERPRISE CRM MODULES</Text>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard3D}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.82}
          >
            <View style={[styles.iconBadge3D, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>

            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward-sharp" size={16} color={theme.colors.brand700} />
            </View>
          </TouchableOpacity>
        ))}
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
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  subtleGlassGlow: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    gap: 14,
    paddingBottom: 40,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 4,
  },
  menuCard3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  iconBadge3D: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
