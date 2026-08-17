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

export const TaskFormScreen = ({ route, navigation }: any) => {
  const defaultLeadName = route?.params?.leadName || '';
  const defaultLeadId = route?.params?.leadId || '';

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('Tomorrow, 10:00 AM');
  const [associatedLead, setAssociatedLead] = useState(defaultLeadName || 'General Sales Activity');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [titleFocused, setTitleFocused] = useState(false);
  const [dueDateFocused, setDueDateFocused] = useState(false);
  const [leadFocused, setLeadFocused] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter task title');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        task_name: title.trim(),
        due_date: dueDate.trim(),
        leadName: associatedLead.trim(),
        leadId: defaultLeadId,
        priority,
        status: 'Pending',
        completed: false,
        description: description.trim(),
      };

      await apiClient.post('/tasks', payload);
      Alert.alert('Success', 'Site visit follow-up scheduled successfully!');
      navigation.navigate('Tasks');
    } catch (err: any) {
      console.error('Task save error:', err);
      const msg = err.message || err.response?.data?.message || 'Failed to save task';
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
          <Text style={styles.statusBadgeText}>SCHEDULE FOLLOW-UP / SITE VISIT</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Tasks" message="Schedule follow-up tasks & site visits to keep your buyer deals moving forward!" />

        {/* 3D Framed Form Card */}
        <View style={styles.framedFormCard3D}>
          <Text style={styles.headingTitle}>Task & Site Visit Details</Text>
          <Text style={styles.headingSubtext}>Set follow-up reminders and buyer activity notes</Text>

          {/* Task Title Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>TASK / ACTIVITY TITLE *</Text>
            <View style={[styles.inputBox, titleFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, titleFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="checkbox" size={16} color={titleFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. Schedule Villa Site Visit with Mr. Anuj"
                placeholderTextColor={theme.colors.textDisabled}
                value={title}
                onChangeText={setTitle}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
              />
            </View>
          </View>

          {/* Due Date & Time Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>DUE DATE & TIME</Text>
            <View style={[styles.inputBox, dueDateFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, dueDateFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="time" size={16} color={dueDateFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="e.g. Tomorrow, 10:00 AM"
                placeholderTextColor={theme.colors.textDisabled}
                value={dueDate}
                onChangeText={setDueDate}
                onFocus={() => setDueDateFocused(true)}
                onBlur={() => setDueDateFocused(false)}
              />
            </View>
          </View>

          {/* Associated Buyer Lead */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>ASSOCIATED BUYER LEAD</Text>
            <View style={[styles.inputBox, leadFocused && styles.inputBoxFocused]}>
              <View style={[styles.fieldIconBadge, leadFocused && styles.fieldIconBadgeFocused]}>
                <Ionicons name="person" size={16} color={leadFocused ? '#FFFFFF' : theme.colors.brand700} />
              </View>
              <TextInput
                style={styles.textInputControl}
                placeholder="Buyer Name or Project"
                placeholderTextColor={theme.colors.textDisabled}
                value={associatedLead}
                onChangeText={setAssociatedLead}
                onFocus={() => setLeadFocused(true)}
                onBlur={() => setLeadFocused(false)}
              />
            </View>
          </View>

          {/* Priority Pill Selector */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>PRIORITY LEVEL</Text>
            <View style={styles.priorityPillGroup}>
              {(['High', 'Medium', 'Low'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityPill, isSelected && styles.priorityPillActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.priorityPillText, isSelected && styles.priorityPillTextActive]}>
                      {p} Priority
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes & Description */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>ACTIVITY NOTES & REMARKS</Text>
            <View style={styles.textAreaBox}>
              <TextInput
                style={styles.textAreaControl}
                placeholder="Add special requests, site location details, or buyer budget notes..."
                placeholderTextColor={theme.colors.textDisabled}
                value={description}
                onChangeText={setDescription}
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
                <Text style={styles.ctaButtonText}>Save Task</Text>
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
  priorityPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  priorityPillActive: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  priorityPillTextActive: {
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
