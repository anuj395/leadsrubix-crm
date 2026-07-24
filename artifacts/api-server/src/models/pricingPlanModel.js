const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema(
  {
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

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema, 'pricing_plans');

exports.PricingPlan = PricingPlan;
