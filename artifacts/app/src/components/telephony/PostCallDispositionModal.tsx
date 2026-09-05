import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { callLogService } from '../../services/callLogService';
import { leadService } from '../../services/leadService';
import { taskService } from '../../services/taskService';
import { getIndustryCallOutcomePresets, CallOutcomePreset } from '../../utils/industryLabels';
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';
import { theme } from '../../theme/theme';

export interface PostCallCallerInfo {
  contactId?: string;
  leadId?: string;
  customerName: string;
  phone: string;
  project?: string;
  stage?: string;
}

interface PostCallDispositionModalProps {
  visible: boolean;
  onClose: () => void;
  caller: PostCallCallerInfo | null;
  onSuccess?: () => void;
}

const DURATION_PRESETS = [
  { label: '0s', value: 0 },
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 mins', value: 120 },
  { label: '5 mins', value: 300 },
  { label: '10+ mins', value: 600 },
];

function formatFollowUpDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'Select Call-Back Date & Time';

  if (dateStr.includes(',') && (dateStr.includes('AM') || dateStr.includes('PM'))) {
    const parts = dateStr.split(',');
    const dPart = parts[0].trim();
    const tPart = parts.slice(1).join(',').trim();
    const parsed = new Date(dPart);
    if (!isNaN(parsed.getTime())) {
      const formatted = parsed.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
      return `${formatted}, ${tPart}`;
    }
    return dateStr;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return dateStr || 'Select Call-Back Date & Time';
}

export const PostCallDispositionModal: React.FC<PostCallDispositionModalProps> = ({
  visible,
  onClose,
  caller,
  onSuccess,
}) => {
  const { user } = useAuth();
  const outcomePresets = useMemo(
    () => getIndustryCallOutcomePresets(user?.industryId),
    [user?.industryId]
  );

  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcomePreset | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [callNotes, setCallNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible && outcomePresets.length > 0) {
      setSelectedOutcome(outcomePresets[0]);
      setDurationSeconds(60);
      setCallNotes('');
      setFollowUpDate('');
    }
  }, [visible, outcomePresets]);

  const handleSelectOutcome = (preset: CallOutcomePreset) => {
    setSelectedOutcome(preset);
    const lbl = preset.label.toLowerCase();
    if (lbl.includes('missed') || lbl.includes('busy') || lbl.includes('no answer') || lbl.includes('wrong')) {
      setDurationSeconds(0);
    } else if (durationSeconds === 0) {
      setDurationSeconds(60);
    }
  };

  if (!caller) return null;

  const isFollowUpRequired =
    selectedOutcome?.label.toLowerCase().includes('callback') ||
    selectedOutcome?.label.toLowerCase().includes('call back') ||
    selectedOutcome?.label.toLowerCase().includes('follow') ||
    selectedOutcome?.label.toLowerCase().includes('reschedule');

  const handleSubmit = async () => {
    if (!selectedOutcome) {
      Alert.alert('Select Outcome', 'Please select a call outcome before saving.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        contactId: caller.contactId || caller.leadId,
        leadId: caller.leadId || caller.contactId,
        customerName: caller.customerName || 'Contact',
        contactNumber: caller.phone,
        duration: durationSeconds,
        details: callNotes.trim(),
        stage: selectedOutcome.label,
        projectName: caller.project || '',
        createdBy: user?.name || user?.email || 'Mobile Agent',
        organizationId: user?.organizationId,
        industryId: user?.industryId,
        type: 'Outbound',
      };

      // 1. Save Call Log to Backend MongoDB
      await callLogService.logCall(payload);

      // 3. Create Follow-up Task if Call-Back / Follow-up date chosen
      if (isFollowUpRequired && followUpDate) {
        let taskDueDate = followUpDate;
        if (followUpDate.includes(',')) {
          const parts = followUpDate.split(',');
          taskDueDate = parts[0].trim();
        }
        await taskService
          .createTask({
            contactId: caller.contactId || caller.leadId,
            title: `Follow-up Call: ${caller.customerName}`,
            dueDate: taskDueDate,
            priority: 'High',
            notes: `Follow-up from call disposition: ${callNotes} (Scheduled: ${followUpDate})`,
            status: 'PENDING',
          })
          .catch((err) => console.warn('Task follow-up creation note:', err));
      }

      Alert.alert('Call Logged', `Call outcome '${selectedOutcome.label}' recorded successfully.`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to log call outcome:', err);
      Alert.alert('Logging Error', 'Unable to record call log. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.dispositionCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconBadge}>
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Call Disposition</Text>
                <Text style={styles.headerSub}>Log outcome & conversation notes</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Caller Info Banner */}
            <View style={styles.callerBanner}>
              <View style={styles.callerAvatar}>
                <Text style={styles.callerAvatarText}>
                  {(caller.customerName || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callerNameText} numberOfLines={1}>
                  {caller.customerName}
                </Text>
                <View style={styles.callerMetaRow}>
                  <Text style={styles.callerPhoneText}>{caller.phone}</Text>
                  {caller.project ? (
                    <Text style={styles.callerProjectText} numberOfLines={1}>
                      • {caller.project}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Outcome Selection Grid */}
            <Text style={styles.sectionLabel}>CALL OUTCOME *</Text>
            <View style={styles.outcomesGrid}>
              {outcomePresets.map((preset, idx) => {
                const isSelected = selectedOutcome?.label === preset.label;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.outcomeChip,
                      isSelected && {
                        backgroundColor: preset.bgColor,
                        borderColor: preset.badgeColor,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => handleSelectOutcome(preset)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.outcomeDot,
                        { backgroundColor: isSelected ? preset.badgeColor : '#94A3B8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.outcomeLabel,
                        isSelected && { color: preset.badgeColor, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Call Duration Chips */}
            <Text style={styles.sectionLabel}>CALL DURATION</Text>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((dur, idx) => {
                const isSelected = durationSeconds === dur.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.durationChip, isSelected && styles.durationChipActive]}
                    onPress={() => setDurationSeconds(dur.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        isSelected && styles.durationChipTextActive,
                      ]}
                    >
                      {dur.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Follow Up Scheduler (if Call-Back / Reschedule) */}
            {isFollowUpRequired && (
              <View style={styles.followUpContainer}>
                <Text style={styles.sectionLabel}>SCHEDULE FOLLOW-UP CALL</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.brand700} />
                  <Text style={styles.datePickerBtnText}>
                    {formatFollowUpDateDisplay(followUpDate)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Discussion Notes Input */}
            <Text style={styles.sectionLabel}>DISCUSSION NOTES</Text>
            <View style={styles.notesInputContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Write call discussion summary, buyer preferences, or next steps..."
                placeholderTextColor={theme.colors.textDisabled}
                value={callNotes}
                onChangeText={setCallNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Submit Action Button */}
          <View style={styles.footerActionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitBtnText}>Save Call Log</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal for Follow-Up */}
        <CalendarDatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={(dt) => {
            setFollowUpDate(dt);
            setShowDatePicker(false);
          }}
          currentValue={followUpDate}
          title="Select Next Call-Back Time"
          includeTime={true}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dispositionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 8,
  },
  callerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 10,
  },
  callerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  callerNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  callerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  callerPhoneText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  callerProjectText: {
    fontSize: 11,
    color: theme.colors.brand700,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  outcomesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  outcomeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  outcomeLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 7,
  },
  durationChipActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  durationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  followUpContainer: {
    marginBottom: 12,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  notesInputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 14,
  },
  notesInput: {
    fontSize: 12,
    color: '#0F172A',
    minHeight: 56,
    padding: 0,
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#272944',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
