import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
import { theme } from '../../theme/theme';
import { APP_CONFIG } from '../../constants/appConstants';

export const ForgotPasswordScreen = ({ navigation, route }: any) => {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your work email.');
      emailInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      setSuccessMessage(
        response.data?.message || 'A password reset link has been sent to your email.'
      );
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to send reset instructions right now.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* Subtle Executive Ambient Glows */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />


      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Executive Brand Identity Header */}
          <View style={styles.brandHeroBlock}>
            <View style={styles.logoContainer}>
              <CompanyLogo variant="white" height={42} />
            </View>

            <View style={styles.statusBadgePill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.statusBadgeText}>ENTERPRISE REAL ESTATE CRM</Text>
            </View>
          </View>

          {/* 3D Framed White Form Card */}
          <View style={styles.framedFormCard3D}>
            <Text style={styles.headingTitle}>Reset password</Text>
            <Text style={styles.headingSubtext}>
              Enter your work email to receive password reset instructions.
            </Text>

            {/* Error Alert */}
            {errorMessage ? (
              <View style={styles.alertError}>
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text style={styles.alertErrorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Success Alert */}
            {successMessage ? (
              <View style={styles.alertSuccess}>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertSuccessTitle}>Reset Link Sent</Text>
                  <Text style={styles.alertSuccessText}>{successMessage}</Text>
                  <Text style={styles.alertSuccessHint}>
                    Please check your inbox / spam folder and follow the instructions.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Work Email Field */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>WORK EMAIL</Text>
              <Pressable
                style={[
                  styles.inputBox,
                  emailFocused && styles.inputBoxFocused,
                ]}
                onPress={() => emailInputRef.current?.focus()}
              >
                <View
                  style={[
                    styles.fieldIconBadge,
                    emailFocused && styles.fieldIconBadgeFocused,
                  ]}
                >
                  <Ionicons
                    name="mail"
                    size={16}
                    color={emailFocused ? '#FFFFFF' : theme.colors.brand700}
                  />
                </View>
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInputControl}
                  placeholder="name@company.com"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
              </Pressable>
            </View>

            {/* 3D Primary Action Button (#272944) */}
            <TouchableOpacity
              style={styles.primaryCtaButton3D}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={styles.ctaContentRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.ctaButtonText}>Sending link…</Text>
                </View>
              ) : (
                <View style={styles.ctaContentRow}>
                  <Text style={styles.ctaButtonText}>Send reset link</Text>
                  <View style={styles.ctaArrowCircle}>
                    <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Card Footer Divider & Links */}
            <View style={styles.cardFooterDivider}>
              <Text style={styles.footerPromptText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.signinLinkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Version Info */}
          <AppVersionFooter textStyle={styles.footerVersionText} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#151728',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  flexOne: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 68 : 48,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  brandHeroBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    alignItems: 'center',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
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
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  framedFormCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headingSubtext: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
    fontWeight: '400',
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 10,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#E11D48',
    fontWeight: '600',
    lineHeight: 17,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  alertSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  alertSuccessText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 18,
  },
  alertSuccessHint: {
    fontSize: 12,
    color: '#047857',
    marginTop: 6,
    lineHeight: 16,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 12,
  },
  inputBoxFocused: {
    borderColor: theme.colors.brand700,
    borderBottomColor: theme.colors.brand700,
    backgroundColor: '#FFFFFF',
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
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
    height: 50,
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  primaryCtaButton3D: {
    backgroundColor: '#272944',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#16182B',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterDivider: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerPromptText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  signinLinkText: {
    fontSize: 13,
    color: theme.colors.brand700,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footerVersionText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
