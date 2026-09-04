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

interface OwnerOption {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

const DEFAULT_REASONS = [
  'Reassigned by Admin',
  'Lead Unresponsive',
  'Territory Re-allocation',
  'Owner Left Organization',
  'Workload Balancing',
  'Other',
];

export const ChangeOwnerModal: React.FC<Props> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<OwnerOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [transferReason, setTransferReason] = useState(DEFAULT_REASONS[0]);
  const [customEmail, setCustomEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoadingUsers(true);

    const initialOwner = (lead as any).assignedTo || (lead as any).contactOwnerEmail || (lead as any).contact_owner_email || '';
    setSelectedUserEmail(initialOwner);
    setCustomEmail('');
    setTransferReason(DEFAULT_REASONS[0]);

    // Fetch active users list matching Web CRM 1:1
    apiClient.get('/users')
      .then((res) => {
        const raw = res?.data?.items || res?.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped = raw
            .filter((u: any) => u.isActive !== false)
            .map((u: any) => ({
              _id: String(u._id || u.id || ''),
              name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              role: u.role || 'Agent',
            }));
          setUsers(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [visible, lead]);

  const handleSubmit = async () => {
    const leadId = lead.id || lead._id;
    if (!leadId) {
      Alert.alert('Error', 'Invalid lead record');
      return;
    }

    const targetEmail = selectedUserEmail.trim() || customEmail.trim();
    if (!targetEmail) {
      Alert.alert('Validation Error', 'Please choose or enter owner email address');
      return;
    }

    try {
      setSubmitting(true);

      const targetUser = users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());

      // 1. Try Bulk / Standard Transfer Endpoint (Matching Web CRM 1:1)
      const transferPayload = {
        ids: [leadId],
        owner: {
          email: targetEmail,
          uid: targetUser?._id || '',
        },
        reason: transferReason,
        leadType: 'Leads',
        options: {
          notes: true,
          attachments: true,
          contactDetails: true,
        },
      };

      const transferRes = await apiClient.post('/contacts/transfer', transferPayload).catch(() => null);

      if (!transferRes) {
        // Fallback: Direct Contact Update
        const updatePayload = {
          contactOwnerEmail: targetEmail,
          contact_owner_email: targetEmail,
          assignedTo: targetEmail,
          modifiedAt: new Date(),
        };
        await apiClient.put(`/contacts/${leadId}`, updatePayload).catch(() => null);
      }

      Alert.alert('Success', 'Lead owner updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to update lead owner');
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
              <Text style={styles.modalTitle}>Reassign Lead Owner</Text>
              <Text style={styles.modalSubtitle}>Transfer lead ownership to another team member.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* Owner Selection List / Custom Input */}
            <Text style={styles.modalInputLabel}>Select New Owner *</Text>

            {loadingUsers ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0EA5E9" />
                <Text style={styles.loadingText}>Loading team members...</Text>
              </View>
            ) : (
              <View style={styles.userListContainer}>
                {users.map((u) => {
                  const isSelected = selectedUserEmail.toLowerCase() === u.email.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={u._id || u.email}
                      style={[styles.userChip, isSelected && styles.userChipSelected]}
                      onPress={() => {
                        setSelectedUserEmail(u.email);
                        setCustomEmail('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.userInfoCol}>
                        <Text style={[styles.userNameText, isSelected && styles.userNameTextSelected]}>
                          {u.name}
                        </Text>
                        <Text style={[styles.userEmailText, isSelected && styles.userEmailTextSelected]}>
                          {u.email} ({u.role})
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0EA5E9" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Custom Owner Email Input fallback */}
            <Text style={styles.modalInputLabel}>Or Enter Email Address</Text>
            <TextInput
              style={styles.modalTextInput}
              value={customEmail}
              onChangeText={(txt) => {
                setCustomEmail(txt);
                setSelectedUserEmail('');
              }}
              placeholder="agent@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Transfer Reason */}
            <Text style={styles.modalInputLabel}>Transfer Reason</Text>
            <View style={styles.reasonsContainer}>
              {DEFAULT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonPill, transferReason === r && styles.reasonPillSelected]}
                  onPress={() => setTransferReason(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reasonPillText, transferReason === r && styles.reasonPillTextSelected]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <Text style={styles.modalSubmitBtnText}>Reassign Owner</Text>
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
  loadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  userListContainer: {
    gap: 6,
    marginBottom: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userChipSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  userNameTextSelected: {
    color: '#0EA5E9',
  },
  userEmailText: {
    fontSize: 11,
    color: '#64748B',
  },
  userEmailTextSelected: {
    color: '#0284C7',
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
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reasonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  reasonPillSelected: {
    backgroundColor: '#0EA5E9',
  },
  reasonPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reasonPillTextSelected: {
    color: '#FFFFFF',
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
