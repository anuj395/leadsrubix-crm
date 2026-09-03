import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadService } from '../../services/leadService';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/apiClient';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { CalendarDatePickerModal } from '../../components/ui/CalendarDatePickerModal';
import { getIndustrySemantics } from '../../utils/industryLabels';

export interface DynamicFormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder?: string;
  order?: number;
  dropdown_source?: string;
  dropdown_api?: string;
}

const COUNTRY_DIALING_CODES = [
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+1', flag: '🇺🇸', country: 'United States' },
  { code: '+971', flag: '🇦🇪', country: 'UAE' },
  { code: '+44', flag: '🇬🇧', country: 'United Kingdom' },
  { code: '+65', flag: '🇸🇬', country: 'Singapore' },
  { code: '+61', flag: '🇦🇺', country: 'Australia' },
  { code: '+966', flag: '🇸🇦', country: 'Saudi Arabia' },
  { code: '+49', flag: '🇩🇪', country: 'Germany' },
  { code: '+33', flag: '🇫🇷', country: 'France' },
  { code: '+81', flag: '🇯🇵', country: 'Japan' },
  { code: '+977', flag: '🇳🇵', country: 'Nepal' },
  { code: '+880', flag: '🇧🇩', country: 'Bangladesh' },
];

function getDynamicDefaultOptions(industryInput?: string): Record<string, string[]> {
  const norm = String(industryInput || '').toLowerCase().trim().replace(/[\s\-_]+/g, '');

  if (norm === 'temp0003' || norm.includes('health') || norm.includes('medic') || norm.includes('clinic')) {
    return {
      leadType: ['New Patient', 'Follow-up Patient', 'Emergency Triage', 'Insurance Referral'],
      projectName: ['Cardiology Specialty', 'Neurology Center', 'Orthopedics Clinic', 'General Medicine', 'Pediatrics Care'],
      project: ['Cardiology Specialty', 'Neurology Center', 'Orthopedics Clinic', 'General Medicine', 'Pediatrics Care'],
      propertyType: ['Outpatient OPD', 'Inpatient Ward', 'ICU Critical Care', 'Emergency Trauma', 'Day Care Surgery'],
      propertyStage: ['Initial Triage', 'Diagnostic Pending', 'Treatment Scheduled', 'Under Treatment', 'Post-Op Follow-up'],
      budget: ['Under ₹10,000', '₹10,000 - ₹50,000', '₹50,000 - ₹1 Lakh', '₹1 Lakh - ₹2.5 Lakhs', 'Above ₹2.5 Lakhs'],
      propertySubType: ['Interventional Cardiology', 'Spine Surgery', 'Joint Replacement', 'Dialysis Care', 'Dermatology'],
      leadSource: ['Hospital Walk-in', 'Doctor Referral', 'Website Appointment', 'Practo', 'Emergency Helpline', 'Health Camp'],
      location: ['Main Hospital Building', 'South Wing Clinic', 'East Care Unit', 'West Triage Center'],
    };
  }

  if (norm === 'temp0004' || norm.includes('edu') || norm.includes('school') || norm.includes('college') || norm.includes('admission')) {
    return {
      leadType: ['Domestic Applicant', 'International Student', 'Transfer Student', 'Corporate Sponsored'],
      projectName: ['B.Tech Computer Science', 'MBA Finance & Marketing', 'BBA International Business', 'Data Science Diploma', 'B.Des Design'],
      project: ['B.Tech Computer Science', 'MBA Finance & Marketing', 'BBA International Business', 'Data Science Diploma', 'B.Des Design'],
      propertyType: ['Undergraduate Degree', 'Postgraduate Master', 'Executive Certification', 'Distance Learning', 'PhD Doctorate'],
      propertyStage: ['Application Submitted', 'Counseling Call Scheduled', 'Entrance Exam Cleared', 'Seat Reserved', 'Enrolled'],
      budget: ['Under ₹1 Lakh/yr', '₹1 Lakh - ₹2.5 Lakhs/yr', '₹2.5 Lakhs - ₹5 Lakhs/yr', 'Above ₹5 Lakhs/yr'],
      propertySubType: ['Full-Time Campus', 'Weekend Hybrid', 'Online Flexible', 'Residential Campus'],
      leadSource: ['College Website', 'Education Fair', 'Shiksha.com', 'Facebook Ads', 'Google Search', 'Alumni Referral', 'Campus Walk-in'],
      location: ['Main Campus', 'North Satellite Center', 'Downtown Study Wing', 'Online Virtual Portal'],
    };
  }

  if (norm === 'temp0005' || norm.includes('fin') || norm.includes('wealth') || norm.includes('invest') || norm.includes('bank')) {
    return {
      leadType: ['Individual Investor', 'Corporate Client', 'Institutional Fund', 'NRI Client'],
      projectName: ['Wealth Management Portfolio', 'Mutual Funds Growth', 'Equity Advisory', 'Fixed Income Bonds', 'Real Estate REITs'],
      project: ['Wealth Management Portfolio', 'Mutual Funds Growth', 'Equity Advisory', 'Fixed Income Bonds', 'Real Estate REITs'],
      propertyType: ['High Net Worth (HNI)', 'Retail Investor', 'Corporate Treasury', 'Family Office'],
      propertyStage: ['Risk Profiling', 'KYC Verification', 'Portfolio Proposal', 'Fund Allocated', 'Review Period'],
      budget: ['₹5 Lakhs - ₹25 Lakhs', '₹25 Lakhs - ₹1 Crore', '₹1 Crore - ₹5 Crores', 'Above ₹5 Crores'],
      propertySubType: ['Diversified Equity', 'Balanced Hybrid', 'Debt & Liquid', 'Global Offshore'],
      leadSource: ['Bank Branch Referral', 'Financial Seminar', 'Google Ads', 'Advisor Network', 'Website Inquiry'],
      location: ['Financial District Hub', 'Central Wealth Office', 'Regional Branch'],
    };
  }

  if (norm === 'temp0006' || norm.includes('it') || norm.includes('software') || norm.includes('tech') || norm.includes('saas')) {
    return {
      leadType: ['Inbound Lead', 'Outbound Prospect', 'Channel Partner', 'Enterprise RFP'],
      projectName: ['Custom Cloud Migration', 'Full-Stack Web App', 'AI & ML Analytics Platform', 'Cybersecurity Audit', 'Mobile App Development'],
      project: ['Custom Cloud Migration', 'Full-Stack Web App', 'AI & ML Analytics Platform', 'Cybersecurity Audit', 'Mobile App Development'],
      propertyType: ['Enterprise Retainer', 'Fixed-Scope Project', 'Staff Augmentation', 'Consulting & POC'],
      propertyStage: ['Discovery Call', 'RFP Technical Scope', 'Proposal Submitted', 'Security Review', 'Contract Signed'],
      budget: ['$5,000 - $20,000', '$20,000 - $50,000', '$50,000 - $100,000', 'Above $100,000'],
      propertySubType: ['AWS & Kubernetes', 'React & Node.js', 'Python & PyTorch', 'Flutter Mobile App'],
      leadSource: ['Clutch.co', 'LinkedIn Outreach', 'Organic SEO', 'Partner Agency', 'Direct Referral'],
      location: ['Headquarters (Remote)', 'On-Site Client Office', 'Offshore Dev Center'],
    };
  }

  // Default: Real Estate (temp0001, real_estate, property)
  return {
    leadType: ['Data', 'Leads', 'Direct Buyer', 'Channel Partner Referral'],
    projectName: ['Test', 'Prestige Highline', 'Skyline Residency', 'Greenwood Park', 'Urban Oasis'],
    project: ['Test', 'Prestige Highline', 'Skyline Residency', 'Greenwood Park', 'Urban Oasis'],
    propertyType: [
      'Residential Properties',
      'Commercial Properties',
      'Investment Properties',
      'Land',
      'Special Purpose Properties',
      'Government Properties',
    ],
    propertySubType: [
      'Apartment',
      'Villa / Independent House',
      'Plot / Land',
      'Penthouse',
      'Studio Apartment',
      'Builder Floor',
      'Commercial Office',
      'Retail Shop',
      'Warehouse / Godown',
      'Industrial Plot',
    ],
    propertyStage: [
      'Pre Launch',
      'Under Construction',
      'Ready To Move',
      'Resale',
      'Completed',
    ],
    budget: [
      'Under ₹25 Lakhs',
      '₹25 Lakhs - ₹50 Lakhs',
      '₹50 Lakhs - ₹75 Lakhs',
      '₹75 Lakhs - ₹1 Crore',
      '₹1 Crore - ₹1.5 Crore',
      '₹1.5 Crore - ₹2.5 Crore',
      '₹2.5 Crore - ₹5 Crore',
      'Above ₹5 Crore',
    ],
    location: [
      'Noida',
      'Greater Noida',
      'Delhi',
      'Gurgaon',
      'Ghaziabad',
      'Faridabad',
      'Mumbai',
      'Pune',
      'Bangalore',
      'Hyderabad',
    ],
    leadSource: [
      'Sulekha',
      'Self Generated',
      'OLX',
      'Makaan.com',
      'Magicbricks',
      'LinkedIn Ads',
      'Facebook Ads',
      'Google Ads',
      '99acres',
      'Housing.com',
      'Walk-in',
      'Referral',
    ],
  };
}

