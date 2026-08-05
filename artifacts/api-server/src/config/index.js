// src/config/index.js
// configuration loader; reads from environment variables or defaults
const cliPort = process.env.PORT;
require('dotenv').config();

module.exports = {
  // use a port that doesn't conflict with a frontend dev server
  port: cliPort || process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm-dev',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpUser: process.env.SMTP_USER || 'dev@digitalrubix.com',
  smtpPass: process.env.SMTP_PASS || 'exch pzyu imoy zptl'
  // add other third-party API keys, etc.
};
