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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.topBackNavRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.backButtonCircle}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <CompanyLogo variant="white" height={40} />
            <Text style={styles.brandTagline}>{APP_CONFIG.tagline}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.authCard}>
            <Text style={styles.cardTitle}>Reset password</Text>
            <Text style={styles.cardSubtitle}>We'll send a reset link to your work email.</Text>

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
                  <Text style={styles.alertSuccessTitle}>Reset Email Sent</Text>
                  <Text style={styles.alertSuccessText}>{successMessage}</Text>
                  <Text style={styles.alertSuccessHint}>
                    Please check your inbox / spam folder and click the link to create your new password.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Work Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                Work email <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
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
                    size={15}
                    color={emailFocused ? '#FFFFFF' : theme.colors.brand700}
                  />
                </View>
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInputControl}
                  placeholder="name@company.com"
                  placeholderTextColor="#94A3B8"
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

            {/* Submit Button */}
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
                    <Ionicons name="paper-plane" size={14} color={theme.colors.brand700} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Footer Navigation Links */}
            <View style={styles.cardFooterDivider}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.backToSignInText}>Back to sign in</Text>
              </TouchableOpacity>

              <View style={styles.footerSeparatorDot} />

              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLinkText}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Info */}
          <AppVersionFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C30',
  },
  keyboardContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  topBackNavRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTagline: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 20,
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
  inputGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 7,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
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
    backgroundColor: theme.colors.brand700,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#16182B',
    shadowColor: theme.colors.brand700,
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
    gap: 12,
  },
  footerSeparatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  backToSignInText: {
    fontSize: 13,
    color: theme.colors.brand700,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  signupLinkText: {
    fontSize: 13,
    color: theme.colors.brand700,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  bottomFooterInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  bottomFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
