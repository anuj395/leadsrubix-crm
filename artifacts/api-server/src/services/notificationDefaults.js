/**
 * Standard CRM Event Definitions, Default Routing Matrix, and Industry Vertical Templates
 * Adheres to NAMING_CONVENTIONS.md: snake_case for DB fields, camelCase for API mappings.
 */

const STANDARD_EVENTS = [
  {
    event_key: 'lead.created',
    event_label: 'Fresh Inbound Lead Captured',
    category: 'Lead Lifecycle',
    description: 'Triggered instantly when a prospect inquires via Webhook, Meta Ads, Landing Page, Manual Entry, or API.'
  },
  {
    event_key: 'lead.assigned',
    event_label: 'Lead Assigned or Rotated',
    category: 'Lead Lifecycle',
    description: 'Triggered when a lead is routed or assigned to a sales representative or telecaller.'
  },
  {
    event_key: 'lead.transferred',
    event_label: 'Lead Transferred / Reassigned',
    category: 'Lead Lifecycle',
    description: 'Triggered when a lead is transferred from one agent to another, manually or in bulk.'
  },
  {
    event_key: 'lead.stage_changed',
    event_label: 'Lead Stage / Pipeline Transition',
    category: 'Lead Lifecycle',
    description: 'Triggered when a lead moves stage (e.g. Fresh -> Contacted -> Interested -> Site Visit).'
  },
  {
    event_key: 'task.reminder',
    event_label: 'Follow-up Callback / Task Due',
    category: 'Activity & Tasks',
    description: 'Scheduled callback or task due reminder sent prior to due time.'
  },
  {
    event_key: 'task.sla_breach',
    event_label: 'SLA Escalation (Uncontacted Lead)',
    category: 'Activity & Tasks',
    description: 'Escalation sent when a new lead is not contacted within the required SLA window.'
  },
  {
    event_key: 'deal.won',
    event_label: 'Deal Won / Revenue Milestone',
    category: 'Deals & Revenue',
    description: 'Celebratory notification sent when an opportunity is successfully closed.'
  },
  {
    event_key: 'deal.lost',
    event_label: 'Deal Lost / Dropped',
    category: 'Deals & Revenue',
    description: 'Alert sent when a deal is closed lost or dropped.'
  },
  {
    event_key: 'customer.welcome',
    event_label: 'Customer Welcome & Acknowledgment',
    category: 'Customer Facing',
    description: 'Instant external acknowledgment sent to the inquiring prospect with assigned agent details.'
  }
];

const DEFAULT_MATRIX_RULES = [
  {
    event_key: 'lead.created',
    event_label: 'Fresh Inbound Lead Captured',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: true, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: true,
        channels: { whatsapp: true, email: false }
      }
    }
  },
  {
    event_key: 'lead.assigned',
    event_label: 'Lead Assigned or Rotated',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: false, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'lead.transferred',
    event_label: 'Lead Transferred / Reassigned',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: false, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'lead.stage_changed',
    event_label: 'Lead Stage / Pipeline Transition',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: false, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: false, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'task.reminder',
    event_label: 'Follow-up Callback / Task Due',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: false,
        channels: { whatsapp: false, email: false, push: false, in_app: false }
      },
      org_admin: {
        enabled: false,
        channels: { whatsapp: false, email: false, push: false, in_app: false },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'task.sla_breach',
    event_label: 'SLA Escalation (Uncontacted Lead)',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'deal.won',
    event_label: 'Deal Won / Revenue Milestone',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: true,
        channels: { whatsapp: true, email: true }
      }
    }
  },
  {
    event_key: 'deal.lost',
    event_label: 'Deal Lost / Dropped',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: false, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: false, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: false,
        channels: { whatsapp: false, email: false }
      }
    }
  },
  {
    event_key: 'customer.welcome',
    event_label: 'Customer Welcome & Acknowledgment',
    is_enabled: true,
    routing: {
      assigned_agent: {
        enabled: false,
        channels: { whatsapp: false, email: false, push: false, in_app: false }
      },
      team_lead: {
        enabled: false,
        channels: { whatsapp: false, email: false, push: false, in_app: false }
      },
      org_admin: {
        enabled: false,
        channels: { whatsapp: false, email: false, push: false, in_app: false },
        override_phone: '',
        override_email: ''
      },
      customer: {
        enabled: true,
        channels: { whatsapp: true, email: true }
      }
    }
  }
];

