import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stage, Deal } from '../../services/dealsService';

export const LOST_REASONS = [
  'Price / Budget Constraint',
  'Competitor Chosen',
  'Location / Timing Mismatch',
  'Project Specifications Unmet',
  'Client unresponsive / Lost interest',
  'Other',
];

interface LostReasonModalProps {
  visible: boolean;
  deal: Deal | null;
  stage: Stage | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, remarks?: string) => Promise<void> | void;
}

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  visible,
  deal,
  stage,
  loading = false,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(LOST_REASONS[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (selectedReason === 'Other' && !remarks.trim()) {
      setValidationError('Please enter remarks explaining why the deal was lost.');
      return;
    }
    setValidationError(null);
    const finalReason = selectedReason === 'Other' && remarks.trim() ? remarks.trim() : selectedReason;
    await onConfirm(finalReason, remarks.trim());
  };

  const formatAmount = (amt?: number, curr = 'INR') => {
    if (typeof amt !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr || 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.modalTitle}>Mark Deal as Lost</Text>
              </View>
              {deal && (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {deal.title || deal.name} • {formatAmount(deal.amount, deal.currency)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>
            Please select the authoritative reason for closing this opportunity as lost:
          </Text>

          {/* Reason Selection List */}
          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {LOST_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                  onPress={() => {
                    setSelectedReason(reason);
                    setValidationError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-sharp" size={16} color="#DC2626" />}
                </TouchableOpacity>
              );
            })}

            {/* Custom Remarks Input for 'Other' or extra feedback */}
            <View style={styles.remarksBlock}>
              <Text style={styles.remarksLabel}>
                {selectedReason === 'Other' ? 'SPECIFY REASON (MANDATORY) *' : 'ADDITIONAL REMARKS (OPTIONAL)'}
              </Text>
              <TextInput
                style={[
                  styles.remarksInput,
                  selectedReason === 'Other' && !remarks.trim() && validationError ? styles.remarksInputError : null,
                ]}
                placeholder={
                  selectedReason === 'Other'
                    ? 'Enter detailed rationale for closing this deal...'
                    : 'Add any competitor pricing or client feedback notes...'
                }
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={remarks}
                onChangeText={(t) => {
                  setRemarks(t);
                  if (validationError) setValidationError(null);
                }}
              />
              {Boolean(validationError) && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Confirm Closed Lost</Text>
                </>
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
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    lineHeight: 18,
  },
  reasonsList: {
    maxHeight: 340,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#DC2626',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  reasonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontWeight: '700',
  },
  remarksBlock: {
    marginTop: 8,
    marginBottom: 12,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  remarksInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  remarksInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
