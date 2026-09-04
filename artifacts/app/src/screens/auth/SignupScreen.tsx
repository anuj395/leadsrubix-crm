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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AppVersionFooter } from '../../components/ui/AppVersionFooter';
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

export const SignupScreen = ({ navigation }: any) => {
  const { logout } = useAuth();

  // Step 1: Industry Selection (Only Launched Industries Matching Web CRM)
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);

  // Dialing Code & Dropdown State
  const [dialCode, setDialCode] = useState('+91');
  const [showDialCodePicker, setShowDialCodePicker] = useState(false);

  // Step 2: Dynamic Resolved Fields & Options
  const [resolvedFields, setResolvedFields] = useState<DynamicFormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);

  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>(COUNTRY_OPTIONS);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>(STATE_OPTIONS);

  // Form Field Values State (Matching Web Form Keys - All empty by default, only Industry ID auto-filled)
  const [formValues, setFormValues] = useState<Record<string, string>>({
    organizationName: '',
    firstName: '',
    lastName: '',
    contactNumber: '',
    emailId: '',
    country: '',
    state: '',
    city: '',
    pincode: '',
    industryId: '',
    numEmployees: '',
    address: '',
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIndustryObj = useMemo(
    () => industries.find((i) => i.code === selectedIndustry),
    [industries, selectedIndustry]
  );

  const handleValueChange = (key: string, val: string) => {
    setFormValues((prev) => {
      const next: Record<string, any> = { ...prev, [key]: val };
      if (
        key === 'numEmployees' ||
        key === 'num_employees' ||
        key === 'numberOfEmployees' ||
        key === 'number_of_employees'
      ) {
        next.numEmployees = val;
        next.num_employees = val;
        next.numberOfEmployees = val;
        next.number_of_employees = val;
      }
      return next;
    });
  };

  // Load Launched Industries on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingIndustries(true);

    apiClient
      .get('/industries?active=true')
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.items || res.data || [];
        const formatted: IndustryOption[] = list
          .filter((item: any) => item.status === 'Launched' || (item.is_active === true && item.status !== 'Pre-Launched'))
          .map((item: any) => ({
            code: item.code || item.key || item._id || item.id,
            name: item.name || item.title || item.code,
          }));

        if (formatted.length === 0) {
          formatted.push(
            { code: 'temp0001', name: 'Real Estate' },
            { code: 'temp0003', name: 'Healthcare' },
            { code: 'temp0004', name: 'Education' },
            { code: 'temp0005', name: 'Financial Services' },
            { code: 'temp0006', name: 'IT & Tech Services' },
            { code: 'temp0007', name: 'Manufacturing' }
          );
        }

        setIndustries(formatted);
        setLoadingIndustries(false);
      })
      .catch((err) => {
        console.warn('Failed to load launched industries from API, using fallback:', err);
        if (!isMounted) return;
        setIndustries([
          { code: 'temp0001', name: 'Real Estate' },
          { code: 'temp0003', name: 'Healthcare' },
          { code: 'temp0004', name: 'Education' },
          { code: 'temp0005', name: 'Financial Services' },
          { code: 'temp0006', name: 'IT & Tech Services' },
          { code: 'temp0007', name: 'Manufacturing' },
        ]);
        setLoadingIndustries(false);
      });

    // Fetch Countries Dropdown
    apiClient
      .get('/options/countries')
      .then((res) => {
        const items = res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setCountryOptions(items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Dynamic States when Country changes
  useEffect(() => {
    const country = formValues.country || 'India';
    apiClient
      .get(`/options/states?country=${encodeURIComponent(country)}`)
      .then((res) => {
        const items = res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setStateOptions(items);
        }
      })
      .catch(() => {});
  }, [formValues.country]);

  // Resolve Dynamic Screen Fields for Industry (Exact Parity with Web CRM)
  useEffect(() => {
    if (!selectedIndustry) {
      setResolvedFields([]);
      return;
    }

    setLoadingFields(true);
    setErrorMessage(null);

    const indName = industries.find((i) => i.code === selectedIndustry)?.name || selectedIndustry;
    setFormValues((prev) => ({ ...prev, industryId: selectedIndustry, industry_id: selectedIndustry }));

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
              return (
                k !== 'costPerLicense' &&
                k !== 'validTill' &&
                k !== 'cost_per_license' &&
                k !== 'valid_till' &&
                k !== 'subdomain'
              );
            })
            .map((f: any) => {
              const k = f.key || f.fieldKey || f.field_key;
              let opts = f.options ? f.options.map((o: any) => (typeof o === 'string' ? { value: o, label: o } : o)) : [];

              if (k === 'country' && opts.length === 0) opts = countryOptions;
              if (k === 'state' && opts.length === 0) opts = stateOptions;
              if (k === 'industryId' || k === 'industry_id') opts = [{ value: selectedIndustry, label: indName }];

              // If numEmployees, it is rendered as text/number input matching Web CRM
              const isSelect =
                k !== 'numEmployees' &&
                k !== 'numberOfEmployees' &&
                k !== 'number_of_employees' &&
                (k === 'country' || k === 'state' || k === 'industryId' || k === 'industry_id' || f.type === 'select');

              return {
                key: k,
                label: f.label || f.name || f.key,
                type: isSelect ? 'select' : f.type || 'text',
                isRequired: f.isRequired ?? f.is_required ?? f.required ?? true,
                options: opts,
                defaultValue: k === 'industryId' || k === 'industry_id' ? indName : undefined,
                readOnly: k === 'industryId' || k === 'industry_id',
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
  }, [selectedIndustry, countryOptions, stateOptions]);

  const getWebExactOrganizationFields = (industryName: string): DynamicFormField[] => [
    { key: 'organizationName', label: 'Organization Name', type: 'text', isRequired: true },
    { key: 'firstName', label: 'First Name', type: 'text', isRequired: true },
    { key: 'lastName', label: 'Last Name', type: 'text', isRequired: true },
    { key: 'contactNumber', label: 'Contact Number', type: 'phone', isRequired: true },
    { key: 'emailId', label: 'Email ID', type: 'email', isRequired: true },
    { key: 'country', label: 'Country', type: 'select', isRequired: true, options: countryOptions },
    { key: 'state', label: 'State', type: 'select', isRequired: true, options: stateOptions },
    { key: 'city', label: 'City', type: 'text', isRequired: true },
    { key: 'pincode', label: 'Pincode', type: 'text', isRequired: true },
    { key: 'industryId', label: 'Industry ID', type: 'select', isRequired: true, readOnly: true, defaultValue: industryName, options: [{ value: selectedIndustry, label: industryName }] },
    { key: 'numEmployees', label: 'Number of Employees(Licenses)', type: 'number', isRequired: true },
    { key: 'address', label: 'Address', type: 'textarea', isRequired: true },
  ];

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
    const subSlug = orgName.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'workspace';
    const firstName = formValues.firstName || formValues.first_name || '';
    const email = formValues.emailId || formValues.email_id || formValues.email || '';
    const contact = formValues.contactNumber || formValues.contactNo || formValues.contact_number || formValues.contact_no || '';

    const rawNum =
      formValues.numEmployees ||
      formValues.numberOfEmployees ||
      formValues.number_of_employees ||
      formValues.num_employees ||
      '10';
    const numEmp = !isNaN(Number(rawNum)) && Number(rawNum) > 0 ? Number(rawNum) : 10;

    if (!orgName.trim()) {
      setErrorMessage('Please enter Organization Name.');
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
    if (!contact.trim()) {
      setErrorMessage('Please enter Contact Number.');
      return;
    }

    try {
      setSubmitting(true);
      const fullContactPhone = contact.trim().startsWith('+') ? contact.trim() : `${dialCode} ${contact.trim()}`.trim();

      const payload = {
        fields: {
          ...formValues,
          organizationName: orgName.trim(),
          organization_name: orgName.trim(),
          subdomain: subSlug,
          subdomainUrl: `https://${subSlug}.leadsrubix.com`,
          firstName: firstName.trim(),
          first_name: firstName.trim(),
          lastName: (formValues.lastName || formValues.last_name || '').trim(),
          last_name: (formValues.lastName || formValues.last_name || '').trim(),
          contactNo: fullContactPhone,
          contact_no: fullContactPhone,
          contactNumber: fullContactPhone,
          contact_number: fullContactPhone,
          emailId: email.trim().toLowerCase(),
          email_id: email.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          industryId: selectedIndustry,
          industry_id: selectedIndustry,
          country: formValues.country || 'India',
          state: formValues.state || 'Haryana',
          city: formValues.city || 'Gurugram',
          pincode: formValues.pincode || '122002',
          numberOfEmployees: numEmp,
          number_of_employees: numEmp,
          numEmployees: numEmp,
          num_employees: numEmp,
          address: formValues.address || '',
        },
        numEmployees: numEmp,
        num_employees: numEmp,
        numberOfEmployees: numEmp,
        number_of_employees: numEmp,
      };

      await apiClient.post('/auth/signup', payload);

      if (logout) {
        await logout();
      }

      Alert.alert(
        'Account Created Successfully!',
        `Your workspace for ${orgName} is live. We have sent your login credentials and temporary password to ${email.trim()}. Please check your email to sign in.`,
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
        err.response?.data?.message || err.message || 'Unable to create account. Please try again.';
      setErrorMessage(msg);
      Alert.alert('Registration Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" />

      {/* Subtle Executive Ambient Glows */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* FIXED Brand Hero Block (Never Scrolls, Always Fixed Top) */}
      <View style={styles.fixedBrandHeader}>
        <View style={styles.logoContainer}>
          <CompanyLogo variant="white" height={38} />
        </View>

        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>
            ENTERPRISE {selectedIndustryObj?.name?.toUpperCase() || 'MULTI-TENANT'} CRM
          </Text>
        </View>
      </View>

      {/* Form Card Area (Centered when selecting industry, Full scroll when form loaded) */}
      <KeyboardAvoidingView
        style={[
          styles.formCardContainer,
          !selectedIndustry && styles.formCardContainerCentered,
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.framedFormCard3D,
            !selectedIndustry && styles.framedFormCard3DAuto,
          ]}
        >
          <ScrollView
            style={selectedIndustry ? styles.innerScrollView : undefined}
            contentContainerStyle={
              selectedIndustry
                ? styles.innerCardScrollContent
                : styles.innerCardCompactContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={!!selectedIndustry}
            scrollEnabled={!!selectedIndustry}
          >
            <Text style={styles.headingTitle}>Create Account</Text>
            <Text style={styles.headingSubtext}>
              {selectedIndustry
                ? 'Enter your organization details to complete registration.'
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

                {/* Industry Options Dropdown List */}
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
                    {/* Render Dynamic Form Fields Matching Web 100% */}
                    {resolvedFields.map((field) => {
                      const key = field.key;
                      const val = formValues[key] ?? field.defaultValue ?? '';
                      const isFocused = focusedField === key;
                      const isRequired = field.isRequired;

                      // 1. Phone Field
                      if (key === 'contactNo' || key === 'contactNumber' || key === 'contact_number' || key === 'contact_no' || field.type === 'phone') {
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
                                  autoCorrect={false}
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

                      // 2. Select Dropdown Fields (Country, State, Industry ID)
                      if (
                        field.type === 'select' ||
                        key === 'country' ||
                        key === 'state' ||
                        key === 'industryId' ||
                        key === 'industry_id'
                      ) {
                        const isDropdownOpen = activeDropdownKey === key;
                        let opts = field.options && field.options.length > 0 ? field.options : [];
                        const currentIndName = selectedIndustryObj?.name || selectedIndustry;
                        if (key === 'country') opts = countryOptions;
                        if (key === 'state') opts = stateOptions;
                        if (key === 'industryId' || key === 'industry_id') opts = [{ value: selectedIndustry, label: currentIndName }];

                        const selectedOpt = opts.find(
                          (o) => o.value === val || o.label === val || ((key === 'industryId' || key === 'industry_id') && o.value === selectedIndustry)
                        );
                        const displayLabel = selectedOpt?.label || (key === 'industryId' || key === 'industry_id' ? currentIndName : val) || `Select ${field.label}...`;

                        return (
                          <View key={key} style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>
                              {field.label.toUpperCase()} {isRequired ? '*' : ''}
                            </Text>

                            <TouchableOpacity
                              style={[styles.selectTriggerBox, field.readOnly && styles.inputBoxDisabled]}
                              onPress={() => !field.readOnly && setActiveDropdownKey(isDropdownOpen ? null : key)}
                              activeOpacity={field.readOnly ? 1 : 0.8}
                              disabled={field.readOnly}
                            >
                              <Text style={styles.selectTriggerText}>{displayLabel}</Text>
                              <Ionicons
                                name={isDropdownOpen ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                                size={18}
                                color="#64748B"
                              />
                            </TouchableOpacity>

                            {isDropdownOpen && !field.readOnly && (
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

                      // 3. Textarea Field (Address)
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
                                onChangeText={(text) => handleValueChange(key, text)}
                                multiline
                                numberOfLines={3}
                                autoCorrect={false}
                              />
                            </View>
                          </View>
                        );
                      }

                      // 5. Default Text / Number / Email Input (Matching Web Input Fields)
                      const isNumber = field.type === 'number' || key === 'numEmployees' || key === 'numberOfEmployees' || key === 'number_of_employees' || key === 'pincode';

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
                              onChangeText={(text) => handleValueChange(key, text)}
                              onFocus={() => setFocusedField(key)}
                              onBlur={() => setFocusedField(null)}
                              editable={!field.readOnly}
                              autoCorrect={false}
                              keyboardType={
                                isNumber
                                  ? 'numeric'
                                  : key.toLowerCase().includes('email')
                                  ? 'email-address'
                                  : 'default'
                              }
                              autoCapitalize={key.toLowerCase().includes('email') ? 'none' : 'words'}
                            />
                          </View>
                        </View>
                      );
                    })}

                    {/* Primary Executive Sign Up Button */}
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
                          <Text style={styles.ctaButtonText}>Sign Up</Text>
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* FIXED Bottom Footer Info (Never Scrolls) */}
      <View style={styles.fixedBottomFooter}>
        <AppVersionFooter textStyle={styles.footerVersionText} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#151728',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  fixedBrandHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
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
    letterSpacing: 0.6,
  },
  formCardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  formCardContainerCentered: {
    justifyContent: 'center',
  },
  framedFormCard3D: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  framedFormCard3DAuto: {
    flex: 0,
    maxHeight: 460,
  },
  innerScrollView: {
    flex: 1,
  },
  innerCardScrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  innerCardCompactContent: {
    padding: 24,
    paddingBottom: 24,
  },
  fixedBottomFooter: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 6,
    alignItems: 'center',
  },
  footerVersionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  headingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headingSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 14,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 11.5,
    color: '#BE123C',
    fontWeight: '600',
    lineHeight: 16,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  selectedIndustryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectedIndustryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  selectedIndustryValue: {
    fontWeight: '800',
    color: '#272944',
  },
  changeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  selectTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTriggerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownOptionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
    gap: 4,
  },
  dialCodeFlag: {
    fontSize: 14,
  },
  dialCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dialCodeScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dialCodeOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dialCodeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputBoxFlex: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputBoxFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  inputBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  textInputControl: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 10,
    minHeight: 70,
  },
  textAreaControl: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  eyeBtn: {
    padding: 6,
  },
  dynamicFormGrid: {
    gap: 2,
  },
  primaryCtaButton3D: {
    backgroundColor: '#272944',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  existingPrompt: {
    fontSize: 12,
    color: '#64748B',
  },
  loginLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
});
