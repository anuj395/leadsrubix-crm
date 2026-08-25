import { industryTemplateRepository } from '../repositories/industryTemplateRepository';

export interface IndustryPresetTemplate {
  code: string;
  name: string;
  description: string;
  defaultStages: { key: string; label: string; color: string }[];
  defaultCustomFields: { key: string; label: string; type: string }[];
}

export const EXHAUSTIVE_INDUSTRY_TEMPLATES: IndustryPresetTemplate[] = [
  {
    code: 'auto_sales_service_3s',
    name: 'Auto Sales & Service Dealership (3S/4S Outlet)',
    description: 'Unified 360° Automobile Sales (Test Drives & CPQ) and Workshop Service (Job Cards & Spares)',
    defaultStages: [
      { key: 'fresh_inquiry', label: 'Fresh Inquiry', color: '#0284C7' },
      { key: 'test_drive_scheduled', label: 'Test Drive Scheduled', color: '#D97706' },
      { key: 'booking_closed', label: 'Vehicle Booking Closed', color: '#059669' },
      { key: 'delivery_done', label: 'Vehicle Delivered', color: '#7C3AED' },
      { key: 'job_card_opened', label: 'Workshop Job Card Opened', color: '#272944' },
      { key: 'service_completed', label: 'Service & Maintenance Completed', color: '#16A34A' },
    ],
    defaultCustomFields: [
      { key: 'vehicleModel', label: 'Vehicle Model & Trim Variant', type: 'select' },
      { key: 'variantSpec', label: 'Transmission & Engine Spec', type: 'text' },
      { key: 'odometerReading', label: 'Odometer KM Reading', type: 'number' },
      { key: 'jobCardNo', label: 'Workshop Job Card #', type: 'text' },
      { key: 'chassisVin', label: 'Chassis VIN / Registration #', type: 'text' },
    ],
  },
  {
    code: 'real_estate',
    name: 'Real Estate & Property Development',
    description: 'Property sales, site visits, unit availability, and CPQ payment plans',
    defaultStages: [
      { key: 'fresh', label: 'Fresh Lead', color: '#0284C7' },
      { key: 'visit_scheduled', label: 'Site Visit Scheduled', color: '#D97706' },
      { key: 'negotiation', label: 'Offer & Negotiation', color: '#7C3AED' },
      { key: 'booked', label: 'Unit Booked', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'propertyType', label: 'Property Type (3 BHK / Villa / Commercial)', type: 'select' },
      { key: 'budgetRange', label: 'Budget Range', type: 'currency' },
    ],
  },
  {
    code: 'it_saas',
    name: 'IT Services & Enterprise SaaS',
    description: 'B2B software sales, ARR deal sizing, POCs, and technical demos',
    defaultStages: [
      { key: 'prospect', label: 'Inbound Prospect', color: '#0284C7' },
      { key: 'demo_done', label: 'Product Demo Completed', color: '#D97706' },
      { key: 'poc_signed', label: 'POC Signed', color: '#7C3AED' },
      { key: 'contract_won', label: 'SaaS Contract Won', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'arrValue', label: 'Annual Recurring Revenue (ARR)', type: 'currency' },
      { key: 'userLicenses', label: 'Number of User Licenses', type: 'number' },
    ],
  },
  {
    code: 'ecommerce',
    name: 'E-Commerce & D2C Brands',
    description: 'Cart abandonment recovery, VIP buyer loyalty, and order dispatch tracking',
    defaultStages: [
      { key: 'cart_abandoned', label: 'Cart Abandoned', color: '#EF4444' },
      { key: 'checkout_started', label: 'Checkout Started', color: '#F59E0B' },
      { key: 'order_placed', label: 'Order Placed', color: '#10B981' },
      { key: 'order_delivered', label: 'Order Delivered', color: '#6366F1' },
    ],
    defaultCustomFields: [
      { key: 'orderId', label: 'E-Commerce Order ID #', type: 'text' },
      { key: 'cartValue', label: 'Cart Total Value', type: 'currency' },
    ],
  },
  {
    code: 'healthcare',
    name: 'Healthcare & Clinic Management',
    description: 'Patient consultations, appointment bookings, and treatment plans',
    defaultStages: [
      { key: 'patient_inquiry', label: 'Patient Inquiry', color: '#0284C7' },
      { key: 'consultation_scheduled', label: 'Consultation Scheduled', color: '#D97706' },
      { key: 'treatment_started', label: 'Treatment In-Progress', color: '#7C3AED' },
      { key: 'treatment_completed', label: 'Treatment Completed', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'specialty', label: 'Medical Department & Doctor Specialty', type: 'select' },
      { key: 'preferredDate', label: 'Preferred Appointment Date', type: 'date' },
    ],
  },
  {
    code: 'education',
    name: 'Education & Admissions',
    description: 'Student counseling, campus visits, course applications, and enrollment',
    defaultStages: [
      { key: 'applicant', label: 'Student Lead', color: '#0284C7' },
      { key: 'counseling_done', label: 'Counseling Session Completed', color: '#D97706' },
      { key: 'application_submitted', label: 'Application Submitted', color: '#7C3AED' },
      { key: 'enrolled', label: 'Admission Enrolled', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'courseProgram', label: 'Degree / Course Program', type: 'select' },
      { key: 'academicYear', label: 'Academic Intake Batch', type: 'text' },
    ],
  },
  {
    code: 'financial_services',
    name: 'Financial Services & Wealth Management',
    description: 'Loan inquiries, credit verification, investment portfolios, and KYC',
    defaultStages: [
      { key: 'lead_received', label: 'Financial Inquiry', color: '#0284C7' },
      { key: 'kyc_verified', label: 'KYC & Docs Verified', color: '#D97706' },
      { key: 'underwriting', label: 'Credit Underwriting', color: '#7C3AED' },
      { key: 'disbursed', label: 'Loan Disbursed / Investment Active', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'loanAmount', label: 'Requested Loan / Investment Amount', type: 'currency' },
      { key: 'cibilScore', label: 'Credit Bureau / CIBIL Score', type: 'number' },
    ],
  },
  {
    code: 'manufacturing',
    name: 'Industrial Manufacturing & B2B Supply',
    description: 'RFQ quotations, sample production, PO sign-offs, and batch dispatch',
    defaultStages: [
      { key: 'rfq_received', label: 'RFQ Inbound Lead', color: '#0284C7' },
      { key: 'sample_approved', label: 'Sample Prototype Approved', color: '#D97706' },
      { key: 'po_received', label: 'Purchase Order Received', color: '#059669' },
      { key: 'batch_dispatched', label: 'Production Batch Dispatched', color: '#7C3AED' },
    ],
    defaultCustomFields: [
      { key: 'partNumber', label: 'OEM Component / Part #', type: 'text' },
      { key: 'batchQuantity', label: 'Production Batch Units', type: 'number' },
    ],
  },
  {
    code: 'basic_crm',
    name: 'Universal Basic CRM',
    description: 'Standard Lead, Task, and Customer Contact Management Workflow',
    defaultStages: [
      { key: 'new', label: 'New Lead', color: '#0284C7' },
      { key: 'contacted', label: 'Contacted', color: '#D97706' },
      { key: 'qualified', label: 'Qualified Prospect', color: '#7C3AED' },
      { key: 'won', label: 'Closed Won', color: '#059669' },
    ],
    defaultCustomFields: [
      { key: 'leadSource', label: 'Inbound Lead Source Channel', type: 'select' },
      { key: 'expectedDealValue', label: 'Estimated Deal Value', type: 'currency' },
    ],
  },
];

export const industryTemplateService = {
  async getTemplates(): Promise<IndustryPresetTemplate[]> {
    try {
      const data = await industryTemplateRepository.fetchRawIndustryTemplates();
      const items = data?.items || data || [];
      return items.length > 0 ? items : EXHAUSTIVE_INDUSTRY_TEMPLATES;
    } catch (err) {
      console.warn('[industryTemplateService] API fallback, using exhaustive industry presets:', err);
      return EXHAUSTIVE_INDUSTRY_TEMPLATES;
    }
  },
};
