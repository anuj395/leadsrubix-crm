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

export const IntegrationsScreen = () => {
  const [connectors, setConnectors] = useState<any[]>([
    {
      id: '1',
      name: 'WhatsApp Business API',
      category: 'Messaging & Dialers',
      icon: 'logo-whatsapp',
      color: '#25D366',
      enabled: true,
      status: 'Connected & Live',
    },
    {
      id: '2',
      name: 'Website Lead Form Webhook',
      category: 'Inbound Inquiries',
      icon: 'globe-outline',
      color: theme.colors.cyan,
      enabled: true,
      status: 'Active Endpoint',
    },
    {
      id: '3',
      name: 'Facebook Lead Ads',
      category: 'Social Acquisition',
      icon: 'logo-facebook',
      color: '#1877F2',
      enabled: true,
      status: 'Synced',
    },
    {
      id: '4',
      name: 'Google Calendar & Mail Sync',
      category: 'Productivity',
      icon: 'calendar-outline',
      color: theme.colors.amber,
      enabled: false,
      status: 'Disconnected',
    },
  ]);

  const toggleConnector = (id: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Integrations & Apps</Text>
        <Text style={styles.headerSub}>Manage API connectors & lead capture sources</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {connectors.map((item) => (
          <View key={item.id} style={styles.connectorCard}>
            <View style={styles.topRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View style={styles.textGroup}>
                <Text style={styles.connectorName}>{item.name}</Text>
                <Text style={styles.connectorCat}>{item.category}</Text>
              </View>

              <Switch
                value={item.enabled}
                onValueChange={() => toggleConnector(item.id)}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
              <View style={styles.statusGroup}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: item.enabled ? theme.colors.emerald : theme.colors.rose },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: item.enabled ? theme.colors.emerald : theme.colors.rose },
                  ]}
                >
                  {item.enabled ? item.status : 'Disconnected'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => Alert.alert('Connector Configuration', `${item.name} settings updated.`)}
              >
                <Text style={styles.configLink}>Configure</Text>
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
  headerSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  connectorCard: {
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textGroup: {
    flex: 1,
  },
  connectorName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  connectorCat: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: theme.spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  configLink: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
