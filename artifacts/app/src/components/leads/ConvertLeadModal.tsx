import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
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

export const ConvertLeadModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [dealTitle, setDealTitle] = useState(`${lead.name || 'Client'} - Deal`);
  const [dealAmount, setDealAmount] = useState('5000000');
  const [dealPipeline, setDealPipeline] = useState('Primary Sales Pipeline');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    try {
      setSubmitting(true);

      const dealPayload = {
        contactId: leadId,
        contact_id: leadId,
        title: dealTitle.trim() || `${lead.name || 'Client'} - Deal`,
        dealName: dealTitle.trim() || `${lead.name || 'Client'} - Deal`,
        value: Number(dealAmount) || 0,
        amount: Number(dealAmount) || 0,
        pipeline: dealPipeline,
        stage: 'PROPOSAL_SENT',
        customerName: lead.name || '',
        contactNumber: lead.phone || '',
        createdBy: user?.email || 'System',
      };
      await apiClient.post('/deals', dealPayload).catch(() => null);

      const updatePayload = {
        isConverted: true,
        is_converted: true,
        stage: 'CONVERTED',
        status: 'CONVERTED',
        modifiedAt: new Date(),
      };
      await apiClient.put(`/contacts/${leadId}`, updatePayload).catch(() => null);

      Alert.alert('Success', 'Lead successfully converted to Deal!');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to convert lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Convert Lead to Deal</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalInputLabel}>Deal Title *</Text>
          <TextInput
            style={styles.modalTextInput}
            value={dealTitle}
            onChangeText={setDealTitle}
            placeholder="e.g. Vikram Malhotra - Apartment Deal"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.modalInputLabel}>Deal Amount / Value (₹) *</Text>
          <TextInput
            style={styles.modalTextInput}
            value={dealAmount}
            onChangeText={setDealAmount}
            placeholder="5000000"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.modalInputLabel}>Sales Pipeline *</Text>
          <View style={styles.chipOptionRow}>
            {['Primary Sales Pipeline', 'Secondary Pipeline'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.reasonChip, dealPipeline === p && styles.reasonChipSelected]}
                onPress={() => setDealPipeline(p)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    dealPipeline === p && styles.reasonChipTextSelected,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#10B981' }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Convert & Create Deal</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
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
  chipOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
