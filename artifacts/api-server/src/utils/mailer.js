const nodemailer = require('nodemailer');
const config = require('../config');

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Send login credentials to a newly created organization user.
 * @param {Object} params
 * @param {string} params.orgName
 * @param {string} params.userName
 * @param {string} params.emailAddress
 * @param {string} params.tempPassword
 */
async function sendCredentialsEmail({ orgName, userName, emailAddress, tempPassword }) {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';

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

    await transporter.sendMail(mailOptions);
    console.log(`[mailer] Account credentials email sent successfully to ${emailAddress}`);
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
    await transporter.sendMail(mailOptions);
    console.log(`[mailer] Password reset email sent successfully to ${emailAddress}`);
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

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Agent',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || 'Direct Entry',
    orgName: orgName || 'your organization',
    leadType: leadType || 'Lead',
    specialtyOrDepartment: specialtyOrDepartment || ''
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `New Lead Assigned: ${customerName || 'Unnamed Lead'}`;

  const leadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads`;
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

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Agent',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || 'Direct Entry',
    orgName: orgName || 'your organization',
    transferredBy: transferredBy || 'Admin',
    reason: reason || ''
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `Lead Transferred to You: ${customerName || 'Unnamed Lead'}`;

  const leadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads`;
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

  const dataMap = {
    customerName: customerName || 'Unnamed Lead',
    agentName: agentName || 'Team',
    contactNumber: contactNumber || 'N/A',
    email: email || '',
    source: source || '3rd-Party Integration',
    orgName: orgName || 'your organization',
    campaign: campaign || '',
    adset: adset || ''
  };

  const subject = customTemplate?.subject
    ? replaceTemplateVariables(customTemplate.subject, dataMap)
    : `[${source || '3rd Party'}] New Lead: ${customerName || 'Unnamed'}`;

  const leadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads`;
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
 * If the organization has configured a custom SMTP, uses that; otherwise falls back to system CRM SMTP.
 */
async function getTransporterForOrganization(organizationId) {
  if (!organizationId) {
    return {
      transporter,
      fromAddress: `"Leads Rubix CRM" <${config.smtpUser}>`,
      fromName: 'Leads Rubix CRM',
      fromEmail: config.smtpUser
    };
  }

  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(organizationId) ? organizationId : null },
        { organization_id: organizationId },
        { organizationId: organizationId }
      ]
    }).lean().exec();

    const smtpConfig = org?.smtpConfig || org?.smtp_config;
    const useCustom = smtpConfig?.useCustomSmtp || smtpConfig?.use_custom_smtp;
    const host = smtpConfig?.smtpHost || smtpConfig?.smtp_host;
    const port = Number(smtpConfig?.smtpPort || smtpConfig?.smtp_port) || 465;
    const user = smtpConfig?.smtpUser || smtpConfig?.smtp_user;
    const pass = smtpConfig?.smtpPass || smtpConfig?.smtp_pass;
    const fromEmail = smtpConfig?.fromEmail || smtpConfig?.from_email || user || config.smtpUser;
    const fromName = smtpConfig?.fromName || smtpConfig?.from_name || org?.organization_name || 'Leads Rubix CRM';

    if (useCustom && host && user && pass) {
      const customTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465 || smtpConfig?.security === 'SSL',
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });

      return {
        transporter: customTransporter,
        fromAddress: `"${fromName}" <${fromEmail}>`,
        fromName,
        fromEmail,
        templates: org?.emailTemplates || org?.email_templates || []
      };
    }
  } catch (err) {
    console.error(`[mailer] Failed to load custom SMTP for org ${organizationId}:`, err.message);
  }

  return {
    transporter,
    fromAddress: `"Leads Rubix CRM" <${config.smtpUser}>`,
    fromName: 'Leads Rubix CRM',
    fromEmail: config.smtpUser,
    templates: []
  };
}

/**
 * Tests an SMTP connection configuration live and sends a verification test email.
 */
async function testSmtpConnection(smtpConfig, recipientEmail) {
  const host = smtpConfig?.smtpHost || smtpConfig?.smtp_host;
  const port = Number(smtpConfig?.smtpPort || smtpConfig?.smtp_port) || 465;
  const user = smtpConfig?.smtpUser || smtpConfig?.smtp_user;
  const pass = smtpConfig?.smtpPass || smtpConfig?.smtp_pass;
  const fromEmail = smtpConfig?.fromEmail || smtpConfig?.from_email || user;
  const fromName = smtpConfig?.fromName || smtpConfig?.from_name || 'Workspace Test';

  if (!host || !user || !pass) {
    throw new Error('SMTP host, username, and password are required for connection test.');
  }

  const testTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || smtpConfig?.security === 'SSL',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  // Verify connection configuration
  await testTransporter.verify();

  if (recipientEmail) {
    await testTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: 'SMTP Connection Test - Leads Rubix CRM',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; border-radius: 8px;">
          <h2 style="color: #272944;">SMTP Connection Successful!</h2>
          <p>Your custom workspace SMTP server (<strong>${host}:${port}</strong>) is configured correctly and verified live.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent via Leads Rubix CRM Workspace Email Settings.</p>
        </div>
      `
    });
  }

  return { success: true, message: `SMTP connection to ${host}:${port} verified successfully.` };
}

module.exports = {
  transporter,
  sendCredentialsEmail,
  sendResetPasswordEmail,
  sendNewLeadEmail,
  sendLeadTransferredEmail,
  sendThirdPartyLeadEmail,
  replaceTemplateVariables,
  getTransporterForOrganization,
  testSmtpConnection,
};

