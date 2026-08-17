import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const LeadFormScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('Grand Horizon Towers');
  const [budget, setBudget] = useState('₹75L - 1.2Cr');
  const [source, setSource] = useState('Google Ads');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [fnFocused, setFnFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please enter at least buyer first name and contact phone.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        contact_no: phone.trim(),
        phone: phone.trim(),
        email_id: email.trim(),
        company_name: project.trim(),
        project_name: project.trim(),
        budget: budget.trim(),
        lead_source: source.trim(),
        lead_status: 'Fresh',
        status: 'Fresh',
        notes: notes.trim(),
      };

      await apiClient.post('/contacts', payload);
      Alert.alert('Success', 'Buyer lead added to sales pipeline!');
      navigation.navigate('Leads');
    } catch (err: any) {
      console.error('Lead save error:', err);
      const msg = err.message || err.response?.data?.message || 'Failed to add buyer lead';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Solid #272944 Executive Header Banner */}
      <View style={styles.fullBleedHeroHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtnCircle} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={32} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>ADD BUYER INQUIRY / LEAD</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Leads" message="Pro Tip: Contact fresh buyer leads within 5 mins to increase closing rate by 80%!" />

        {/* 3D Framed Form Card */}
        <View style={styles.framedFormCard3D}>
          <Text style={styles.headingTitle}>Buyer Profile Details</Text>
          <Text style={styles.headingSubtext}>Enter buyer contact info, project interest & budget</Text>

          {/* First Name Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>FIRST NAME *</Text>
            <View style={[styles.inputBox, fnFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, fnFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="person" size={16} color={fnFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. Rahul"
                placeholderTextColor={theme.colors.textDisabled}
                value={firstName}
                onChangeText={setFirstName}
                onFocus={() => setFnFocused(true)}
                onBlur={() => setFnFocused(false)}
              />
            </View>
          </View>

          {/* Last Name Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>LAST NAME</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. Sharma"
                placeholderTextColor={theme.colors.textDisabled}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          {/* Contact Phone Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>CONTACT PHONE *</Text>
            <View style={[styles.inputBox, phoneFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, phoneFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="call" size={16} color={phoneFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.colors.textDisabled}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email Address Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, emailFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="mail" size={16} color={emailFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="rahul@example.com"
                placeholderTextColor={theme.colors.textDisabled}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Project Interest */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>PROJECT INTEREST</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. Grand Horizon Towers"
                placeholderTextColor={theme.colors.textDisabled}
                value={project}
                onChangeText={setProject}
              />
            </View>
          </View>

          {/* Target Budget */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>TARGET BUDGET</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. ₹75L - 1.2Cr"
                placeholderTextColor={theme.colors.textDisabled}
                value={budget}
                onChangeText={setBudget}
              />
            </View>
          </View>

          {/* Lead Source */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>LEAD SOURCE</Text>
            <View style={styles.sourcePillGroup}>
              {(['Google Ads', 'Housing.com', 'MagicBricks', 'Direct Referral'] as const).map((s) => {
                const isSelected = source === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sourcePill, isSelected && styles.sourcePillActive]}
                    onPress={() => setSource(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sourcePillText, isSelected && styles.sourcePillTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>BUYER REQUIREMENTS & NOTES</Text>
            <View style={styles.textAreaBox}>
              <TextInput
                style={styles.textAreaControl}
                placeholder="Preferred floor height, 3BHK requirement, site visit availability..."
                placeholderTextColor={theme.colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* 3D Primary Save Button */}
          <TouchableOpacity
            style={styles.primaryCtaButton3D}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.ctaContentRow}>
                <Text style={styles.ctaButtonText}>Add Buyer Lead</Text>
                <View style={styles.ctaArrowCircle}>
                  <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullBleedHeroHeader: {
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
    overflow: 'hidden',
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
  statusBadgeText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  framedFormCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headingSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 1.1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    height: 54,
  },
  inputBoxFocused: {
    borderColor: theme.colors.brand700,
    borderBottomColor: theme.colors.brand700,
    backgroundColor: '#FFFFFF',
  },
  fieldIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldIconBadgeFocused: {
    backgroundColor: theme.colors.brand700,
  },
  textInputControl: {
    flex: 1,
    height: 54,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  sourcePillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourcePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  sourcePillActive: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  sourcePillTextActive: {
    color: '#FFFFFF',
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
  },
  textAreaControl: {
    minHeight: 70,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  primaryCtaButton3D: {
    backgroundColor: theme.colors.brand700,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#16182B',
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