/**
 * Universal Merge Tag Palette definitions
 */
const MERGE_TAGS = [
  { tag: '{{customer_name}}', label: 'Customer Full Name' },
  { tag: '{{customer_phone}}', label: 'Customer Mobile Number' },
  { tag: '{{customer_email}}', label: 'Customer Email' },
  { tag: '{{lead_source}}', label: 'Lead Source (e.g. Website, Facebook, Referral)' },
  { tag: '{{lead_type}}', label: 'Lead Type (Leads / Data)' },
  { tag: '{{assigned_agent_name}}', label: 'Assigned Sales Representative' },
  { tag: '{{assigned_agent_phone}}', label: 'Agent Contact Number' },
  { tag: '{{assigned_agent_email}}', label: 'Agent Email Address' },
  { tag: '{{previous_agent_name}}', label: 'Transferred From (Previous Agent)' },
  { tag: '{{team_lead_name}}', label: 'Reporting Team Lead' },
  { tag: '{{organization_name}}', label: 'Company / Workspace Name' },
  { tag: '{{deal_title}}', label: 'Deal Title / Opportunity' },
  { tag: '{{deal_amount}}', label: 'Deal Value / Revenue' },
  { tag: '{{deal_stage}}', label: 'Current Pipeline Stage' },
  { tag: '{{task_title}}', label: 'Task / Callback Title' },
  { tag: '{{task_due}}', label: 'Scheduled Due Date & Time' },
  { tag: '{{crm_lead_url}}', label: 'CRM Direct Deep Link' },
  // Industry specific
  { tag: '{{budget}}', label: 'Budget Range' },
  { tag: '{{location}}', label: 'Preferred Location / City' },
  { tag: '{{project_name}}', label: 'Project / Department / Course' },
  { tag: '{{property_type}}', label: 'Property Type / Speciality' }
];

/**
 * Build dynamic default industry vertical templates
 */
