import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';

interface TaskFormField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  isRequired?: boolean;
}

const DEFAULT_TASK_FIELDS: TaskFormField[] = [
  { key: 'title', label: 'Task Title', type: 'text', isRequired: true, placeholder: 'e.g. Schedule Follow-up Call' },
  { key: 'leadName', label: 'Lead / Client Name', type: 'text', isRequired: false, placeholder: 'Enter contact name' },
  { key: 'dueDate', label: 'Due Date & Time', type: 'datetime', isRequired: false, placeholder: 'Select due date & time' },
  { key: 'project', label: 'Project / Department', type: 'text', isRequired: false, placeholder: 'Enter project or specialty' },
];

export const TaskFormScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const [fields, setFields] = useState<TaskFormField[]>(DEFAULT_TASK_FIELDS);
  const [loadingSchema, setLoadingSchema] = useState(true);

  const [formValues, setFormValues] = useState<Record<string, string>>({
    title: '',
    leadName: '',
    dueDate: '',
    project: '',
  });

  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dynamically resolve task form schema from backend API
  useEffect(() => {
    let isMounted = true;
    setLoadingSchema(true);

    apiClient
      .post('/screens/resolve', {
        screenKey: 'task',
        industryCode: user?.industryId || 'real_estate',
        roleKey: user?.role || 'sales',
        organizationId: user?.organizationId,
      })
      .then((res) => {
        if (!isMounted) return;
        const raw = res.data?.formFields || res.data?.form_fields || res.data?.fields || [];
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped: TaskFormField[] = raw.map((f: any) => ({
            key: f.key || f.fieldKey || f.field_key,
            label: f.label || f.name || f.key,
            type: f.type || 'text',
            isRequired: f.isRequired ?? f.is_required ?? false,
          }));
          setFields(mapped.length > 0 ? mapped : DEFAULT_TASK_FIELDS);
        } else {
          setFields(DEFAULT_TASK_FIELDS);
        }
        setLoadingSchema(false);
      })
      .catch((err) => {
        console.warn('Failed to resolve task schema, using default fields:', err);
        if (!isMounted) return;
        setFields(DEFAULT_TASK_FIELDS);
        setLoadingSchema(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleValueChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const title = formValues.title || '';
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter Task Title.');
      return;
    }

    try {
      setSubmitting(true);
      await taskService.createTask({
        title: title.trim(),
        leadName: formValues.leadName || '',
        dueDate: formValues.dueDate || 'Today',
        project: formValues.project || '',
        priority,
        isCompleted: false,
      });

      Alert.alert(
        'Task Created!',
        `New ${semantics.taskEntitySingular.toLowerCase()} added to your schedule.`,
        [
          {
            text: 'View Tasks',
            onPress: () => navigation.navigate('Tasks'),
          },
        ]
      );
    } catch (err) {
      console.error('Error creating task:', err);
      Alert.alert('Error', 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* Luxury #151728 Midnight Header */}
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

        <View style={styles.headerBannerBox}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="calendar-sharp" size={15} color="#0284C7" />
            </View>
            <Text style={styles.headerTitleText}>
              Schedule New {semantics.taskEntitySingular}
            </Text>
          </View>
          <View style={styles.headerStatusPill}>
            <View style={styles.headerGreenPulseDot} />
            <Text style={styles.headerStatusPillText}>ENTRY</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          {loadingSchema ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#272944" />
              <Text style={styles.loadingText}>Loading dynamic task schema…</Text>
            </View>
          ) : (
            fields.map((field) => {
              const isFocused = focusedField === field.key;
              const val = formValues[field.key] || '';
              const isDate =
                field.key.toLowerCase().includes('date') ||
                field.key.toLowerCase().includes('time') ||
                field.type === 'date' ||
                field.type === 'datetime';

              if (isDate) {
                return (
                  <View key={field.key} style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      {field.isRequired && <Text style={styles.requiredStar}>*</Text>}
                    </View>
                    <TouchableOpacity
                      style={[styles.input, styles.dateTriggerBox]}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.datePickerLeft}>
                        <Ionicons name="calendar-outline" size={17} color="#0284C7" />
                        <Text
                          style={[
                            styles.dateTriggerText,
                            !val && styles.datePlaceholderText,
                          ]}
                        >
                          {val || field.placeholder || 'Select date & time...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View key={field.key} style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    {field.isRequired && <Text style={styles.requiredStar}>*</Text>}
                  </View>

                  <TextInput
                    style={[styles.input, isFocused && styles.inputFocused]}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    placeholderTextColor="#94A3B8"
                    value={val}
                    onChangeText={(txt) => handleValueChange(field.key, txt)}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              );
            })
          )}

          {/* Priority Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Task Priority</Text>
            <View style={styles.priorityRow}>
              {(['High', 'Medium', 'Low'] as const).map((p) => {
                const isSelected = priority === p;
                const pColor =
                  p === 'High' ? '#E11D48' : p === 'Medium' ? '#D97706' : '#059669';

                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      isSelected && {
                        borderColor: pColor,
                        backgroundColor: `${pColor}15`,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: isSelected ? pColor : '#CBD5E1' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        isSelected && { color: pColor, fontWeight: '700' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Action Button */}
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
                <Ionicons name="checkmark-circle-sharp" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  Schedule {semantics.taskEntitySingular}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Calendar Date Picker Modal */}
      <CalendarDatePickerModal
        visible={showDatePicker}
        title="Schedule Due Date"
        currentValue={formValues.dueDate}
        includeTime={true}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formatted) => {
          handleValueChange('dueDate', formatted);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  luxuryHeader: {
    backgroundColor: '#151728',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
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
  headerBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  headerGreenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerStatusPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
  },
  requiredStar: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  dateTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateTriggerText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  datePlaceholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    backgroundColor: '#272944',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
