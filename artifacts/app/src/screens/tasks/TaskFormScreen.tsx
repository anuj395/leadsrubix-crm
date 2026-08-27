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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { theme } from '../../theme/theme';

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
  { key: 'dueDate', label: 'Due Date & Time', type: 'text', isRequired: false, placeholder: 'e.g. Today, 4:00 PM' },
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

  // Dynamically resolve task form schema from backend API
  useEffect(() => {
    let isMounted = true;
    setLoadingSchema(true);

    apiClient
      .post('/screens/resolve', {
        screenKey: 'task',
        industryCode: user?.industryId || 'real_estate',
        roleKey: 'sales',
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SCHEDULE {semantics.taskEntitySingular.toUpperCase()}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          {loadingSchema ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.brand700} />
              <Text style={styles.loadingText}>Loading dynamic task schema…</Text>
            </View>
          ) : (
            fields.map((field) => {
              const isFocused = focusedField === field.key;
              const val = formValues[field.key] || '';

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

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-sharp" size={17} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>SAVE {semantics.taskEntitySingular.toUpperCase()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  requiredStar: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  inputFocused: {
    borderColor: theme.colors.brand700,
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 9,
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
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272944',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
    gap: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
