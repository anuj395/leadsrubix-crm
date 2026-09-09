export interface DefaultWidgetConfig {
  id: string
  type: 'KPI' | 'CHART' | 'TABLE'
  title: string
  color?: string
  bg?: string
  icon?: string
  chart_type?: string
  data_key?: string
  columns?: Array<{ key: string; label: string }>
}

export interface DefaultSectionConfig {
  id: string
  title: string
  order: number
  is_active: boolean
  widgets: DefaultWidgetConfig[]
}

export interface DefaultTabConfig {
  id: number
  label: string
  sections: DefaultSectionConfig[]
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
          { id: 'totalLeads', type: 'KPI', title: 'Total Enquiries', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
          { id: 'fresh', type: 'KPI', title: 'Fresh Leads', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
          { id: 'callBack', type: 'KPI', title: 'Call Back', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PhoneCallbackIcon', data_key: 'cards.callBack' },
          { id: 'interested', type: 'KPI', title: 'Interested / Site Visit', color: '#EAB308', bg: 'rgba(234,179,8,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
          { id: 'closedWon', type: 'KPI', title: 'Token / Booked', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' },
          { id: 'notInterested', type: 'KPI', title: 'Not Interested', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CancelIcon', data_key: 'cards.notInterested' },
          { id: 'closedLost', type: 'KPI', title: 'Closed Lost', color: '#F97316', bg: 'rgba(249,115,22,0.06)', icon: 'TrendingDownIcon', data_key: 'cards.closedLost' },
          { id: 'completedVisits', type: 'KPI', title: 'Completed Visits', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'EventAvailableIcon', data_key: 'cards.completedVisits' },
          { id: 'scheduledVisits', type: 'KPI', title: 'Scheduled Visits', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'EventIcon', data_key: 'cards.scheduledVisits' }
        ]
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
              { key: 'associate', label: 'Associate/Group' },
              { key: 'total', label: 'Total' },
              { key: 'fresh', label: 'Fresh' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'interested', label: 'Interested' },
              { key: 'won', label: 'Won' },
              { key: 'notInterested', label: 'Not Interested' },
              { key: 'lost', label: 'Lost' },
              { key: 'completedVisits', label: 'Completed Visits' }
            ]
          },
          {
            id: 'contacts_callback',
            type: 'TABLE',
            title: 'Callback Reasons Summary',
            data_key: 'contacts.callBackReasons',
            columns: [
              { key: 'associate', label: 'Associate/Group' },
              { key: 'total', label: 'Total Call Backs' }
            ]
          },
          {
            id: 'contacts_conversion_donut',
            type: 'CHART',
            title: 'Leads Conversion Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          },
          {
            id: 'contacts_callback_chart',
            type: 'CHART',
            title: 'Callback Reasons Distribution',
            chart_type: 'bar',
            data_key: 'contacts.callBackReasons'
          }
        ]
      }
    ]
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
              { key: 'associate', label: 'Associate/Group' },
              { key: 'total', label: 'Total Completed' },
              { key: 'meeting', label: 'Meeting' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'siteVisit', label: 'Site Visit' }
            ]
          },
          {
            id: 'tasks_completed_donut',
            type: 'CHART',
            title: 'Completed Tasks Distribution',
            chart_type: 'rose',
            data_key: 'tasks.completedChartData'
          }
        ]
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
              { key: 'associate', label: 'Associate/Group' },
              { key: 'total', label: 'Total Pending' },
              { key: 'meeting', label: 'Meeting' },
              { key: 'callBack', label: 'Call Back' },
              { key: 'siteVisit', label: 'Site Visit' }
            ]
          },
          {
            id: 'tasks_pending_donut',
            type: 'CHART',
            title: 'Pending Tasks Distribution',
            chart_type: 'bar',
            data_key: 'tasks.pendingChartData'
          }
        ]
      }
    ]
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
            title: 'Calling Trend',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends'
          },
          {
            id: 'call_logs_table',
            type: 'TABLE',
            title: 'Call Duration Summary',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Associate/Group' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0 Sec' },
              { key: 'duration0_30', label: '0-30 Sec' },
              { key: 'duration31_60', label: '31-60 Sec' },
              { key: 'duration61_120', label: '61-120 Sec' },
              { key: 'durationAbove120', label: '>120 Sec' }
            ]
          }
        ]
      }
    ]
  }
]

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
          { id: 'totalPatients', type: 'KPI', title: 'Total Patient Inquiries', color: '#0D9488', bg: 'rgba(13,148,136,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
          { id: 'freshInquiries', type: 'KPI', title: 'Fresh Inquiries', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
          { id: 'callBack', type: 'KPI', title: 'Follow-up / Call Back', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PhoneCallbackIcon', data_key: 'cards.callBack' },
          { id: 'consulted', type: 'KPI', title: 'Consulted / Diagnosis', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
          { id: 'treatmentApproved', type: 'KPI', title: 'Treatment Approved (Won)', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' },
          { id: 'declined', type: 'KPI', title: 'Not Interested / Declined', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CancelIcon', data_key: 'cards.notInterested' },
          { id: 'dropped', type: 'KPI', title: 'Dropped Cases (Lost)', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', icon: 'TrendingDownIcon', data_key: 'cards.closedLost' },
          { id: 'completedConsultations', type: 'KPI', title: 'Completed Consultations', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'EventAvailableIcon', data_key: 'cards.completedVisits' },
          { id: 'scheduledConsultations', type: 'KPI', title: 'Scheduled Consultations', color: '#0284C7', bg: 'rgba(2,132,199,0.06)', icon: 'EventIcon', data_key: 'cards.scheduledVisits' }
        ]
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
              { key: 'associate', label: 'Doctor / Coordinator' },
              { key: 'total', label: 'Total Inquiries' },
              { key: 'fresh', label: 'Fresh' },
              { key: 'callBack', label: 'Follow-up' },
              { key: 'interested', label: 'Consulted' },
              { key: 'won', label: 'Treatment Approved' },
              { key: 'notInterested', label: 'Declined' },
              { key: 'lost', label: 'Dropped' },
              { key: 'completedVisits', label: 'Completed Consultations' }
            ]
          },
          {
            id: 'contacts_callback',
            type: 'TABLE',
            title: 'Follow-up / Reschedule Reasons Summary',
            data_key: 'contacts.callBackReasons',
            columns: [
              { key: 'associate', label: 'Doctor / Coordinator' },
              { key: 'total', label: 'Total Follow-ups' }
            ]
          },
          {
            id: 'contacts_conversion_donut',
            type: 'CHART',
            title: 'Patient Care & Conversion Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          },
          {
            id: 'contacts_callback_chart',
            type: 'CHART',
            title: 'Follow-up Reasons Distribution',
            chart_type: 'bar',
            data_key: 'contacts.callBackReasons'
          }
        ]
      }
    ]
  },
  {
    id: 1,
    label: 'Consultations & Clinical Tasks',
    sections: [
      {
        id: 'tasks_overview',
        title: 'Completed Consultation Metrics',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'tasks_completed',
            type: 'TABLE',
            title: 'Completed Consultations by Doctor / Staff',
            data_key: 'tasks.completedTasks',
            columns: [
              { key: 'associate', label: 'Doctor / Coordinator' },
              { key: 'total', label: 'Total Completed' },
              { key: 'meeting', label: 'Clinical Meeting' },
              { key: 'callBack', label: 'Telehealth / Follow-up' },
              { key: 'siteVisit', label: 'In-Clinic Consultation' }
            ]
          },
          {
            id: 'tasks_completed_donut',
            type: 'CHART',
            title: 'Completed Consultations Distribution',
            chart_type: 'rose',
            data_key: 'tasks.completedChartData'
          }
        ]
      },
      {
        id: 'tasks_pending_section',
        title: 'Pending Consultation Metrics',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'tasks_pending',
            type: 'TABLE',
            title: 'Pending Consultations by Doctor / Staff',
            data_key: 'tasks.pendingTasks',
            columns: [
              { key: 'associate', label: 'Doctor / Coordinator' },
              { key: 'total', label: 'Total Pending' },
              { key: 'meeting', label: 'Clinical Meeting' },
              { key: 'callBack', label: 'Telehealth / Follow-up' },
              { key: 'siteVisit', label: 'In-Clinic Consultation' }
            ]
          },
          {
            id: 'tasks_pending_donut',
            type: 'CHART',
            title: 'Pending Consultations Distribution',
            chart_type: 'bar',
            data_key: 'tasks.pendingChartData'
          }
        ]
      }
    ]
  },
  {
    id: 2,
    label: 'Telehealth & Calling Analytics',
    sections: [
      {
        id: 'calling_insights',
        title: 'Telehealth & Consultation Call Durations',
        order: 0,
        is_active: true,
        widgets: [
          {
            id: 'call_trends_trend',
            type: 'CHART',
            title: 'Telehealth & Call Trends',
            chart_type: 'trend',
            data_key: 'callLogs.callingTrends'
          },
          {
            id: 'call_logs_table',
            type: 'TABLE',
            title: 'Consultation Call Duration Summary',
            data_key: 'callLogs.callLogSummary',
            columns: [
              { key: 'associate', label: 'Doctor / Coordinator' },
              { key: 'total', label: 'Total Calls' },
              { key: 'duration0', label: '0 Sec' },
              { key: 'duration0_30', label: '0-30 Sec' },
              { key: 'duration31_60', label: '31-60 Sec' },
              { key: 'duration61_120', label: '61-120 Sec' },
              { key: 'durationAbove120', label: '>120 Sec' }
            ]
          }
        ]
      }
    ]
  }
]

