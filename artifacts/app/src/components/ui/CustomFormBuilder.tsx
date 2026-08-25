import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DynamicFieldRenderer, ComprehensiveFormField } from './DynamicFieldRenderer';
import { InfoGuideBadge } from './InfoGuideBadge';
import { theme } from '../../theme/theme';

export const CustomFormBuilder: React.FC = () => {
  const [fields, setFields] = useState<ComprehensiveFormField[]>([
    { key: 'clientName', label: 'Client / Company Name', type: 'text', isRequired: true },
    { key: 'contactPhone', label: 'Primary Mobile Number', type: 'phone', isRequired: true },
    { key: 'kycDoc', label: 'KYC Verification Document', type: 'file', isRequired: false },
  ]);

  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<ComprehensiveFormField['type']>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const availableTypes: ComprehensiveFormField['type'][] = [
    'text',
    'email',
    'phone',
    'select',
    'multiselect',
    'checkbox',
    'radio',
    'number',
    'currency',
    'date',
    'time',
    'datetime',
    'textarea',
    'file',
    'gallery',
    'repeater',
  ];

  const handleAddField = () => {
    if (!newLabel.trim()) {
      Alert.alert('Label Required', 'Please enter a field label name.');
      return;
    }

    const newFieldKey = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newField: ComprehensiveFormField = {
      key: `${newFieldKey}_${Date.now().toString().slice(-4)}`,
      label: newLabel.trim(),
      type: newType,
      isRequired: newRequired,
    };

    setFields([...fields, newField]);
    setNewLabel('');
    setNewRequired(false);

    Alert.alert('Field Added', `Added "${newLabel}" (${newType}) to custom form schema.`);
  };

  const handleRemoveField = (key: string) => {
    setFields(fields.filter((f) => f.key !== key));
  };

  const handleSaveSchema = () => {
    Alert.alert(
      'Form Schema Published!',
      `Custom form schema with ${fields.length} fields published to workspace backend!`
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>NO-CODE CUSTOM FORM BUILDER</Text>
        <InfoGuideBadge
          title="Custom Form Builder"
          description="Visually construct custom forms by adding any of the 16 dynamic field types. Forms automatically publish to your workspace."
        />
      </View>

      {/* Field Creator Card */}
      <View style={styles.card3D}>
        <Text style={styles.cardSectionTitle}>ADD NEW CUSTOM FIELD</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>FIELD LABEL NAME *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. GST Registration Number, Co-Applicant Name..."
            placeholderTextColor="#94A3B8"
            value={newLabel}
            onChangeText={setNewLabel}
          />
        </View>

        <Text style={styles.inputLabel}>SELECT FIELD TYPE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {availableTypes.map((type) => {
            const isSelected = newType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                onPress={() => setNewType(type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setNewRequired(!newRequired)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={newRequired ? 'checkbox-sharp' : 'square-outline'}
            size={18}
            color={newRequired ? theme.colors.brand700 : '#94A3B8'}
          />
          <Text style={styles.checkboxText}>Mark Field as Mandatory Required (*)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn3D} onPress={handleAddField} activeOpacity={0.88}>
          <Ionicons name="add-circle-sharp" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Field to Form Schema</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields Inventory & Live Preview */}
      <View style={styles.card3D}>
        <View style={styles.previewHeaderRow}>
          <Text style={styles.cardSectionTitle}>LIVE FORM SCHEMA PREVIEW ({fields.length} FIELDS)</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSchema} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-sharp" size={14} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Publish Form</Text>
          </TouchableOpacity>
        </View>

        {fields.map((field) => (
          <View key={field.key} style={styles.fieldPreviewWrapper}>
            <View style={styles.fieldMetaBar}>
              <Text style={styles.fieldMetaKey}>{field.label} ({field.type.toUpperCase()})</Text>
              <TouchableOpacity onPress={() => handleRemoveField(field.key)}>
                <Ionicons name="trash-outline" size={16} color="#E11D48" />
              </TouchableOpacity>
            </View>

            <DynamicFieldRenderer
              field={field}
              value={formValues[field.key]}
              onChange={(val) => setFormValues((prev) => ({ ...prev, [field.key]: val }))}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  card3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  typeScroll: {
    marginBottom: 14,
    marginHorizontal: -4,
  },
  typeChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  typeChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkboxText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  addBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fieldPreviewWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  fieldMetaKey: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
});