export const LeadFormScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const semantics = getIndustrySemantics(user?.industryId);
  const dynamicOptionMap = useMemo(() => getDynamicDefaultOptions(user?.industryId), [user?.industryId]);

  const [dynamicFields, setDynamicFields] = useState<DynamicFormField[]>([]);
  const [apiOptions, setApiOptions] = useState<Record<string, string[]>>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({
    contactCountryCode: '+91',
    alternateCountryCode: '+91',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    fieldKey: string;
    fieldLabel: string;
    options: string[];
  }>({
    visible: false,
    fieldKey: '',
    fieldLabel: '',
    options: [],
  });
  const [pickerSearch, setPickerSearch] = useState('');
  const [countryPickerTarget, setCountryPickerTarget] = useState<
    'contactCountryCode' | 'alternateCountryCode' | null
  >(null);
  const [datePickerField, setDatePickerField] = useState<{
    key: string;
    label: string;
    includeTime?: boolean;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSchema = async () => {
      try {
        setLoadingConfig(true);
        const finalIndustry = user?.industryId || 'temp0001';
        const finalRole = user?.role || 'admin';
        const finalOrg = user?.organizationId;

        const res = await apiClient.post('/screens/resolve', {
          screenKey: 'contacts',
          industryCode: finalIndustry,
          industry_code: finalIndustry,
          roleKey: finalRole,
          role_key: finalRole,
          organizationId: finalOrg,
          organization_id: finalOrg,
        });

        if (!isMounted) return;
        const rawFields: any[] = res.data?.form_fields || res.data?.formFields || [];

        if (Array.isArray(rawFields) && rawFields.length > 0) {
          const parsed: DynamicFormField[] = rawFields.map((f: any, idx: number) => ({
            key: f.key || f.field_key || f.fieldKey || `field_${idx}`,
            label: f.label || f.name || f.key || 'Field',
            type: (f.type || f.field_type || 'text').toLowerCase(),
            required: !!(f.required || f.isRequired || f.is_required),
            options: Array.isArray(f.options)
              ? f.options.map((o: any) => (typeof o === 'string' ? o : o.label || o.value || String(o)))
              : [],
            placeholder: f.placeholder,
            order: f.order ?? idx,
            dropdown_source: f.dropdown_source || f.dropdownSource,
            dropdown_api: f.dropdown_api || f.dropdownApi,
          }));
          setDynamicFields(parsed);

          const initial: Record<string, string> = {
            contactCountryCode: '+91',
            alternateCountryCode: '+91',
          };
          parsed.forEach((f) => {
            initial[f.key] = '';
          });
          setFormValues((prev) => ({ ...initial, ...prev }));
        } else {
          setDynamicFields(getDefaultDynamicFields(semantics, user?.industryId));
        }
      } catch (err) {
        console.warn('Failed to resolve dynamic form schema, using industry template:', err);
        if (isMounted) setDynamicFields(getDefaultDynamicFields(semantics, user?.industryId));
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    fetchSchema();
    return () => { isMounted = false; };
  }, [user?.industryId, user?.role, user?.organizationId]);

  // 2) Lazy load API dropdowns with dynamic multi-tenant headers
  useEffect(() => {
    let isMounted = true;
    const fetchApiOptions = async () => {
      try {
        const orgParam = user?.organizationId ? `?organizationId=${encodeURIComponent(user.organizationId)}` : '';
        const indParam = user?.industryId ? `&industryId=${encodeURIComponent(user.industryId)}` : '';
        const querySuffix = `${orgParam}${orgParam ? indParam : indParam ? `?${indParam.substring(1)}` : ''}`;

        const endpoints = [
          { key: 'projectName', url: `options/projectName${querySuffix}` },
          { key: 'projectName', url: `options/resourceProjects?display=projectName${indParam}` },
          { key: 'projectName', url: `projects${querySuffix}` },
          { key: 'location', url: `options/location${querySuffix}` },
          { key: 'location', url: `options/resourceLocations?display=locationName${indParam}` },
          { key: 'propertyType', url: `options/propertyType${querySuffix}` },
          { key: 'propertyType', url: `options/resourcePropertyTypes?display=propertyType${indParam}` },
          { key: 'propertyStage', url: `options/propertyStage${querySuffix}` },
          { key: 'propertyStage', url: `options/resourcePropertyStages?display=stage${indParam}` },
          { key: 'propertySubType', url: `options/propertySubType${querySuffix}` },
          { key: 'budget', url: `options/budget${querySuffix}` },
          { key: 'budget', url: `options/resourceBudgets?display=budget${indParam}` },
          { key: 'leadSource', url: `options/source${querySuffix}` },
          { key: 'leadSource', url: `options/resourceLeadSources?display=leadSource${indParam}` },
          { key: 'contactOwnerEmail', url: `options/organizationUsers${querySuffix}` },
          { key: 'contactOwnerEmail', url: `users${querySuffix}` },
        ];

        // Also add any dynamic dropdown_api URLs from dynamicFields
        dynamicFields.forEach((f) => {
          if (f.dropdown_api) {
            const clean = f.dropdown_api.replace(/^\/+/, '').replace(/^api\//, '');
            endpoints.push({ key: f.key, url: clean });
          }
        });

        const loaded: Record<string, string[]> = {};

        await Promise.allSettled(
          endpoints.map(async ({ key, url }) => {
            try {
              const res = await apiClient.get(url);
              const raw = res.data?.items || res.data;
              const list = Array.isArray(raw) ? raw : [];
              const stringOpts = list
                .map((item: any) => {
                  if (item && typeof item === 'object') {
                    return String(
                      item.label ||
                      item.name ||
                      item.projectName ||
                      item.locationName ||
                      item.propertyType ||
                      item.stage ||
                      item.budget ||
                      item.leadSource ||
                      item.value ||
                      (item.email ? `${item.name ? `${item.name} (${item.email})` : item.email}` : '') ||
                      ''
                    );
                  }
                  return String(item);
                })
                .filter(Boolean);

              if (stringOpts.length > 0) {
                if (!loaded[key]) loaded[key] = [];
                stringOpts.forEach((opt) => {
                  if (!loaded[key].includes(opt)) {
                    loaded[key].push(opt);
                  }
                });
              }
            } catch (err) {
              // ignore individual endpoint failure
            }
          })
        );

        if (isMounted && Object.keys(loaded).length > 0) {
          setApiOptions((prev) => ({ ...prev, ...loaded }));
        }
      } catch (e) {
        console.warn('Failed to load dynamic API options:', e);
      }
    };

    fetchApiOptions();
    return () => {
      isMounted = false;
    };
  }, [user?.organizationId, dynamicFields]);

  const handleValueChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const getOptionsForField = (field: DynamicFormField): string[] => {
    if (apiOptions[field.key] && apiOptions[field.key].length > 0) {
      return apiOptions[field.key];
    }
    const camel = field.key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (apiOptions[camel] && apiOptions[camel].length > 0) {
      return apiOptions[camel];
    }
    if (field.options && field.options.length > 0) {
      return field.options;
    }
    if (dynamicOptionMap[camel]) {
      return dynamicOptionMap[camel];
    }
    if (dynamicOptionMap[field.key]) {
      return dynamicOptionMap[field.key];
    }
    return ['Option 1', 'Option 2', 'Option 3'];
  };

  const isFieldDropdown = (field: DynamicFormField): boolean => {
    if (field.type === 'select') return true;
    if (field.options && field.options.length > 0) return true;
    if (apiOptions[field.key] && apiOptions[field.key].length > 0) return true;
    const camel = field.key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    return !!dynamicOptionMap[camel] || !!dynamicOptionMap[field.key];
  };

  const openDropdownPicker = (field: DynamicFormField) => {
    const opts = getOptionsForField(field);
    setPickerSearch('');
    setPickerModal({ visible: true, fieldKey: field.key, fieldLabel: field.label, options: opts });
  };

  const filteredPickerOptions = useMemo(() => {
    if (!pickerSearch.trim()) return pickerModal.options;
    const query = pickerSearch.toLowerCase();
    return pickerModal.options.filter((o) => o.toLowerCase().includes(query));
  }, [pickerModal.options, pickerSearch]);

  const handleSubmit = async () => {
    for (const field of dynamicFields) {
      if (field.required) {
        const val = formValues[field.key];
        if (!val || !val.trim()) {
          Alert.alert('Required Field', `Please provide ${field.label}.`);
          return;
        }
      }
    }

    const name = formValues.customerName || formValues.customer_name || formValues.name || '';
    const phone = formValues.contactNumber || formValues.contact_number || formValues.phone || '';
    const email = formValues.emailId || formValues.email_id || formValues.email || '';
    const project = formValues.projectName || formValues.project_name || formValues.project || '';
    const source = formValues.leadSource || formValues.lead_source || formValues.source || 'Direct';

    if (!name.trim()) {
      Alert.alert('Required Field', `Please enter ${semantics.leadEntitySingular} Name.`);
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter Contact Number.');
      return;
    }

    try {
      setSubmitting(true);
      const fullPhone = formValues.contactCountryCode ? `${formValues.contactCountryCode} ${phone.trim()}` : phone.trim();
      const fullAltPhone = formValues.alternateNumber && formValues.alternateCountryCode ? `${formValues.alternateCountryCode} ${formValues.alternateNumber.trim()}` : (formValues.alternateNumber || formValues.alternateNo || '');

      const payload = {
        ...formValues,
        name: name.trim(),
        phone: fullPhone,
        alternateNo: fullAltPhone,
        email: email.trim(),
        project: project.trim(),
        source: source,
        status: 'FRESH',
        stage: 'FRESH',
        organizationId: user?.organizationId,
        organization_id: user?.organizationId,
        industryId: user?.industryId,
        industry_id: user?.industryId,
      };

      await leadService.createLead(payload as any);

      Alert.alert(
        `${semantics.leadEntitySingular} Registered!`,
        `New ${semantics.leadEntitySingular.toLowerCase()} prospect registered successfully.`,
        [{ text: 'View Pipeline', onPress: () => navigation.navigate('Leads') }]
      );
    } catch (err: any) {
      console.error('Failed to create lead:', err);
      Alert.alert('Error', err.message || 'Unable to register prospect.');
    } finally {
      setSubmitting(false);
    }
  };

  const contactFields = dynamicFields.filter((f) => {
    const k = f.key.toLowerCase();
    return k.includes('name') || k.includes('customer') || k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('alternate') || k.includes('email') || k.includes('owner');
  });

  const requirementFields = dynamicFields.filter((f) => {
    const k = f.key.toLowerCase();
    const isContact = k.includes('name') || k.includes('customer') || k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('alternate') || k.includes('email') || k.includes('owner');
    const isSourceOrNotes = k.includes('source') || k.includes('adset') || k.includes('ad_set') || k.includes('campaign') || k.includes('note') || k.includes('remark');
    return !isContact && !isSourceOrNotes;
  });

  const sourceAndCampaignFields = dynamicFields.filter((f) => {
    const k = f.key.toLowerCase();
    return k.includes('source') || k.includes('adset') || k.includes('ad_set') || k.includes('campaign');
  });

  const notesAndOtherFields = dynamicFields.filter((f) => {
    const k = f.key.toLowerCase();
    return k.includes('note') || k.includes('remark') || (!contactFields.some((c) => c.key === f.key) && !requirementFields.some((r) => r.key === f.key) && !sourceAndCampaignFields.some((s) => s.key === f.key));
  });

  const renderFieldInput = (field: DynamicFormField) => {
    const val = formValues[field.key] || '';
    const isFocused = focusedField === field.key;
    const isDropdown = isFieldDropdown(field);
    const isPhone = field.type === 'phone' || field.key.toLowerCase().includes('phone') || field.key.toLowerCase().includes('mobile') || field.key.toLowerCase().includes('contactnumber') || field.key.toLowerCase().includes('alternatenumber');
    const isAlternatePhone = field.key.toLowerCase().includes('alternate') || field.key.toLowerCase().includes('alt');
    const isEmail = field.type === 'email' || field.key.toLowerCase().includes('email');
    const isTextarea = field.type === 'textarea' || field.key.toLowerCase().includes('note');

    if (isTextarea) {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{field.label.toUpperCase()} {field.required ? <Text style={styles.requiredAsterisk}>*</Text> : null}</Text>
          <View style={[styles.inputBox, styles.textareaBox, isFocused && styles.inputBoxFocused]}>
            <TextInput style={styles.textareaInput} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} placeholderTextColor="#94A3B8" value={val} onChangeText={(t) => handleValueChange(field.key, t)} multiline numberOfLines={3} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} />
          </View>
        </View>
      );
    }

    if (isDropdown) {
      const selectedOption = val || '';
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{field.label.toUpperCase()} {field.required ? <Text style={styles.requiredAsterisk}>*</Text> : null}</Text>
          <TouchableOpacity style={[styles.inputBox, styles.dropdownTriggerBox]} onPress={() => openDropdownPicker(field)} activeOpacity={0.8}>
            <Text style={[styles.dropdownTriggerText, !selectedOption && styles.dropdownPlaceholderText]} numberOfLines={1}>{selectedOption || `Select ${field.label}...`}</Text>
            <Ionicons name="chevron-down-sharp" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      );
    }

    if (isPhone && !isEmail) {
      const targetCountryCodeKey = isAlternatePhone ? 'alternateCountryCode' : 'contactCountryCode';
      const countryCode = formValues[targetCountryCodeKey] || '+91';
      const activeCountry = COUNTRY_DIALING_CODES.find((c) => c.code === countryCode) || COUNTRY_DIALING_CODES[0];

      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{field.label.toUpperCase()} {field.required ? <Text style={styles.requiredAsterisk}>*</Text> : null}</Text>
          <View style={styles.phoneInputRow}>
            <TouchableOpacity style={styles.countryCodePill} onPress={() => setCountryPickerTarget(targetCountryCodeKey)} activeOpacity={0.75}>
              <Text style={styles.countryFlagText}>{activeCountry.flag}</Text>
              <Text style={styles.countryCodeText}>{countryCode}</Text>
              <Ionicons name="caret-down-sharp" size={11} color="#64748B" />
            </TouchableOpacity>
            <View style={[styles.inputBox, styles.phoneInputBox, isFocused && styles.inputBoxFocused]}>
              <TextInput style={styles.textInput} placeholder="Enter 10-digit number..." placeholderTextColor="#94A3B8" value={val} onChangeText={(t) => handleValueChange(field.key, t)} keyboardType="phone-pad" onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} />
            </View>
          </View>
        </View>
      );
    }

    const isDate =
      field.type === 'date' ||
      field.type === 'datetime' ||
      field.key.toLowerCase().includes('date') ||
      field.key.toLowerCase().includes('dob');

    if (isDate) {
      const selectedDate = val || '';
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {field.label.toUpperCase()}{' '}
            {field.required ? <Text style={styles.requiredAsterisk}>*</Text> : null}
          </Text>
          <TouchableOpacity
            style={[styles.inputBox, styles.dropdownTriggerBox]}
            onPress={() =>
              setDatePickerField({
                key: field.key,
                label: field.label,
                includeTime:
                  field.type === 'datetime' ||
                  field.key.toLowerCase().includes('time'),
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.datePickerTriggerLeft}>
              <Ionicons name="calendar-sharp" size={16} color="#0284C7" />
              <Text
                style={[
                  styles.dropdownTriggerText,
                  !selectedDate && styles.dropdownPlaceholderText,
                ]}
                numberOfLines={1}
              >
                {selectedDate || `Select ${field.label}...`}
              </Text>
            </View>
            <Ionicons name="chevron-down-sharp" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{field.label.toUpperCase()} {field.required ? <Text style={styles.requiredAsterisk}>*</Text> : null}</Text>
        <View style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
          <TextInput style={styles.textInput} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} placeholderTextColor="#94A3B8" value={val} onChangeText={(t) => handleValueChange(field.key, t)} keyboardType={isEmail ? 'email-address' : 'default'} autoCapitalize={isEmail ? 'none' : 'sentences'} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />
      <View style={styles.luxuryHeader}>
        <View style={styles.headerTopRow}>
          <CompanyLogo variant="white" height={28} />
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="chevron-back" size={15} color="#FFFFFF" />
            <Text style={styles.headerBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerBannerBox}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="person-add-sharp" size={15} color="#0284C7" />
            </View>
            <Text style={styles.headerTitleText}>Add New {semantics.leadEntitySingular}</Text>
          </View>
          <View style={styles.headerStatusPill}>
            <View style={styles.headerGreenPulseDot} />
            <Text style={styles.headerStatusPillText}>ENTRY</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flexOne} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {loadingConfig ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#272944" />
              <Text style={styles.loadingText}>Configuring dynamic workspace schema...</Text>
            </View>
          ) : (
            <>
              {contactFields.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}><Ionicons name="person-circle-sharp" size={16} color="#0284C7" /></View>
                    <View>
                      <Text style={styles.sectionTitle}>{semantics.leadEntitySingular.toUpperCase()} CONTACT DETAILS</Text>
                      <Text style={styles.sectionSubtitle}>Primary {semantics.leadEntitySingular.toLowerCase()} & contact profile</Text>
                    </View>
                  </View>
                  {contactFields.map((field) => renderFieldInput(field))}
                </View>
              )}
              {requirementFields.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}><Ionicons name="business-sharp" size={16} color="#D97706" /></View>
                    <View>
                      <Text style={styles.sectionTitle}>REQUIREMENT & SPECIFICATIONS</Text>
                      <Text style={styles.sectionSubtitle}>Interest, criteria, specialty & budget specifications</Text>
                    </View>
                  </View>
                  {requirementFields.map((field) => renderFieldInput(field))}
                </View>
              )}
              {sourceAndCampaignFields.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIconBadge, { backgroundColor: '#ECFDF5' }]}><Ionicons name="flash-sharp" size={16} color="#059669" /></View>
                    <View>
                      <Text style={styles.sectionTitle}>{semantics.leadEntitySingular.toUpperCase()} ATTRIBUTION & CAMPAIGN</Text>
                      <Text style={styles.sectionSubtitle}>Channel attribution and marketing tracking</Text>
                    </View>
                  </View>
                  {sourceAndCampaignFields.map((field) => renderFieldInput(field))}
                </View>
              )}
              {notesAndOtherFields.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIconBadge, { backgroundColor: '#F1F5F9' }]}><Ionicons name="chatbubble-ellipses-sharp" size={16} color="#475569" /></View>
                    <View>
                      <Text style={styles.sectionTitle}>NOTES & REMARKS</Text>
                      <Text style={styles.sectionSubtitle}>Internal team notes and interaction remarks</Text>
                    </View>
                  </View>
                  {notesAndOtherFields.map((field) => renderFieldInput(field))}
                </View>
              )}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.88}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.submitBtnContent}>
                    <Ionicons name="checkmark-circle-sharp" size={20} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Create {semantics.leadEntitySingular}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={pickerModal.visible} animationType="slide" transparent={true} onRequestClose={() => setPickerModal((prev) => ({ ...prev, visible: false }))}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))} />
          <View style={styles.modalBottomSheet}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Select {pickerModal.fieldLabel}</Text><Text style={styles.modalSubtitle}>{filteredPickerOptions.length} options available</Text></View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}><Ionicons name="close" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-sharp" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput style={styles.modalSearchInput} placeholder={`Search ${pickerModal.fieldLabel.toLowerCase()}...`} placeholderTextColor="#94A3B8" value={pickerSearch} onChangeText={setPickerSearch} autoCorrect={false} />
              {pickerSearch ? <TouchableOpacity onPress={() => setPickerSearch('')}><Ionicons name="close-circle" size={16} color="#94A3B8" /></TouchableOpacity> : null}
            </View>
            <FlatList data={filteredPickerOptions} keyExtractor={(item, index) => `${item}_${index}`} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} renderItem={({ item }) => {
              const isSelected = formValues[pickerModal.fieldKey] === item;
              return (
                <TouchableOpacity style={[styles.optionRow, isSelected && styles.optionRowSelected]} onPress={() => { handleValueChange(pickerModal.fieldKey, item); setPickerModal((prev) => ({ ...prev, visible: false })); }} activeOpacity={0.7}>
                  <Text style={[styles.optionRowText, isSelected && styles.optionRowTextSelected]}>{item}</Text>
                  {isSelected ? <Ionicons name="checkmark-circle-sharp" size={18} color="#0284C7" /> : null}
                </TouchableOpacity>
              );
            }} ListEmptyComponent={<View style={styles.emptyOptionsBox}><Text style={styles.emptyOptionsText}>No matching options found.</Text></View>} style={{ maxHeight: 360 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={countryPickerTarget !== null} animationType="slide" transparent={true} onRequestClose={() => setCountryPickerTarget(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCountryPickerTarget(null)} />
          <View style={styles.modalBottomSheet}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Select Country Code</Text><Text style={styles.modalSubtitle}>Choose international dialing code</Text></View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCountryPickerTarget(null)}><Ionicons name="close" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <FlatList data={COUNTRY_DIALING_CODES} keyExtractor={(item) => item.code + item.country} renderItem={({ item }) => {
              const activeCode = countryPickerTarget ? formValues[countryPickerTarget] : '+91';
              const isSelected = activeCode === item.code;
              return (
                <TouchableOpacity style={[styles.optionRow, isSelected && styles.optionRowSelected]} onPress={() => { if (countryPickerTarget) handleValueChange(countryPickerTarget, item.code); setCountryPickerTarget(null); }} activeOpacity={0.7}>
                  <View style={styles.countryOptionLeft}><Text style={styles.countryOptionFlag}>{item.flag}</Text><Text style={styles.countryOptionCountry}>{item.country}</Text></View>
                  <Text style={[styles.countryOptionCode, isSelected && styles.countryOptionCodeSelected]}>{item.code}</Text>
                </TouchableOpacity>
              );
            }} style={{ maxHeight: 360 }} />
          </View>
        </View>
      </Modal>

      {/* ─── Calendar Date Picker Modal ─── */}
      <CalendarDatePickerModal
        visible={datePickerField !== null}
        title={`Select ${datePickerField?.label || 'Date'}`}
        currentValue={datePickerField ? formValues[datePickerField.key] : undefined}
        includeTime={datePickerField?.includeTime}
        onClose={() => setDatePickerField(null)}
        onSelectDate={(formattedDate) => {
          if (datePickerField) {
            handleValueChange(datePickerField.key, formattedDate);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flexOne: { flex: 1 },
  luxuryHeader: { backgroundColor: '#151728', paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8, overflow: 'hidden' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 4 },
  headerBackBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  headerBannerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  headerStatusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5, 150, 105, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 5 },
  headerGreenPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  headerStatusPillText: { color: '#059669', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scrollContent: { padding: 16, paddingBottom: 48, gap: 16 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  sectionIconBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.3 },
  requiredAsterisk: { color: '#EF4444', fontWeight: '900' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 48 },
  inputBoxFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF', shadowColor: '#0284C7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  textInput: { flex: 1, height: 48, color: '#0F172A', fontSize: 14, fontWeight: '600' },
  dropdownTriggerBox: { justifyContent: 'space-between' },
  datePickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownTriggerText: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  dropdownPlaceholderText: { color: '#94A3B8', fontWeight: '400' },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countryCodePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 10, height: 48, gap: 4 },
  countryFlagText: { fontSize: 16 },
  countryCodeText: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  phoneInputBox: { flex: 1 },
  textareaBox: { height: 84, alignItems: 'flex-start', paddingVertical: 10 },
  textareaInput: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '500', textAlignVertical: 'top', minHeight: 64 },
  submitBtn: { backgroundColor: '#272944', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#272944', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6, marginTop: 6 },
  submitBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { fontSize: 15.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  loadingBox: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.65)' },
  modalBackdrop: { flex: 1 },
  modalBottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '80%', shadowColor: '#000000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 42, marginBottom: 12 },
  modalSearchInput: { flex: 1, fontSize: 13.5, color: '#0F172A', fontWeight: '500' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  optionRowSelected: { backgroundColor: '#EFF6FF' },
  optionRowText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  optionRowTextSelected: { color: '#0284C7', fontWeight: '700' },
  emptyOptionsBox: { paddingVertical: 24, alignItems: 'center' },
  emptyOptionsText: { fontSize: 13, color: '#94A3B8' },
  countryOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryOptionFlag: { fontSize: 20 },
  countryOptionCountry: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  countryOptionCode: { fontSize: 13.5, fontWeight: '700', color: '#64748B' },
  countryOptionCodeSelected: { color: '#0284C7' },
});

function getDefaultDynamicFields(semantics: any, industryInput?: string): DynamicFormField[] {
  const norm = String(industryInput || '').toLowerCase().trim().replace(/[\s\-_]+/g, '');

  if (norm === 'temp0003' || norm.includes('health') || norm.includes('medic') || norm.includes('clinic')) {
    return [
      { key: 'customerName', label: 'Patient Name', type: 'text', required: true, options: [], order: 1 },
      { key: 'contactNumber', label: 'Contact Number', type: 'phone', required: true, options: [], order: 2 },
      { key: 'emailId', label: 'Email ID', type: 'email', required: true, options: [], order: 3 },
      { key: 'alternateNumber', label: 'Alternate Number', type: 'phone', required: false, options: [], order: 4 },
      { key: 'contactOwnerEmail', label: 'Attending Doctor Email', type: 'select', required: false, options: [], order: 5 },
      { key: 'leadType', label: 'Patient Category', type: 'select', required: true, options: ['New Patient', 'Follow-up Patient', 'Emergency Triage', 'Insurance Referral'], order: 6 },
      { key: 'projectName', label: 'Clinical Specialty', type: 'select', required: false, options: [], order: 7 },
      { key: 'propertyType', label: 'Clinical Wing / Ward', type: 'select', required: false, options: ['Outpatient OPD', 'Inpatient Ward', 'ICU Critical Care', 'Emergency Trauma', 'Day Care Surgery'], order: 8 },
      { key: 'propertyStage', label: 'Clinical Stage', type: 'select', required: false, options: ['Initial Triage', 'Diagnostic Pending', 'Treatment Scheduled', 'Under Treatment', 'Post-Op Follow-up'], order: 9 },
      { key: 'budget', label: 'Treatment Budget', type: 'select', required: false, options: ['Under ₹10,000', '₹10,000 - ₹50,000', '₹50,000 - ₹1 Lakh', '₹1 Lakh - ₹2.5 Lakhs', 'Above ₹2.5 Lakhs'], order: 10 },
      { key: 'propertySubType', label: 'Specialty Sub Type', type: 'select', required: false, options: ['Interventional Cardiology', 'Spine Surgery', 'Joint Replacement', 'Dialysis Care', 'Dermatology'], order: 11 },
      { key: 'leadSource', label: 'Patient Source', type: 'select', required: false, options: ['Hospital Walk-in', 'Doctor Referral', 'Website Appointment', 'Practo', 'Emergency Helpline', 'Health Camp'], order: 12 },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', required: false, options: [], order: 13 },
    ];
  }

  if (norm === 'temp0004' || norm.includes('edu') || norm.includes('school') || norm.includes('college') || norm.includes('admission')) {
    return [
      { key: 'customerName', label: 'Student Name', type: 'text', required: true, options: [], order: 1 },
      { key: 'contactNumber', label: 'Contact Number', type: 'phone', required: true, options: [], order: 2 },
      { key: 'emailId', label: 'Email ID', type: 'email', required: true, options: [], order: 3 },
      { key: 'alternateNumber', label: 'Alternate Number', type: 'phone', required: false, options: [], order: 4 },
      { key: 'contactOwnerEmail', label: 'Academic Counselor Email', type: 'select', required: false, options: [], order: 5 },
      { key: 'leadType', label: 'Applicant Type', type: 'select', required: true, options: ['Domestic Applicant', 'International Student', 'Transfer Student', 'Corporate Sponsored'], order: 6 },
      { key: 'projectName', label: 'Course / Program', type: 'select', required: false, options: [], order: 7 },
      { key: 'propertyType', label: 'Program Category', type: 'select', required: false, options: ['Undergraduate Degree', 'Postgraduate Master', 'Executive Certification', 'Distance Learning', 'PhD Doctorate'], order: 8 },
      { key: 'propertyStage', label: 'Admission Semester', type: 'select', required: false, options: ['Application Submitted', 'Counseling Call Scheduled', 'Entrance Exam Cleared', 'Seat Reserved', 'Enrolled'], order: 9 },
      { key: 'budget', label: 'Fee Budget', type: 'select', required: false, options: ['Under ₹1 Lakh/yr', '₹1 Lakh - ₹2.5 Lakhs/yr', '₹2.5 Lakhs - ₹5 Lakhs/yr', 'Above ₹5 Lakhs/yr'], order: 10 },
      { key: 'propertySubType', label: 'Program Mode', type: 'select', required: false, options: ['Full-Time Campus', 'Weekend Hybrid', 'Online Flexible', 'Residential Campus'], order: 11 },
      { key: 'leadSource', label: 'Inquiry Source', type: 'select', required: false, options: ['College Website', 'Education Fair', 'Shiksha.com', 'Facebook Ads', 'Google Search', 'Alumni Referral', 'Campus Walk-in'], order: 12 },
      { key: 'notes', label: 'Admission Notes', type: 'textarea', required: false, options: [], order: 13 },
    ];
  }

  // Default: Real Estate / Universal Schema
  return [
    { key: 'customerName', label: `${semantics.leadEntitySingular} Name`, type: 'text', required: true, options: [], order: 1 },
    { key: 'contactNumber', label: 'Contact Number', type: 'phone', required: true, options: [], order: 2 },
    { key: 'emailId', label: 'Email ID', type: 'email', required: true, options: [], order: 3 },
    { key: 'alternateNumber', label: 'Alternate Number', type: 'phone', required: false, options: [], order: 4 },
    { key: 'leadType', label: 'Lead Type', type: 'select', required: true, options: ['Data', 'Leads'], order: 5 },
    { key: 'location', label: 'Location', type: 'select', required: false, options: ['Noida', 'Greater Noida', 'Delhi', 'Gurgaon', 'Ghaziabad', 'Faridabad', 'Mumbai', 'Pune', 'Bangalore', 'Hyderabad'], order: 6 },
    { key: 'projectName', label: 'Project Name', type: 'select', required: false, options: [], order: 7 },
    { key: 'propertyType', label: 'Property Type', type: 'select', required: false, options: ['Residential Properties', 'Commercial Properties', 'Investment Properties', 'Land', 'Special Purpose Properties', 'Government Properties'], order: 8 },
    { key: 'propertyStage', label: 'Property Stage', type: 'select', required: false, options: ['Pre Launch', 'Under Construction', 'Ready To Move', 'Resale', 'Completed'], order: 9 },
    { key: 'budget', label: 'Budget', type: 'select', required: false, options: ['Under ₹25 Lakhs', '₹25 Lakhs - ₹50 Lakhs', '₹50 Lakhs - ₹75 Lakhs', '₹75 Lakhs - ₹1 Crore', '₹1 Crore - ₹1.5 Crore', '₹1.5 Crore - ₹2.5 Crore', '₹2.5 Crore - ₹5 Crore', 'Above ₹5 Crore'], order: 10 },
    { key: 'propertySubType', label: 'Property Sub Type', type: 'select', required: false, options: ['Apartment', 'Villa / Independent House', 'Plot / Land', 'Penthouse', 'Studio Apartment', 'Builder Floor', 'Commercial Office', 'Retail Shop', 'Warehouse / Godown', 'Industrial Plot'], order: 11 },
    { key: 'leadSource', label: 'Lead Source', type: 'select', required: false, options: ['Sulekha', 'Self Generated', 'OLX', 'Makaan.com', 'Magicbricks', 'LinkedIn Ads', 'Facebook Ads', 'Google Ads', '99acres', 'Housing.com', 'Walk-in', 'Referral'], order: 12 },
    { key: 'contactOwnerEmail', label: 'Contact Owner Email', type: 'select', required: false, options: [], order: 13 },
    { key: 'adSet', label: 'Ad Set', type: 'text', required: false, options: [], order: 14 },
    { key: 'campaign', label: 'Campaign', type: 'text', required: false, options: [], order: 15 },
    { key: 'notes', label: 'Notes', type: 'textarea', required: false, options: [], order: 16 },
  ];
}
