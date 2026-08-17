import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const CallLogsScreen = () => {
  const [callLogs] = useState([
    {
      id: '1',
      buyerName: 'Anuj Chauhan',
      phone: '+91 98765 43210',
      project: 'Grand Horizon Towers',
      type: 'Outbound Call',
      duration: '4m 12s',
      timestamp: 'Today, 2:30 PM',
      outcome: 'Site Visit Confirmed',
      badgeColor: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
    },
    {
      id: '2',
      buyerName: 'Priya Sharma',
      phone: '+91 98123 45678',
      project: 'Rubix Empire Estates',
      type: 'Inbound Call',
      duration: '2m 45s',
      timestamp: 'Today, 11:15 AM',
      outcome: 'Price Matrix Sent',
      badgeColor: '#0284C7',
      bgColor: 'rgba(2, 132, 199, 0.12)',
    },
    {
      id: '3',
      buyerName: 'Vikram Mehta',
      phone: '+91 99887 76655',
      project: 'Skyline Business Park',
      type: 'Missed Call',
      duration: '0s',
      timestamp: 'Yesterday, 6:40 PM',
      outcome: 'Callback Required',
      badgeColor: '#E11D48',
      bgColor: 'rgba(225, 29, 72, 0.12)',
    },
  ]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
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
          <Text style={styles.headerTagText}>CALL ACTIVITY & DIALER LOGS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="CallLogs" message="All outbound & inbound call outcomes logged automatically! One-tap WhatsApp dialer active." />

        <Text style={styles.sectionHeaderTitle}>RECENT CALL ACTIVITY</Text>

        {callLogs.map((log) => (
          <View key={log.id} style={styles.callCard3D}>
            <View style={styles.cardTopRow}>
              <View style={[styles.callIconBadge, { backgroundColor: log.bgColor }]}>
                <Ionicons
                  name={
                    log.type === 'Missed Call'
                      ? 'call-sharp'
                      : log.type === 'Outbound Call'
                      ? 'arrow-up-circle-sharp'
                      : 'arrow-down-circle-sharp'
                  }
                  size={18}
                  color={log.badgeColor}
                />
              </View>

              <View style={styles.callTitleGroup}>
                <Text style={styles.buyerNameText}>{log.buyerName}</Text>
                <Text style={styles.projectText} numberOfLines={1}>{log.project} • {log.timestamp}</Text>
              </View>

              <View style={[styles.outcomePill, { backgroundColor: log.bgColor }]}>
                <Text style={[styles.outcomeText, { color: log.badgeColor }]}>{log.outcome}</Text>
              </View>
            </View>

            <View style={styles.callMetaStrip}>
              <Text style={styles.metaLabel}>TYPE: <Text style={styles.metaValue}>{log.type}</Text></Text>
              <Text style={styles.metaLabel}>DURATION: <Text style={[styles.metaValue, theme.typography.tabularNumbers]}>{log.duration}</Text></Text>
              <Text style={styles.metaLabel}>PHONE: <Text style={[styles.metaValue, theme.typography.tabularNumbers]}>{log.phone}</Text></Text>
            </View>

            <View style={styles.cardFooterActions}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(log.phone)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.btnText}>Call Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => handleWhatsApp(log.phone)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                <Text style={styles.btnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  callCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  callIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  callTitleGroup: {
    flex: 1,
  },
  buyerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  projectText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  outcomePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  callMetaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  metaValue: {
    color: '#0F172A',
    fontWeight: '700',
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
