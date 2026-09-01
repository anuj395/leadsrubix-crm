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
      trial_period_licenses: body.trialPeriodLicenses !== undefined ? Number(body.trialPeriodLicenses) : 10,
      grace_period_days: body.gracePeriodDays !== undefined ? Number(body.gracePeriodDays) : 7,
      trial_period_days: body.trialPeriodDays !== undefined ? Number(body.trialPeriodDays) : 7,
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
    const body = req.body || {};
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.organizationId !== undefined || body.organization_id !== undefined) {
      updateData.organization_id = body.organizationId || body.organization_id || null;
    }
    if (body.industryId !== undefined || body.industry_id !== undefined) {
      updateData.industry_id = body.industryId || body.industry_id || null;
    }
    if (body.licensesCost !== undefined || body.licenses_cost !== undefined) {
      updateData.licenses_cost = Number(body.licensesCost ?? body.licenses_cost);
    }
    if (body.trialPeriodLicenses !== undefined || body.trial_period_licenses !== undefined) {
      updateData.trial_period_licenses = Number(body.trialPeriodLicenses ?? body.trial_period_licenses);
    }
    if (body.gracePeriodDays !== undefined || body.grace_period_days !== undefined) {
      updateData.grace_period_days = Number(body.gracePeriodDays ?? body.grace_period_days);
    }
    if (body.trialPeriodDays !== undefined || body.trial_period_days !== undefined) {
      updateData.trial_period_days = Number(body.trialPeriodDays ?? body.trial_period_days);
    }

    const doc = await PricingPlan.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }

    // Sync to organization if this plan is scoped to an organization
    const targetOrgId = doc.organization_id || doc.organizationId;
    if (targetOrgId && (updateData.licenses_cost !== undefined || updateData.trial_period_licenses !== undefined)) {
      try {
        const Organization = mongoose.model('Organization');
        const orgSync = {};
        if (updateData.licenses_cost !== undefined) orgSync.cost_per_license = updateData.licenses_cost;
        if (updateData.trial_period_licenses !== undefined) orgSync.num_employees = updateData.trial_period_licenses;
        await Organization.updateMany(
          {
            $or: [
              { organization_id: targetOrgId },
              { organizationId: targetOrgId },
              { _id: targetOrgId },
              { organization_name: targetOrgId },
              { organizationName: targetOrgId }
            ]
          },
          { $set: orgSync }
        ).exec();
      } catch (e) {
        console.error('[pricingPlanRoutes] Failed to sync Organization:', e);
      }
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
