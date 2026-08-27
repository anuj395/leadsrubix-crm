import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subdomainService } from '../../services/subdomainService';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { theme } from '../../theme/theme';

export const SettingsScreen = ({ navigation }: any) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD' | 'AED' | 'GBP' | 'EUR'>('INR');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [activeCustomDomain, setActiveCustomDomain] = useState<string | null>(null);

  const [biometricLock, setBiometricLock] = useState(true);
  const [autoCallPopup, setAutoCallPopup] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  ] as const;

  const handleMapCustomDomain = async () => {
    if (!customDomainInput.trim()) {
      Alert.alert('Domain Required', 'Please enter a valid custom domain (e.g. crm.acmerealty.com).');
      return;
    }

    const domain = customDomainInput.trim().toLowerCase();
    const res = await subdomainService.mapCustomDomain('client1', domain);
    setActiveCustomDomain(domain);

    Alert.alert(
      'Custom Domain CNAME Target Issued',
      `${res.message}\n\nCNAME Target: ${res.cnameTarget}`,
      [{ text: 'Got it' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={36} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>SUBDOMAIN & WORKSPACE CONFIGURATION</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Subdomain & Custom Domain Mapping Card */}
        <View style={styles.card3D}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>SUBDOMAIN & CUSTOM DOMAIN MAPPING</Text>
            <InfoGuideBadge
              title="Workspace Subdomain"
              description="Every client receives an active default subdomain (e.g. client1.leadsrubix.com). Enterprise accounts can map custom domains with SSL."
            />
          </View>

          {/* Active Subdomain Banner */}
          <View style={styles.activeSubdomainBox}>
            <Ionicons name="globe-sharp" size={18} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.subdomainLabel}>Active Default Subdomain:</Text>
              <Text style={styles.subdomainUrlText}>https://client1.leadsrubix.com</Text>
            </View>
            <View style={styles.activeBadgePill}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>

          {/* Custom Domain Input */}
          <Text style={styles.fieldLabel}>CUSTOM CNAME DOMAIN MAPPING</Text>
          <View style={styles.domainInputRow}>
            <TextInput
              style={styles.domainInput}
              placeholder="e.g. crm.acmerealty.com"
              placeholderTextColor="#94A3B8"
              value={customDomainInput}
              onChangeText={setCustomDomainInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.mapBtn} onPress={handleMapCustomDomain} activeOpacity={0.8}>
              <Text style={styles.mapBtnText}>Map Domain</Text>
            </TouchableOpacity>
          </View>

          {activeCustomDomain && (
            <View style={styles.mappedDomainNotice}>
              <Ionicons name="checkmark-circle-sharp" size={16} color="#059669" />
              <Text style={styles.mappedDomainText}>
                CNAME target issued for <Text style={{ fontWeight: '700' }}>{activeCustomDomain}</Text>. Point CNAME to <Text style={{ fontWeight: '700' }}>client1.leadsrubix.com</Text>.
              </Text>
            </View>
          )}
        </View>

        {/* Currency Preferences */}
        <View style={styles.card3D}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>WORKSPACE CURRENCY PREFERENCE</Text>
            <InfoGuideBadge
              title="Workspace Currency"
              description="Select currency symbol for CPQ quotes, revenue analytics, and transaction values."
            />
          </View>

          <View style={styles.currencyGrid}>
            {currencies.map((curr) => {
              const isSelected = selectedCurrency === curr.code;
              return (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.currencyChip, isSelected && styles.currencyChipSelected]}
                  onPress={() => setSelectedCurrency(curr.code)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.currencySymbolText, isSelected && styles.currencySymbolTextSelected]}>
                    {curr.symbol}
                  </Text>
                  <Text style={[styles.currencyCodeText, isSelected && styles.currencyCodeTextSelected]}>
                    {curr.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Security & Automation Switches */}
        <View style={styles.card3D}>
          <Text style={styles.cardTitle}>SECURITY & AUTOMATION TOGGLES</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Face ID / Touch ID Biometric Lock</Text>
              <Text style={styles.toggleSub}>Require biometrics to access buyer data</Text>
            </View>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{ false: '#CBD5E1', true: theme.colors.brand700 }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Auto Post-Call Outcome Popup</Text>
              <Text style={styles.toggleSub}>Show 1-tap outcome logger after phone call</Text>
            </View>
            <Switch
              value={autoCallPopup}
              onValueChange={setAutoCallPopup}
              trackColor={{ false: '#CBD5E1', true: theme.colors.brand700 }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Real-Time Push Notifications</Text>
              <Text style={styles.toggleSub}>Alert on new lead assignments & due tasks</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#CBD5E1', true: theme.colors.brand700 }}
            />
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
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgePill: {
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
  card3D: {
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
  activeSubdomainBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  subdomainLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  subdomainUrlText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  activeBadgePill: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  domainInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  domainInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  mapBtn: {
    backgroundColor: theme.colors.brand700,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mappedDomainNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  mappedDomainText: {
    flex: 1,
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  currencyGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  currencyChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  currencySymbolText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencySymbolTextSelected: {
    color: '#FFFFFF',
  },
  currencyCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  currencyCodeTextSelected: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
