export interface IndustrySemantics {
  industryName: string;
  leadEntitySingular: string;
  leadEntityPlural: string;
  taskEntitySingular: string;
  taskEntityPlural: string;
  agentEntity: string;
  agentEntityPlural: string;
  projectEntity: string;
  freshLabel: string;
  inPipelineLabel: string;
  completedVisits: string;
  scheduledVisits: string;
  wonLabel: string;
  siteVisit: string;
  meeting: string;
  visitsDesc: string;
  completedVisitsTooltip: string;
  scheduledVisitsTooltip: string;
  tasksAndMeetingsTab: string;
  recentLeadsHeader: string;
  recentLeadsSub: string;
}

export interface CallOutcomePreset {
  label: string;
  badgeColor: string;
  bgColor: string;
}

export function getIndustrySemantics(industryInput?: string): IndustrySemantics {
  const normalized = String(industryInput || '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, '');

  // 1. Healthcare (temp0003, healthcare, medical, clinic, hospital)
  if (
    normalized === 'temp0003' ||
    normalized.includes('health') ||
    normalized.includes('medic') ||
    normalized.includes('clinic') ||
    normalized.includes('hospital')
  ) {
    return {
      industryName: 'Healthcare',
      leadEntitySingular: 'Patient',
      leadEntityPlural: 'Patients',
      taskEntitySingular: 'Consultation',
      taskEntityPlural: 'Consultations',
      agentEntity: 'Doctor',
      agentEntityPlural: 'Doctors',
      projectEntity: 'Department / Specialty',
      freshLabel: 'Patient Inquiries',
      inPipelineLabel: 'Active Triage',
      completedVisits: 'Completed Consultations',
      scheduledVisits: 'Scheduled Consultations',
      wonLabel: 'Treatment Plans',
      siteVisit: 'Consultation',
      meeting: 'Appointment',
      visitsDesc: 'Consultations',
      completedVisitsTooltip: 'Completed Consultations:\nThe count of successfully finished patient consultations.',
      scheduledVisitsTooltip: 'Scheduled Consultations:\nPatient consultations scheduled for the future.',
      tasksAndMeetingsTab: 'Consultations & Appointments',
      recentLeadsHeader: 'FRESH PATIENT INQUIRIES',
      recentLeadsSub: 'Recent patients assigned to clinical queue',
    };
  }

  // 2. Education (temp0004, education, school, college, university, institute, admissions)
  if (
    normalized === 'temp0004' ||
    normalized.includes('edu') ||
    normalized.includes('school') ||
    normalized.includes('college') ||
    normalized.includes('university') ||
    normalized.includes('admission')
  ) {
    return {
      industryName: 'Education',
      leadEntitySingular: 'Student',
      leadEntityPlural: 'Students',
      taskEntitySingular: 'Interview',
      taskEntityPlural: 'Interviews',
      agentEntity: 'Counselor',
      agentEntityPlural: 'Counselors',
      projectEntity: 'Course / Program',
      freshLabel: 'Student Inquiries',
      inPipelineLabel: 'Admissions Queue',
      completedVisits: 'Completed Interviews',
      scheduledVisits: 'Scheduled Interviews',
      wonLabel: 'Enrollments',
      siteVisit: 'Campus Tour',
      meeting: 'Admissions Call',
      visitsDesc: 'Interviews',
      completedVisitsTooltip: 'Completed Interviews:\nThe count of successfully finished student admission interviews.',
      scheduledVisitsTooltip: 'Scheduled Interviews:\nStudent interviews scheduled for the future.',
      tasksAndMeetingsTab: 'Admissions & Campus Tours',
      recentLeadsHeader: 'FRESH STUDENT INQUIRIES',
      recentLeadsSub: 'Recent applicants assigned to counselor queue',
    };
  }

  // 3. E-Commerce (temp0002, ecommerce, ecom, retail, consumergoods, shopping)
  if (
    normalized === 'temp0002' ||
    normalized.includes('ecom') ||
    normalized.includes('retail') ||
    normalized.includes('shopping') ||
    normalized.includes('consumer')
  ) {
    return {
      industryName: 'E-Commerce',
      leadEntitySingular: 'Order',
      leadEntityPlural: 'Orders',
      taskEntitySingular: 'Delivery',
      taskEntityPlural: 'Deliveries',
      agentEntity: 'Support Agent',
      agentEntityPlural: 'Support Agents',
      projectEntity: 'Category / Brand',
      freshLabel: 'Pending Orders',
      inPipelineLabel: 'Processing',
      completedVisits: 'Delivered Orders',
      scheduledVisits: 'Scheduled Deliveries',
      wonLabel: 'Fulfilled',
      siteVisit: 'Delivery',
      meeting: 'Demo Call',
      visitsDesc: 'Deliveries',
      completedVisitsTooltip: 'Delivered Orders:\nThe count of successfully delivered customer orders.',
      scheduledVisitsTooltip: 'Scheduled Deliveries:\nCustomer deliveries scheduled for the future.',
      tasksAndMeetingsTab: 'Support Tickets & Deliveries',
      recentLeadsHeader: 'RECENT BUYER INQUIRIES',
      recentLeadsSub: 'Recent product orders & cart inquiries',
    };
  }

  // 4. Financial Services / Finance (temp0005, finance, financial, banking, insurance, investment)
  if (
    normalized === 'temp0005' ||
    normalized.includes('finan') ||
    normalized.includes('bank') ||
    normalized.includes('insur') ||
    normalized.includes('invest')
  ) {
    return {
      industryName: 'Finance',
      leadEntitySingular: 'Client',
      leadEntityPlural: 'Clients',
      taskEntitySingular: 'Audit',
      taskEntityPlural: 'Audits',
      agentEntity: 'Advisor',
      agentEntityPlural: 'Advisors',
      projectEntity: 'Portfolio / Fund',
      freshLabel: 'Portfolio Inquiries',
      inPipelineLabel: 'Under Review',
      completedVisits: 'Completed Audits',
      scheduledVisits: 'Scheduled Meetings',
      wonLabel: 'Funded Deals',
      siteVisit: 'Office Visit',
      meeting: 'Portfolio Review',
      visitsDesc: 'Meetings',
      completedVisitsTooltip: 'Completed Audits:\nThe count of successfully finished portfolio or client audits.',
      scheduledVisitsTooltip: 'Scheduled Meetings:\nAdvisory meetings scheduled for the future.',
      tasksAndMeetingsTab: 'Advisory Tasks & Audits',
      recentLeadsHeader: 'FRESH CLIENT INQUIRIES',
      recentLeadsSub: 'Recent portfolio reviews assigned to advisor queue',
    };
  }

  // 5. IT & Tech Services (temp0006, it, tech, software, itservices, saas)
  if (
    normalized === 'temp0006' ||
    normalized.includes('it') ||
    normalized.includes('tech') ||
    normalized.includes('software') ||
    normalized.includes('saas')
  ) {
    return {
      industryName: 'IT Services',
      leadEntitySingular: 'Prospect',
      leadEntityPlural: 'Prospects',
      taskEntitySingular: 'Demo',
      taskEntityPlural: 'Demos',
      agentEntity: 'Consultant',
      agentEntityPlural: 'Consultants',
      projectEntity: 'Solution / Stack',
      freshLabel: 'RFP Inquiries',
      inPipelineLabel: 'SOW Scoping',
      completedVisits: 'Completed Demos',
      scheduledVisits: 'Scheduled RFPs',
      wonLabel: 'Signed Contracts',
      siteVisit: 'Client Meetup',
      meeting: 'Technical Call',
      visitsDesc: 'Demos',
      completedVisitsTooltip: 'Completed Demos:\nThe count of successfully finished client project demos.',
      scheduledVisitsTooltip: 'Scheduled RFPs:\nProject proposal reviews scheduled for the future.',
      tasksAndMeetingsTab: 'SLA Tasks & Demos',
      recentLeadsHeader: 'FRESH PROSPECT INQUIRIES',
      recentLeadsSub: 'Recent project leads assigned to consultant queue',
    };
  }

  // 6. Manufacturing & Logistics (temp0007, manufacturing, logistics, plant, factory, distribution)
  if (
    normalized === 'temp0007' ||
    normalized.includes('manufact') ||
    normalized.includes('logistic') ||
    normalized.includes('plant') ||
    normalized.includes('factory')
  ) {
    return {
      industryName: 'Manufacturing',
      leadEntitySingular: 'Dealer',
      leadEntityPlural: 'Dealers',
      taskEntitySingular: 'Shipment',
      taskEntityPlural: 'Shipments',
      agentEntity: 'Manager',
      agentEntityPlural: 'Managers',
      projectEntity: 'Product Line',
      freshLabel: 'RFQ Inquiries',
      inPipelineLabel: 'Production Queue',
      completedVisits: 'Completed Shipments',
      scheduledVisits: 'Scheduled Audits',
      wonLabel: 'Purchase Orders',
      siteVisit: 'Plant Visit',
      meeting: 'Dealer Call',
      visitsDesc: 'Shipments',
      completedVisitsTooltip: 'Completed Shipments:\nThe count of successfully finished dealer shipments.',
      scheduledVisitsTooltip: 'Scheduled Audits:\nPlant inspections scheduled for the future.',
      tasksAndMeetingsTab: 'Plant Audits & Shipments',
      recentLeadsHeader: 'FRESH DEALER INQUIRIES',
      recentLeadsSub: 'Recent distributor RFQs assigned to territory manager',
    };
  }

  // 7. Default: Real Estate (temp0001)
  return {
    industryName: 'Real Estate',
    leadEntitySingular: 'Lead',
    leadEntityPlural: 'Leads',
    taskEntitySingular: 'Site Visit',
    taskEntityPlural: 'Site Visits',
    agentEntity: 'Associate',
    agentEntityPlural: 'Associates',
    projectEntity: 'Project',
    freshLabel: 'Fresh Leads',
    inPipelineLabel: 'In Follow-up',
    completedVisits: 'Completed Visits',
    scheduledVisits: 'Scheduled Visits',
    wonLabel: 'Closed Won',
    siteVisit: 'Site Visit',
    meeting: 'Meeting',
    visitsDesc: 'Site Visits',
    completedVisitsTooltip: 'Completed Visits:\nThe count of successfully finished customer property visits.',
    scheduledVisitsTooltip: 'Scheduled Visits:\nCustomer property visits scheduled for the future.',
    tasksAndMeetingsTab: 'Site Visits & Meetings',
    recentLeadsHeader: 'FRESH LEADS INQUIRIES',
    recentLeadsSub: 'Recent buyers assigned to sales queue',
  };
}

export function getIndustryCallOutcomePresets(industryInput?: string): CallOutcomePreset[] {
  const normalized = String(industryInput || '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, '');

  if (normalized === 'temp0003' || normalized.includes('health') || normalized.includes('medic')) {
    return [
      { label: 'Consultation Booked', badgeColor: '#047857', bgColor: '#ECFDF5' },
      { label: 'Follow-up Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
      { label: 'Prescription / Report Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
      { label: 'Not Interested / Lost', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
    ];
  }

  if (normalized === 'temp0004' || normalized.includes('edu')) {
    return [
      { label: 'Campus Tour Scheduled', badgeColor: '#047857', bgColor: '#ECFDF5' },
      { label: 'Counseling Call Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
      { label: 'Application Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
      { label: 'Not Interested / Dropped', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
    ];
  }

  if (normalized === 'temp0005' || normalized.includes('finan')) {
    return [
      { label: 'Portfolio Review Booked', badgeColor: '#047857', bgColor: '#ECFDF5' },
      { label: 'Audit Follow-up Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
      { label: 'Proposal Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
      { label: 'Not Interested / Declined', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
    ];
  }

  if (normalized === 'temp0006' || normalized.includes('tech') || normalized.includes('it')) {
    return [
      { label: 'Demo Confirmed', badgeColor: '#047857', bgColor: '#ECFDF5' },
      { label: 'Technical Call Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
      { label: 'SOW / Quote Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
      { label: 'Not Interested / Disqualified', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
    ];
  }

  // Default Real Estate
  return [
    { label: 'Site Visit Confirmed', badgeColor: '#047857', bgColor: '#ECFDF5' },
    { label: 'Callback Required', badgeColor: '#B45309', bgColor: '#FFFBEB' },
    { label: 'Price Matrix Sent', badgeColor: '#1D4ED8', bgColor: '#EFF6FF' },
    { label: 'Not Interested / Lost', badgeColor: '#BE123C', bgColor: '#FFF1F2' },
  ];
}
