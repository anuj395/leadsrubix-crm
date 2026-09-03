import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
import { theme } from '../../theme/theme';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your work email and password.');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (err: any) {
      const isRestriction = err.isSuperAdminRestriction;
      const title = isRestriction ? 'Access Restricted' : 'Sign In Failed';

      let msg = 'Incorrect work email or password. Please check your credentials and try again.';
      if (err.isSuperAdminRestriction) {
        msg = err.message;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status === 401) {
        msg = 'Invalid work email or password. Please verify and try again.';
      } else if (!err.response) {
        msg = 'Unable to connect to CRM server. Please check your internet connection.';
      }

      Alert.alert(title, msg);
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

      {/* FIXED Brand Hero Block (Never Scrolls, Always Fixed Top) */}
      <View style={styles.fixedBrandHeader}>
        <View style={styles.logoContainer}>
          <CompanyLogo variant="white" height={42} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>ENTERPRISE MULTI-TENANT CRM</Text>
        </View>
      </View>

      {/* Form Card Area (Centered Vertically) */}
      <KeyboardAvoidingView
        style={styles.formCardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.framedFormCard3D}>
          <Text style={styles.headingTitle}>Welcome back</Text>
          <Text style={styles.headingSubtext}>Sign in to access your sales workspace</Text>

          {/* Work Email Field */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>WORK EMAIL</Text>
            <View
              style={[
                styles.inputBox,
                emailFocused && styles.inputBoxFocused,
              ]}
            >
              <View style={[styles.fieldIconBadge, emailFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons
                  name="mail"
                  size={16}
                  color={emailFocused ? '#FFFFFF' : theme.colors.brand700}
                />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="name@company.com"
                placeholderTextColor={theme.colors.textDisabled}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View
              style={[
                styles.inputBox,
                passwordFocused && styles.inputBoxFocused,
              ]}
            >
              <View style={[styles.fieldIconBadge, passwordFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={passwordFocused ? '#FFFFFF' : theme.colors.brand700}
                />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeToggleBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Forgot Password Link */}
          <View style={styles.forgotRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In CTA Button */}
          <TouchableOpacity
            style={styles.primaryCtaButton3D}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.ctaContentRow}>
                <Text style={styles.ctaButtonText}>Sign in</Text>
                <View style={styles.ctaArrowCircle}>
                  <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Card Footer Section */}
          <View style={styles.cardFooterDivider}>
            <Text style={styles.newAccountPrompt}>New to Leads Rubix? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
              <Text style={styles.signupLinkText}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* FIXED Bottom Footer Info (Never Scrolls) */}
      <View style={styles.fixedBottomFooter}>
        <AppVersionFooter textStyle={styles.footerVersionText} />
      </View>
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
  fixedBrandHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  formCardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
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
  eyeToggleBtn: {
    padding: 8,
    marginRight: 4,
  },
  fixedBottomFooter: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 6,
    alignItems: 'center',
  },
  footerVersionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.4,
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fieldBlock: {
    marginBottom: 14,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
  },
  inputBoxFocused: {
    borderColor: theme.colors.brand700,
    borderBottomColor: theme.colors.brand700,
    backgroundColor: '#FFFFFF',
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
  eyeBtn: {
    padding: 6,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: 2,
  },
  forgotLink: {
    fontSize: 12.5,
    color: theme.colors.brand700,
    fontWeight: '600',
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
  newAccountPrompt: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
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
    marginTop: 20,
  },
  bottomFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalHeadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubheadingText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '400',
  },
  modalAlertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 8,
  },
  modalAlertErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },
  modalAlertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  modalAlertSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    lineHeight: 18,
  },
});
