import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { taskService } from '../../services/taskService';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { theme } from '../../theme/theme';

export interface TaskFormField {
  key: string;
  label: string;
  type: string;
  isRequired?: boolean;
  options?: { value: string; label: string }[];
}

const DEFAULT_TASK_FIELDS: TaskFormField[] = [
  { key: 'title', label: 'Task Title / Action Item', type: 'text', isRequired: true },
  { key: 'leadName', label: 'Related Prospect Name', type: 'text', isRequired: true },
  { key: 'dueDate', label: 'Due Date & Time', type: 'text', isRequired: true },
  { key: 'project', label: 'Associated Development Project', type: 'text', isRequired: true },
];

export const TaskFormScreen = ({ navigation }: any) => {
  const [fields, setFields] = useState<TaskFormField[]>(DEFAULT_TASK_FIELDS);
  const [loadingSchema, setLoadingSchema] = useState(true);

  const [formValues, setFormValues] = useState<Record<string, string>>({
    title: 'Schedule Site Visit Tour',
    leadName: 'Rajesh Kumar',
    dueDate: 'Today, 4:00 PM',
    project: 'Grand Horizon Towers',
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
        industryCode: 'real_estate',
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
  }, []);

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
        leadName: formValues.leadName || 'Rajesh Kumar',
        dueDate: formValues.dueDate || 'Today, 4:00 PM',
        project: formValues.project || 'Grand Horizon Towers',
        priority,
        isCompleted: false,
      });

      Alert.alert(
        'Task Created!',
        'New follow-up task added to your schedule.',
        [
          {
            text: 'View Tasks',
            onPress: () => navigation.navigate('Tasks'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Failed to create task:', err);
      Alert.alert('Error', err.message || 'Unable to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={36} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>SCHEDULE BUYER FOLLOW-UP TASK</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated AI Mascot Advisor Companion */}
          <AIAdvisorMascot
            screenName="TaskForm"
            message="Schedule site visits & follow-up calls to keep buyer deals moving forward!"
          />

          {/* 3D Framed Form Card */}
          <View style={styles.framedCard3D}>
            <Text style={styles.cardTitle}>New Follow-up Task</Text>
            <Text style={styles.cardSubtitle}>Set action item details & priority level</Text>

            {/* Priority Selector Pills */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>PRIORITY LEVEL *</Text>
              <View style={styles.priorityPillRow}>
                {(['High', 'Medium', 'Low'] as const).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityPill, isSelected && styles.priorityPillSelected]}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.priorityPillText, isSelected && styles.priorityPillTextSelected]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {loadingSchema ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.colors.brand700} />
                <Text style={styles.loadingText}>Configuring task schema fields...</Text>
              </View>
            ) : (
              <View>
                {fields.map((field) => {
                  const key = field.key;
                  const val = formValues[key] || '';
                  const isFocused = focusedField === key;
                  const isRequired = field.isRequired;

                  return (
                    <View key={key} style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>
                        {field.label.toUpperCase()} {isRequired ? '*' : ''}
                      </Text>
                      <View style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
                        <View style={[styles.fieldIconBadge, isFocused && styles.fieldIconBadgeFocused]}>
                          <Ionicons
                            name={
                              key.toLowerCase().includes('date')
                                ? 'calendar'
                                : key.toLowerCase().includes('project')
                                ? 'business'
                                : key.toLowerCase().includes('lead')
                                ? 'person'
                                : 'checkbox'
                            }
                            size={16}
                            color={isFocused ? '#FFFFFF' : theme.colors.brand700}
                          />
                        </View>
                        <TextInput
                          style={styles.textInputControl}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          placeholderTextColor={theme.colors.textDisabled}
                          value={val}
                          onChangeText={(text) => handleValueChange(key, text)}
                          onFocus={() => setFocusedField(key)}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  );
                })}

                {/* 3D Submit Button */}
                <TouchableOpacity
                  style={styles.primaryCtaButton3D}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.88}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.ctaContentRow}>
                      <Text style={styles.ctaButtonText}>Schedule Task</Text>
                      <View style={styles.ctaArrowCircle}>
                        <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  hero3DHeader: {
    width: '100%',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  headerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  framedCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 20,
    fontWeight: '500',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 1.1,
  },
  priorityPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  priorityPillSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  priorityPillTextSelected: {
    color: '#FFFFFF',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    height: 52,
  },
  inputBoxFocused: {
    borderColor: theme.colors.brand700,
    borderBottomColor: theme.colors.brand700,
    backgroundColor: '#FFFFFF',
  },
  fieldIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldIconBadgeFocused: {
    backgroundColor: theme.colors.brand700,
  },
  textInputControl: {
    flex: 1,
    height: 52,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryCtaButton3D: {
    backgroundColor: theme.colors.brand700,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#16182B',
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
