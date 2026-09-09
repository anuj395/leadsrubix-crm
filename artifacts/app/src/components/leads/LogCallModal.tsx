import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { LeadItem } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
}

const CALLBACK_REASONS = [
  'Customer Busy / Call Later',
  'Price / Budget Discussion',
  'Location / Layout Clarification',
  'Site Visit Booking',
  'Decision Maker Unavailable',
  'Ringing / Not Picked',
  'Other',
];

function getSmartMobileFollowUp(): string {
  const d = new Date();
  const currentHour = d.getHours();
  if (currentHour >= 9 && currentHour < 17) {
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
  } else if (currentHour >= 17) {
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
  } else {
    d.setHours(11, 0, 0, 0);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}, ${strHours}:${minutes} ${ampm}`;
}

export const LogCallModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [callType, setCallType] = useState('Outbound');
  const [callStatus, setCallStatus] = useState('Answered');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackReason, setCallbackReason] = useState('Customer Busy / Call Later');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCallType('Outbound');
    setCallStatus('Answered');
    setDurationMinutes('2');
    setCallbackDate(getSmartMobileFollowUp());
    setCallbackReason('Customer Busy / Call Later');
    setShowDatePicker(false);
    setNotes('');
  }, [visible]);

  const isUnconnected = callStatus !== 'Answered';
  const isCallbackRequired = ['Busy', 'No Answer', 'Missed', 'Left Voicemail'].includes(callStatus);
  const isWrongNumber = callStatus === 'Wrong Number';

  const handleSelectStatus = (status: string) => {
    setCallStatus(status);
    if (status === 'Answered') {
      setDurationMinutes('2');
    } else {
      setDurationMinutes('0');
      if (status === 'Busy') setCallbackReason('Customer Busy / Call Later');
      else if (status === 'No Answer' || status === 'Missed') setCallbackReason('Ringing / Not Picked');
      else if (status === 'Left Voicemail') setCallbackReason('Decision Maker Unavailable');
      if (!callbackDate) setCallbackDate(getSmartMobileFollowUp());
    }
  };

  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    try {
      setSubmitting(true);

      // Geolocation capture matching Web CRM 1:1
      let lat = null;
      let lng = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch (e) {
        console.warn('Geolocation capture warning:', e);
      }

      const durNum = isUnconnected ? 0 : Math.max(0, parseInt(durationMinutes, 10) || 0) * 60;

      // 1. Post to call-logs/create endpoint (Matching Web CRM 1:1)
      const callPayload = {
        leadId: leadId,
        contactId: leadId,
        customerName: lead.name || (lead as any).customerName || 'Contact',
        contactNumber: lead.phone || (lead as any).contactNumber || '',
        stage: callStatus,
        status: callStatus,
        type: callType,
        direction: callType,
        callTime: durNum,
        duration: durNum,
        notes: notes.trim(),
        details: notes.trim(),
        uid: user?.id || user?.email || '',
        contactOwnerEmail: (lead as any).contactOwnerEmail || user?.email || '',
        projectName: lead.projectName || (lead as any).project_name || '',
        location: lead.location || '',
        budget: lead.budget || '',
        source: lead.source || (lead as any).lead_source || '',
        latitude: lat,
        longitude: lng,
        createdAt: new Date(),
      };

      await apiClient.post('/call-logs/create', callPayload)
        .catch(() => apiClient.post('/call-logs', callPayload))
        .catch(() => null);

      // 2. Record note in resourceNotes as well (Matching Web CRM 1:1)
      if (notes.trim()) {
        await apiClient
          .post('/resources/resourceNotes', {
            contactId: leadId,
            contact_id: leadId,
            note: `[Call Log - ${callType} / ${callStatus}]: ${notes.trim()}`,
            notes: `[Call Log - ${callType} / ${callStatus}]: ${notes.trim()}`,
            userName: user?.name || user?.email || 'Admin',
            userEmail: user?.email || '',
            createdBy: user?.name || user?.email || 'Admin',
          })
          .catch(() => null);
      }

      // 3. Auto-embed Callback Task & Contact Stage Sync for Unconnected Calls
      if (isCallbackRequired && callbackDate) {
        let parsedDate = new Date(callbackDate.replace(',', ''));
        if (isNaN(parsedDate.getTime()) && callbackDate.includes('/')) {
          const parts = callbackDate.split(',');
          const dateParts = parts[0].trim().split('/');
          if (dateParts.length === 3) {
            parsedDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
        }

        // Create Task
        await apiClient.post('/tasks', {
          contactId: leadId,
          type: 'Call Back',
          taskType: 'Call Back',
          task_type: 'Call Back',
          dueDate: parsedDate,
          status: 'PENDING',
          priority: 'Medium',
          callbackReason: callbackReason,
          customerName: lead.name || (lead as any).customerName || 'Contact',
          contactNumber: lead.phone || (lead as any).contactNumber || '',
          createdBy: user?.email || 'System',
          notes: `[Auto-Callback via ${callStatus} Call]: ${notes.trim() || callbackReason}`,
        }).catch(() => null);

        // Update Contact Stage to CALLBACK
        await apiClient.put(`/contacts/${leadId}`, {
          stage: 'CALLBACK',
          nextFollowUpType: 'Call Back',
          nextFollowUpDateTime: parsedDate,
          callBackReason: callbackReason,
          modifiedAt: new Date(),
        }).catch(() => null);
      }

      // 4. Update Contact for Wrong Number
      if (isWrongNumber) {
        await apiClient.put(`/contacts/${leadId}`, {
          stage: 'WRONG_NUMBER',
          qualificationStatus: 'UNQUALIFIED',
          modifiedAt: new Date(),
        }).catch(() => null);
      }

      Alert.alert('Success', isCallbackRequired ? 'Call Logged & Callback Scheduled!' : 'Call Logged Successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to log call activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle}>LOG CALL DETAILS</Text>
                <Text style={styles.modalSubtitle}>Record phone conversation summary and outcome.</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Call Type */}
              <Text style={styles.modalInputLabel}>Call Type *</Text>
              <View style={styles.chipRow}>
                {['Outbound', 'Inbound'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chipItem, callType === t && styles.chipItemSelected]}
                    onPress={() => setCallType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipItemText, callType === t && styles.chipItemTextSelected]}>
                      {t === 'Outbound' ? 'Outbound (Outgoing)' : 'Inbound (Incoming)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Call Status / Outcome */}
              <Text style={styles.modalInputLabel}>Call Outcome / Status *</Text>
              <View style={styles.chipRow}>
                {['Answered', 'Busy', 'No Answer', 'Left Voicemail', 'Wrong Number', 'Missed'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chipItem, callStatus === s && styles.chipItemSelected]}
                    onPress={() => handleSelectStatus(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipItemText, callStatus === s && styles.chipItemTextSelected]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Duration: Strictly rendered for Answered calls only */}
              {!isUnconnected && (
                <>
                  <Text style={styles.modalInputLabel}>Duration (Minutes) *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    placeholder="Duration in minutes (e.g. 2)..."
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Auto-Embedded Callback Scheduler for Unconnected Calls */}
              {isCallbackRequired && (
                <View style={styles.callbackCard}>
                  <View style={styles.callbackHeader}>
                    <Ionicons name="calendar" size={16} color="#0369A1" />
                    <Text style={styles.callbackTitle}>Schedule Follow-up Call (Mandatory)</Text>
                  </View>
                  <Text style={styles.callbackSubtitle}>
                    Since call was {callStatus.toLowerCase()}, a follow-up callback task is queued.
                  </Text>

                  <Text style={[styles.modalInputLabel, { marginTop: 8 }]}>Callback Date & Time</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={16} color="#0284C7" />
                    <Text style={styles.datePickerText}>{callbackDate || 'Select Date & Time'}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={[styles.modalInputLabel, { marginTop: 8 }]}>Callback Reason</Text>
                  <View style={styles.chipRow}>
                    {CALLBACK_REASONS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.smallChipItem, callbackReason === r && styles.smallChipItemSelected]}
                        onPress={() => setCallbackReason(r)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.smallChipItemText, callbackReason === r && styles.smallChipItemTextSelected]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Wrong Number Warning Banner */}
              {isWrongNumber && (
                <View style={styles.warningBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.warningBannerText}>
                    This phone number will be marked as invalid / wrong number. Lead qualification will update to Unqualified.
                  </Text>
                </View>
              )}

              {/* Call Notes */}
              <Text style={styles.modalInputLabel}>Call Discussion & Notes</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter summary of discussion, objections, or next steps..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isCallbackRequired ? 'Log Call & Set Callback' : 'Log Call'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Overlay */}
      {showDatePicker && (
        <CalendarDatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={(val) => {
            setCallbackDate(val);
            setShowDatePicker(false);
          }}
          currentValue={callbackDate}
          title="Select Callback Date & Time"
          includeTime={true}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleGroup: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    marginVertical: 4,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipItemText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  chipItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  smallChipItem: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  smallChipItemSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  smallChipItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  smallChipItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  callbackCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  callbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  callbackTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  callbackSubtitle: {
    fontSize: 11,
    color: '#0284C7',
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 16,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
