import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InfoGuideBadge } from './InfoGuideBadge';
import { theme } from '../../theme/theme';

export interface ComprehensiveFormField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'radio'
    | 'number'
    | 'currency'
    | 'date'
    | 'time'
    | 'datetime'
    | 'textarea'
    | 'file'
    | 'gallery'
    | 'repeater';
  isRequired?: boolean;
  infoDescription?: string;
  options?: { value: string; label: string }[];
  repeaterFields?: { key: string; label: string }[];
}

interface Props {
  field: ComprehensiveFormField;
  value: any;
  onChange: (val: any) => void;
}

export const DynamicFieldRenderer: React.FC<Props> = ({ field, value, onChange }) => {
  const [repeaterItems, setRepeaterItems] = useState<Record<string, string>[]>(
    Array.isArray(value) ? value : [{ title: '', value: '' }]
  );

  const key = field.key;
  const label = field.label;
  const isRequired = field.isRequired;

  // 1. Repeater Field (Dynamic Multi-Row Items)
  if (field.type === 'repeater') {
    const addRepeaterRow = () => {
      const updated = [...repeaterItems, { title: '', value: '' }];
      setRepeaterItems(updated);
      onChange(updated);
    };

    const updateRepeaterRow = (index: number, subKey: string, val: string) => {
      const updated = repeaterItems.map((item, idx) =>
        idx === index ? { ...item, [subKey]: val } : item
      );
      setRepeaterItems(updated);
      onChange(updated);
    };

    return (
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label.toUpperCase()} (REPEATER) {isRequired ? '*' : ''}</Text>
          {field.infoDescription && (
            <InfoGuideBadge title={label} description={field.infoDescription} />
          )}
        </View>

        {repeaterItems.map((row, idx) => (
          <View key={idx} style={styles.repeaterRowCard}>
            <TextInput
              style={styles.repeaterInput}
              placeholder="Title / Attribute..."
              placeholderTextColor="#94A3B8"
              value={row.title}
              onChangeText={(text) => updateRepeaterRow(idx, 'title', text)}
            />
            <TextInput
              style={styles.repeaterInput}
              placeholder="Value / Spec..."
              placeholderTextColor="#94A3B8"
              value={row.value}
              onChangeText={(text) => updateRepeaterRow(idx, 'value', text)}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addRepeaterBtn} onPress={addRepeaterRow} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={16} color={theme.colors.brand700} />
          <Text style={styles.addRepeaterText}>Add Item Row</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Document & File Attachment Upload Field
  if (field.type === 'file') {
    return (
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label.toUpperCase()} (DOCUMENT) {isRequired ? '*' : ''}</Text>
          {field.infoDescription && (
            <InfoGuideBadge title={label} description={field.infoDescription} />
          )}
        </View>

        <TouchableOpacity
          style={styles.fileUploadBox}
          onPress={() => {
            onChange('kyc_document_attached.pdf');
            Alert.alert('Document Attached', 'Uploaded document: kyc_document_attached.pdf');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="document-attach-sharp" size={22} color={theme.colors.brand700} />
          <Text style={styles.fileUploadText}>{value || 'Tap to attach document (PDF / DOC)'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Image Photo Gallery Upload Field
  if (field.type === 'gallery') {
    return (
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label.toUpperCase()} (PHOTO GALLERY) {isRequired ? '*' : ''}</Text>
          {field.infoDescription && (
            <InfoGuideBadge title={label} description={field.infoDescription} />
          )}
        </View>

        <TouchableOpacity
          style={styles.galleryUploadBox}
          onPress={() => {
            onChange(['photo_1.jpg', 'photo_2.jpg']);
            Alert.alert('Gallery Updated', '2 Photos attached to property record.');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="images-sharp" size={22} color={theme.colors.brand700} />
          <Text style={styles.galleryUploadText}>
            {Array.isArray(value) ? `${value.length} Photos Uploaded` : 'Tap to upload photo gallery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 4. Checkbox / Boolean Toggle
  if (field.type === 'checkbox') {
    return (
      <View style={styles.fieldBlock}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => onChange(!value)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={value ? 'checkbox-sharp' : 'square-outline'}
            size={20}
            color={value ? theme.colors.brand700 : '#94A3B8'}
          />
          <Text style={styles.checkboxLabel}>{label} {isRequired ? '*' : ''}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 5. Textarea Multiline Field
  if (field.type === 'textarea') {
    return (
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label.toUpperCase()} {isRequired ? '*' : ''}</Text>
          {field.infoDescription && (
            <InfoGuideBadge title={label} description={field.infoDescription} />
          )}
        </View>

        <View style={styles.textAreaBox}>
          <TextInput
            style={styles.textAreaControl}
            placeholder={`Enter ${label.toLowerCase()}...`}
            placeholderTextColor="#94A3B8"
            value={value || ''}
            onChangeText={onChange}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    );
  }

  // 6. Standard Input Field (Text, Email, Phone, Number, Currency, Date, Time)
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label.toUpperCase()} {isRequired ? '*' : ''}</Text>
        {field.infoDescription && (
          <InfoGuideBadge title={label} description={field.infoDescription} />
        )}
      </View>

      <View style={styles.inputBox}>
        <TextInput
          style={styles.textInputControl}
          placeholder={`Enter ${label.toLowerCase()}...`}
          placeholderTextColor="#94A3B8"
          value={value || ''}
          onChangeText={onChange}
          keyboardType={
            field.type === 'email'
              ? 'email-address'
              : field.type === 'phone'
              ? 'phone-pad'
              : field.type === 'number' || field.type === 'currency'
              ? 'numeric'
              : 'default'
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.9,
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    height: 50,
    justifyContent: 'center',
  },
  textInputControl: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
  },
  textAreaControl: {
    minHeight: 70,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  fileUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: 10,
  },
  fileUploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  galleryUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: 10,
  },
  galleryUploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  repeaterRowCard: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  repeaterInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  addRepeaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
  },
  addRepeaterText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
});
