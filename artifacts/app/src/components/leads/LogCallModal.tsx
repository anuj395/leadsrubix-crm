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

interface Props {
  visible: boolean;
  lead: LeadItem;
  onClose: () => void;
  onSuccess: () => void;
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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCallType('Outbound');
    setCallStatus('Answered');
    setDurationMinutes('2');
    setNotes('');
  }, [visible]);

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

      const durNum = Math.max(0, parseInt(durationMinutes, 10) || 0) * 60;

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

      Alert.alert('Success', 'Call Logged Successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to log call activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                  onPress={() => setCallStatus(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipItemText, callStatus === s && styles.chipItemTextSelected]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration */}
            <Text style={styles.modalInputLabel}>Duration (Minutes)</Text>
            <TextInput
              style={styles.modalTextInput}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="Approximate minutes..."
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />

            {/* Call Notes */}
            <Text style={styles.modalInputLabel}>Call Discussion & Notes</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter summary of discussion or remarks..."
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
                <Text style={styles.modalSubmitBtnText}>Log Call</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    maxHeight: '85%',
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
    marginBottom: 12,
    paddingBottom: 12,
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
