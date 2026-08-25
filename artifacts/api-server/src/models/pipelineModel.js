const mongoose = require('mongoose');
const { mapWithDualCase } = require('../utils/caseConverter');

const pipelineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    is_default: { type: Boolean, default: false, alias: 'isDefault' },
    status: { type: String, default: 'ACTIVE' },
    stages: [
      {
        stage_id: { type: String, required: true, alias: 'stageId' },
        name: { type: String, required: true },
        probability: { type: Number, default: 0 },
        color: { type: String, default: '#3b82f6' },
        order: { type: Number, default: 0 },
        is_won: { type: Boolean, default: false, alias: 'isWon' },
        is_lost: { type: Boolean, default: false, alias: 'isLost' }
      }
    ],
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' }
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Pipeline = mongoose.model('Pipeline', pipelineSchema, 'pipelines');
exports.Pipeline = Pipeline;

const DEFAULT_INDUSTRY_STAGES = {
  temp0001: [ // Real Estate & Construction
    { stage_id: 'NEW_ENQUIRY', name: 'New Enquiry', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'CONTACTED', name: 'Contacted', probability: 25, color: '#8b5cf6', order: 2 },
    { stage_id: 'SITE_VISIT_SCHEDULED', name: 'Site Visit Scheduled', probability: 45, color: '#f59e0b', order: 3 },
    { stage_id: 'SITE_VISIT_DONE', name: 'Site Visit Done', probability: 65, color: '#06b6d4', order: 4 },
    { stage_id: 'NEGOTIATION', name: 'Negotiation', probability: 85, color: '#ec4899', order: 5 },
    { stage_id: 'WON', name: 'Token / Booked', probability: 100, color: '#10b981', order: 6, is_won: true },
    { stage_id: 'LOST', name: 'Closed Lost', probability: 0, color: '#ef4444', order: 7, is_lost: true }
  ],
  temp0002: [ // Automobile & Dealerships
    { stage_id: 'NEW_INQUIRY', name: 'Car Inquiry', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'TEST_DRIVE_SCHEDULED', name: 'Test Drive Scheduled', probability: 35, color: '#8b5cf6', order: 2 },
    { stage_id: 'TEST_DRIVE_DONE', name: 'Test Drive Done', probability: 55, color: '#06b6d4', order: 3 },
    { stage_id: 'FINANCE_QUOTE', name: 'Quotation & Finance', probability: 75, color: '#f59e0b', order: 4 },
    { stage_id: 'WON', name: 'Booking & Delivery', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Lost to Competitor', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ],
  temp0003: [ // Healthcare & Clinics
    { stage_id: 'ENQUIRY', name: 'Patient Enquiry', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'CONSULTATION_BOOKED', name: 'Consultation Booked', probability: 30, color: '#8b5cf6', order: 2 },
    { stage_id: 'CONSULTED', name: 'Consulted', probability: 50, color: '#06b6d4', order: 3 },
    { stage_id: 'TREATMENT_PROPOSED', name: 'Treatment Proposed', probability: 70, color: '#f59e0b', order: 4 },
    { stage_id: 'WON', name: 'Treatment Approved', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Dropped', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ],
  temp0004: [ // Education & EdTech
    { stage_id: 'LEAD', name: 'Student Enquiry', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'COUNSELING', name: 'Counseling Done', probability: 35, color: '#8b5cf6', order: 2 },
    { stage_id: 'APPLICATION', name: 'Application Submitted', probability: 60, color: '#f59e0b', order: 3 },
    { stage_id: 'OFFER_MADE', name: 'Admission Offered', probability: 80, color: '#06b6d4', order: 4 },
    { stage_id: 'WON', name: 'Enrolled & Paid', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Declined', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ],
  temp0005: [ // Finance, Loans & Insurance
    { stage_id: 'LEAD_CAPTURED', name: 'Application Inflow', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'KYC_VERIFICATION', name: 'KYC & Verification', probability: 35, color: '#8b5cf6', order: 2 },
    { stage_id: 'CREDIT_APPRAISAL', name: 'Credit Appraisal', probability: 60, color: '#06b6d4', order: 3 },
    { stage_id: 'SANCTIONED', name: 'Sanction Issued', probability: 85, color: '#f59e0b', order: 4 },
    { stage_id: 'WON', name: 'Disbursed / Policy Issued', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Rejected / Cancelled', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ],
  temp0006: [ // Travel, Tourism & Hospitality
    { stage_id: 'INQUIRY', name: 'Trip Inquiry', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'ITINERARY_SHARED', name: 'Itinerary Shared', probability: 35, color: '#8b5cf6', order: 2 },
    { stage_id: 'CUSTOMIZATION', name: 'Customizing Package', probability: 60, color: '#06b6d4', order: 3 },
    { stage_id: 'PAYMENT_PENDING', name: 'Advance Received', probability: 85, color: '#f59e0b', order: 4 },
    { stage_id: 'WON', name: 'Tour Booked & Confirmed', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Trip Cancelled', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ],
  default: [ // Generic B2B / SaaS / Service Business
    { stage_id: 'QUALIFICATION', name: 'Qualification', probability: 10, color: '#3b82f6', order: 1 },
    { stage_id: 'CONTACTED', name: 'Contacted', probability: 25, color: '#8b5cf6', order: 2 },
    { stage_id: 'PROPOSAL_SENT', name: 'Proposal Sent', probability: 50, color: '#f59e0b', order: 3 },
    { stage_id: 'NEGOTIATION', name: 'Negotiation', probability: 75, color: '#ec4899', order: 4 },
    { stage_id: 'WON', name: 'Closed Won', probability: 100, color: '#10b981', order: 5, is_won: true },
    { stage_id: 'LOST', name: 'Closed Lost', probability: 0, color: '#ef4444', order: 6, is_lost: true }
  ]
};

exports.getDefaultStagesForIndustry = (industryCode) => {
  if (!industryCode) return DEFAULT_INDUSTRY_STAGES.default;
  const code = String(industryCode).toLowerCase().trim();
  
  if (DEFAULT_INDUSTRY_STAGES[code]) return DEFAULT_INDUSTRY_STAGES[code];
  
  if (code.includes('real') || code.includes('estate') || code.includes('property') || code === 'temp0001') {
    return DEFAULT_INDUSTRY_STAGES.temp0001;
  }
  if (code.includes('auto') || code.includes('car') || code.includes('vehicle') || code === 'temp0002') {
    return DEFAULT_INDUSTRY_STAGES.temp0002;
  }
  if (code.includes('health') || code.includes('medic') || code.includes('clinic') || code.includes('hospital') || code === 'temp0003') {
    return DEFAULT_INDUSTRY_STAGES.temp0003;
  }
  if (code.includes('edu') || code.includes('school') || code.includes('college') || code.includes('university') || code.includes('course') || code === 'temp0004') {
    return DEFAULT_INDUSTRY_STAGES.temp0004;
  }
  if (code.includes('fin') || code.includes('bank') || code.includes('loan') || code.includes('insur') || code === 'temp0005') {
    return DEFAULT_INDUSTRY_STAGES.temp0005;
  }
  if (code.includes('travel') || code.includes('tour') || code.includes('hotel') || code.includes('hospitality') || code === 'temp0006') {
    return DEFAULT_INDUSTRY_STAGES.temp0006;
  }
  
  return DEFAULT_INDUSTRY_STAGES.default;
};

exports.list = async ({ filter = {} } = {}) => {
  const docs = await Pipeline.find(filter).sort({ is_default: -1, createdAt: 1 }).lean().exec();
  return mapWithDualCase(docs);
};
