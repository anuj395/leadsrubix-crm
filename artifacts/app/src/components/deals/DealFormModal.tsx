import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deal, Pipeline, Stage, TeamMember, dealsService } from '../../services/dealsService';
import { theme } from '../../theme/theme';
import { CalendarDatePickerModal } from '../ui/CalendarDatePickerModal';

interface DealFormModalProps {
  visible: boolean;
  editingDeal?: Deal | null;
  pipelines: Pipeline[];
  defaultPipelineId?: string;
  industryCode?: string;
  onClose: () => void;
  onSuccess: (savedDeal: Deal) => void;
}

const LOST_REASONS = [
  'Price / Budget Constraint',
  'Competitor Chosen',
  'Location / Timing Mismatch',
  'Project Specifications Unmet',
  'Client unresponsive / Lost interest',
  'Other',
];

export const DealFormModal: React.FC<DealFormModalProps> = ({
  visible,
  editingDeal,
  pipelines,
  defaultPipelineId,
  industryCode,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(editingDeal);

  // Form State
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [accountName, setAccountName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [probability, setProbability] = useState<number>(10);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [closeDatePickerOpen, setCloseDatePickerOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Contact Info
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Owner Info
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Dynamic Vertical Fields
  const [unitNumber, setUnitNumber] = useState('');
  const [towerBlock, setTowerBlock] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [variant, setVariant] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [clinicalSpecialty, setClinicalSpecialty] = useState('');
  const [treatmentProcedure, setTreatmentProcedure] = useState('');
  const [programName, setProgramName] = useState('');
  const [academicIntake, setAcademicIntake] = useState('');
  const [portfolioType, setPortfolioType] = useState('');
  const [riskCategory, setRiskCategory] = useState('Moderate');
  const [techStack, setTechStack] = useState('');
  const [sowTerm, setSowTerm] = useState('');
  const [productLine, setProductLine] = useState('');
  const [batchSize, setBatchSize] = useState('');

  // Lost Opportunity State
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [otherLostReason, setOtherLostReason] = useState('');
  const [lostReasonPickerOpen, setLostReasonPickerOpen] = useState(false);

  // Sub-Pickers State
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Pipeline & Stages
  const activePipeline = useMemo(() => {
    return pipelines.find((p) => (p._id || p.id) === pipelineId) || pipelines[0] || null;
  }, [pipelines, pipelineId]);

  const activeStages: Stage[] = useMemo(() => {
    if (!activePipeline?.stages) return [];
    return [...activePipeline.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activePipeline]);

  const activeStageObj = useMemo(() => {
    return (
      activeStages.find((s) => (s.stageId || s.stage_id || s.name) === stageId) ||
      activeStages[0] ||
      null
    );
  }, [activeStages, stageId]);

  // Initialize or reset form
  useEffect(() => {
    if (!visible) return;
    setErrorMessage(null);

    // Preload team members and contacts in background
    loadTeamMembers();
    loadContacts();

    if (editingDeal) {
      const hasAccount = Boolean(editingDeal.accountName || editingDeal.account_name);
      setCustomerType(hasAccount ? 'B2B' : 'B2C');
      setAccountName(editingDeal.accountName || editingDeal.account_name || '');
      setTitle(editingDeal.title || editingDeal.name || '');
      setAmount(editingDeal.amount ? String(editingDeal.amount) : '');
      setCurrency(editingDeal.currency || 'INR');

      const pId = editingDeal.pipelineId || editingDeal.pipeline_id || defaultPipelineId || (pipelines[0]?._id || pipelines[0]?.id || '');
      setPipelineId(pId);

      const stId = editingDeal.stageId || editingDeal.stage_id || editingDeal.stage || '';
      setStageId(stId);
      setProbability(typeof editingDeal.probability === 'number' ? editingDeal.probability : 10);

      const rawClose = editingDeal.expectedCloseDate || editingDeal.expected_close_date;
      setExpectedCloseDate(rawClose ? String(rawClose).split('T')[0] : '');
      setNotes(editingDeal.notes || '');

      setSelectedContactId(editingDeal.contactId || editingDeal.contact_id || null);
      setContactName(editingDeal.contactName || editingDeal.contact_name || '');
      setContactPhone(editingDeal.contactPhone || editingDeal.contact_phone || '');
      setContactEmail(editingDeal.contactEmail || editingDeal.contact_email || '');

      setSelectedOwnerId(editingDeal.ownerId || editingDeal.owner_id || null);
      setOwnerName(editingDeal.ownerName || editingDeal.owner_name || '');
      setOwnerEmail(editingDeal.ownerEmail || editingDeal.owner_email || '');

      // Dynamic Vertical fields
      setUnitNumber((editingDeal as any).unitNumber || (editingDeal as any).unit_number || '');
      setTowerBlock((editingDeal as any).towerBlock || (editingDeal as any).tower_block || '');
      setPropertyType((editingDeal as any).propertyType || (editingDeal as any).property_type || '');
      setVehicleModel((editingDeal as any).vehicleModel || (editingDeal as any).vehicle_model || '');
      setVariant((editingDeal as any).variant || '');
      setModelYear((editingDeal as any).modelYear || (editingDeal as any).model_year || '');
      setClinicalSpecialty((editingDeal as any).clinicalSpecialty || (editingDeal as any).clinical_specialty || '');
      setTreatmentProcedure((editingDeal as any).treatmentProcedure || (editingDeal as any).treatment_procedure || '');
      setProgramName((editingDeal as any).programName || (editingDeal as any).program_name || '');
      setAcademicIntake((editingDeal as any).academicIntake || (editingDeal as any).academic_intake || '');
      setPortfolioType((editingDeal as any).portfolioType || (editingDeal as any).portfolio_type || '');
      setRiskCategory((editingDeal as any).riskCategory || (editingDeal as any).risk_category || 'Moderate');
      setTechStack((editingDeal as any).techStack || (editingDeal as any).tech_stack || '');
      setSowTerm((editingDeal as any).sowTerm || (editingDeal as any).sow_term || '');
      setProductLine((editingDeal as any).productLine || (editingDeal as any).product_line || '');
      setBatchSize((editingDeal as any).batchSize || (editingDeal as any).batch_size || '');

      // Lost Opportunity Reason
      const rawLost = editingDeal.lostReason || editingDeal.lost_reason || '';
      if (rawLost) {
        const matched = LOST_REASONS.find((r) => r.toLowerCase() === rawLost.toLowerCase());
        if (matched && matched !== 'Other') {
          setLostReason(matched);
          setOtherLostReason('');
        } else {
          setLostReason('Other');
          setOtherLostReason(rawLost);
        }
      } else {
        setLostReason(LOST_REASONS[0]);
        setOtherLostReason('');
      }
    } else {
      // New Deal default setup
      const isB2BVertical = industryCode === 'temp0006' || industryCode === 'temp0007';
      setCustomerType(isB2BVertical ? 'B2B' : 'B2C');
      setAccountName('');
      setTitle('');
      setAmount('');
      setCurrency('INR');

      const initialPipe = pipelines.find((p) => p.isDefault || p.is_default) || pipelines[0];
      const initialPipeId = initialPipe ? String(initialPipe._id || initialPipe.id) : defaultPipelineId || '';
      setPipelineId(initialPipeId);

      const firstStage = initialPipe?.stages?.[0];
      const initialStageId = firstStage ? String(firstStage.stageId || firstStage.stage_id || firstStage.name) : '';
      setStageId(initialStageId);
      setProbability(firstStage?.probability ?? 10);

      // Default close date: 30 days from now
      const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setExpectedCloseDate(d30);
      setNotes('');

      setSelectedContactId(null);
      setContactName('');
      setContactPhone('');
      setContactEmail('');

      setSelectedOwnerId(null);
      setOwnerName('');
      setOwnerEmail('');

      setUnitNumber('');
      setTowerBlock('');
      setPropertyType('');
      setVehicleModel('');
      setVariant('');
      setModelYear('');
      setClinicalSpecialty('');
      setTreatmentProcedure('');
      setProgramName('');
      setAcademicIntake('');
      setPortfolioType('');
      setRiskCategory('Moderate');
      setTechStack('');
      setSowTerm('');
      setProductLine('');
      setBatchSize('');

      setLostReason(LOST_REASONS[0]);
      setOtherLostReason('');
    }
  }, [visible, editingDeal, pipelines, defaultPipelineId, industryCode]);

  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const members = await dealsService.listTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.warn('Failed to load team members:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoadingContacts(true);
      const contacts = await dealsService.listContacts();
      setContactsList(contacts);
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectPipeline = (pipe: Pipeline) => {
    const pipeId = String(pipe._id || pipe.id);
    setPipelineId(pipeId);
    setPipelinePickerOpen(false);

    if (pipe.stages && pipe.stages.length > 0) {
      const firstSt = pipe.stages[0];
      const stId = String(firstSt.stageId || firstSt.stage_id || firstSt.name);
      setStageId(stId);
      setProbability(firstSt.probability ?? 10);
    }
  };

  const handleSelectStage = (st: Stage) => {
    const stId = String(st.stageId || st.stage_id || st.name);
    setStageId(stId);
    setProbability(st.probability ?? 10);
    setStagePickerOpen(false);
  };

  const handleSelectContact = (c: any) => {
    setSelectedContactId(String(c._id || c.id));
    const name = c.customerName || c.customer_name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
    setContactName(name);
    setContactPhone(c.contactNumber || c.contact_number || c.phone || '');
    setContactEmail(c.emailId || c.email_id || c.email || '');

    // If title is empty, set a smart default
    if (!title.trim() && name) {
      setTitle(`${name} - Opportunity`);
    }

    setContactPickerOpen(false);
  };

  const handleSelectOwner = (member: TeamMember) => {
    setSelectedOwnerId(member.id || member._id || null);
    setOwnerName(member.name);
    setOwnerEmail(member.email);
    setOwnerPickerOpen(false);
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('Please enter a Deal Title.');
      return;
    }

    if (customerType === 'B2B' && !accountName.trim()) {
      setErrorMessage('Please enter the Company / Corporate Name for B2B deals.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Deal value must be greater than 0.');
      return;
    }

    if (expectedCloseDate) {
      const closeTime = new Date(expectedCloseDate).getTime();
      if (!isNaN(closeTime) && closeTime < Date.now() - 24 * 60 * 60 * 1000) {
        setErrorMessage('Expected close date cannot be in the past.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    const payload: Partial<Deal> = {
      title: cleanTitle,
      name: cleanTitle,
      amount: numAmount,
      currency: currency || 'INR',
      customerType,
      customer_type: customerType,
      accountName: customerType === 'B2B' ? accountName.trim() : undefined,
      account_name: customerType === 'B2B' ? accountName.trim() : undefined,
      pipelineId: pipelineId || undefined,
      pipeline_id: pipelineId || undefined,
      stageId: stageId || activeStageObj?.stageId || activeStageObj?.stage_id || 'QUALIFICATION',
      stage_id: stageId || activeStageObj?.stageId || activeStageObj?.stage_id || 'QUALIFICATION',
      stage: activeStageObj?.name || 'Qualification',
      probability: typeof probability === 'number' ? probability : (activeStageObj?.probability ?? 10),
      expectedCloseDate: expectedCloseDate ? expectedCloseDate : undefined,
      contactId: selectedContactId || undefined,
      contact_id: selectedContactId || undefined,
      contactName: contactName.trim() || undefined,
      contact_name: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      ownerId: selectedOwnerId || undefined,
      owner_id: selectedOwnerId || undefined,
      ownerName: ownerName || undefined,
      owner_name: ownerName || undefined,
      ownerEmail: ownerEmail || undefined,
      owner_email: ownerEmail || undefined,
      notes: notes.trim(),
      // Dynamic vertical fields
      unitNumber: unitNumber.trim() || undefined,
      towerBlock: towerBlock.trim() || undefined,
      propertyType: propertyType.trim() || undefined,
      vehicleModel: vehicleModel.trim() || undefined,
      variant: variant.trim() || undefined,
      modelYear: modelYear.trim() || undefined,
      clinicalSpecialty: clinicalSpecialty.trim() || undefined,
      treatmentProcedure: treatmentProcedure.trim() || undefined,
      programName: programName.trim() || undefined,
      academicIntake: academicIntake.trim() || undefined,
      portfolioType: portfolioType.trim() || undefined,
      riskCategory: riskCategory || undefined,
      techStack: techStack.trim() || undefined,
      sowTerm: sowTerm.trim() || undefined,
      productLine: productLine.trim() || undefined,
      batchSize: batchSize.trim() || undefined,
      lostReason: isLostStage ? (lostReason === 'Other' ? (otherLostReason.trim() || 'Other') : lostReason) : undefined,
      lost_reason: isLostStage ? (lostReason === 'Other' ? (otherLostReason.trim() || 'Other') : lostReason) : undefined,
    };

    if (isLostStage && lostReason === 'Other' && !otherLostReason.trim()) {
      setErrorMessage('Please specify the custom reason for dropping this opportunity.');
      setSubmitting(false);
      return;
    }

    try {
      let resultDeal: Deal;
      if (isEditing && editingDeal) {
        const dealId = String(editingDeal._id || editingDeal.id);
        resultDeal = await dealsService.updateDeal(dealId, payload);
      } else {
        resultDeal = await dealsService.createDeal(payload);
      }
      onSuccess(resultDeal);
      onClose();
    } catch (err: any) {
      console.error('Deal save error:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save deal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered contacts for picker
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) return contactsList;
    const q = contactSearchQuery.toLowerCase().trim();
    return contactsList.filter((c) => {
      const name = (c.customerName || c.customer_name || '').toLowerCase();
      const phone = (c.contactNumber || c.contact_number || c.phone || '').toLowerCase();
      const email = (c.emailId || c.email_id || c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [contactsList, contactSearchQuery]);

  // Filtered team members for picker
  const filteredTeam = useMemo(() => {
    if (!ownerSearchQuery.trim()) return teamMembers;
    const q = ownerSearchQuery.toLowerCase().trim();
    return teamMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    );
  }, [teamMembers, ownerSearchQuery]);

  const ind = String(industryCode || '').toLowerCase();
  const isRealEstate = ind === 'temp0001' || ind.includes('real') || ind.includes('estate') || (!ind && true);
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const isAuto = ind === 'temp0002' || ind.includes('auto') || ind.includes('car');
  const isHealth = ind === 'temp0003' || ind.includes('clinic') || ind.includes('health');
  const isEdTech = ind === 'temp0004' || ind.includes('edu') || ind.includes('school');
  const isFinance = ind === 'temp0005' || ind.includes('fin') || ind.includes('bank') || ind.includes('wealth');
  const isTech = ind === 'temp0006' || ind.includes('tech') || ind.includes('it');
  const isManufacturing = ind === 'temp0007' || ind.includes('manuf') || ind.includes('prod');

  const isLostStage = useMemo(() => {
    if (!activeStageObj) return false;
    const nameUpper = String(activeStageObj.name || '').toUpperCase();
    const idUpper = String(activeStageObj.stageId || activeStageObj.stage_id || '').toUpperCase();
    return Boolean(
      activeStageObj.isLost ||
      activeStageObj.is_lost ||
      nameUpper.includes('LOST') ||
      idUpper.includes('LOST') ||
      nameUpper.includes('DROP')
    );
  }, [activeStageObj]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Deal Opportunity' : 'Create New Deal'}</Text>
              <Text style={styles.modalSubtitle}>
                {isEditing ? 'Update deal pipeline parameters & value' : 'Convert opportunities into active revenue pipeline'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {Boolean(errorMessage) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Scrollable Form Body */}
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ─── 1. Customer Type Toggle ─── */}
            <Text style={styles.sectionLabel}>CUSTOMER TYPE</Text>
            <View style={styles.customerTypeRow}>
              <TouchableOpacity
                style={[styles.customerTypeBtn, customerType === 'B2C' && styles.customerTypeBtnActive]}
                onPress={() => setCustomerType('B2C')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={16} color={customerType === 'B2C' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.customerTypeText, customerType === 'B2C' && styles.customerTypeTextActive]}>
                  Direct (B2C)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customerTypeBtn, customerType === 'B2B' && styles.customerTypeBtnActive]}
                onPress={() => setCustomerType('B2B')}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={16} color={customerType === 'B2B' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.customerTypeText, customerType === 'B2B' && styles.customerTypeTextActive]}>
                  Corporate (B2B)
                </Text>
              </TouchableOpacity>
            </View>

            {/* B2B Company Name */}
            {customerType === 'B2B' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  COMPANY / CORPORATE NAME <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Reliance Retail Ventures Ltd"
                  placeholderTextColor="#94A3B8"
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>
            )}

            {/* ─── 2. Contact Linking ─── */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithAction}>
                <Text style={styles.fieldLabel}>LINKED CONTACT / CLIENT</Text>
                <TouchableOpacity onPress={() => setContactPickerOpen(true)} style={styles.linkActionBtn}>
                  <Ionicons name="search" size={13} color="#272944" />
                  <Text style={styles.linkActionText}>Search CRM Contacts</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setContactPickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  {contactName ? (
                    <>
                      <Text style={styles.selectBoxValue}>{contactName}</Text>
                      <Text style={styles.selectBoxSubValue}>
                        {contactPhone ? `📞 ${contactPhone}` : ''} {contactEmail ? `• ✉️ ${contactEmail}` : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.selectBoxPlaceholder}>Select or enter contact details...</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* Manual Direct Name Input Fallback */}
              {!selectedContactId && (
                <TextInput
                  style={[styles.fieldInput, { marginTop: 6 }]}
                  placeholder="Or type client name directly..."
                  placeholderTextColor="#94A3B8"
                  value={contactName}
                  onChangeText={setContactName}
                />
              )}
            </View>

            {/* ─── 3. Deal Title ─── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                DEAL TITLE <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 3BHK Luxury Apartment - Tower B"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* ─── 4. Deal Amount & Currency ─── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                DEAL VALUE (INR) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.amountInputRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>₹ INR</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, styles.amountInput]}
                  placeholder="e.g. 7500000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* ─── 5. Pipeline & Stage Selectors ─── */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>SALES PIPELINE</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setPipelinePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectBoxValue} numberOfLines={1}>
                    {activePipeline?.name || 'Standard Pipeline'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>STAGE</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setStagePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: activeStageObj?.color || '#272944',
                      }}
                    />
                    <Text style={styles.selectBoxValue} numberOfLines={1}>
                      {activeStageObj?.name || 'Qualification'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ─── 6. Probability % & Expected Close Date ─── */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>WIN PROBABILITY (%)</Text>
                <View style={styles.probabilityBox}>
                  <TextInput
                    style={styles.probabilityInput}
                    keyboardType="numeric"
                    value={String(probability)}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      setProbability(isNaN(num) ? 0 : Math.min(100, Math.max(0, num)));
                    }}
                  />
                  <Text style={styles.probabilityPercent}>%</Text>
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>EXPECTED CLOSE DATE</Text>
                <TouchableOpacity
                  style={[styles.fieldInput, styles.dateTriggerBtn]}
                  onPress={() => setCloseDatePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.dateTriggerText,
                      !expectedCloseDate && styles.dateTriggerPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {expectedCloseDate ? formatDateDisplay(expectedCloseDate) : 'Select date...'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ─── 7. Deal Owner ─── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DEAL OWNER / AGENT</Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setOwnerPickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                      {(ownerName || 'OP')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectBoxValue}>{ownerName || 'Assign Team Member'}</Text>
                    {Boolean(ownerEmail) && (
                      <Text style={styles.selectBoxSubValue}>{ownerEmail}</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* ─── 8. Industry-Specific Dynamic Fields ─── */}
            {isRealEstate && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>🏠 REAL ESTATE SPECIFICATIONS</Text>
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>UNIT / FLAT #</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. 1402"
                      placeholderTextColor="#94A3B8"
                      value={unitNumber}
                      onChangeText={setUnitNumber}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>TOWER / BLOCK</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Tower C"
                      placeholderTextColor="#94A3B8"
                      value={towerBlock}
                      onChangeText={setTowerBlock}
                    />
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PROPERTY TYPE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 3 BHK Luxury Penthouse"
                    placeholderTextColor="#94A3B8"
                    value={propertyType}
                    onChangeText={setPropertyType}
                  />
                </View>
              </View>
            )}

            {isAuto && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>🚗 AUTOMOBILE SPECIFICATIONS</Text>
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>VEHICLE MODEL</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Hyundai Creta"
                      placeholderTextColor="#94A3B8"
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>VARIANT / TRIM</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. SX (O) Diesel AT"
                      placeholderTextColor="#94A3B8"
                      value={variant}
                      onChangeText={setVariant}
                    />
                  </View>
                </View>
              </View>
            )}

            {isHealth && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>🏥 CLINICAL & PROCEDURE SPECIFICATIONS</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CLINICAL SPECIALTY</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Orthopedics / Cardiology"
                    placeholderTextColor="#94A3B8"
                    value={clinicalSpecialty}
                    onChangeText={setClinicalSpecialty}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>TREATMENT / SURGERY PROCEDURE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Total Knee Replacement"
                    placeholderTextColor="#94A3B8"
                    value={treatmentProcedure}
                    onChangeText={setTreatmentProcedure}
                  />
                </View>
              </View>
            )}

            {isEdTech && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>🎓 PROGRAM & ADMISSIONS</Text>
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>PROGRAM / COURSE</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Executive MBA"
                      placeholderTextColor="#94A3B8"
                      value={programName}
                      onChangeText={setProgramName}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>ACADEMIC INTAKE</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Fall 2026"
                      placeholderTextColor="#94A3B8"
                      value={academicIntake}
                      onChangeText={setAcademicIntake}
                    />
                  </View>
                </View>
              </View>
            )}

            {isTech && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>💻 TECH SERVICES & SOW SCOPE</Text>
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>TECH STACK</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. React Native + Node.js"
                      placeholderTextColor="#94A3B8"
                      value={techStack}
                      onChangeText={setTechStack}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>SOW TERM</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. 12 Months MSA"
                      placeholderTextColor="#94A3B8"
                      value={sowTerm}
                      onChangeText={setSowTerm}
                    />
                  </View>
                </View>
              </View>
            )}

            {isFinance && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>📈 FINANCIAL & WEALTH PORTFOLIO</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>INVESTMENT PORTFOLIO / PRODUCT</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. High-Yield Wealth Management / Mutual Funds"
                    placeholderTextColor="#94A3B8"
                    value={portfolioType}
                    onChangeText={setPortfolioType}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>RISK CATEGORY</Text>
                  <View style={styles.pickerRow}>
                    {['Conservative', 'Moderate', 'Aggressive'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.riskOptionBtn, riskCategory === cat && styles.riskOptionBtnActive]}
                        onPress={() => setRiskCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.riskOptionText, riskCategory === cat && styles.riskOptionTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {isManufacturing && (
              <View style={styles.dynamicSection}>
                <Text style={styles.dynamicSectionTitle}>🏭 MANUFACTURING SPECIFICATIONS</Text>
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>PRODUCT LINE</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Industrial Valves & Couplers"
                      placeholderTextColor="#94A3B8"
                      value={productLine}
                      onChangeText={setProductLine}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>BATCH SIZE</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. 10,000 Units"
                      placeholderTextColor="#94A3B8"
                      value={batchSize}
                      onChangeText={setBatchSize}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ─── 9. Notes ─── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DEAL NOTES & REQUIREMENTS</Text>
              <TextInput
                style={[styles.fieldInput, styles.notesInput]}
                placeholder="Enter client specifications, negotiation notes, or delivery terms..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* ─── 10. Lost Opportunity Reason (Expanded if Stage is Lost) ─── */}
            {isLostStage && (
              <View style={styles.lostReasonSection}>
                <View style={styles.lostReasonHeader}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.lostReasonSectionTitle}>LOST OPPORTUNITY REASON *</Text>
                </View>
                <Text style={styles.lostReasonSubtext}>
                  Select why this deal was marked as Closed Lost:
                </Text>
                <TouchableOpacity
                  style={[styles.selectBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                  onPress={() => setLostReasonPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectBoxValue, { color: '#DC2626', fontWeight: '600' }]}>
                    {lostReason}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#DC2626" />
                </TouchableOpacity>

                {lostReason === 'Other' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.fieldLabel}>SPECIFY CUSTOM REASON *</Text>
                    <TextInput
                      style={[styles.fieldInput, { borderColor: '#DC2626', backgroundColor: '#FFFFFF' }]}
                      placeholder="Details about client decision or competitor..."
                      placeholderTextColor="#94A3B8"
                      value={otherLostReason}
                      onChangeText={setOtherLostReason}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{isEditing ? 'Update Deal' : 'Create Deal'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* In-Modal Calendar Date Picker */}
        <CalendarDatePickerModal
          visible={closeDatePickerOpen}
          onClose={() => setCloseDatePickerOpen(false)}
          onSelectDate={(formatted) => {
            setExpectedCloseDate(formatted);
            setCloseDatePickerOpen(false);
          }}
          currentValue={expectedCloseDate}
          title="Expected Close Date"
          includeTime={false}
          asInModalOverlay={true}
          minDate={new Date()}
        />
      </View>

      {/* ─── Sub-Modal: Contact Picker ─── */}
      <Modal visible={contactPickerOpen} animationType="slide" transparent onRequestClose={() => setContactPickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setContactPickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarBox}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search contact by name, phone or email..."
                placeholderTextColor="#94A3B8"
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
              />
              {Boolean(contactSearchQuery) && (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {loadingContacts ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#272944" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading CRM Contacts...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {filteredContacts.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>No matching contacts found</Text>
                  </View>
                ) : (
                  filteredContacts.map((c) => {
                    const cId = String(c._id || c.id);
                    const isSelected = selectedContactId === cId;
                    const cName = c.customerName || c.customer_name || 'Client';
                    const cPhone = c.contactNumber || c.contact_number || c.phone || '';
                    const cEmail = c.emailId || c.email_id || c.email || '';

                    return (
                      <TouchableOpacity
                        key={cId}
                        style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                        onPress={() => handleSelectContact(c)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarCircleText}>
                            {cName
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickerItemName, isSelected && { color: '#272944', fontWeight: '700' }]}>
                            {cName}
                          </Text>
                          <Text style={styles.pickerItemSub}>
                            {cPhone ? `📞 ${cPhone}` : ''} {cEmail ? `• ✉️ ${cEmail}` : ''}
                          </Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Sub-Modal: Owner Picker ─── */}
      <Modal visible={ownerPickerOpen} animationType="slide" transparent onRequestClose={() => setOwnerPickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Assign Deal Owner</Text>
              <TouchableOpacity onPress={() => setOwnerPickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarBox}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search team member..."
                placeholderTextColor="#94A3B8"
                value={ownerSearchQuery}
                onChangeText={setOwnerSearchQuery}
              />
            </View>

            {loadingTeam ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#272944" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading Team Members...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {filteredTeam.map((m) => {
                  const mId = m.id || m._id;
                  const isSelected = selectedOwnerId === mId;
                  return (
                    <TouchableOpacity
                      key={mId}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                      onPress={() => handleSelectOwner(m)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: '#272944' }]}>
                        <Text style={[styles.avatarCircleText, { color: '#FFFFFF' }]}>
                          {m.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemName, isSelected && { color: '#272944', fontWeight: '700' }]}>
                          {m.name}
                        </Text>
                        <Text style={styles.pickerItemSub}>
                          {m.role} • {m.email}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Sub-Modal: Pipeline Selector ─── */}
      <Modal visible={pipelinePickerOpen} animationType="slide" transparent onRequestClose={() => setPipelinePickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Sales Pipeline</Text>
              <TouchableOpacity onPress={() => setPipelinePickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {pipelines.map((p) => {
                const pId = String(p._id || p.id);
                const isSelected = pipelineId === pId;
                return (
                  <TouchableOpacity
                    key={pId}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => handleSelectPipeline(p)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, isSelected && { color: '#272944', fontWeight: '700' }]}>
                        {p.name}
                      </Text>
                      <Text style={styles.pickerItemSub}>{p.stages?.length || 0} stages configured</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Sub-Modal: Stage Selector ─── */}
      <Modal visible={stagePickerOpen} animationType="slide" transparent onRequestClose={() => setStagePickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Pipeline Stage</Text>
              <TouchableOpacity onPress={() => setStagePickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {activeStages.map((st) => {
                const stId = String(st.stageId || st.stage_id || st.name);
                const isSelected = stageId === stId;
                return (
                  <TouchableOpacity
                    key={stId}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => handleSelectStage(st)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: st.color || '#272944',
                        marginRight: 10,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, isSelected && { color: '#272944', fontWeight: '700' }]}>
                        {st.name}
                      </Text>
                      <Text style={styles.pickerItemSub}>Win probability: {st.probability}%</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#272944" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Sub-Modal: Lost Reason Selector ─── */}
      <Modal visible={lostReasonPickerOpen} animationType="slide" transparent onRequestClose={() => setLostReasonPickerOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select Reason for Loss</Text>
              <TouchableOpacity onPress={() => setLostReasonPickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {LOST_REASONS.map((r) => {
                const isSelected = lostReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => {
                      setLostReason(r);
                      setLostReasonPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? '#DC2626' : '#94A3B8'}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, isSelected && { color: '#DC2626', fontWeight: '700' }]}>
                        {r}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  lostReasonSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  lostReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lostReasonSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  lostReasonSubtext: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  riskOptionBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  riskOptionBtnActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  riskOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  riskOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  formScroll: {
    maxHeight: 480,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  customerTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  customerTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  customerTypeBtnActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  customerTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  customerTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  dateTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  dateTriggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  linkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  linkActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#272944',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectBoxValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectBoxSubValue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectBoxPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 41, 68, 0.2)',
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#272944',
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  probabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  probabilityInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  probabilityPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(39, 41, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#272944',
  },
  dynamicSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    marginTop: 4,
  },
  dynamicSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#272944',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Sub-Modal Styling */
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  subModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 12,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    gap: 10,
  },
  pickerItemRowSelected: {
    backgroundColor: 'rgba(39, 41, 68, 0.05)',
    borderColor: '#272944',
  },
  pickerItemName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerItemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(39, 41, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#272944',
  },
});
