const nodemailer = require('nodemailer');
const config = require('../config');

// Primary Gateway: AWS SES Transporter (ap-south-1)
const awsSesTransporter = nodemailer.createTransport({
  host: config.awsSesSmtpHost || config.smtpHost,
  port: config.awsSesSmtpPort || config.smtpPort,
  secure: (config.awsSesSmtpPort || config.smtpPort) === 465, // false for 587 STARTTLS
  auth: {
    user: config.awsSesSmtpUser || config.smtpUser,
    pass: config.awsSesSmtpPass || config.smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Secondary Gateway: Google Workspace SMTP Transporter (Auto-Failover)
const googleTransporter = nodemailer.createTransport({
  host: config.googleSmtpHost || 'smtp.gmail.com',
  port: config.googleSmtpPort || 465,
  secure: (config.googleSmtpPort || 465) === 465, // true for 465 SSL
  auth: {
    user: config.googleSmtpUser || 'info@leadsrubix.com',
    pass: config.googleSmtpPass || 'jucupgkwmniheujp',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Backwards-compatible primary transporter export
const transporter = awsSesTransporter;

/**
 * Send login credentials to a newly created organization user.
 * @param {Object} params
 * @param {string} params.orgName
 * @param {string} params.userName
 * @param {string} params.emailAddress
 * @param {string} params.tempPassword
 */
async function sendCredentialsEmail({ orgName, userName, emailAddress, tempPassword }) {
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const loginUrl = `${frontendBase}/login`;

  const htmlContent = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e5e7eb;">
        
        <!-- Header / Logo Area -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h2 style="color: #272944; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px; margin-bottom: 0;">Your Premium CRM Workspace</p>
        </div>

        <h3 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">Welcome to Your New Account</h3>
        
        <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-top: 0; margin-bottom: 24px;">
          Hello <strong>${userName}</strong>,<br/>
          An account has been created for you under the organization <strong>${orgName}</strong>. You can now log in using the credentials details below:
        </p>

        <!-- Credentials Card -->
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 140px; font-weight: 500;">Organization:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${orgName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Username / Email:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600; word-break: break-all;">${emailAddress}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Temp Password:</td>
              <td style="padding: 6px 0; color: #dc2626; font-weight: 700; font-family: monospace; font-size: 16px; letter-spacing: 0.5px;">${tempPassword}</td>
            </tr>
          </table>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(39, 41, 68, 0.25);">
            Log In to Workspace
          </a>
        </div>

        <!-- Warning / Security Alert Note -->
        <div style="border-left: 4px solid #f59e0b; background-color: #fef3c7; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; line-height: 20px; color: #b45309; font-weight: 500;">
            <strong>Important Note:</strong> For security purposes, please ensure you change this temporary password immediately after your first login.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 18px;">
          If you did not request this account, please ignore this email or contact your super administrator.
        </p>

      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Leads Rubix CRM" <${config.smtpUser}>`,
    to: emailAddress,
    subject: 'Welcome to Leads Rubix - Your Account Credentials',
    html: htmlContent,
  };

  // Fallback credentials log file
  const fs = require('fs');
  const path = require('path');
  const workspaceRoot = path.join(__dirname, '../../../..');
  const logFile = path.join(workspaceRoot, 'sent_emails.txt');
  const emailLogEntry = `
========================================
Timestamp: ${new Date().toISOString()}
To: ${emailAddress}
Subject: Welcome to Leads Rubix - Your Account Credentials
Organization: ${orgName}
Username / Email: ${emailAddress}
Temp Password: ${tempPassword}
========================================\n`;

  try {
    fs.appendFileSync(logFile, emailLogEntry, 'utf8');
    console.log(`[mailer] Account credentials written to fallback log file: ${logFile}`);
  } catch (fsErr) {
    console.error('[mailer] Failed to write fallback email file:', fsErr);
  }

  try {
    const emailQueueService = require('../services/emailQueueService');
    await emailQueueService.enqueueEmail({
      organizationId: null,
      recipient: emailAddress,
      subject: 'Welcome to Leads Rubix - Your Account Credentials',
      htmlContent: htmlContent,
      triggerAction: 'user_created'
    }).catch(() => null);

    const dispatchRes = await sendWithDualEngineFailover({
      to: emailAddress,
      from: mailOptions.from,
      subject: mailOptions.subject,
      html: htmlContent,
      organizationId: null
    });

    if (!dispatchRes.success) {
      throw new Error(dispatchRes.error || 'Credentials dispatch failed');
    }
    console.log(`[mailer] Account credentials email delivered to ${emailAddress} via ${dispatchRes.provider}`);
  } catch (error) {
    console.error(`[mailer] Error sending credentials email to ${emailAddress}:`, error);
  }
}

async function sendResetPasswordEmail({ emailAddress, resetLink }) {
  const htmlContent = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e5e7eb;">
        
        <!-- Header / Logo Area -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h2 style="color: #272944; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px; margin-bottom: 0;">Password Reset Request</p>
        </div>

        <h3 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">Reset Your Password</h3>
        
        <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-top: 0; margin-bottom: 24px;">
          Hello,<br/>
          We received a request to reset the password for your account associated with <strong>${emailAddress}</strong>. Click the button below to reset your password. This link is valid for 1 hour.
        </p>

        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(39, 41, 68, 0.25);">
            Reset Password
          </a>
        </div>

        <p style="font-size: 13px; line-height: 20px; color: #4b5563; margin-bottom: 24px;">
          If the button above does not work, copy and paste the following link into your web browser: <br/>
          <a href="${resetLink}" style="color: #4F6AF5; word-break: break-all;">${resetLink}</a>
        </p>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 18px;">
          If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>

      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Leads Rubix CRM" <${config.smtpUser}>`,
    to: emailAddress,
    subject: 'Leads Rubix CRM - Password Reset Link',
    html: htmlContent,
  };

  try {
    const dispatchRes = await sendWithDualEngineFailover({
      to: emailAddress,
      from: mailOptions.from,
      subject: mailOptions.subject,
      html: htmlContent,
      organizationId: null
    });

    if (!dispatchRes.success) {
      throw new Error(dispatchRes.error || 'Password reset dispatch failed');
    }
    console.log(`[mailer] Password reset email delivered to ${emailAddress} via ${dispatchRes.provider}`);
  } catch (error) {
    console.error(`[mailer] Error sending password reset email to ${emailAddress}:`, error);
    throw error;
  }
}

function logFallbackEmail({ to, subject, details }) {
  const fs = require('fs');
  const path = require('path');
  const workspaceRoot = path.join(__dirname, '../../../..');
  const logFile = path.join(workspaceRoot, 'sent_emails.txt');

  const emailLogEntry = `
========================================
Timestamp: ${new Date().toISOString()}
To: ${to}
Subject: ${subject}
Details: ${JSON.stringify(details, null, 2)}
========================================\n`;
  try {
    fs.appendFileSync(logFile, emailLogEntry, 'utf8');
    console.log(`[mailer] Email logged to fallback file: ${logFile}`);
  } catch (fsErr) {
    console.error('[mailer] Failed to write fallback email file:', fsErr);
  }
}

async function sendNewLeadEmail({ toEmail, agentName, customerName, contactNumber, email, source, leadId, orgName, leadType, specialtyOrDepartment, organizationId }) {
  if (!toEmail) return;

  const emailQueueService = require('../services/emailQueueService');
  const orgId = organizationId || 'GLOBAL';

  // Load custom workspace template if available
  const { templates } = await getTransporterForOrganization(orgId);
  const customTemplate = templates?.find(t => t.triggerKey === 'lead_created' && t.isEnabled !== false);

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const leadUrl = leadId ? `${frontendBase}/leads/contacts/${leadId}` : `${frontendBase}/leads/contacts`;

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Agent',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || 'Direct Entry',
    orgName: orgName || 'your organization',
    leadType: leadType || 'Lead',
    specialtyOrDepartment: specialtyOrDepartment || '',
    leadUrl,
    loginUrl: `${frontendBase}/login`
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `New Lead Assigned: ${customerName || 'Unnamed Lead'}`;
  const defaultHtml = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #272944; margin: 0; font-size: 24px; font-weight: 800;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px; margin-bottom: 0;">New Lead Notification</p>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">New Lead Assigned</h3>
        <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-top: 0; margin-bottom: 20px;">
          Hello <strong>${agentName || 'Agent'}</strong>,<br/>
          A new lead has been created and assigned to you in <strong>${orgName || 'your organization'}</strong>.
        </p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 140px; font-weight: 500;">Lead Name:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${customerName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Phone / Contact:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${contactNumber || 'N/A'}</td>
            </tr>
            ${email ? `<tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Email:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${email}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Source:</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">${source || 'Direct Entry'}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${leadUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 8px;">
            View Lead Details
          </a>
        </div>
      </div>
    </div>
  `;

  const htmlContent = customTemplate?.bodyHtml
    ? replaceTemplateVariables(customTemplate.bodyHtml, dataMap)
    : defaultHtml;

  // Enqueue into high-speed non-blocking Queue Service
  await emailQueueService.enqueueEmail({
    organizationId: orgId,
    leadId: leadId ? String(leadId) : null,
    recipient: toEmail,
    subject,
    htmlContent,
    triggerAction: 'lead_created'
  });
}

async function sendLeadTransferredEmail({ toEmail, agentName, customerName, contactNumber, email, source, leadId, orgName, transferredBy, reason, organizationId }) {
  if (!toEmail) return;

  const emailQueueService = require('../services/emailQueueService');
  const orgId = organizationId || 'GLOBAL';

  const { templates } = await getTransporterForOrganization(orgId);
  const customTemplate = templates?.find(t => t.triggerKey === 'lead_transferred' && t.isEnabled !== false);

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const leadUrl = leadId ? `${frontendBase}/leads/contacts/${leadId}` : `${frontendBase}/leads/contacts`;

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Agent',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || 'Direct Entry',
    orgName: orgName || 'your organization',
    transferredBy: transferredBy || 'Admin',
    reason: reason || '',
    leadUrl,
    loginUrl: `${frontendBase}/login`
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `Lead Transferred to You: ${customerName || 'Unnamed Lead'}`;
  const defaultHtml = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #272944; margin: 0; font-size: 24px; font-weight: 800;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px; margin-bottom: 0;">Lead Reassignment Notification</p>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">Lead Transferred to You</h3>
        <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-top: 0; margin-bottom: 20px;">
          Hello <strong>${agentName || 'Agent'}</strong>,<br/>
          Lead <strong>${customerName || 'N/A'}</strong> has been reassigned to you by <strong>${transferredBy || 'Admin'}</strong>.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${leadUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 8px;">
            View Transferred Lead
          </a>
        </div>
      </div>
    </div>
  `;

  const htmlContent = customTemplate?.bodyHtml
    ? replaceTemplateVariables(customTemplate.bodyHtml, dataMap)
    : defaultHtml;

  await emailQueueService.enqueueEmail({
    organizationId: orgId,
    leadId: leadId ? String(leadId) : null,
    recipient: toEmail,
    subject,
    htmlContent,
    triggerAction: 'lead_transferred'
  });
}

async function sendThirdPartyLeadEmail({ toEmail, agentName, customerName, contactNumber, email, source, leadId, orgName, campaign, adset, organizationId }) {
  if (!toEmail) return;

  const emailQueueService = require('../services/emailQueueService');
  const orgId = organizationId || 'GLOBAL';

  const { templates } = await getTransporterForOrganization(orgId);
  const customTemplate = templates?.find(t => t.triggerKey === 'webhook_ingested' && t.isEnabled !== false);

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const leadUrl = leadId ? `${frontendBase}/leads/contacts/${leadId}` : `${frontendBase}/leads/contacts`;

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Team',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || '3rd-Party Integration',
    orgName: orgName || 'your organization',
    campaign: campaign || '',
    adset: adset || '',
    leadUrl,
    loginUrl: `${frontendBase}/login`
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `[${source || '3rd Party'}] New Lead: ${customerName || 'Unnamed'}`;
  const defaultHtml = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #272944; margin: 0; font-size: 24px; font-weight: 800;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px; margin-bottom: 0;">3rd-Party Lead Alert (${source || 'Webhook'})</p>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">New 3rd-Party Lead Received</h3>
        <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin-top: 0; margin-bottom: 20px;">
          Hello <strong>${agentName || 'Team'}</strong>,<br/>
          A new lead has arrived from <strong>${source || '3rd-Party Integration'}</strong> and assigned to you.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${leadUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 8px;">
            Open Lead in CRM
          </a>
        </div>
      </div>
    </div>
  `;

  const htmlContent = customTemplate?.bodyHtml
    ? replaceTemplateVariables(customTemplate.bodyHtml, dataMap)
    : defaultHtml;

  await emailQueueService.enqueueEmail({
    organizationId: orgId,
    leadId: leadId ? String(leadId) : null,
    recipient: toEmail,
    subject,
    htmlContent,
    triggerAction: 'webhook_ingested'
  });
}

/**
 * Send a single consolidated Bulk Lead Reassignment Digest Email.
 * @param {Object} params
 * @param {string} params.toEmail
 * @param {string} params.agentName
 * @param {Array<Object>} params.leads
 * @param {string} params.orgName
 * @param {string} params.transferredBy
 * @param {string} params.reason
 * @param {string} params.organizationId
 */
async function sendBulkLeadTransferredEmail({ toEmail, agentName, leads = [], orgName, transferredBy, reason, organizationId }) {
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const crmUrl = `${frontendBase}/leads/contacts`;
  const leadCount = leads.length;
  const leadRowsHtml = leads.map((lead, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; font-weight: 600; color: #111827; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-weight: 600; color: #111827; font-size: 13px;">${lead.customerName || lead.customer_name || 'Unnamed'}</td>
      <td style="padding: 10px 8px; color: #4b5563; font-size: 13px;">${lead.contactNumber || lead.phone || '-'}</td>
      <td style="padding: 10px 8px; color: #4b5563; font-size: 13px;">${lead.projectName || lead.propertyType || lead.leadType || '-'}</td>
      <td style="padding: 10px 8px; color: #4b5563; font-size: 13px;">${lead.source || 'Direct'}</td>
    </tr>
  `).join('');

  const defaultHtml = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #272944; margin: 0; font-size: 24px; font-weight: 800;">LEADS RUBIX</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Bulk Lead Assignment Digest</p>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #1e40af; margin: 0 0 6px 0;">📊 ${leadCount} New Leads Transferred to You</h3>
          <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
            Hello <strong>${agentName}</strong>, <strong>${transferredBy}</strong> has transferred <strong>${leadCount} leads</strong> to your workspace pipeline.
            ${reason ? `<br/><em>Reason: "${reason}"</em>` : ''}
          </p>
        </div>

        <div style="overflow-x: auto; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
                <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">#</th>
                <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Customer Name</th>
                <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Phone</th>
                <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Project / Specialty</th>
                <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Source</th>
              </tr>
            </thead>
            <tbody>
              ${leadRowsHtml}
            </tbody>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${crmUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #272944; text-decoration: none; border-radius: 6px;">
            Open CRM Pipeline
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          This is an automated consolidated lead digest notification from ${orgName || 'Leads Rubix CRM'}.
        </p>
      </div>
    </div>
  `;

  const emailQueueService = require('../services/emailQueueService');
  await emailQueueService.enqueueEmail({
    organizationId: organizationId ? String(organizationId) : null,
    leadId: null,
    recipient: toEmail,
    subject: `📊 [${leadCount} New Leads] Transferred to your pipeline`,
    htmlContent: defaultHtml,
    triggerAction: 'bulk_lead_transferred'
  });
}

/**
 * Replaces {{variable}} placeholders in template text with actual data.
 */
function replaceTemplateVariables(templateStr, dataMap = {}) {
  if (!templateStr) return '';
  let result = String(templateStr);
  for (const [key, val] of Object.entries(dataMap)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, val !== undefined && val !== null ? String(val) : '');
  }
  return result;
}

/**
 * Dynamically resolves the Nodemailer transporter for an organization.
 * If the organization has configured a custom SMTP, uses that; otherwise falls back to system CRM SMTP (AWS SES).
 */
async function getTransporterForOrganization(organizationId) {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');

    let org = null;
    if (organizationId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(organizationId);
      const orgQuery = isObjectId
        ? { $or: [{ organization_id: organizationId }, { organizationId: organizationId }, { _id: organizationId }] }
        : { $or: [{ organization_id: organizationId }, { organizationId: organizationId }] };
      org = await Organization.findOne(orgQuery).lean().exec();
    } else {
      // For Super Admin / Platform Master context, check if an organization has active custom gateway
      org = await Organization.findOne({
        $or: [
          { 'smtpConfig.useCustomSmtp': true },
          { 'smtp_config.useCustomSmtp': true },
          { 'smtp_config.use_custom_smtp': true }
        ]
      }).lean().exec();
      if (!org) {
        org = await Organization.findOne().lean().exec();
      }
    }

    const smtpConfig = org?.smtpConfig || org?.smtp_config;

    // Circuit Breaker: Strict Workspace-Level Email Suppression
    const isEmailDisabled = Boolean(
      org && (
        org.email_enabled === false ||
        org.emailEnabled === false ||
        org.smtp_config?.isActive === false ||
        org.smtpConfig?.isActive === false
      )
    );

    if (isEmailDisabled) {
      console.log(`[mailer] Outbound email is explicitly DISABLED by admin for organization: ${organizationId}. Suppressing.`);
      return {
        transporter: null,
        fromAddress: '',
        fromName: '',
        fromEmail: '',
        isCustom: false,
        isEmailDisabled: true,
        suppressed: true,
        reason: 'Email gateway disabled by workspace admin',
        templates: []
      };
    }

    const useCustom = smtpConfig?.useCustomSmtp || smtpConfig?.use_custom_smtp;
    const host = smtpConfig?.smtpHost || smtpConfig?.smtp_host;
    const port = Number(smtpConfig?.smtpPort || smtpConfig?.smtp_port) || 587;
    const user = smtpConfig?.smtpUser || smtpConfig?.smtp_user;
    const pass = smtpConfig?.smtpPass || smtpConfig?.smtp_pass;
    const fallbackSender = config.defaultSenderEmail || config.smtpUser || 'info@leadsrubix.com';
    const fromEmail = smtpConfig?.fromEmail || smtpConfig?.from_email || user || fallbackSender;
    const fromName = smtpConfig?.fromName || smtpConfig?.from_name || org?.organization_name || config.defaultSenderName || 'Leads Rubix CRM';

    if (useCustom && host && user && pass) {
      const isPort465 = port === 465;
      const customTransporter = nodemailer.createTransport({
        host,
        port,
        secure: isPort465, // Port 587 strictly uses STARTTLS (secure: false)
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });

      return {
        transporter: customTransporter,
        fromAddress: `"${fromName}" <${fromEmail}>`,
        fromName,
        fromEmail,
        isCustom: true,
        templates: org?.emailTemplates || org?.email_templates || []
      };
    }
  } catch (err) {
    console.error(`[mailer] Failed to load custom SMTP for org ${organizationId || 'platform'}:`, err.message);
  }

  const defaultFromEmail = config.defaultSenderEmail || config.smtpUser || 'info@leadsrubix.com';
  const defaultFromName = config.defaultSenderName || 'Leads Rubix CRM';
  return {
    transporter,
    fromAddress: `"${defaultFromName}" <${defaultFromEmail}>`,
    fromName: defaultFromName,
    fromEmail: defaultFromEmail,
    isCustom: false,
    templates: []
  };
}

/**
 * Tests an SMTP connection configuration live and sends a verification test email.
 */
async function testSmtpConnection(smtpConfig, recipientEmail) {
  const host = smtpConfig?.smtpHost || smtpConfig?.smtp_host;
  const port = Number(smtpConfig?.smtpPort || smtpConfig?.smtp_port) || 587;
  const user = smtpConfig?.smtpUser || smtpConfig?.smtp_user;
  const pass = smtpConfig?.smtpPass || smtpConfig?.smtp_pass;
  const fromEmail = smtpConfig?.fromEmail || smtpConfig?.from_email || user || config.defaultSenderEmail || 'info@leadsrubix.com';
  const fromName = smtpConfig?.fromName || smtpConfig?.from_name || 'Leads Rubix CRM';

  if (!host || !user || !pass) {
    throw new Error('SMTP host, username, and password are required for connection test.');
  }

  const isPort465 = port === 465;
  const testTransporter = nodemailer.createTransport({
    host,
    port,
    secure: isPort465, // Port 587 strictly uses STARTTLS (secure: false)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  // Verify connection configuration live
  await testTransporter.verify();

  let messageId = null;
  if (recipientEmail) {
    const isAwsSes = String(host).includes('amazonaws.com');
    const info = await testTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: `🚀 Leads Rubix CRM ${isAwsSes ? 'Amazon SES' : 'SMTP'} Gateway Test`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Gateway Connection Verified!</h2>
            <p style="color: #10b981; font-weight: 700; margin: 6px 0 0 0;">Outbound Engine Operational</p>
          </div>
          <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Host:</strong> ${host}</p>
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Port:</strong> ${port} (${isPort465 ? 'SSL/SMTPS' : 'STARTTLS'})</p>
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Sender:</strong> "${fromName}" &lt;${fromEmail}&gt;</p>
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Engine:</strong> ${isAwsSes ? 'Amazon SES (ap-south-1)' : 'Custom Dedicated SMTP'}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Dispatched in real-time by Leads Rubix CRM Omnichannel Gateway Engine.</p>
        </div>
      `
    });
    messageId = info?.messageId || null;
  }

  return {
    success: true,
    message: `SMTP connection to ${host}:${port} verified successfully!`,
    messageId,
    host,
    port,
    sender: fromEmail
  };
}

/**
 * Enterprise Dual-Engine Outbound Email Dispatcher:
 * 1. Checks for workspace custom SMTP if organizationId is present.
 * 2. 1st Priority (Primary Gateway): AWS SES Transporter (ap-south-1)
 * 3. 2nd Priority (Auto-Failover Gateway): Google Workspace SMTP Transporter
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.from] - Custom from address
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 * @param {Array}  [options.attachments] - Attachments
 * @param {string} [options.organizationId] - Organization ID
 * @param {string} [options.replyTo] - Reply-to email
 * @returns {Promise<{ success: boolean, provider: string, messageId: string, error?: string, fallbackReason?: string }>}
 */
async function sendWithDualEngineFailover({ to, from, subject, html, text, attachments, organizationId, replyTo }) {
  if (!to) {
    return { success: false, error: 'Recipient email address is required' };
  }

  const defaultSender = `"${config.defaultSenderName || 'Leads Rubix CRM'}" <${config.defaultSenderEmail || 'info@leadsrubix.com'}>`;
  const mailPayload = {
    to,
    from: from || defaultSender,
    subject: subject || 'Leads Rubix CRM Notification',
    html: html || (text ? `<p>${text}</p>` : '<p></p>'),
    text,
    attachments,
    replyTo
  };

  // Step 1: Check for custom workspace SMTP if organizationId is present
  if (organizationId) {
    try {
      const orgTransporter = await getTransporterForOrganization(organizationId);
      if (orgTransporter && (orgTransporter.suppressed || orgTransporter.isEmailDisabled)) {
        console.log(`[mailer] Suppressing outbound email to ${to} because email gateway is disabled for org ${organizationId}`);
        return {
          success: true,
          suppressed: true,
          provider: 'SUPPRESSED',
          reason: orgTransporter.reason || 'Email gateway disabled by workspace admin'
        };
      }
      if (orgTransporter && orgTransporter.isCustom && orgTransporter.transporter) {
        mailPayload.from = from || orgTransporter.fromAddress;
        console.log(`[mailer] Dispatching email to ${to} via custom workspace SMTP...`);
        const info = await orgTransporter.transporter.sendMail(mailPayload);
        return {
          success: true,
          provider: 'CUSTOM_WORKSPACE_SMTP',
          messageId: info.messageId || `custom-${Date.now()}`
        };
      }
    } catch (customErr) {
      console.warn(`[mailer] Custom workspace SMTP failed for org ${organizationId}: ${customErr.message}. Falling back to primary AWS SES...`);
    }
  }

  // Step 2: 1st Priority (Primary Engine) - AWS SES
  try {
    console.log(`[mailer] [1st Priority: AWS SES] Dispatching email to ${to}...`);
    const info = await awsSesTransporter.sendMail(mailPayload);
    console.log(`[mailer] [AWS SES SUCCESS] Email delivered to ${to} (MessageId: ${info.messageId})`);
    return {
      success: true,
      provider: 'AWS_SES',
      messageId: info.messageId || `ses-${Date.now()}`
    };
  } catch (sesErr) {
    console.warn(`[mailer] [AWS SES FAILED] Error sending to ${to}: ${sesErr.message}`);
    console.log(`[mailer] [2nd Priority: GOOGLE SMTP FAILOVER] Auto-switching to Google Workspace for ${to}...`);

    // Step 3: 2nd Priority (Auto-Failover Engine) - Google Workspace SMTP
    try {
      const googleSenderUser = config.googleSmtpUser || 'info@leadsrubix.com';
      const googleSender = mailPayload.from && mailPayload.from.includes(googleSenderUser)
        ? mailPayload.from
        : `"${config.defaultSenderName || 'Leads Rubix CRM'}" <${googleSenderUser}>`;

      const googlePayload = {
        ...mailPayload,
        from: googleSender
      };

      const googleInfo = await googleTransporter.sendMail(googlePayload);
      console.log(`[mailer] [GOOGLE SMTP SUCCESS] Fallback email delivered to ${to} (MessageId: ${googleInfo.messageId})`);
      return {
        success: true,
        provider: 'GOOGLE_SMTP_FALLBACK',
        messageId: googleInfo.messageId || `google-${Date.now()}`,
        fallbackReason: sesErr.message
      };
    } catch (googleErr) {
      console.error(`[mailer] [CRITICAL ERROR] Both AWS SES and Google SMTP failed for ${to}. SES: ${sesErr.message} | Google: ${googleErr.message}`);
      return {
        success: false,
        provider: 'FAILED',
        error: `SES: ${sesErr.message} | Google: ${googleErr.message}`
      };
    }
  }
}

/**
 * Sends a dynamic HTML email resolving custom SMTP or dual-engine failover.
 */
async function sendDynamicEmail({ toEmail, subject, htmlContent, organizationId, fromAddress, replyTo, attachments }) {
  if (!toEmail) return { success: false, error: 'Recipient email required' };
  return await sendWithDualEngineFailover({
    to: toEmail,
    from: fromAddress,
    subject: subject || 'Leads Rubix CRM Notification',
    html: htmlContent,
    organizationId,
    replyTo,
    attachments
  });
}

module.exports = {
  transporter,
  awsSesTransporter,
  googleTransporter,
  sendWithDualEngineFailover,
  sendCredentialsEmail,
  sendResetPasswordEmail,
  sendNewLeadEmail,
  sendLeadTransferredEmail,
  sendBulkLeadTransferredEmail,
  sendThirdPartyLeadEmail,
  replaceTemplateVariables,
  getTransporterForOrganization,
  testSmtpConnection,
  sendDynamicEmail,
};

