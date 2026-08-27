// src/app.js
// Sets up the Express application with middleware and routes.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// built-in middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: false }));

// CORS — allow all domains, custom origins, and mobile clients
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow mobile apps, curl, postman, and same-origin (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || allowedOrigins.length === 0) {
        return cb(null, true);
      }
      // Allow leadsrubix.com domains and subdomains
      if (/^https?:\/\/([a-zA-Z0-9-]+\.)*leadsrubix\.com(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      // Allow localhost and IP addresses
      if (/^https?:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Platform',
      'X-Client-Version',
      'X-Request-Timestamp',
      'X-Signature',
      'X-Organization-Id',
      'X-Industry-Id',
      'X-Requested-With',
      'Accept',
    ],
  }),
);

const tenantResolver = require('./middlewares/tenantResolver');
app.use(tenantResolver);

app.use(morgan('dev'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// root status & health check
app.get('/', (req, res) => res.json({ status: 'ok', server: 'Leads Rubix CRM API', version: '1.4.0', time: new Date().toISOString() }));
app.get('/api/healthz', (req, res) => res.json({ status: 'ok', server: 'leadsrubix-crm', time: new Date().toISOString() }));
app.get('/healthz', (req, res) => res.json({ status: 'ok', server: 'leadsrubix-crm', time: new Date().toISOString() }));

// mount API routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// global error handler
app.use(errorHandler);

module.exports = app;
