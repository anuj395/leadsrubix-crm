export interface DefaultWidgetConfig {
  id: string;
  type: 'KPI' | 'CHART' | 'TABLE';
  title: string;
  color?: string;
  lightBg?: string;
  bg?: string;
  icon?: string;
  chart_type?: string;
  data_key?: string;
  columns?: Array<{ key: string; label: string }>;
}

export interface DefaultSectionConfig {
  id: string;
  title: string;
  order: number;
  is_active: boolean;
  widgets: DefaultWidgetConfig[];
}

export interface DefaultTabConfig {
  id: number;
  label: string;
  sections: DefaultSectionConfig[];
}

// ── REAL ESTATE BASELINE (temp0001) ──────────────────────────────────────────
export const REAL_ESTATE_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Contacts Overview',
    sections: [
      {
        id: 'contacts_kpis',
        title: 'Key Metrics Overview',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalLeads', type: 'KPI', title: 'Total Leads', color: '#272944', lightBg: '#EEF2F6', icon: 'people', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'Fresh Leads', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
          { id: 'callBack', type: 'KPI', title: 'Call Back', color: '#F59E0B', lightBg: '#FEF3C7', icon: 'call', data_key: 'cards.callBack' },
          { id: 'interested', type: 'KPI', title: 'Interested', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'heart', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Closed Won', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
          { id: 'notInterested', type: 'KPI', title: 'Not Interested', color: '#64748B', lightBg: '#F1F5F9', icon: 'close-circle', data_key: 'cards.notInterested' },
          { id: 'closedLost', type: 'KPI', title: 'Closed Lost', color: '#EF4444', lightBg: '#FEE2E2', icon: 'trending-down', data_key: 'cards.closedLost' },
          { id: 'completedVisits', type: 'KPI', title: 'Completed Visits', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'trail-sign', data_key: 'cards.completedVisits' },
          { id: 'scheduledVisits', type: 'KPI', title: 'Scheduled Visits', color: '#14B8A6', lightBg: '#CCFBF1', icon: 'calendar', data_key: 'cards.scheduledVisits' },
        ],
      },
      {
        id: 'contacts_details',
        title: 'Leads Conversion & Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'contacts_feedback',
            type: 'TABLE',
            title: 'Leads Feedback Breakdown',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Associate / Group' },
              { key: 'total', label: 'Total' },
              { key: 'fresh', label: 'Fresh' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'interested', label: 'Interested' },
              { key: 'won', label: 'Won' },
              { key: 'notInterested', label: 'Not Int.' },
              { key: 'lost', label: 'Lost' },
              { key: 'completedVisits', label: 'Visits' },
            ],
          },
          {
            id: 'contacts_conversion_donut',
            type: 'CHART',
            title: 'Leads Conversion Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
          {
            id: 'contacts_callback',
            type: 'TABLE',
            title: 'Callback Reasons Summary',
            data_key: 'contacts.callBackReasons',
            columns: [
              { key: 'associate', label: 'Associate / Group' },
              { key: 'total', label: 'Total Call Backs' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Tasks & Meetings',
    sections: [
      {
        id: 'tasks_overview',
        title: 'Completed Task Metrics',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'tasks_completed',
            type: 'TABLE',
            title: 'Completed Tasks by Associate',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Associate / Group' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Meeting' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'siteVisit', label: 'Site Visit' },
            ],
          },
          {
            id: 'tasks_completed_donut',
            type: 'CHART',
            title: 'Completed Tasks Distribution',
            chart_type: 'donut',
            data_key: 'tasks.completedChartData',
          },
        ],
      },
      {
        id: 'tasks_pending_section',
        title: 'Pending Task Metrics',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'tasks_pending',
            type: 'TABLE',
            title: 'Pending Tasks by Associate',
            data_key: 'tasks.pendingTasks',
            columns: [
              { key: 'associate', label: 'Associate / Group' },
              { key: 'total', label: 'Pending' },
              { key: 'meeting', label: 'Meeting' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'siteVisit', label: 'Site Visit' },
            ],
          },
          {
            id: 'tasks_pending_donut',
            type: 'CHART',
            title: 'Pending Tasks Distribution',
            chart_type: 'donut',
            data_key: 'tasks.pendingChartData',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Calling Analytics',
    sections: [
      {
        id: 'calling_insights',
        title: 'Call Tracking & Durations',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'call_trends_trend',
            type: 'CHART',
            title: 'Calling Activity Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'call_logs_table',
            type: 'TABLE',
            title: 'Call Duration Summary',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Associate / Group' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0 Sec' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'duration61_120', label: '61-120s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── HEALTHCARE BASELINE (temp0003) ───────────────────────────────────────────
export const HEALTHCARE_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Patient Care Overview',
    sections: [
      {
        id: 'health_kpis',
        title: 'Patient Care Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalPatients', type: 'KPI', title: 'Total Patients', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'people', data_key: 'cards.totalLeads' },
          { id: 'freshInquiries', type: 'KPI', title: 'New Appointments', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'calendar', data_key: 'cards.fresh' },
          { id: 'callBack', type: 'KPI', title: 'Follow-ups', color: '#3B82F6', lightBg: '#DBEAFE', icon: 'call', data_key: 'cards.callBack' },
          { id: 'consulted', type: 'KPI', title: 'Consultations', color: '#10B981', lightBg: '#D1FAE5', icon: 'medkit', data_key: 'cards.completedVisits' },
          { id: 'treatmentApproved', type: 'KPI', title: 'Treatments', color: '#F59E0B', lightBg: '#FEF3C7', icon: 'checkmark-circle', data_key: 'cards.closedWon' },
          { id: 'declined', type: 'KPI', title: 'Declined', color: '#64748B', lightBg: '#F1F5F9', icon: 'close-circle', data_key: 'cards.notInterested' },
          { id: 'dropped', type: 'KPI', title: 'Dropped', color: '#EF4444', lightBg: '#FEE2E2', icon: 'trending-down', data_key: 'cards.closedLost' },
          { id: 'scheduledConsultations', type: 'KPI', title: 'Scheduled Consults', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'time', data_key: 'cards.scheduledVisits' },
        ],
      },
      {
        id: 'health_details',
        title: 'Specialty & Consultation Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'contacts_feedback',
            type: 'TABLE',
            title: 'Patient Inquiries & Consultation Breakdown',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Doctor / Dept' },
              { key: 'total', label: 'Total Patients' },
              { key: 'fresh', label: 'Appointments' },
              { key: 'callBack', label: 'Follow-up' },
              { key: 'interested', label: 'Consulted' },
              { key: 'won', label: 'Treatments' },
              { key: 'notInterested', label: 'Declined' },
              { key: 'completedVisits', label: 'Consultations' },
            ],
          },
          {
            id: 'health_donut',
            type: 'CHART',
            title: 'Patient Care & Consultation Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Consultations & OPD',
    sections: [
      {
        id: 'health_completed_section',
        title: 'Completed Consultations',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'health_completed_table',
            type: 'TABLE',
            title: 'Completed Consultations by Doctor',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Doctor / Dept' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Consultation' },
              { key: 'callBack', label: 'Phone Follow-up' },
              { key: 'siteVisit', label: 'OPD / Clinic Visit' },
            ],
          },
          {
            id: 'health_completed_chart',
            type: 'CHART',
            title: 'Completed Consultations Distribution',
            chart_type: 'donut',
            data_key: 'tasks.completedChartData',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Tele-Health & Calling',
    sections: [
      {
        id: 'health_calling_section',
        title: 'Tele-Consultation Calling Records',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'health_calling_trends',
            type: 'CHART',
            title: 'Tele-Consultation Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'health_call_durations',
            type: 'TABLE',
            title: 'Call Duration Breakdown',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Doctor / Staff' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0 Sec' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'duration61_120', label: '61-120s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── EDUCATION BASELINE (temp0004) ────────────────────────────────────────────
export const EDUCATION_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Admissions Overview',
    sections: [
      {
        id: 'edu_kpis',
        title: 'Admissions & Enrollment Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalApplicants', type: 'KPI', title: 'Total Applicants', color: '#3B82F6', lightBg: '#DBEAFE', icon: 'school', data_key: 'cards.totalLeads' },
          { id: 'counseling', type: 'KPI', title: 'In Counseling', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'chatbubbles', data_key: 'cards.fresh' },
          { id: 'entrancePassed', type: 'KPI', title: 'Shortlisted', color: '#10B981', lightBg: '#D1FAE5', icon: 'checkmark-circle', data_key: 'cards.interested' },
          { id: 'enrolled', type: 'KPI', title: 'Enrolled Students', color: '#EC4899', lightBg: '#FCE7F3', icon: 'ribbon', data_key: 'cards.closedWon' },
          { id: 'completedInterviews', type: 'KPI', title: 'Interviews Completed', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'trail-sign', data_key: 'cards.completedVisits' },
          { id: 'scheduledInterviews', type: 'KPI', title: 'Interviews Sched.', color: '#14B8A6', lightBg: '#CCFBF1', icon: 'calendar', data_key: 'cards.scheduledVisits' },
        ],
      },
      {
        id: 'edu_breakdown',
        title: 'Counselor Admissions Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'edu_table',
            type: 'TABLE',
            title: 'Admissions Feedback Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Counselor / Dept' },
              { key: 'total', label: 'Total Inquiries' },
              { key: 'fresh', label: 'New Applicants' },
              { key: 'callBack', label: 'Follow-up' },
              { key: 'interested', label: 'Shortlisted' },
              { key: 'won', label: 'Enrolled' },
              { key: 'completedVisits', label: 'Interviews' },
            ],
          },
          {
            id: 'edu_donut',
            type: 'CHART',
            title: 'Admissions Funnel Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Campus Tours & Interviews',
    sections: [
      {
        id: 'edu_interviews_section',
        title: 'Campus Tour & Interview Tasks',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'edu_tasks_table',
            type: 'TABLE',
            title: 'Completed Tours by Counselor',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Counselor' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Admissions Call' },
              { key: 'siteVisit', label: 'Campus Tour' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Counselor Calling Trends',
    sections: [
      {
        id: 'edu_calling_section',
        title: 'Counselor Outbound Performance',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'edu_calling_trends',
            type: 'CHART',
            title: 'Counseling Call Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'edu_call_durations',
            type: 'TABLE',
            title: 'Call Duration Breakdown',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Counselor' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0s' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── E-COMMERCE BASELINE (temp0002) ───────────────────────────────────────────
export const ECOMMERCE_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Store & Inquiries',
    sections: [
      {
        id: 'ecom_kpis',
        title: 'Orders & Support Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalLeads', type: 'KPI', title: 'Store Inquiries', color: '#3B82F6', lightBg: '#DBEAFE', icon: 'cart', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'New Leads', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
          { id: 'interested', type: 'KPI', title: 'Cart In Progress', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'bag-check', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Orders Placed', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
          { id: 'completedVisits', type: 'KPI', title: 'Dispatches', color: '#F59E0B', lightBg: '#FEF3C7', icon: 'cube', data_key: 'cards.completedVisits' },
        ],
      },
      {
        id: 'ecom_breakdown',
        title: 'Support & Inquiries Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'ecom_table',
            type: 'TABLE',
            title: 'Support Rep Order Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Support Rep / Channel' },
              { key: 'total', label: 'Total Inquiries' },
              { key: 'fresh', label: 'Fresh' },
              { key: 'interested', label: 'Active Cart' },
              { key: 'won', label: 'Ordered' },
              { key: 'completedVisits', label: 'Dispatches' },
            ],
          },
          {
            id: 'ecom_donut',
            type: 'CHART',
            title: 'Inquiry Conversion Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Order Follow-ups',
    sections: [
      {
        id: 'ecom_tasks_section',
        title: 'Dispatch & Follow-up Tasks',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'ecom_tasks_table',
            type: 'TABLE',
            title: 'Completed Dispatch Tasks',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Rep' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Review' },
              { key: 'callBack', label: 'Follow-up' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Support Calling',
    sections: [
      {
        id: 'ecom_calling_section',
        title: 'Support Calling Trends',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'ecom_calling_trends',
            type: 'CHART',
            title: 'Support Call Activity',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'ecom_call_durations',
            type: 'TABLE',
            title: 'Support Call Durations',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Support Rep' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0s' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── BFSI BASELINE (temp0005) ─────────────────────────────────────────────────
export const FINANCIAL_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Applications Overview',
    sections: [
      {
        id: 'fin_kpis',
        title: 'Loan & Policy Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalLeads', type: 'KPI', title: 'Applications', color: '#272944', lightBg: '#EEF2F6', icon: 'document-text', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'New Applications', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
          { id: 'interested', type: 'KPI', title: 'Underwriting', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'shield-checkmark', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Disbursed', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
          { id: 'completedVisits', type: 'KPI', title: 'KYC Verified', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'checkmark-circle', data_key: 'cards.completedVisits' },
        ],
      },
      {
        id: 'fin_breakdown',
        title: 'Officer Portfolio Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'fin_table',
            type: 'TABLE',
            title: 'Loan Officer Applications Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Loan Officer / Branch' },
              { key: 'total', label: 'Applications' },
              { key: 'fresh', label: 'New' },
              { key: 'interested', label: 'Underwriting' },
              { key: 'won', label: 'Disbursed' },
              { key: 'completedVisits', label: 'KYC Verified' },
            ],
          },
          {
            id: 'fin_donut',
            type: 'CHART',
            title: 'Application Pipeline Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Branch Visits & KYC',
    sections: [
      {
        id: 'fin_tasks_section',
        title: 'Branch Verification Tasks',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'fin_tasks_table',
            type: 'TABLE',
            title: 'Completed KYC & Verification',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Officer' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Client Meeting' },
              { key: 'siteVisit', label: 'Field Verification' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Tele-Verification',
    sections: [
      {
        id: 'fin_calling_section',
        title: 'Tele-Verification Activity',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'fin_calling_trends',
            type: 'CHART',
            title: 'Verification Calling Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'fin_call_durations',
            type: 'TABLE',
            title: 'Verification Call Durations',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Officer' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0s' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── IT & SAAS BASELINE (temp0006) ────────────────────────────────────────────
export const IT_TECH_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Deals & Pipeline',
    sections: [
      {
        id: 'tech_kpis',
        title: 'Pipeline & Demo Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalLeads', type: 'KPI', title: 'Prospects', color: '#272944', lightBg: '#EEF2F6', icon: 'code-working', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'Inbound Inquiries', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
          { id: 'interested', type: 'KPI', title: 'POC / Evaluation', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'laptop', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Closed Deals', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
          { id: 'completedVisits', type: 'KPI', title: 'Demos Delivered', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'videocam', data_key: 'cards.completedVisits' },
        ],
      },
      {
        id: 'tech_breakdown',
        title: 'Account Executive Pipeline',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'tech_table',
            type: 'TABLE',
            title: 'Account Executive Deal Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'AE / Channel' },
              { key: 'total', label: 'Prospects' },
              { key: 'fresh', label: 'Inbound' },
              { key: 'interested', label: 'POC' },
              { key: 'won', label: 'Closed Deals' },
              { key: 'completedVisits', label: 'Demos' },
            ],
          },
          {
            id: 'tech_donut',
            type: 'CHART',
            title: 'Deal Stage Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Product Demos & POCs',
    sections: [
      {
        id: 'tech_tasks_section',
        title: 'Technical Demo Tasks',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'tech_tasks_table',
            type: 'TABLE',
            title: 'Completed Demos & Scoping Calls',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'AE / SE' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'Live Demo' },
              { key: 'callBack', label: 'Discovery Call' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Outbound Calling',
    sections: [
      {
        id: 'tech_calling_section',
        title: 'Sales Calling Activity',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'tech_calling_trends',
            type: 'CHART',
            title: 'Outbound Call Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'tech_call_durations',
            type: 'TABLE',
            title: 'Call Duration Summary',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'SDR / AE' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0s' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── MANUFACTURING BASELINE (temp0007) ────────────────────────────────────────
export const MANUFACTURING_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Orders & RFQ Overview',
    sections: [
      {
        id: 'mfg_kpis',
        title: 'Production & RFQ Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalLeads', type: 'KPI', title: 'Total RFQs', color: '#272944', lightBg: '#EEF2F6', icon: 'construct', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'MOQ Approved', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
          { id: 'interested', type: 'KPI', title: 'In Production', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'hardware-chip', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Shipped Batches', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
          { id: 'completedVisits', type: 'KPI', title: 'Factory Inspections', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'clipboard', data_key: 'cards.completedVisits' },
        ],
      },
      {
        id: 'mfg_breakdown',
        title: 'Dealer Category Order Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'mfg_table',
            type: 'TABLE',
            title: 'Dealer Rep Order Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Dealer Rep / Region' },
              { key: 'total', label: 'Total RFQs' },
              { key: 'fresh', label: 'MOQ Approved' },
              { key: 'interested', label: 'Production' },
              { key: 'won', label: 'Shipped' },
              { key: 'completedVisits', label: 'Factory Audits' },
            ],
          },
          {
            id: 'mfg_donut',
            type: 'CHART',
            title: 'Product Line Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData',
          },
        ],
      },
    ],
  },
  {
    id: 1,
    label: 'Factory Audits & Inspections',
    sections: [
      {
        id: 'mfg_tasks_section',
        title: 'Site Inspection Tasks',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'mfg_tasks_table',
            type: 'TABLE',
            title: 'Completed Factory Audits',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Inspector' },
              { key: 'total', label: 'Completed' },
              { key: 'meeting', label: 'QC Meeting' },
              { key: 'siteVisit', label: 'Factory Inspection' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Supplier Calling',
    sections: [
      {
        id: 'mfg_calling_section',
        title: 'Vendor Calling Activity',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'mfg_calling_trends',
            type: 'CHART',
            title: 'Vendor Call Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends',
          },
          {
            id: 'mfg_call_durations',
            type: 'TABLE',
            title: 'Vendor Call Durations',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Vendor Rep' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0s' },
              { key: 'duration0_30', label: '0-30s' },
              { key: 'duration31_60', label: '31-60s' },
              { key: 'durationAbove120', label: '>120s' },
            ],
          },
        ],
      },
    ],
  },
];

// ── CANONICAL BASELINE RESOLVER ──────────────────────────────────────────────
export function getIndustryBaselineTabs(industryCode?: string | null): DefaultTabConfig[] {
  if (!industryCode) {
    return JSON.parse(JSON.stringify(REAL_ESTATE_BASELINE_TABS));
  }
  const code = String(industryCode).toLowerCase().trim();

  if (
    code.includes('health') ||
    code.includes('medic') ||
    code.includes('clinic') ||
    code.includes('hospital') ||
    code.includes('patient') ||
    code === 'temp0003'
  ) {
    return JSON.parse(JSON.stringify(HEALTHCARE_BASELINE_TABS));
  }

  if (
    code.includes('ecom') ||
    code.includes('store') ||
    code.includes('retail') ||
    code.includes('shop') ||
    code === 'temp0002'
  ) {
    return JSON.parse(JSON.stringify(ECOMMERCE_BASELINE_TABS));
  }

  if (
    code.includes('edu') ||
    code.includes('school') ||
    code.includes('college') ||
    code.includes('admiss') ||
    code === 'temp0004'
  ) {
    return JSON.parse(JSON.stringify(EDUCATION_BASELINE_TABS));
  }

  if (
    code.includes('fin') ||
    code.includes('bank') ||
    code.includes('loan') ||
    code.includes('insur') ||
    code === 'temp0005'
  ) {
    return JSON.parse(JSON.stringify(FINANCIAL_BASELINE_TABS));
  }

  if (
    code.includes('tech') ||
    code.includes('soft') ||
    code.includes('it') ||
    code.includes('rfp') ||
    code === 'temp0006'
  ) {
    return JSON.parse(JSON.stringify(IT_TECH_BASELINE_TABS));
  }

  if (
    code.includes('mfg') ||
    code.includes('manufactur') ||
    code.includes('factory') ||
    code.includes('dealer') ||
    code === 'temp0007'
  ) {
    return JSON.parse(JSON.stringify(MANUFACTURING_BASELINE_TABS));
  }

  return JSON.parse(JSON.stringify(REAL_ESTATE_BASELINE_TABS));
}

// Global KPI cards list resolver
export function getIndustryGlobalKpis(industryCode?: string | null): DefaultWidgetConfig[] {
  const tabs = getIndustryBaselineTabs(industryCode);
  const tab0 = tabs.find((t) => t.id === 0) || tabs[0];
  if (!tab0) return [];

  const kpiSection = tab0.sections.find((s) => s.id.includes('kpi') || s.widgets.some((w) => w.type === 'KPI'));
  if (kpiSection) {
    return kpiSection.widgets.filter((w) => w.type === 'KPI');
  }

  // Fallback flat search
  const flatKpis: DefaultWidgetConfig[] = [];
  for (const s of tab0.sections) {
    for (const w of s.widgets) {
      if (w.type === 'KPI') flatKpis.push(w);
    }
  }
  return flatKpis;
}

// Layman metric explanations dictionary
export const METRIC_DESCRIPTIONS: Record<string, { title: string; description: string; hint: string }> = {
  totalLeads: {
    title: 'Total Inquiries / Leads',
    description: 'The overall volume of incoming prospects or inquiries registered in your CRM pipeline across all channels.',
    hint: 'Higher volume indicates strong marketing and lead generation.',
  },
  fresh: {
    title: 'Fresh Inquiries',
    description: 'Newly added leads that have not yet been assigned or contacted by your sales/service associates.',
    hint: 'Prioritize contacting these within 15 minutes for maximum conversion.',
  },
  callBack: {
    title: 'Call Backs / Follow-ups',
    description: 'Prospective clients who requested a callback at a specific future date and time.',
    hint: 'Timely callbacks build trust and prevent deal leakage.',
  },
  interested: {
    title: 'Interested / In Pipeline',
    description: 'High-intent prospects currently evaluating offers, pricing, or product specifications.',
    hint: 'Focus deal-closing efforts and personalized offers on this stage.',
  },
  closedWon: {
    title: 'Closed Won / Converted',
    description: 'Successful revenue events — completed sales, enrolled students, or approved treatments.',
    hint: 'Measures net closed business revenue performance.',
  },
  notInterested: {
    title: 'Not Interested',
    description: 'Contacts who evaluated the offering but explicitly declined due to timing, fit, or budget.',
    hint: 'Can be re-targeted in future seasonal drip campaigns.',
  },
  closedLost: {
    title: 'Closed Lost',
    description: 'Inquiries dropped due to competitor selection, invalid details, or unresponsive status.',
    hint: 'Useful for auditing pipeline leakage reasons.',
  },
  completedVisits: {
    title: 'Completed Visits / Consultations',
    description: 'Physical site visits, clinical doctor consultations, or product demos successfully concluded.',
    hint: 'Physical or live touchpoints carry the highest closing ratio.',
  },
  scheduledVisits: {
    title: 'Scheduled Visits / Appointments',
    description: 'Upcoming scheduled appointments, tours, or demos locked in the calendar.',
    hint: 'Send automatic SMS/WhatsApp reminders to minimize no-shows.',
  },
};
