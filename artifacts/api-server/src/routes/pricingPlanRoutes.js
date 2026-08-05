const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Helper middleware to ensure superAdmin role
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'superAdmin') {
    return res.status(403).json({ message: 'Access denied: Super Admin only' });
  }
  next();
};

router.get('/', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const PricingPlan = mongoose.model('PricingPlan');
    const { organizationId, industryId, scope } = req.query;

    const q = {};
    if (scope === 'global') {
      q.organization_id = null;
    } else if (organizationId && String(organizationId).trim() !== '' && organizationId !== 'all') {
      q.$or = [{ organization_id: String(organizationId).trim() }, { organization_id: null }];
    }

    if (industryId && String(industryId).trim() !== '' && industryId !== 'all') {
      const indStr = String(industryId).trim();
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ industry_id: indStr }, { industry_id: null }] });
    }

    const plans = await PricingPlan.find(q).sort({ createdAt: -1 }).exec();
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const PricingPlan = mongoose.model('PricingPlan');
    const body = req.body || {};
    const payload = {
      name: body.name || 'Plan',
      description: body.description || '',
      organization_id: body.organizationId || body.organization_id || null,
      industry_id: body.industryId || body.industry_id || null,
      licenses_cost: body.licensesCost !== undefined ? Number(body.licensesCost) : 1000,
      trial_period_licenses: body.trialPeriodLicenses !== undefined ? Number(body.trialPeriodLicenses) : 20,
      grace_period_days: body.gracePeriodDays !== undefined ? Number(body.gracePeriodDays) : 7,
      trial_period_days: body.trialPeriodDays !== undefined ? Number(body.trialPeriodDays) : 30,
    };
    const doc = await PricingPlan.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const PricingPlan = mongoose.model('PricingPlan');
    const doc = await PricingPlan.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const PricingPlan = mongoose.model('PricingPlan');
    const doc = await PricingPlan.findByIdAndDelete(req.params.id).exec();
    if (!doc) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
