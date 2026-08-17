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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export const SignupScreen = ({ navigation }: any) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please fill in all fields to create your account.');
      return;
    }
    try {
      setLoading(true);
      await signup({ name: name.trim(), email: email.trim(), password });
      Alert.alert('Workspace Created', 'Your account has been registered successfully!');
    } catch (err: any) {
      console.error('Signup error:', err);
      const msg = err.message || err.response?.data?.message || 'Failed to create account.';
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Solid #272944 Executive Header Banner (Zero Side Circles) */}
      <View style={styles.fullBleedHeroHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={36} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>CREATE CRM WORKSPACE</Text>
        </View>
      </View>

      {/* Form Content Area */}
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated AI Mascot Advisor Companion */}
          <AIAdvisorMascot screenName="Login" message="Create your CRM workspace to track real estate leads & site visits!" />

          {/* 3D Framed White Form Card */}
          <View style={styles.framedFormCard3D}>
            <Text style={styles.headingTitle}>Create account</Text>
            <Text style={styles.headingSubtext}>Get started with your sales workspace</Text>

            {/* Full Name Field */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <View style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}>
                <View style={[styles.fieldIconBadge, nameFocused && styles.fieldIconBadgeFocused]}>
                  <Ionicons
                    name="person"
                    size={16}
                    color={nameFocused ? '#FFFFFF' : theme.colors.brand700}
                  />
                </View>
                <TextInput
                  style={styles.textInputControl}
                  placeholder="John Doe"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>
            </View>

            {/* Work Email Field */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>WORK EMAIL</Text>
              <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
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
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={[styles.inputBox, passwordFocused && styles.inputBoxFocused]}>
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
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 3D Primary Create Account Button (#272944) */}
            <TouchableOpacity
              style={styles.primaryCtaButton3D}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.ctaContentRow}>
                  <Text style={styles.ctaButtonText}>Create account</Text>
                  <View style={styles.ctaArrowCircle}>
                    <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Card Footer Section */}
            <View style={styles.cardFooterDivider}>
              <Text style={styles.existingPrompt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Version Info */}
          <View style={styles.bottomFooterInfo}>
            <Text style={styles.bottomFooterText}>Leads Rubix CRM • Enterprise v1.4</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
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
    paddingBottom: 32,
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
    fontSize: 24,
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
    marginBottom: 16,
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
  eyeBtn: {
    padding: 6,
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
  cardFooterDivider: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  existingPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLinkText: {
    fontSize: 13,
    color: theme.colors.brand700,
    fontWeight: '800',
  },
  bottomFooterInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  bottomFooterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