// ── E-COMMERCE BASELINE (temp0002) ──────────────────────────────────────────
export const ECOMMERCE_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Store & Sales Overview',
    sections: [
      {
        id: 'ecom_kpis',
        title: 'Key E-Commerce Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalOrders', type: 'KPI', title: 'Total Orders', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'ShoppingBagIcon', data_key: 'cards.totalLeads' },
          { id: 'cartRecovered', type: 'KPI', title: 'Cart Recovered', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'ShoppingCartIcon', data_key: 'cards.fresh' },
          { id: 'repeatCustomers', type: 'KPI', title: 'Repeat Buyers', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'RepeatIcon', data_key: 'cards.interested' },
          { id: 'grossSales', type: 'KPI', title: 'Gross Sales', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'AttachMoneyIcon', data_key: 'cards.closedWon' },
          { id: 'refundClaims', type: 'KPI', title: 'Refund Claims', color: '#F97316', bg: 'rgba(249,115,22,0.06)', icon: 'AssignmentReturnIcon', data_key: 'cards.notInterested' }
        ]
      },
      {
        id: 'ecom_breakdown',
        title: 'Order Status & Conversion',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'ecom_table',
            type: 'TABLE',
            title: 'Order Fulfillment Breakdown',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Store Rep' },
              { key: 'total', label: 'Total Orders' },
              { key: 'fresh', label: 'Pending Payment' },
              { key: 'interested', label: 'Processing' },
              { key: 'won', label: 'Shipped' },
              { key: 'lost', label: 'Canceled' }
            ]
          },
          {
            id: 'ecom_donut',
            type: 'CHART',
            title: 'Fulfillment Status Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          }
        ]
      }
    ]
  }
]

