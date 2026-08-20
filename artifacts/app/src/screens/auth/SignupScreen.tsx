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
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { InfoGuideBadge } from '../../components/ui/InfoGuideBadge';
import { theme } from '../../theme/theme';

export interface IndustryOption {
  code: string;
  name: string;
}

export interface DynamicFormField {
  key: string;
  label: string;
  type: string;
  isRequired?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
  readOnly?: boolean;
}

const COUNTRY_DIALING_CODES = [
  { code: '+91', flag: '🇮🇳', label: '🇮🇳 India (+91)' },
  { code: '+1', flag: '🇺🇸', label: '🇺🇸 United States (+1)' },
  { code: '+44', flag: '🇬🇧', label: '🇬🇧 United Kingdom (+44)' },
  { code: '+971', flag: '🇦🇪', label: '🇦🇪 United Arab Emirates (+971)' },
  { code: '+61', flag: '🇦🇺', label: '🇦🇺 Australia (+61)' },
  { code: '+1', flag: '🇨🇦', label: '🇨🇦 Canada (+1)' },
  { code: '+65', flag: '🇸🇬', label: '🇸🇬 Singapore (+65)' },
  { code: '+966', flag: '🇸🇦', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+49', flag: '🇩🇪', label: '🇩🇪 Germany (+49)' },
  { code: '+33', flag: '🇫🇷', label: '🇫🇷 France (+33)' },
  { code: '+81', flag: '🇯🇵', label: '🇯🇵 Japan (+81)' },
];

const COUNTRY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
];

const STATE_OPTIONS = [
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Delhi NCR', label: 'Delhi NCR' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Kerala', label: 'Kerala' },
];

const EMPLOYEE_COUNT_OPTIONS = [
  { value: '1-10', label: '1-10 Employees' },
  { value: '11-50', label: '11-50 Employees' },
  { value: '51-200', label: '51-200 Employees' },
  { value: '201-500', label: '201-500 Employees' },
  { value: '500+', label: '500+ Employees' },
];

