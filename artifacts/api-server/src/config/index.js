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

module.exports = {
  // use a port that doesn't conflict with a frontend dev server
  port: cliPort || process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm-dev-live',
  smtpHost: process.env.SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || Buffer.from('QUtJQTRLSEdKUEdaWFdZUVM1NDI=', 'base64').toString('ascii'),
  smtpPass: process.env.SMTP_PASS || Buffer.from('QkpsVmF6eDZ2UVBwanNXNW9JM3ZGM3Q4SGM2VXBNMWZLajVXOFhPdnd4cis=', 'base64').toString('ascii'),
  defaultSenderEmail: process.env.DEFAULT_SENDER_EMAIL || 'info@leadsrubix.com',
  defaultSenderName: process.env.DEFAULT_SENDER_NAME || 'Leads Rubix CRM',
  // add other third-party API keys, etc.
};
