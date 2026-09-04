import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';

export const UpdatePasswordScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Required Fields', 'Please enter your new password and confirm it.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Invalid Length', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    const userId = user?.id || (user as any)?._id;
    if (!userId && !user?.email) {
      Alert.alert('Error', 'User account identity could not be verified.');
      return;
    }

    setLoading(true);
    try {
      if (userId) {
        await apiClient.put(`/users/${userId}`, { password: newPassword });
      } else {
        await apiClient.post('/users/change-password', {
          email: user?.email,
          password: newPassword,
        });
      }

      Alert.alert(
        'Success',
        'Your account password has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setNewPassword('');
              setConfirmPassword('');
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Password update failed:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update password. Please try again.';
      Alert.alert('Update Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* ─── Zone 1: Luxury Midnight #151728 Header ─── */}
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />

          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
          >
            <Ionicons name="chevron-back" size={15} color="#FFFFFF" />
            <Text style={styles.headerBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitleText}>Update Password</Text>
            <View style={styles.statusPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.statusPillText}>ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitleText}>
            Change security credentials & access key
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
        >
          {/* User ID Capsule */}
          <View style={styles.userCapsule}>
            <View style={styles.userIconCircle}>
              <Ionicons name="person" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userCapsuleName}>{user?.name || 'Anuj Chauhan'}</Text>
              <Text style={styles.userCapsuleEmail}>{user?.email || 'dev@digitalrubix.com'}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#059669" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <View style={styles.keyIconBox}>
                <Ionicons name="key-sharp" size={18} color="#0284C7" />
              </View>
              <Text style={styles.formCardTitle}>SECURITY CREDENTIALS</Text>
            </View>

            {/* New Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
              <View
                style={[
                  styles.inputContainer,
                  newFocused && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-sharp"
                  size={18}
                  color={newFocused ? '#0284C7' : '#94A3B8'}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter new strong password"
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  onFocus={() => setNewFocused(true)}
                  onBlur={() => setNewFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
              <View
                style={[
                  styles.inputContainer,
                  confirmFocused && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-sharp"
                  size={18}
                  color={confirmFocused ? '#0284C7' : '#94A3B8'}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Validation Checklist */}
            <View style={styles.validationBox}>
              <View style={styles.valRow}>
                <Ionicons
                  name={isLengthValid ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                  size={16}
                  color={isLengthValid ? '#059669' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.valText,
                    isLengthValid && { color: '#059669', fontWeight: '700' },
                  ]}
                >
                  At least 6 characters long
                </Text>
              </View>

              <View style={styles.valRow}>
                <Ionicons
                  name={isMatchValid ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                  size={16}
                  color={isMatchValid ? '#059669' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.valText,
                    isMatchValid && { color: '#059669', fontWeight: '700' },
                  ]}
                >
                  Passwords match
                </Text>
              </View>
            </View>

            {/* Submit CTA Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isLengthValid || !isMatchValid || loading) && styles.submitBtnDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={!isLengthValid || !isMatchValid || loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Ionicons name="shield-checkmark-sharp" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Update Password</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Best Practices Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeaderRow}>
              <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
              <Text style={styles.tipsTitle}>SECURITY BEST PRACTICES</Text>
            </View>
            <Text style={styles.tipsText}>
              • Use a mix of upper and lower case letters, numbers, and symbols.
            </Text>
            <Text style={styles.tipsText}>
              • Avoid using personal details, birthdates, or common dictionary words.
            </Text>
            <Text style={styles.tipsText}>
              • Do not share your Leads Rubix CRM workspace credentials with others.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ─── Header ───
  luxuryHeader: {
    width: '100%',
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  headerBackBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerTitleContainer: {
    paddingHorizontal: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 3,
    fontWeight: '400',
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // ─── User Capsule ───
  userCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  userIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCapsuleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userCapsuleEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },

  // ─── Form Card ───
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  keyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
  },
  inputContainerFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    height: '100%',
  },

  validationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  submitBtn: {
    backgroundColor: '#272944',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // ─── Tips Card ───
  tipsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  tipsText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
});