// ── EDUCATION BASELINE (temp0004) ───────────────────────────────────────────
export const EDUCATION_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Admissions & Enrollment',
    sections: [
      {
        id: 'edu_kpis',
        title: 'Enrollment Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'totalApplicants', type: 'KPI', title: 'Total Applicants', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'SchoolIcon', data_key: 'cards.totalLeads' },
          { id: 'counseling', type: 'KPI', title: 'Counseling Scheduled', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
          { id: 'entrancePassed', type: 'KPI', title: 'Entrance Passed', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.interested' },
          { id: 'enrolled', type: 'KPI', title: 'Total Enrolled', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'GradeIcon', data_key: 'cards.closedWon' }
        ]
      },
      {
        id: 'edu_breakdown',
        title: 'Program Application Summary',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'edu_table',
            type: 'TABLE',
            title: 'Degree / Program Conversion',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Admissions Counselor' },
              { key: 'total', label: 'Total Inquiries' },
              { key: 'fresh', label: 'Counseling' },
              { key: 'interested', label: 'Test Passed' },
              { key: 'won', label: 'Enrolled' }
            ]
          },
          {
            id: 'edu_donut',
            type: 'CHART',
            title: 'Course Admissions Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          }
        ]
      }
    ]
  }
]

// ── FINANCIAL SERVICES BASELINE (temp0005) ───────────────────────────────────
export const FINANCIAL_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Loan & Policy Portfolio',
    sections: [
      {
        id: 'fin_kpis',
        title: 'Portfolio & Application KPIs',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'loanApps', type: 'KPI', title: 'Applications', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'AccountBalanceIcon', data_key: 'cards.totalLeads' },
          { id: 'kycDone', type: 'KPI', title: 'KYC Verified', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'VerifiedUserIcon', data_key: 'cards.fresh' },
          { id: 'sanctioned', type: 'KPI', title: 'Underwriting Passed', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
          { id: 'disbursed', type: 'KPI', title: 'Disbursed', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' }
        ]
      },
      {
        id: 'fin_breakdown',
        title: 'Financial Product Conversion',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'fin_table',
            type: 'TABLE',
            title: 'Product Line Performance',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Financial Advisor' },
              { key: 'total', label: 'Applications' },
              { key: 'fresh', label: 'KYC Done' },
              { key: 'interested', label: 'Sanctioned' },
              { key: 'won', label: 'Disbursed' }
            ]
          },
          {
            id: 'fin_donut',
            type: 'CHART',
            title: 'Product Line Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          }
        ]
      }
    ]
  }
]

