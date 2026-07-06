// src/middlewares/auth.js
// JWT-based authentication and role authorization
const authService = require('../services/authService');
const userModel = require('../models/userModel');

/**
 * Verifies the JWT then hydrates req.user from the DB so downstream code can
 * trust the latest role / industry / active flag (the JWT itself may pre-date
 * a profile change, and older tokens don't carry industryId at all). This
 * is what makes tenant scoping in user CRUD reliable.
 */
module.exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    const fresh = await userModel.findById(payload.id);
    if (!fresh || fresh.isActive === false) {
      return res.status(401).json({ message: 'Account is no longer active' });
    }
    req.user = {
      id: String(fresh._id),
      role: fresh.role,
      industryId: fresh.industryId,
      organizationId: fresh.organizationId,
      organizationName: fresh.organizationName,
      email: fresh.email,
    };

    // Subscription & Trial expiration checks for non-superAdmin users
    if (fresh.role !== 'superAdmin' && fresh.industryId) {
      const mongoose = require('mongoose');
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ industryId: fresh.industryId });
      if (org) {
        let isExpired = false;
        const now = new Date();
        const createdAt = new Date(org.createdAt);

        if (org.trialPeriod === true || org.trialPeriod === 'true') {
          const trialDays = typeof org.trialPeriodDays === 'number' ? org.trialPeriodDays : 7;
          const trialExpiry = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
          if (now > trialExpiry) {
            isExpired = true;
          }
        } else {
          // trialPeriod === false
          const validTill = new Date(org.validTill);
          const graceDays = typeof org.gracePeriodDays === 'number' ? org.gracePeriodDays : 7;
          const graceExpiry = new Date(validTill.getTime() + graceDays * 24 * 60 * 60 * 1000);
          if (now > graceExpiry) {
            isExpired = true;
          }
        }

        if (isExpired) {
          if (org.paymentStatus !== false && org.paymentStatus !== 'false') {
            await Organization.updateOne({ _id: org._id }, { $set: { paymentStatus: false } });
          }
          // Permit subscription detail checks / updates
          const isAllowedPath = 
            (req.method === 'GET' && req.baseUrl === '/api/organizations') ||
            (req.baseUrl.startsWith('/api/organizations/')) || 
            (req.method === 'GET' && req.baseUrl === '/api/pricing-plans');

          if (!isAllowedPath) {
            return res.status(402).json({ message: 'Subscription expired. Please renew.' });
          }
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

// middleware factory for roles
module.exports.authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;
    if (!userRole || (allowedRoles.length && !allowedRoles.includes(userRole))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
