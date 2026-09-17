const path = require('path');
const fs = require('fs');
const cliPort = process.env.PORT;
const currentEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.resolve(__dirname, `../../.env.${currentEnv}`),
  path.resolve(__dirname, `../../../.env.${currentEnv}`),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const f of envFiles) {
  if (fs.existsSync(f)) {
    require('dotenv').config({ path: f });
    break;
  }
}

const crypto = require('crypto');

/**
 * Derives the AWS SES SMTP password from the IAM secret access key according to AWS specifications.
 */
function calculateSesSmtpPassword(secretAccessKey, region = 'ap-south-1') {
  if (!secretAccessKey) return '';
  const DATE = '11111111';
  const SERVICE = 'ses';
  const MESSAGE = 'SendRawEmail';
  const TERMINAL = 'aws4_request';
  const VERSION = 0x04;

  let kDate = crypto.createHmac('sha256', 'AWS4' + secretAccessKey).update(DATE).digest();
  let kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  let kService = crypto.createHmac('sha256', kRegion).update(SERVICE).digest();
  let kTerminal = crypto.createHmac('sha256', kService).update(TERMINAL).digest();
  let kMessage = crypto.createHmac('sha256', kTerminal).update(MESSAGE).digest();

  let signatureAndVersion = Buffer.concat([Buffer.from([VERSION]), kMessage]);
  return signatureAndVersion.toString('base64');
}

const activeAwsAccessKey = process.env.AWS_ACCESS_KEY_ID || 'AKIA4KHGJPGZTLWMCIEF';
const activeAwsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || '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';
const derivedSesPass = calculateSesSmtpPassword(activeAwsSecretKey, process.env.AWS_REGION || 'ap-south-1');

module.exports = {
  // use a port that doesn't conflict with a frontend dev server
  port: cliPort || process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm-dev-live',

  // Primary Gateway: AWS SES (Mumbai ap-south-1)
  awsSesSmtpHost: process.env.AWS_SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
  awsSesSmtpPort: parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10),
  awsSesSmtpUser: process.env.AWS_SES_SMTP_USER || activeAwsAccessKey,
  awsSesSmtpPass: process.env.AWS_SES_SMTP_PASS || derivedSesPass,

  // Secondary Failover Gateway: Google Workspace SMTP
  googleSmtpHost: process.env.GOOGLE_SMTP_HOST || 'smtp.gmail.com',
  googleSmtpPort: parseInt(process.env.GOOGLE_SMTP_PORT || '465', 10),
  googleSmtpUser: process.env.GOOGLE_SMTP_USER || 'info@leadsrubix.com',
  googleSmtpPass: process.env.GOOGLE_SMTP_PASS || 'jucupgkwmniheujp',

  // System Defaults & Backwards-Compatibility
  smtpHost: process.env.SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || process.env.AWS_SES_SMTP_USER || activeAwsAccessKey,
  smtpPass: process.env.SMTP_PASS || process.env.AWS_SES_SMTP_PASS || derivedSesPass,
  defaultSenderEmail: process.env.DEFAULT_SENDER_EMAIL || 'info@leadsrubix.com',
  defaultSenderName: process.env.DEFAULT_SENDER_NAME || 'Leads Rubix CRM',

  // Cloudflare Account, DNS & R2 Storage
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
    domain: process.env.CLOUDFLARE_DOMAIN || 'leadsrubix.com',
    r2: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || ''
    }
  }
};
