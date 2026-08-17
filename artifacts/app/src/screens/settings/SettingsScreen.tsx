import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

export const SettingsScreen = () => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const handleChangePassword = () => {
    Alert.alert(
      'Update Password',
      'A password reset link has been dispatched to your work email address.'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>App Settings & Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Security Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Security & Credentials</Text>

          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword} activeOpacity={0.7}>
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Update Password</Text>
              <Text style={styles.rowSub}>Change your workspace authentication password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="finger-print-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Biometric Authentication</Text>
              <Text style={styles.rowSub}>Use Face ID / Fingerprint for quick login</Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notifications & Alert Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Alert Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSub}>Receive instant alerts on new lead assignments</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="mail-unread-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Daily Email Summary</Text>
              <Text style={styles.rowSub}>Receive daily morning digest of pending tasks</Text>
            </View>
            <Switch
              value={emailDigest}
              onValueChange={setEmailDigest}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* System & Connection Info */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>System & Environment</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API Server Endpoint</Text>
            <Text style={styles.infoValue}>http://localhost:8080/api</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ADB USB Port Forwarding</Text>
            <Text style={[styles.infoValue, { color: theme.colors.emerald }]}>Active (tcp:8080)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile App Version</Text>
            <Text style={styles.infoValue}>v1.4.2 Enterprise</Text>
          </View>
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
  headerBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
