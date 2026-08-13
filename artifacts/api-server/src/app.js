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

// CORS — allow same-origin (Replit proxy) and configured frontend origins.
// In development we reflect the request origin so the app works behind any preview proxy.
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';
if (isProd && allowedOrigins.length === 0) {
  throw new Error(
    '[cors] FATAL: FRONTEND_ORIGINS must be set in production (comma-separated allowed origins).',
  );
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (curl, server-side) and same-origin (no Origin header).
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // In dev, with no explicit allowlist, reflect any origin so previews work.
      if (!isProd && allowedOrigins.length === 0) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

const tenantResolver = require('./middlewares/tenantResolver');
app.use(tenantResolver);

app.use(morgan('dev'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// health check
app.get('/api/healthz', (req, res) => res.json({ status: 'ok' }));

// mount API routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// centralized error handler
app.use(errorHandler);

module.exports = app;
