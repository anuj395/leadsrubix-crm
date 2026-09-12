import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem, taskService } from '../../services/taskService';
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { openEmail } from '../../utils/emailHelper';

interface TaskDetailModalProps {
  visible: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onRefresh: () => void;
  onCall?: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onViewLead?: (task: TaskItem) => void;
  organizationName?: string;
  userName?: string;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  onClose,
  onRefresh,
  onCall,
  onEdit,
  onViewLead,
  organizationName = 'Leads Rubix',
  userName = 'Executive',
}) => {
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!task) return null;

  const getPriorityMeta = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'urgent') {
      return { bg: '#FAF5FF', border: '#E9D5FF', text: '#9333EA' };
    }
    if (p === 'high') {
      return { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' };
    }
    if (p === 'medium') {
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' };
    }
    return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' };
  };

  const getTaskIcon = (type?: string, title?: string) => {
    const s = `${type || ''} ${title || ''}`.toLowerCase();
    if (s.includes('visit') || s.includes('site')) {
      return { name: 'business' as const, color: '#1D4ED8', bg: '#EFF6FF' };
    }
    if (s.includes('call') || s.includes('phone')) {
      return { name: 'call' as const, color: '#272944', bg: 'rgba(39, 41, 68, 0.08)' };
    }
    if (s.includes('demo') || s.includes('online')) {
      return { name: 'videocam' as const, color: '#4F46E5', bg: '#EEF2FF' };
    }
    if (s.includes('doc') || s.includes('kyc')) {
      return { name: 'document-text' as const, color: '#0D9488', bg: '#F0FDFA' };
    }
    if (s.includes('follow')) {
      return { name: 'repeat' as const, color: '#EA580C', bg: '#FFF7ED' };
    }
    if (s.includes('meet') || s.includes('consult')) {
      return { name: 'people' as const, color: '#7C3AED', bg: '#F5F3FF' };
    }
    return { name: 'checkmark-circle' as const, color: '#059669', bg: '#ECFDF5' };
  };

  const handleToggleComplete = async () => {
    try {
      setActionLoading(true);
      const nextState = !task.isCompleted;
      await taskService.toggleTaskCompletion(task.id, nextState);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to toggle task:', err);
      Alert.alert('Error', 'Could not update task status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleDate = async (newDateStr: string) => {
    setShowReschedulePicker(false);
    if (!newDateStr) return;

    try {
      setActionLoading(true);
      await taskService.rescheduleTask(task.id, newDateStr);
      Alert.alert('Task Rescheduled', `Rescheduled to ${newDateStr}`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to reschedule task:', err);
      Alert.alert('Error', 'Could not reschedule task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to permanently delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await taskService.deleteTask(task.id);
              onRefresh();
              onClose();
            } catch (err) {
              console.error('Failed to delete task:', err);
              Alert.alert('Error', 'Could not delete task.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleWhatsApp = () => {
    if (!task.phone) {
      Alert.alert('No Phone', 'No phone number for WhatsApp.');
      return;
    }
    const msg = `Hello ${task.leadName || 'Client'}, this is regarding our scheduled follow-up from ${organizationName}.`;
    openWhatsApp(task.phone, msg);
  };

  const handleEmail = () => {
    if (!task.email) {
      Alert.alert('No Email', 'No email address registered for this contact.');
      return;
    }
    const subject = `Regarding our scheduled appointment - ${organizationName}`;
    const body = `Hello ${task.leadName || 'Client'},\n\nFollowing up on our scheduled appointment.\n\nBest regards,\n${userName}`;
    openEmail(task.email, subject, body);
  };

  const priorityMeta = getPriorityMeta(task.priority);
  const iconMeta = getTaskIcon(task.type, task.title);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.bottomSheetCard}>
          {/* Header Drag Handle */}
          <View style={styles.dragHandleBox}>
            <View style={styles.dragHandle} />
          </View>

          {/* Modal Header */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.headerLeftBadge}>
              <View style={[styles.taskTypeIconCircle, { backgroundColor: iconMeta.bg }]}>
                <Ionicons name={iconMeta.name} size={18} color={iconMeta.color} />
              </View>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTaskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <View style={styles.headerBadgeRow}>
                  <View
                    style={[
                      styles.priorityPill,
                      {
                        backgroundColor: priorityMeta.bg,
                        borderColor: priorityMeta.border,
                      },
                    ]}
                  >
                    <Text style={[styles.priorityPillText, { color: priorityMeta.text }]}>
                      {task.priority} Priority
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: task.isCompleted ? '#ECFDF5' : '#FFFBEB',
                        borderColor: task.isCompleted ? '#A7F3D0' : '#FDE68A',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: task.isCompleted ? '#10B981' : '#F59E0B' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: task.isCompleted ? '#047857' : '#B45309' },
                      ]}
                    >
                      {task.isCompleted ? 'COMPLETED' : 'PENDING'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Urgency Alert Strip */}
          {task.urgency === 'OVERDUE' ? (
            <View style={styles.overdueAlertStrip}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.overdueAlertText}>
                ⚠️ Attention: This task is {task.urgencyLabel.toLowerCase()}!
              </Text>
            </View>
          ) : task.urgency === 'TODAY' && !task.isCompleted ? (
            <View style={styles.todayAlertStrip}>
              <Ionicons name="time" size={16} color="#D97706" />
              <Text style={styles.todayAlertText}>
                📅 Scheduled for Today. Complete before end of day.
              </Text>
            </View>
          ) : null}

          <ScrollView
            style={styles.modalScrollBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollInnerContent}
          >
            {/* ── Client / Contact Info Card ── */}
            <View style={styles.infoSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person-circle-outline" size={16} color="#272944" />
                <Text style={styles.sectionHeading}>Contact Details</Text>
              </View>

              <View style={styles.contactRow}>
                <View style={styles.contactDetailsLeft}>
                  <Text style={styles.contactNameText} numberOfLines={1}>
                    {task.leadName || 'No Contact Attached'}
                  </Text>
                  {task.project ? (
                    <Text style={styles.contactProjectText} numberOfLines={1}>
                      🏢 {task.project}
                    </Text>
                  ) : null}
                  {task.phone ? (
                    <Text style={styles.contactPhoneText}>
                      📞 {task.phone}
                    </Text>
                  ) : null}
                </View>

                {/* Direct Telephony & Messaging Actions */}
                <View style={styles.quickContactCockpit}>
                  {task.phone ? (
                    <TouchableOpacity
                      style={styles.actionIconBtnCall}
                      onPress={() => onCall ? onCall(task) : Linking.openURL(`tel:${task.phone}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}

                  {task.phone ? (
                    <TouchableOpacity
                      style={styles.actionIconBtnWhatsApp}
                      onPress={handleWhatsApp}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}

                  {task.email ? (
                    <TouchableOpacity
                      style={styles.actionIconBtnEmail}
                      onPress={handleEmail}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mail" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* View Full Lead Link */}
              {task.leadId ? (
                <TouchableOpacity
                  style={styles.viewLeadLinkBtn}
                  onPress={() => {
                    onClose();
                    if (onViewLead) {
                      onViewLead(task);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewLeadLinkText}>Open Client Profile & History</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0284C7" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ── Schedule & Timing Card ── */}
            <View style={styles.infoSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar-outline" size={16} color="#272944" />
                <Text style={styles.sectionHeading}>Schedule Information</Text>
              </View>

              <View style={styles.dataGridRow}>
                <View style={styles.dataGridItem}>
                  <Text style={styles.dataGridLabel}>DUE DATE & TIME</Text>
                  <Text style={styles.dataGridValue}>
                    {task.dueDate || 'Today'}
                  </Text>
                </View>

                <View style={styles.dataGridItem}>
                  <Text style={styles.dataGridLabel}>URGENCY STATUS</Text>
                  <Text
                    style={[
                      styles.dataGridValue,
                      task.urgency === 'OVERDUE' && { color: '#DC2626', fontWeight: '800' },
                      task.urgency === 'TODAY' && { color: '#D97706', fontWeight: '800' },
                    ]}
                  >
                    {task.urgencyLabel}
                  </Text>
                </View>
              </View>

              {task.callbackReason || task.call_back_reason ? (
                <View style={styles.callbackReasonBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#D97706" />
                  <Text style={styles.callbackReasonBoxText}>
                    Reason: {task.callbackReason || task.call_back_reason}
                  </Text>
                </View>
              ) : null}

              {(task.meetingLocation || task.location) ? (
                <View style={styles.locationBox}>
                  <Ionicons name="location-outline" size={14} color="#15803D" />
                  <Text style={styles.locationBoxText} numberOfLines={2}>
                    Venue / Location: {task.meetingLocation || task.location}
                  </Text>
                </View>
              ) : null}

              {(task.demoLink || task.meetingLink) ? (
                <View style={styles.demoLinkBox}>
                  <View style={styles.demoLinkLeftGroup}>
                    <Ionicons name="videocam-outline" size={15} color="#4F46E5" />
                    <Text style={styles.demoLinkBoxText} numberOfLines={1}>
                      {task.demoLink || task.meetingLink}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.joinMeetingBtn}
                    onPress={() => {
                      const url = task.demoLink || task.meetingLink || '';
                      if (url) {
                        const target = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
                        Linking.openURL(target).catch(() => Alert.alert('Error', 'Unable to open meeting link'));
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.joinMeetingBtnText}>Join Meeting</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {task.assignedTo ? (
                <View style={styles.assigneeBox}>
                  <Ionicons name="person-outline" size={13} color="#475569" />
                  <Text style={styles.assigneeBoxText}>
                    Assigned: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{task.assignedTo}</Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ── Notes & Instructions Card ── */}
            {task.notes ? (
              <View style={styles.infoSectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="document-text-outline" size={16} color="#272944" />
                  <Text style={styles.sectionHeading}>Notes & Agenda</Text>
                </View>
                <Text style={styles.notesBodyText}>{task.notes}</Text>
              </View>
            ) : null}

            {/* ── Action Cockpit (Buttons) ── */}
            <View style={styles.actionButtonsContainer}>
              {/* Primary Toggle Complete Button */}
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  task.isCompleted ? styles.reopenButton : styles.completeButton,
                ]}
                onPress={handleToggleComplete}
                disabled={actionLoading}
                activeOpacity={0.88}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={task.isCompleted ? 'arrow-undo' : 'checkmark-circle-sharp'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryActionButtonText}>
                      {task.isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Actions Row: Reschedule, Edit, Delete */}
              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => setShowReschedulePicker(true)}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-sharp" size={15} color="#0284C7" />
                  <Text style={styles.secondaryActionBtnText}>Reschedule</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => {
                    onClose();
                    if (onEdit) onEdit(task);
                  }}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color="#475569" />
                  <Text style={styles.secondaryActionBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.deleteActionBtn]}
                  onPress={handleDelete}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={[styles.secondaryActionBtnText, { color: '#EF4444' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Reschedule Calendar Overlay */}
      <CalendarDatePickerModal
        visible={showReschedulePicker}
        title="Reschedule Follow-up"
        currentValue={task.rawDueDate || task.dueDate}
        includeTime={true}
        minDate={new Date()}
        onClose={() => setShowReschedulePicker(false)}
        onSelectDate={handleRescheduleDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleBox: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  taskTypeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueAlertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FECDD3',
    gap: 8,
  },
  overdueAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  todayAlertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    gap: 8,
  },
  todayAlertText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  scrollInnerContent: {
    paddingBottom: 20,
  },
  infoSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272944',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactDetailsLeft: {
    flex: 1,
  },
  contactNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  contactProjectText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  contactPhoneText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  quickContactCockpit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtnCall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnWhatsApp: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnEmail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLeadLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewLeadLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  dataGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dataGridItem: {
    flex: 1,
  },
  dataGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  dataGridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  callbackReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  callbackReasonBoxText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45309',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  locationBoxText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },
  demoLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    gap: 8,
  },
  demoLinkLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  demoLinkBoxText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#4338CA',
    flex: 1,
  },
  joinMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  joinMeetingBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assigneeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  assigneeBoxText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },
  notesBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  actionButtonsContainer: {
    marginTop: 8,
    gap: 10,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  completeButton: {
    backgroundColor: '#059669',
  },
  reopenButton: {
    backgroundColor: '#475569',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 5,
  },
  deleteActionBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});
