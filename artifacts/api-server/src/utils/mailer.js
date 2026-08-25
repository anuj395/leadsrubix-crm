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

module.exports = {
  sendCredentialsEmail,
  sendResetPasswordEmail,
};
