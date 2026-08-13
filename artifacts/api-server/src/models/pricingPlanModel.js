const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Plan' },
    description: { type: String, default: '' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    licenses_cost: { type: Number, default: 1000, alias: 'licensesCost' },
    trial_period_licenses: { type: Number, default: 20, alias: 'trialPeriodLicenses' },
    grace_period_days: { type: Number, default: 7, alias: 'gracePeriodDays' },
    trial_period_days: { type: Number, default: 30, alias: 'trialPeriodDays' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

pricingPlanSchema.index({ organization_id: 1, industry_id: 1 }, { name: 'idx_pricing_plan_org_ind' });

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema, 'pricing_plans');

exports.PricingPlan = PricingPlan;
