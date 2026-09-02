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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomFormBuilder } from '../../components/ui/CustomFormBuilder';
import { AutomationWorkflowBuilder } from '../../components/ui/AutomationWorkflowBuilder';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

export const MenuScreen = ({ navigation }: any) => {
  const [formBuilderVisible, setFormBuilderVisible] = useState(false);
  const [automationVisible, setAutomationVisible] = useState(false);

  const menuItems = [
    {
      id: 'leads',
      title: 'Leads Pipeline',
      subtitle: 'Manage buyer prospects & deals',
      icon: 'people-sharp',
      color: '#0284C7',
      route: 'Leads',
    },
    {
      id: 'tasks',
      title: 'Tasks & Visits',
      subtitle: 'Schedule site visits & follow-ups',
      icon: 'calendar-sharp',
      color: '#D97706',
      route: 'Tasks',
    },
    {
      id: 'projects',
      title: 'CPQ & Inventory',
      subtitle: 'Quotes & unit availability',
      icon: 'business-sharp',
      color: '#7C3AED',
      route: 'Projects',
    },
    {
      id: 'analytics',
      title: 'Sales Analytics',
      subtitle: 'BI conversion & revenue velocity',
      icon: 'bar-chart-sharp',
      color: '#059669',
      route: 'Analytics',
    },
    {
      id: 'callLogs',
      title: 'Call Telephony',
      subtitle: 'Auto-logging dialer & history',
      icon: 'call-sharp',
      color: '#272944',
      route: 'CallLogs',
    },
    {
      id: 'integrations',
      title: 'Integrations & WhatsApp',
      subtitle: 'WhatsApp campaigns & webhooks',
      icon: 'logo-whatsapp',
      color: '#25D366',
      route: 'Integrations',
    },
    {
      id: 'automations',
      title: 'Workflow Automation',
      subtitle: 'Zapier-style custom triggers',
      icon: 'flash-sharp',
      color: '#D97706',
      action: () => setAutomationVisible(true),
    },
    {
      id: 'formBuilder',
      title: 'Custom Form Builder',
      subtitle: 'No-code dynamic form creator',
      icon: 'create-sharp',
      color: '#E11D48',
      action: () => setFormBuilderVisible(true),
    },
    {
      id: 'notifications',
      title: 'Notifications & Alerts',
      subtitle: 'Real-time workspace activity',
      icon: 'notifications-sharp',
      color: '#EA580C',
      route: 'Notifications',
    },
    {
      id: 'profile',
      title: 'Profile & Account',
      subtitle: 'User role & workspace stats',
      icon: 'person-circle-sharp',
      color: '#475569',
      route: 'Profile',
    },
    {
      id: 'settings',
      title: 'Settings & Security',
      subtitle: 'Preferences & biometric lock',
      icon: 'settings-sharp',
      color: '#64748B',
      route: 'Settings',
    },
  ];

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
          <Text style={styles.headerTagText}>NAVIGATION HUB & MODULE DIRECTORY</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>WORKSPACE MODULE DIRECTORY</Text>
          <InfoGuideBadge
            title="Module Directory"
            description="Access all sales modules, no-code form builders, Zapier-style workflow automations, and CPQ quote generators."
          />
        </View>

        {/* 2-Column Grid Directory */}
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard3D}
              onPress={() => {
                if (item.action) {
                  item.action();
                } else if (item.route) {
                  navigation.navigate(item.route);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBadgeCircle, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Builder Full Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={formBuilderVisible}
          onRequestClose={() => setFormBuilderVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFormBuilderVisible(false)}
              >
                <Ionicons name="close-sharp" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>NO-CODE FORM BUILDER</Text>
              <View style={{ width: 34 }} />
            </View>

            <CustomFormBuilder />
          </View>
        </Modal>

        {/* Workflow Automations Full Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={automationVisible}
          onRequestClose={() => setAutomationVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAutomationVisible(false)}
              >
                <Ionicons name="close-sharp" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>WORKFLOW AUTOMATION ENGINE</Text>
              <View style={{ width: 34 }} />
            </View>

            <AutomationWorkflowBuilder />
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
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuCard3D: {
    width: '48%',
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
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
  iconBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 15,
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