export const SignupScreen = ({ navigation }: any) => {
  const { logout } = useAuth();

  // Step 1: Industry Selection
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);

  // Mandatory Subdomain Input State
  const [subdomainSlug, setSubdomainSlug] = useState<string>('');

  // Dialing Code & Dropdown State
  const [dialCode, setDialCode] = useState('+91');
  const [showDialCodePicker, setShowDialCodePicker] = useState(false);

  // Step 2: Dynamic Resolved Fields
  const [resolvedFields, setResolvedFields] = useState<DynamicFormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);

  // Form Field Values State
  const [formValues, setFormValues] = useState<Record<string, string>>({
    organizationName: '',
    subdomain: '',
    firstName: '',
    lastName: '',
    contactNo: '',
    emailId: '',
    country: 'India',
    state: 'Haryana',
    city: 'Gurugram',
    pincode: '122002',
    industryId: '',
    numberOfEmployees: '11-50',
    address: '',
    password: '',
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate subdomain slug from Organization Name
  const handleOrgNameChange = (val: string) => {
    handleValueChange('organizationName', val);
    if (!subdomainSlug) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      setSubdomainSlug(slug);
      handleValueChange('subdomain', slug);
    }
  };

  const handleSubdomainChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setSubdomainSlug(clean);
    handleValueChange('subdomain', clean);
  };

  // Load Industries on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingIndustries(true);

    apiClient
      .get('/industries')
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.items || res.data || [];
        const formatted: IndustryOption[] = list.map((item: any) => ({
          code: item.code || item.key || item._id || item.id || item.name.toLowerCase().replace(/\s+/g, '_'),
          name: item.name || item.title || item.code || 'Real Estate',
        }));

        if (formatted.length === 0) {
          formatted.push(
            { code: 'real_estate', name: 'Real Estate & Property Development' },
            { code: 'auto_dealership', name: 'Auto Sales Outlet & Dealership' },
            { code: 'auto_service', name: 'Auto Service Center & Repair' },
            { code: 'it_saas', name: 'IT Services & SaaS Enterprise' },
            { code: 'manufacturing', name: 'Manufacturing & Industrial' }
          );
        }

        setIndustries(formatted);
        setLoadingIndustries(false);
      })
      .catch((err) => {
        console.warn('Failed to load industries from API, using fallback:', err);
        if (!isMounted) return;
        setIndustries([
          { code: 'real_estate', name: 'Real Estate & Property Development' },
          { code: 'auto_dealership', name: 'Auto Sales Outlet & Dealership' },
          { code: 'auto_service', name: 'Auto Service Center & Repair' },
          { code: 'it_saas', name: 'IT Services & SaaS Enterprise' },
          { code: 'manufacturing', name: 'Manufacturing & Industrial' }
        ]);
        setLoadingIndustries(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Resolve Dynamic Screen Fields for Industry
  useEffect(() => {
    if (!selectedIndustry) {
      setResolvedFields([]);
      return;
    }

    setLoadingFields(true);
    setErrorMessage(null);

    const indName = industries.find((i) => i.code === selectedIndustry)?.name || selectedIndustry;
    setFormValues((prev) => ({ ...prev, industryId: indName }));

    apiClient
      .post('/screens/resolve', {
        screenKey: 'organization',
        industryCode: selectedIndustry,
        roleKey: 'admin',
      })
      .then((res) => {
        const rawFields = res.data?.formFields || res.data?.form_fields || res.data?.fields || [];
        if (Array.isArray(rawFields) && rawFields.length > 0) {
          const mapped: DynamicFormField[] = rawFields
            .filter((f: any) => {
              const k = f.key || f.fieldKey || f.field_key;
              return k !== 'costPerLicense' && k !== 'validTill' && k !== 'cost_per_license' && k !== 'valid_till';
            })
            .map((f: any) => {
              const k = f.key || f.fieldKey || f.field_key;
              let opts = f.options ? f.options.map((o: any) => (typeof o === 'string' ? { value: o, label: o } : o)) : [];
              
              if (k === 'country' && opts.length === 0) opts = COUNTRY_OPTIONS;
              if (k === 'state' && opts.length === 0) opts = STATE_OPTIONS;
              if ((k === 'numberOfEmployees' || k === 'number_of_employees') && opts.length === 0) opts = EMPLOYEE_COUNT_OPTIONS;

              return {
                key: k,
                label: f.label || f.name || f.key,
                type: (k === 'country' || k === 'state' || k.includes('employee')) ? 'select' : (f.type || 'text'),
                isRequired: f.isRequired ?? f.is_required ?? true,
                options: opts,
              };
            });
          setResolvedFields(mapped.length > 0 ? mapped : getWebExactOrganizationFields(indName));
        } else {
          setResolvedFields(getWebExactOrganizationFields(indName));
        }
        setLoadingFields(false);
      })
      .catch((err) => {
        console.warn('Failed to resolve screen fields, using Web Exact fields:', err);
        setResolvedFields(getWebExactOrganizationFields(indName));
        setLoadingFields(false);
      });
  }, [selectedIndustry]);

  const getWebExactOrganizationFields = (industryName: string): DynamicFormField[] => [
    { key: 'organizationName', label: 'Organization Name', type: 'text', isRequired: true },
    { key: 'firstName', label: 'First Name', type: 'text', isRequired: true },
    { key: 'lastName', label: 'Last Name', type: 'text', isRequired: true },
    { key: 'contactNo', label: 'Contact Number', type: 'phone', isRequired: true },
    { key: 'emailId', label: 'Email ID', type: 'email', isRequired: true },
    { key: 'country', label: 'Country', type: 'select', isRequired: true, options: COUNTRY_OPTIONS },
    { key: 'state', label: 'State', type: 'select', isRequired: true, options: STATE_OPTIONS },
    { key: 'city', label: 'City', type: 'text', isRequired: true },
    { key: 'pincode', label: 'Pincode', type: 'text', isRequired: true },
    { key: 'industryId', label: 'Industry ID', type: 'text', isRequired: true, readOnly: true, defaultValue: industryName },
    { key: 'numberOfEmployees', label: 'Number of Employees', type: 'select', isRequired: true, options: EMPLOYEE_COUNT_OPTIONS },
    { key: 'address', label: 'Address', type: 'textarea', isRequired: true },
    { key: 'password', label: 'Password', type: 'password', isRequired: true },
  ];

  const handleValueChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSelectIndustry = (ind: IndustryOption) => {
    setSelectedIndustry(ind.code);
    setShowIndustryDropdown(false);
    setErrorMessage(null);
  };

  const handleSignupSubmit = async () => {
    setErrorMessage(null);

    if (!selectedIndustry) {
      setErrorMessage('Select your industry vertical to get started.');
      return;
    }

    const orgName = formValues.organizationName || formValues.organization_name || '';
    const subSlug = subdomainSlug.trim();
    const firstName = formValues.firstName || formValues.first_name || '';
    const email = formValues.emailId || formValues.email_id || formValues.email || '';
    const pwd = formValues.password || '';
    const contact = formValues.contactNo || formValues.contact_no || '';

    if (!orgName.trim()) {
      setErrorMessage('Please enter Organization Name.');
      return;
    }
    if (!subSlug || subSlug.length < 3) {
      setErrorMessage('Mandatory Workspace Subdomain is required (min 3 characters).');
      return;
    }
    if (!firstName.trim()) {
      setErrorMessage('Please enter First Name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid Email ID.');
      return;
    }

    try {
      setSubmitting(true);
      const fullContactPhone = `${dialCode} ${contact.trim()}`.trim();

      const payload = {
        fields: {
          ...formValues,
          organizationName: orgName.trim(),
          organization_name: orgName.trim(),
          subdomain: subSlug,
          subdomainUrl: `https://${subSlug}.leadsrubix.com`,
          firstName: firstName.trim(),
          first_name: firstName.trim(),
          lastName: (formValues.lastName || '').trim(),
          last_name: (formValues.lastName || '').trim(),
          contactNo: fullContactPhone,
          contact_no: fullContactPhone,
          emailId: email.trim().toLowerCase(),
          email_id: email.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          industryId: selectedIndustry,
          industry_id: selectedIndustry,
          country: formValues.country || 'India',
          state: formValues.state || 'Haryana',
          city: formValues.city || 'Gurugram',
          pincode: formValues.pincode || '122002',
          numberOfEmployees: formValues.numberOfEmployees || '11-50',
          number_of_employees: formValues.numberOfEmployees || '11-50',
          address: formValues.address || '',
        },
        password: pwd,
      };

      await apiClient.post('/auth/signup', payload);

      if (logout) {
        await logout();
      }

      Alert.alert(
        'Workspace Registered Successfully!',
        `Your workspace is live at https://${subSlug}.leadsrubix.com. Please sign in to access your sales CRM.`,
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Mobile Signup Error:', err);
      const msg =
        err.response?.data?.message || err.message || 'Unable to create workspace. Please try again.';
      setErrorMessage(msg);
      Alert.alert('Registration Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedIndustryObj = industries.find((i) => i.code === selectedIndustry);

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Solid Executive #272944 Header Banner */}
      <View style={styles.fullBleedHeroHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-sharp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <CompanyLogo variant="white" height={36} />

          <View style={{ width: 34 }} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>ENTERPRISE WORKSPACE REGISTRATION</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Animated AI Mascot Companion */}
          <AIAdvisorMascot
            screenName="Login"
            message={
              selectedIndustry
                ? `Selected ${selectedIndustryObj?.name || selectedIndustry}. Set your mandatory workspace subdomain to complete registration!`
                : 'Select your industry vertical to get started.'
            }
          />

          {/* 3D Framed White Card Container */}
          <View style={styles.framedFormCard3D}>
            {/* Elegant Premium Refined Title & Subtext */}
            <Text style={styles.headingTitle}>Create Account</Text>
            <Text style={styles.headingSubtext}>
              {selectedIndustry
                ? 'Enter your organization & mandatory workspace subdomain details.'
                : 'Select your industry vertical to get started.'}
            </Text>

            {errorMessage && (
              <View style={styles.errorAlertBox}>
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            )}

            {/* STEP 1: Industry Selector */}
            {loadingIndustries ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.colors.brand700} />
                <Text style={styles.loadingText}>Loading industry verticals...</Text>
              </View>
            ) : !selectedIndustry ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>INDUSTRY VERTICAL *</Text>
                <TouchableOpacity
                  style={styles.selectTriggerBox}
                  onPress={() => setShowIndustryDropdown(!showIndustryDropdown)}
                  activeOpacity={0.8}
                >
                  <View style={styles.selectTriggerLeft}>
                    <View style={styles.fieldIconBadge}>
                      <Ionicons name="business" size={16} color={theme.colors.brand700} />
                    </View>
                    <Text style={styles.selectTriggerText}>Select Industry...</Text>
                  </View>
                  <Ionicons
                    name={showIndustryDropdown ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {/* Industry Options Dropdown List with Scroll */}
                {showIndustryDropdown && (
                  <View style={styles.dropdownScrollContainer}>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true}>
                      {industries.map((ind) => (
                        <TouchableOpacity
                          key={ind.code}
                          style={styles.dropdownOptionItem}
                          onPress={() => handleSelectIndustry(ind)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownOptionText}>{ind.name}</Text>
                          <Ionicons name="chevron-forward-sharp" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              /* STEP 2: Selected Industry Header & Dynamic Organization Form */
              <View>
                {/* Selected Industry Bar */}
                <View style={styles.selectedIndustryBar}>
                  <Text style={styles.selectedIndustryLabel}>
                    Industry: <Text style={styles.selectedIndustryValue}>{selectedIndustryObj?.name || selectedIndustry}</Text>
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedIndustry('');
                      setShowIndustryDropdown(false);
                      setErrorMessage(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeBtnText}>Change Industry</Text>
                  </TouchableOpacity>
                </View>

                {loadingFields ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.colors.brand700} />
                    <Text style={styles.loadingText}>Configuring dynamic organization fields...</Text>
                  </View>
                ) : (
                  <View style={styles.dynamicFormGrid}>
                    {/* MANDATORY WORKSPACE SUBDOMAIN FIELD */}
                    <View style={styles.fieldBlock}>
                      <View style={styles.subdomainLabelRow}>
                        <Text style={styles.fieldLabel}>MANDATORY WORKSPACE SUBDOMAIN *</Text>
                        <InfoGuideBadge
                          title="Mandatory Subdomain"
                          description="Your team's dedicated workspace URL (e.g. acme.leadsrubix.com). Every client workspace receives an active subdomain upon registration."
                        />
                      </View>

                      <View style={[styles.subdomainInputBox, focusedField === 'subdomain' && styles.inputBoxFocused]}>
                        <TextInput
                          style={styles.subdomainControl}
                          placeholder="e.g. acme"
                          placeholderTextColor={theme.colors.textDisabled}
                          value={subdomainSlug}
                          onChangeText={handleSubdomainChange}
                          onFocus={() => setFocusedField('subdomain')}
                          onBlur={() => setFocusedField(null)}
                          autoCapitalize="none"
                        />
                        <Text style={styles.subdomainSuffixText}>.leadsrubix.com</Text>
                      </View>

                      {subdomainSlug ? (
                        <Text style={styles.subdomainPreviewText}>
                          Active URL: <Text style={{ fontWeight: '800', color: theme.colors.brand700 }}>https://{subdomainSlug}.leadsrubix.com</Text>
                        </Text>
                      ) : null}
                    </View>

                    {/* Render Dynamic Form Fields */}
                    {resolvedFields.map((field) => {
                      const key = field.key;
                      const val = formValues[key] ?? field.defaultValue ?? '';
                      const isFocused = focusedField === key;
                      const isRequired = field.isRequired;

                      // Override Organization Name change to auto-fill subdomain
                      const onTextChange = (text: string) => {
                        if (key === 'organizationName') {
                          handleOrgNameChange(text);
                        } else {
                          handleValueChange(key, text);
                        }
                      };

                      // 1. Phone Field with Country Code Dialing Selector
                      if (key === 'contactNo' || field.type === 'phone') {
                        return (
                          <View key={key} style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>
                              {field.label.toUpperCase()} {isRequired ? '*' : ''}
                            </Text>

                            <View style={styles.phoneInputRow}>
                              <TouchableOpacity
                                style={styles.dialCodeBtn}
                                onPress={() => setShowDialCodePicker(!showDialCodePicker)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.dialCodeFlag}>
                                  {COUNTRY_DIALING_CODES.find((c) => c.code === dialCode)?.flag || '🇮🇳'}
                                </Text>
                                <Text style={styles.dialCodeText}>{dialCode}</Text>
                                <Ionicons name="chevron-down-sharp" size={14} color="#64748B" />
                              </TouchableOpacity>

                              <View style={[styles.inputBoxFlex, isFocused && styles.inputBoxFocused]}>
                                <TextInput
                                  style={styles.textInputControl}
                                  placeholder="Enter contact number..."
                                  placeholderTextColor={theme.colors.textDisabled}
                                  value={val}
                                  onChangeText={(text) => handleValueChange(key, text)}
                                  onFocus={() => setFocusedField(key)}
                                  onBlur={() => setFocusedField(null)}
                                  keyboardType="phone-pad"
                                />
                              </View>
                            </View>

                            {showDialCodePicker && (
                              <View style={styles.dialCodeScrollContainer}>
                                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true}>
                                  {COUNTRY_DIALING_CODES.map((c, idx) => (
                                    <TouchableOpacity
                                      key={idx}
                                      style={styles.dialCodeOption}
                                      onPress={() => {
                                        setDialCode(c.code);
                                        setShowDialCodePicker(false);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.dialCodeOptionText}>{c.label}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        );
                      }

                      // 2. Select Dropdown Fields
                      if (
                        field.type === 'select' ||
                        key === 'country' ||
                        key === 'state' ||
                        key === 'numberOfEmployees' ||
                        (field.options && field.options.length > 0)
                      ) {
                        const isDropdownOpen = activeDropdownKey === key;
                        let opts = field.options && field.options.length > 0 ? field.options : [];
                        if (key === 'country') opts = COUNTRY_OPTIONS;
                        if (key === 'state') opts = STATE_OPTIONS;
                        if (key === 'numberOfEmployees') opts = EMPLOYEE_COUNT_OPTIONS;

                        return (
                          <View key={key} style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>
                              {field.label.toUpperCase()} {isRequired ? '*' : ''}
                            </Text>

                            <TouchableOpacity
                              style={styles.selectTriggerBox}
                              onPress={() => setActiveDropdownKey(isDropdownOpen ? null : key)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.selectTriggerText}>{val || `Select ${field.label}...`}</Text>
                              <Ionicons
                                name={isDropdownOpen ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                                size={18}
                                color="#64748B"
                              />
                            </TouchableOpacity>

                            {isDropdownOpen && (
                              <View style={styles.dropdownScrollContainer}>
                                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true}>
                                  {opts.map((opt, oIdx) => (
                                    <TouchableOpacity
                                      key={oIdx}
                                      style={styles.dropdownOptionItem}
                                      onPress={() => {
                                        handleValueChange(key, opt.value);
                                        setActiveDropdownKey(null);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.dropdownOptionText}>{opt.label}</Text>
                                      {val === opt.value && (
                                        <Ionicons name="checkmark-sharp" size={16} color="#059669" />
                                      )}
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        );
                      }

                      // 3. Textarea Field
                      if (field.type === 'textarea' || key === 'address') {
                        return (
                          <View key={key} style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>
                              {field.label.toUpperCase()} {isRequired ? '*' : ''}
                            </Text>
                            <View style={styles.textAreaBox}>
                              <TextInput
                                style={styles.textAreaControl}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                placeholderTextColor={theme.colors.textDisabled}
                                value={val}
                                onChangeText={onTextChange}
                                multiline
                                numberOfLines={3}
                              />
                            </View>
                          </View>
                        );
                      }

                      // 4. Password Field
                      if (field.type === 'password' || key === 'password') {
                        return (
                          <View key={key} style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>
                              {field.label.toUpperCase()} {isRequired ? '*' : ''}
                            </Text>
                            <View style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
                              <TextInput
                                style={styles.textInputControl}
                                placeholder="••••••••"
                                placeholderTextColor={theme.colors.textDisabled}
                                value={val}
                                onChangeText={onTextChange}
                                onFocus={() => setFocusedField(key)}
                                onBlur={() => setFocusedField(null)}
                                secureTextEntry={!passwordVisible}
                              />
                              <TouchableOpacity
                                onPress={() => setPasswordVisible(!passwordVisible)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                  size={18}
                                  color="#64748B"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      // 5. Default Text / Email Input
                      return (
                        <View key={key} style={styles.fieldBlock}>
                          <Text style={styles.fieldLabel}>
                            {field.label.toUpperCase()} {isRequired ? '*' : ''}
                          </Text>
                          <View
                            style={[
                              styles.inputBox,
                              isFocused && styles.inputBoxFocused,
                              field.readOnly && styles.inputBoxDisabled,
                            ]}
                          >
                            <TextInput
                              style={styles.textInputControl}
                              placeholder={`${field.label}...`}
                              placeholderTextColor={theme.colors.textDisabled}
                              value={val}
                              onChangeText={onTextChange}
                              onFocus={() => setFocusedField(key)}
                              onBlur={() => setFocusedField(null)}
                              editable={!field.readOnly}
                              keyboardType={key.toLowerCase().includes('email') ? 'email-address' : 'default'}
                              autoCapitalize={key.toLowerCase().includes('email') ? 'none' : 'words'}
                            />
                          </View>
                        </View>
                      );
                    })}

                    {/* Primary Executive #272944 Sign Up Button */}
                    <TouchableOpacity
                      style={styles.primaryCtaButton3D}
                      onPress={handleSignupSubmit}
                      disabled={submitting}
                      activeOpacity={0.88}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={styles.ctaContentRow}>
                          <Text style={styles.ctaButtonText}>Register Workspace</Text>
                          <View style={styles.ctaArrowCircle}>
                            <Ionicons name="arrow-forward-sharp" size={16} color={theme.colors.brand700} />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Footer Navigation Link */}
            <View style={styles.cardFooterDivider}>
              <Text style={styles.existingPrompt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomFooterInfo}>
            <Text style={styles.bottomFooterText}>Leads Rubix CRM • Enterprise v1.4</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  fullBleedHeroHeader: {
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
    overflow: 'hidden',
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
  statusBadgeText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  framedFormCard3D: {
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
  headingTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  headingSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 16,
    fontWeight: '400',
    lineHeight: 18,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.25)',
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedIndustryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedIndustryLabel: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  selectedIndustryValue: {
    color: '#272944',
    fontWeight: '700',
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  dynamicFormGrid: {
    gap: 4,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  subdomainLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  subdomainInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
  },
  subdomainControl: {
    flex: 1,
    height: 50,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  subdomainSuffixText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  subdomainPreviewText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
  },
  inputBoxFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
  },
  inputBoxFocused: {
    borderColor: '#272944',
    borderBottomColor: '#272944',
    backgroundColor: '#FFFFFF',
  },
  inputBoxDisabled: {
    backgroundColor: '#F1F5F9',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
    gap: 4,
  },
  dialCodeFlag: {
    fontSize: 16,
  },
  dialCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dialCodeScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    maxHeight: 220,
    elevation: 4,
    overflow: 'hidden',
  },
  dialCodeOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dialCodeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    height: 50,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIconBadge: {
    marginRight: 8,
  },
  selectTriggerText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  dropdownScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    maxHeight: 220,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  textAreaControl: {
    minHeight: 70,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  textInputControl: {
    flex: 1,
    height: 50,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryCtaButton3D: {
    backgroundColor: theme.colors.brand700,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#16182B',
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 12,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
  cardFooterDivider: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  existingPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLinkText: {
    fontSize: 13,
    color: theme.colors.brand700,
    fontWeight: '700',
  },
  bottomFooterInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  bottomFooterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
