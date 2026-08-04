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
      industryId: fresh.industry_id?.code || String(fresh.industry_id || fresh.industryId || ''),
      organizationId: fresh.organizationId || fresh.organization_id || '',
      workspaceId: fresh.workspaceId || fresh.workspace_id || '',
      organizationName: fresh.organizationName || fresh.organization_name || '',
      email: fresh.email,
      uid: fresh.uid,
      name: fresh.name || fresh.email,
    };

    // Subscription & Trial expiration checks for non-superAdmin users
    if (fresh.role !== 'superAdmin' && (fresh.organizationId || fresh.organization_id)) {
      const mongoose = require('mongoose');
      const Organization = mongoose.model('Organization');
      const userOrgId = fresh.organizationId || fresh.organization_id;
      const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
      const orgQuery = isObjectId
        ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
        : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };
      const org = await Organization.findOne(orgQuery).exec();

      if (org) {
        let isExpired = false;
        const now = new Date();
        const createdAt = new Date(org.createdAt || org.created_at || now);

        const isTrial = org.trial_period === true || org.trial_period === 'true' || org.trialPeriod === true || org.trialPeriod === 'true';
        const trialDays = typeof org.trial_period_days === 'number' ? org.trial_period_days : (typeof org.trialPeriodDays === 'number' ? org.trialPeriodDays : 7);
        const graceDays = typeof org.grace_period_days === 'number' ? org.grace_period_days : (typeof org.gracePeriodDays === 'number' ? org.gracePeriodDays : 7);

        if (isTrial) {
          const trialExpiry = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
          if (now > trialExpiry) {
            isExpired = true;
          }
        } else {
          const rawValidTill = org.valid_till || org.validTill;
          if (rawValidTill) {
            const validTill = new Date(rawValidTill);
            const graceExpiry = new Date(validTill.getTime() + graceDays * 24 * 60 * 60 * 1000);
            if (now > graceExpiry) {
              isExpired = true;
            }
          }
        }

        if (isExpired) {
          if (org.payment_status !== false && org.paymentStatus !== false) {
            await Organization.updateOne({ _id: org._id }, { $set: { payment_status: false, paymentStatus: false } });
          }
          // Permit navigation, sidebar menus, screens, subscription details, licenses, pricing plans
          const reqPath = req.originalUrl || req.url || '';
          const isAllowedPath = 
            reqPath.includes('/api/organizations') ||
            reqPath.includes('/api/pricing-plans') ||
            reqPath.includes('/api/coupons') ||
            reqPath.includes('/api/sidebar') ||
            reqPath.includes('/api/menus') ||
            reqPath.includes('/api/screens') ||
            reqPath.includes('/api/auth/me');

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