function getIndustryTemplates(industryId = 'temp0001') {
  const code = String(industryId || '').toLowerCase().trim();

  // Industry-specific vocabulary mapping
  let verticalConfig = {
    verticalName: 'Real Estate',
    entityLabel: 'Property Requirement',
    itemLabel: 'Project',
    detailTags: '*Project:* {{project_name}} ({{property_type}})\n*Budget:* {{budget}}\n*Location:* {{location}}',
    emailDetailRows: `
      <tr><td style="padding: 6px 0; color: #6b7280;">Project:</td><td style="font-weight: 600;">{{project_name}} ({{property_type}})</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Budget:</td><td style="font-weight: 600;">{{budget}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Location:</td><td style="font-weight: 600;">{{location}}</td></tr>
    `,
    welcomeCopy: 'Thank you for your interest in our properties at {{organization_name}}. Your property advisor {{assigned_agent_name}} will connect with you shortly.'
  };

  if (code === 'temp0002') {
    // B2B / General
    verticalConfig = {
      verticalName: 'B2B & Corporate Services',
      entityLabel: 'Business Inquiry',
      itemLabel: 'Service Solution',
      detailTags: '*Company/Account:* {{project_name}}\n*Budget/Deal:* {{budget}}\n*Location:* {{location}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Account:</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Budget:</td><td style="font-weight: 600;">{{budget}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">City:</td><td style="font-weight: 600;">{{location}}</td></tr>
      `,
      welcomeCopy: 'Thank you for contacting {{organization_name}}. Your dedicated account manager {{assigned_agent_name}} will review your requirements and reach out promptly.'
    };
  } else if (code === 'temp0003') {
    // Healthcare
    verticalConfig = {
      verticalName: 'Healthcare & Medical Clinic',
      entityLabel: 'Patient Appointment',
      itemLabel: 'Speciality / Department',
      detailTags: '*Department:* {{project_name}}\n*Consultation Type:* {{property_type}}\n*Location:* {{location}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Department:</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Type:</td><td style="font-weight: 600;">{{property_type}}</td></tr>
      `,
      welcomeCopy: 'Thank you for reaching out to {{organization_name}}. Our patient care coordinator {{assigned_agent_name}} will contact you shortly to schedule your appointment.'
    };
  } else if (code === 'temp0004') {
    // Education
    verticalConfig = {
      verticalName: 'Education & Admissions',
      entityLabel: 'Student Inquiry',
      itemLabel: 'Course / Program',
      detailTags: '*Program:* {{project_name}}\n*Campus:* {{location}}\n*Intake:* {{property_type}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Program:</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Campus:</td><td style="font-weight: 600;">{{location}}</td></tr>
      `,
      welcomeCopy: 'Welcome to {{organization_name}}! Your admissions counselor {{assigned_agent_name}} will reach out with complete curriculum and fee details.'
    };
  } else if (code === 'temp0005') {
    // Financial Advisory
    verticalConfig = {
      verticalName: 'Financial Services & Wealth',
      entityLabel: 'Investment Inquiry',
      itemLabel: 'Product / Plan',
      detailTags: '*Product:* {{project_name}}\n*Investment Amount:* {{budget}}\n*Location:* {{location}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Portfolio:*</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Investment Size:</td><td style="font-weight: 600;">{{budget}}</td></tr>
      `,
      welcomeCopy: 'Thank you for connecting with {{organization_name}}. Your financial advisor {{assigned_agent_name}} has received your request and will contact you promptly.'
    };
  } else if (code === 'temp0006') {
    // IT Services
    verticalConfig = {
      verticalName: 'IT & Technology Services',
      entityLabel: 'Technical Project Inquiry',
      itemLabel: 'Technology Stack',
      detailTags: '*Project:* {{project_name}}\n*Tech Stack:* {{property_type}}\n*Budget:* {{budget}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Project:</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Tech Stack:</td><td style="font-weight: 600;">{{property_type}}</td></tr>
      `,
      welcomeCopy: 'Thank you for your project inquiry with {{organization_name}}. Our solutions consultant {{assigned_agent_name}} will review your scope and contact you shortly.'
    };
  } else if (code === 'temp0007') {
    // Manufacturing
    verticalConfig = {
      verticalName: 'Manufacturing & Industrial',
      entityLabel: 'Industrial RFQ',
      itemLabel: 'Product Line',
      detailTags: '*Product Line:* {{project_name}}\n*Order Size:* {{budget}}\n*Delivery Destination:* {{location}}',
      emailDetailRows: `
        <tr><td style="padding: 6px 0; color: #6b7280;">Product:</td><td style="font-weight: 600;">{{project_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Destination:</td><td style="font-weight: 600;">{{location}}</td></tr>
      `,
      welcomeCopy: 'Thank you for your RFQ submission with {{organization_name}}. Your industrial sales representative {{assigned_agent_name}} will prepare quotation details.'
    };
  }

  return [
    // 1. LEAD.CREATED TEMPLATES
    {
      event_key: 'lead.created',
      channel: 'whatsapp',
      name: 'Fresh Inbound Lead WhatsApp Alert',
      subject_template: '🆕 New Lead: {{customer_name}}',
      body_template: `🆕 *New Inbound Lead Assigned to You*

*Prospect:* {{customer_name}}
*Phone:* {{customer_phone}}
*Source:* {{lead_source}}
${verticalConfig.detailTags}
*Assigned Rep:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

⚡ *Speed-to-Lead:* Please call or WhatsApp this prospect immediately to maximize conversion.`,
      cta_label: 'View in CRM',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.created',
      channel: 'email',
      name: 'Fresh Inbound Lead Email Notification',
      subject_template: '🎯 New Lead Alert: {{customer_name}} ({{lead_source}})',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <div style="border-bottom: 2px solid #272944; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #272944; margin: 0; font-size: 20px;">New Inbound Lead Received</h2>
    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">{{organization_name}} • ${verticalConfig.verticalName}</p>
  </div>
  <p style="font-size: 15px; color: #1f2937;">Hello <strong>{{assigned_agent_name}}</strong>,</p>
  <p style="font-size: 14px; color: #4b5563; line-height: 22px;">A fresh prospect has submitted an inquiry and is assigned to your CRM pipeline:</p>
  
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin: 18px 0;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Customer:</td><td style="font-weight: 700; color: #111827;">{{customer_name}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Contact Number:</td><td style="font-weight: 600; color: #111827;">{{customer_phone}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Email ID:</td><td style="font-weight: 600; color: #111827;">{{customer_email}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Source:</td><td style="font-weight: 600; color: #111827;">{{lead_source}}</td></tr>
      ${verticalConfig.emailDetailRows}
    </table>
  </div>
  <div style="text-align: center; margin-top: 24px;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #272944; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">Open Lead in CRM</a>
  </div>
</div>`,
      cta_label: 'Open Lead in CRM',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.created',
      channel: 'push',
      name: 'Fresh Inbound Lead Mobile Push',
      subject_template: '🎯 New Lead: {{customer_name}}',
      body_template: 'New inquiry from {{customer_name}} ({{lead_source}}). Tap to view and call now.',
      cta_label: 'Call Lead',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.created',
      channel: 'in_app',
      name: 'Fresh Inbound Lead In-App Alert',
      subject_template: 'New Lead Assigned: {{customer_name}}',
      body_template: '{{customer_name}} from {{lead_source}} was added to your pipeline.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 2. LEAD.ASSIGNED TEMPLATES
    {
      event_key: 'lead.assigned',
      channel: 'whatsapp',
      name: 'Lead Assigned WhatsApp Alert',
      subject_template: '👤 Lead Assigned: {{customer_name}}',
      body_template: `👤 *New Lead Assigned to You*

*Prospect:* {{customer_name}}
*Phone:* {{customer_phone}}
*Source:* {{lead_source}}
${verticalConfig.detailTags}
*Assigned Rep:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

⚡ *Speed-to-Lead:* Please call or WhatsApp this prospect promptly to initiate sales engagement.`,
      cta_label: 'View Lead in CRM',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.assigned',
      channel: 'email',
      name: 'Lead Assigned Email Notification',
      subject_template: '🎯 Lead Assigned: {{customer_name}} ({{lead_source}})',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <div style="border-bottom: 2px solid #272944; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #272944; margin: 0; font-size: 20px;">New Lead Assigned to Your Pipeline</h2>
    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">{{organization_name}} • ${verticalConfig.verticalName}</p>
  </div>
  <p style="font-size: 15px; color: #1f2937;">Hello <strong>{{assigned_agent_name}}</strong>,</p>
  <p style="font-size: 14px; color: #4b5563; line-height: 22px;">A prospect has been assigned to your CRM pipeline:</p>
  
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin: 18px 0;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Customer:</td><td style="font-weight: 700; color: #111827;">{{customer_name}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Contact Number:</td><td style="font-weight: 600; color: #111827;">{{customer_phone}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Email ID:</td><td style="font-weight: 600; color: #111827;">{{customer_email}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Source:</td><td style="font-weight: 600; color: #111827;">{{lead_source}}</td></tr>
      ${verticalConfig.emailDetailRows}
    </table>
  </div>
  <div style="text-align: center; margin-top: 24px;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #272944; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">Open Lead in CRM</a>
  </div>
</div>`,
      cta_label: 'Open Lead in CRM',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.assigned',
      channel: 'push',
      name: 'Lead Assigned Mobile Push',
      subject_template: '👤 Lead Assigned: {{customer_name}}',
      body_template: '{{customer_name}} ({{lead_source}}) assigned to you. Tap to view and call.',
      cta_label: 'View Lead',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.assigned',
      channel: 'in_app',
      name: 'Lead Assigned In-App Alert',
      subject_template: 'Lead Assigned: {{customer_name}}',
      body_template: '{{customer_name}} from {{lead_source}} was assigned to your pipeline.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 3. LEAD.TRANSFERRED TEMPLATES
    {
      event_key: 'lead.transferred',
      channel: 'whatsapp',
      name: 'Lead Reassigned WhatsApp Alert',
      subject_template: '🔄 Lead Reassigned: {{customer_name}}',
      body_template: `*Lead Reassigned Alert* 🔄

*Customer:* {{customer_name}}
*Phone:* {{customer_phone}}
*Source:* {{lead_source}}
*New Representative:* {{assigned_agent_name}}
*Transferred From:* {{previous_agent_name}}
*Workspace:* {{organization_name}}

_Please review the CRM activity history and take immediate next action._`,
      cta_label: 'View Pipeline',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.transferred',
      channel: 'email',
      name: 'Lead Transferred Email Notification',
      subject_template: '🔄 Lead Transferred: {{customer_name}} to {{assigned_agent_name}}',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <h2 style="color: #272944; margin: 0 0 16px 0; font-size: 20px;">Lead Reassigned to Your Pipeline</h2>
  <p style="font-size: 14px; color: #4b5563;">Hello <strong>{{assigned_agent_name}}</strong>,</p>
  <p style="font-size: 14px; color: #4b5563;">Prospect <strong>{{customer_name}}</strong> ({{customer_phone}}) was transferred to you from <strong>{{previous_agent_name}}</strong>.</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #272944; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">View Lead History</a>
  </div>
</div>`,
      cta_label: 'View Lead History',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.transferred',
      channel: 'push',
      name: 'Lead Reassigned Mobile Push',
      subject_template: '🔄 Lead Transferred: {{customer_name}}',
      body_template: '{{customer_name}} was reassigned to you from {{previous_agent_name}}.',
      cta_label: 'View History',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.transferred',
      channel: 'in_app',
      name: 'Lead Reassigned In-App Alert',
      subject_template: 'Lead Reassigned: {{customer_name}}',
      body_template: '{{customer_name}} was reassigned to you from {{previous_agent_name}}.',
      cta_label: 'Open',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 4. LEAD.STAGE_CHANGED TEMPLATES
    {
      event_key: 'lead.stage_changed',
      channel: 'whatsapp',
      name: 'Lead Stage Transition WhatsApp Alert',
      subject_template: '📊 Stage Transition: {{customer_name}} ➔ {{deal_stage}}',
      body_template: `📊 *Lead Stage Transition*

*Customer:* {{customer_name}}
*Phone:* {{customer_phone}}
*New Stage:* {{deal_stage}}
*Representative:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

_Lead stage updated in CRM pipeline._`,
      cta_label: 'View Lead',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.stage_changed',
      channel: 'email',
      name: 'Lead Stage Transition Email Notification',
      subject_template: '📊 Stage Transition: {{customer_name}} moved to {{deal_stage}}',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <h2 style="color: #272944; margin: 0 0 16px 0; font-size: 20px;">Lead Stage Transition</h2>
  <p style="font-size: 14px; color: #4b5563;">Prospect <strong>{{customer_name}}</strong> ({{customer_phone}}) has moved to stage <strong>{{deal_stage}}</strong>.</p>
  <p style="font-size: 14px; color: #4b5563;">Representative: <strong>{{assigned_agent_name}}</strong></p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #272944; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">View Lead in CRM</a>
  </div>
</div>`,
      cta_label: 'View Lead',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.stage_changed',
      channel: 'push',
      name: 'Lead Stage Transition Mobile Push',
      subject_template: '📊 Stage Transition: {{customer_name}}',
      body_template: '{{customer_name}} moved to {{deal_stage}} by {{assigned_agent_name}}.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'lead.stage_changed',
      channel: 'in_app',
      name: 'Lead Stage Transition In-App Alert',
      subject_template: 'Stage Transition: {{customer_name}}',
      body_template: '{{customer_name}} transitioned to {{deal_stage}}.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 3. TASK.REMINDER TEMPLATES
    {
      event_key: 'task.reminder',
      channel: 'whatsapp',
      name: 'Follow-up Callback WhatsApp Reminder',
      subject_template: '⏰ Callback Reminder: {{customer_name}}',
      body_template: `*Task / Callback Due Reminder* ⏰

*Customer:* {{customer_name}}
*Phone:* {{customer_phone}}
*Task:* {{task_title}}
*Scheduled Time:* {{task_due}}
*Representative:* {{assigned_agent_name}}

_Speed-to-contact is critical. Please complete this call on schedule._`,
      cta_label: 'Complete Task',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.reminder',
      channel: 'email',
      name: 'Follow-up Task Email Reminder',
      subject_template: '⏰ Follow-up Due: {{customer_name}} - {{task_title}}',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <h2 style="color: #272944; margin: 0 0 16px 0; font-size: 20px;">Task / Callback Due Reminder</h2>
  <p style="font-size: 14px; color: #4b5563;">Hello <strong>{{assigned_agent_name}}</strong>,</p>
  <p style="font-size: 14px; color: #4b5563;">You have an upcoming follow-up with <strong>{{customer_name}}</strong> ({{customer_phone}}):</p>
  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; font-weight: 600; color: #111827;">{{task_title}}</p>
    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">Due: {{task_due}}</p>
  </div>
  <div style="text-align: center; margin-top: 20px;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #272944; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">Log Disposition</a>
  </div>
</div>`,
      cta_label: 'Log Disposition',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.reminder',
      channel: 'push',
      name: 'Task Due Mobile Push Alert',
      subject_template: '⏰ Task Due: {{customer_name}}',
      body_template: '{{task_title}} scheduled for {{task_due}}. Tap to connect.',
      cta_label: 'Connect',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.reminder',
      channel: 'in_app',
      name: 'Task Due In-App Alert',
      subject_template: 'Follow-up Due: {{customer_name}}',
      body_template: 'Scheduled callback "{{task_title}}" is due now.',
      cta_label: 'Open Task',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 6. TASK.SLA_BREACH TEMPLATES
    {
      event_key: 'task.sla_breach',
      channel: 'whatsapp',
      name: 'SLA Escalation WhatsApp Alert',
      subject_template: '🚨 SLA Escalation: {{customer_name}}',
      body_template: `🚨 *SLA Escalation Alert*

*Prospect:* {{customer_name}}
*Phone:* {{customer_phone}}
*Source:* {{lead_source}}
*Assigned Rep:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

⚠️ *Action Overdue:* This lead has not been contacted within the required SLA window. Immediate attention required!`,
      cta_label: 'Call Lead Now',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.sla_breach',
      channel: 'email',
      name: 'SLA Escalation Email Notification',
      subject_template: '🚨 SLA Breach Alert: Uncontacted Lead {{customer_name}}',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #ef4444; border-radius: 10px;">
  <div style="border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ SLA Escalation: Uncontacted Lead</h2>
  </div>
  <p style="font-size: 14px; color: #4b5563;">Prospect <strong>{{customer_name}}</strong> ({{customer_phone}}) has exceeded the initial contact SLA window.</p>
  <p style="font-size: 14px; color: #4b5563;">Assigned Representative: <strong>{{assigned_agent_name}}</strong></p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">Take Action Now</a>
  </div>
</div>`,
      cta_label: 'Take Action Now',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.sla_breach',
      channel: 'push',
      name: 'SLA Escalation Mobile Push',
      subject_template: '🚨 SLA Escalation: {{customer_name}}',
      body_template: 'SLA breached for {{customer_name}}. Please connect immediately.',
      cta_label: 'Call Now',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'task.sla_breach',
      channel: 'in_app',
      name: 'SLA Escalation In-App Alert',
      subject_template: 'SLA Escalation: {{customer_name}}',
      body_template: 'Initial contact SLA breached for {{customer_name}}.',
      cta_label: 'Take Action',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 7. DEAL.WON TEMPLATES
    {
      event_key: 'deal.won',
      channel: 'whatsapp',
      name: 'Deal Won WhatsApp Celebration',
      subject_template: '🎉 Deal Closed: {{deal_title}}',
      body_template: `*Deal Closed / Won Milestone!* 🎉🥂

*Opportunity:* {{deal_title}}
*Customer:* {{customer_name}}
*Deal Amount:* ₹{{deal_amount}}
*Representative:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

_Congratulations to {{assigned_agent_name}} and the entire team on this win!_ 🚀`,
      cta_label: 'View Deal',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.won',
      channel: 'email',
      name: 'Deal Won Email Announcement',
      subject_template: '🎉 Deal Won: {{deal_title}} - ₹{{deal_amount}}',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #10b981; border-radius: 10px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #059669; margin: 0; font-size: 22px;">🎉 Deal Closed Won!</h2>
    <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Milestone Achieved for {{organization_name}}</p>
  </div>
  <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #065f46;">{{deal_title}}</p>
    <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800; color: #059669;">₹{{deal_amount}}</p>
    <p style="margin: 8px 0 0 0; font-size: 13px; color: #047857;">Closed by {{assigned_agent_name}}</p>
  </div>
  <div style="text-align: center; margin-top: 24px;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">View Deal Summary</a>
  </div>
</div>`,
      cta_label: 'View Deal Summary',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.won',
      channel: 'push',
      name: 'Deal Won Mobile Push Alert',
      subject_template: '🎉 Deal Won: ₹{{deal_amount}}',
      body_template: 'Congratulations! {{deal_title}} was marked Closed Won by {{assigned_agent_name}}.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.won',
      channel: 'in_app',
      name: 'Deal Won In-App Alert',
      subject_template: 'Deal Closed Won: {{deal_title}}',
      body_template: '{{assigned_agent_name}} successfully closed {{deal_title}} for ₹{{deal_amount}}.',
      cta_label: 'View Deal',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 8. DEAL.LOST TEMPLATES
    {
      event_key: 'deal.lost',
      channel: 'whatsapp',
      name: 'Deal Lost WhatsApp Notification',
      subject_template: '📉 Deal Closed Lost: {{deal_title}}',
      body_template: `📉 *Deal Marked Closed Lost*

*Opportunity:* {{deal_title}}
*Customer:* {{customer_name}}
*Value:* ₹{{deal_amount}}
*Representative:* {{assigned_agent_name}}
*Workspace:* {{organization_name}}

_Opportunity closed as dropped/lost in CRM._`,
      cta_label: 'View Deal',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.lost',
      channel: 'email',
      name: 'Deal Lost Email Notification',
      subject_template: '📉 Deal Closed Lost: {{deal_title}} (₹{{deal_amount}})',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <h2 style="color: #6b7280; margin: 0 0 16px 0; font-size: 20px;">Deal Marked Closed Lost</h2>
  <p style="font-size: 14px; color: #4b5563;">Opportunity <strong>{{deal_title}}</strong> (₹{{deal_amount}}) was marked Closed Lost by <strong>{{assigned_agent_name}}</strong>.</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="{{crm_lead_url}}" style="display: inline-block; background-color: #4b5563; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">View Deal Summary</a>
  </div>
</div>`,
      cta_label: 'View Deal Summary',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.lost',
      channel: 'push',
      name: 'Deal Lost Mobile Push Alert',
      subject_template: '📉 Deal Closed Lost: {{deal_title}}',
      body_template: '{{deal_title}} was marked Closed Lost by {{assigned_agent_name}}.',
      cta_label: 'View',
      cta_url_template: '{{crm_lead_url}}'
    },
    {
      event_key: 'deal.lost',
      channel: 'in_app',
      name: 'Deal Lost In-App Alert',
      subject_template: 'Deal Closed Lost: {{deal_title}}',
      body_template: '{{deal_title}} was marked Closed Lost by {{assigned_agent_name}}.',
      cta_label: 'View Deal',
      cta_url_template: '{{crm_lead_url}}'
    },

    // 5. CUSTOMER.WELCOME TEMPLATES
    {
      event_key: 'customer.welcome',
      channel: 'whatsapp',
      name: 'Customer Welcome WhatsApp Greeting',
      subject_template: 'Welcome to {{organization_name}}',
      body_template: `Hello {{customer_name}}, 👋

${verticalConfig.welcomeCopy}

*Your Executive:* {{assigned_agent_name}}
*Direct Phone:* {{assigned_agent_phone}}

Please feel free to reply directly to this chat for any questions. We are glad to assist you!

Best regards,
*{{organization_name}}*`,
      cta_label: 'Visit Website',
      cta_url_template: ''
    },
    {
      event_key: 'customer.welcome',
      channel: 'email',
      name: 'Customer Welcome Email Greeting',
      subject_template: 'Welcome to {{organization_name}} - Your Inquiry is Received',
      body_template: `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
  <h2 style="color: #272944; margin: 0 0 16px 0; font-size: 22px;">Welcome to {{organization_name}}</h2>
  <p style="font-size: 15px; color: #374151; line-height: 24px;">Dear <strong>{{customer_name}}</strong>,</p>
  <p style="font-size: 14px; color: #4b5563; line-height: 22px;">${verticalConfig.welcomeCopy}</p>
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #e5e7eb;">
    <p style="margin: 0; font-size: 13px; color: #6b7280;">Your Assigned Advisor:</p>
    <p style="margin: 4px 0; font-size: 16px; font-weight: 700; color: #111827;">{{assigned_agent_name}}</p>
    <p style="margin: 0; font-size: 14px; color: #4b5563;">Mobile: {{assigned_agent_phone}} | Email: {{assigned_agent_email}}</p>
  </div>
  <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">Thank you for choosing {{organization_name}}.</p>
</div>`,
      cta_label: 'Contact Advisor',
      cta_url_template: ''
    }
  ];
}

module.exports = {
  STANDARD_EVENTS,
  DEFAULT_MATRIX_RULES,
  MERGE_TAGS,
  getIndustryTemplates
};
