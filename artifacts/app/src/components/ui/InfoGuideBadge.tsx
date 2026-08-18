import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface InfoGuideBadgeProps {
  title: string;
  description: string;
}

export const InfoGuideBadge: React.FC<InfoGuideBadgeProps> = ({ title, description }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.inlineContainer}>
      <TouchableOpacity
        style={styles.infoBadgeCircle}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.infoLetter}>i</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard3D}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.infoIconBadge}>
                <Ionicons name="information-circle" size={20} color={theme.colors.brand700} />
              </View>
              <Text style={styles.modalTitle}>{title}</Text>
            </View>

            <Text style={styles.modalDescription}>{description}</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    marginLeft: 4,
  },
  infoBadgeCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(39, 41, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.25)',
  },
  infoLetter: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.brand700,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard3D: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  modalDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  closeBtn: {
    backgroundColor: theme.colors.brand700,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