// ── IT & TECH SERVICES BASELINE (temp0006) ───────────────────────────────────
export const IT_TECH_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'RFP & Proposal Pipeline',
    sections: [
      {
        id: 'it_kpis',
        title: 'Tech Pipeline Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'activeRfps', type: 'KPI', title: 'RFPs Received', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'ComputerIcon', data_key: 'cards.totalLeads' },
          { id: 'techDiscovery', type: 'KPI', title: 'Tech Discovery', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'SearchIcon', data_key: 'cards.fresh' },
          { id: 'proposalsSent', type: 'KPI', title: 'Proposals Sent', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'DescriptionIcon', data_key: 'cards.interested' },
          { id: 'sowSigned', type: 'KPI', title: 'SOW Signed', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' }
        ]
      },
      {
        id: 'it_breakdown',
        title: 'Service Line RFP Conversion',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'it_table',
            type: 'TABLE',
            title: 'Service Line Conversion',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Tech Lead / BD' },
              { key: 'total', label: 'Total RFPs' },
              { key: 'fresh', label: 'Discovery' },
              { key: 'interested', label: 'Proposal Sent' },
              { key: 'won', label: 'SOW Signed' }
            ]
          },
          {
            id: 'it_donut',
            type: 'CHART',
            title: 'Service Line Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          }
        ]
      }
    ]
  }
]

// ── MANUFACTURING BASELINE (temp0007) ───────────────────────────────────────
export const MANUFACTURING_BASELINE_TABS: DefaultTabConfig[] = [
  {
    id: 0,
    label: 'Dealer & Supply Network',
    sections: [
      {
        id: 'mfg_kpis',
        title: 'Supply Chain Metrics',
        order: 0,
        is_active: true,
        widgets: [
          { id: 'dealerRfqs', type: 'KPI', title: 'Dealer RFQs', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'BuildIcon', data_key: 'cards.totalLeads' },
          { id: 'moqApproved', type: 'KPI', title: 'MOQ Approved', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.fresh' },
          { id: 'productionBatches', type: 'KPI', title: 'In Production', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PrecisionManufacturingIcon', data_key: 'cards.interested' },
          { id: 'shippedOrders', type: 'KPI', title: 'Shipped Orders', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'LocalShippingIcon', data_key: 'cards.closedWon' }
        ]
      },
      {
        id: 'mfg_breakdown',
        title: 'Product Line Order Breakdown',
        order: 1,
        is_active: true,
        widgets: [
          {
            id: 'mfg_table',
            type: 'TABLE',
            title: 'Dealer Category Order Summary',
            data_key: 'contacts.feedbackSummary',
            columns: [
              { key: 'associate', label: 'Dealer Rep' },
              { key: 'total', label: 'Total RFQs' },
              { key: 'fresh', label: 'MOQ Approved' },
              { key: 'interested', label: 'Production' },
              { key: 'won', label: 'Shipped' }
            ]
          },
          {
            id: 'mfg_donut',
            type: 'CHART',
            title: 'Product Category Distribution',
            chart_type: 'donut',
            data_key: 'contacts.chartData'
          }
        ]
      }
    ]
  }
]

// Single source of truth baseline resolver
export function getIndustryBaselineTabs(industryCode?: string | null): DefaultTabConfig[] {
  if (!industryCode) {
    return JSON.parse(JSON.stringify(REAL_ESTATE_BASELINE_TABS))
  }
  const code = String(industryCode).toLowerCase().trim()
  if (code.includes('health') || code.includes('medic') || code.includes('clinic') || code.includes('hospital') || code.includes('patient') || code === 'temp0003') {
    return JSON.parse(JSON.stringify(HEALTHCARE_BASELINE_TABS))
  }
  if (code.includes('ecom') || code.includes('store') || code.includes('retail') || code.includes('shop') || code === 'temp0002') {
    return JSON.parse(JSON.stringify(ECOMMERCE_BASELINE_TABS))
  }
  if (code.includes('edu') || code.includes('school') || code.includes('college') || code.includes('admiss') || code === 'temp0004') {
    return JSON.parse(JSON.stringify(EDUCATION_BASELINE_TABS))
  }
  if (code.includes('fin') || code.includes('bank') || code.includes('loan') || code.includes('insur') || code === 'temp0005') {
    return JSON.parse(JSON.stringify(FINANCIAL_BASELINE_TABS))
  }
  if (code.includes('tech') || code.includes('soft') || code.includes('it') || code.includes('rfp') || code === 'temp0006') {
    return JSON.parse(JSON.stringify(IT_TECH_BASELINE_TABS))
  }
  if (code.includes('mfg') || code.includes('manufactur') || code.includes('factory') || code.includes('dealer') || code === 'temp0007') {
    return JSON.parse(JSON.stringify(MANUFACTURING_BASELINE_TABS))
  }
  return JSON.parse(JSON.stringify(REAL_ESTATE_BASELINE_TABS))
}

// Backward compatibility export
export const DEFAULT_BASELINE_TABS: DefaultTabConfig[] = REAL_ESTATE_BASELINE_TABS
