const service = require('../services/organizationService');

exports.list = async (req, res, next) => {
  try {
    const { items, total } = await service.listPaged({
      authedUser: req.user,
      industryId: req.query.industryId,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortField: req.query.sortField,
      sortDir: req.query.sortDir,
    });
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await service.fetchById({ id: req.params.id, authedUser: req.user });
    if (!item) return res.status(404).json({ message: 'Organization not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await service.create({ payload: req.body, authedUser: req.user });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await service.update({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove({ id: req.params.id, authedUser: req.user });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// Helper to resolve dynamic PricingPlan matching Organization > Industry > Global
async function resolveOrganizationPricingPlan(org, user = {}) {
  const mongoose = require('mongoose');
  const PricingPlan = mongoose.model('PricingPlan');

  const orgIdStr = String(org?.organization_id || org?.organizationId || org?._id || user.organizationId || user.organization_id || '').trim();
  const indIdStr = String(org?.industry_id || org?.industryId || user.industryId || '').trim();

  let matchedPlan = null;
  // 1. Check exact Organization-specific plan
  if (orgIdStr) {
    matchedPlan = await PricingPlan.findOne({
      $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }]
    }).lean().exec();
  }

  // 2. Check Industry-specific plan
  if (!matchedPlan && indIdStr) {
    matchedPlan = await PricingPlan.findOne({
      $and: [
        { $or: [{ industry_id: indIdStr }, { industryId: indIdStr }] },
        { $or: [{ organization_id: null }, { organization_id: '' }] }
      ]
    }).lean().exec();
  }

  // 3. Check Global plan
  if (!matchedPlan) {
    matchedPlan = await PricingPlan.findOne({
      $and: [
        { $or: [{ organization_id: null }, { organization_id: '' }] },
        { $or: [{ industry_id: null }, { industry_id: '' }] }
      ]
    }).lean().exec();
  }

  const isTrial = org?.trial_period === true || org?.trial_period === 'true' || org?.trialPeriod === true || org?.trialPeriod === 'true';
  const planLicensesCost = matchedPlan ? Number(matchedPlan.licenses_cost ?? matchedPlan.licensesCost ?? 1000) : 1000;
  const planTrialLicenses = matchedPlan ? Number(matchedPlan.trial_period_licenses ?? matchedPlan.trialPeriodLicenses ?? 10) : 10;
  const planGraceDays = matchedPlan ? Number(matchedPlan.grace_period_days ?? matchedPlan.gracePeriodDays ?? 7) : 7;
  const planTrialDays = matchedPlan ? Number(matchedPlan.trial_period_days ?? matchedPlan.trialPeriodDays ?? 7) : 7;
  const planName = matchedPlan?.name || (isTrial ? 'Trial Enterprise Plan' : 'Enterprise License Plan');

  // Dynamic Seats:
  let numEmployees = 0;
  if (org && (org.num_employees || org.numEmployees || org.no_of_employees)) {
    numEmployees = Number(org.num_employees || org.numEmployees || org.no_of_employees);
  } else {
    numEmployees = planTrialLicenses;
  }

  // Dynamic Cost Per License:
  // SuperAdmin edit in Edit Organization (org.cost_per_license) or PricingPlan
  const orgExplicitCost = Number(org?.cost_per_license ?? org?.costPerLicense);
  let costPerLicense = 1000;
  if (!isNaN(orgExplicitCost) && orgExplicitCost > 0) {
    costPerLicense = orgExplicitCost;
  } else if (matchedPlan) {
    costPerLicense = planLicensesCost;
  }

  return {
    matchedPlan,
    planName,
    numEmployees,
    costPerLicense,
    planTrialLicenses,
    planGraceDays,
    planTrialDays,
  };
}

exports.getMySubscription = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const { calculateSubscriptionStatus } = require('../utils/subscriptionUtils');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.json({
        status: 'SUPER_ADMIN',
        isExpired: false,
        isTrial: false,
        isGracePeriod: false,
        paymentStatus: true,
        daysRemaining: 9999,
        reason: 'Super Admin or user without organization',
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const { planName, numEmployees, costPerLicense, planGraceDays, planTrialDays } = await resolveOrganizationPricingPlan(org, req.user);

    // Scoped user count: Organization + Workspace
    const User = mongoose.model('User');
    const userWorkspaceId = req.user?.workspaceId || req.user?.workspace_id;
    const userFilter = {
      $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }]
    };
    if (userWorkspaceId) {
      userFilter.$and = [
        { $or: [{ workspace_id: userWorkspaceId }, { workspaceId: userWorkspaceId }, { workspace_id: null }, { workspace_id: '' }] }
      ];
    }
    const activeUsersCount = await User.countDocuments(userFilter).exec();

    // Dynamically calculate status using plan trial days and grace days
    const dynamicOrg = {
      ...(org.toObject ? org.toObject() : org),
      trial_period_days: org.trial_period_days || planTrialDays,
      grace_period_days: org.grace_period_days || planGraceDays,
    };
    const subState = calculateSubscriptionStatus(dynamicOrg);

    res.json({
      organizationId: org.organizationId || org._id,
      organizationName: org.organizationName || org.organization_name || '',
      workspaceId: userWorkspaceId || null,
      industryId: org.industry_id || org.industryId || req.user?.industryId || null,
      planName,
      numEmployees,
      costPerLicense,
      activeUsersCount: activeUsersCount || 0,
      registeredMethod: org.payment_method || org.paymentMethod || 'Online / Razorpay',
      cardDetails: org.card_details || org.cardDetails || null,
      billingDetails: org.billing_details || org.billingDetails || {
        legalName: org.organizationName || org.organization_name || '',
        billingEmail: org.email_id || org.email || '',
        billingPhone: org.contact_number || '',
        billingAddress: org.address || '',
        gstin: org.gstin || '',
        pan: org.pan || '',
      },
      validFrom: org.valid_from || org.validFrom || org.createdAt,
      validTill: org.valid_till || org.validTill || subState.expiryDate,
      ...subState,
    });
  } catch (err) {
    next(err);
  }
};

exports.renewSubscription = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const Coupon = mongoose.model('Coupon');
    const { Invoice } = require('../models/invoiceModel');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const { tenureMonths = 1, couponCode, paymentMethod = 'Online / Razorpay', seats: requestedSeats } = req.body || {};
    const months = [1, 3, 6, 12].includes(Number(tenureMonths)) ? Number(tenureMonths) : 1;

    const { numEmployees: currentSeats, costPerLicense } = await resolveOrganizationPricingPlan(org, req.user);
    // Allow user to change / set seats for the renewal cycle (e.g. 5 -> 10, or 10 -> 7)
    const seats = requestedSeats !== undefined && Number(requestedSeats) > 0 ? Math.max(1, Number(requestedSeats)) : currentSeats;

    const subtotal = Math.round(seats * costPerLicense * months);
    let discountAmount = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).exec();
      if (coupon && coupon.status === 'Active' && (coupon.usage_count || 0) < (coupon.usage_limit || 999999)) {
        if (coupon.discount_type === 'Percentage') {
          discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
        } else {
          discountAmount = Math.min(subtotal, coupon.discount_value);
        }
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usage_count: 1 } });
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(discountedSubtotal * 0.18);
    const totalAmount = discountedSubtotal + taxAmount;

    const now = new Date();
    const currentExpiry = org.valid_till || org.validTill;
    const baseDate = (currentExpiry && new Date(currentExpiry) > now) ? new Date(currentExpiry) : now;

    const nextExpiry = new Date(baseDate);
    nextExpiry.setMonth(nextExpiry.getMonth() + months);

    const updateFields = {
      valid_till: nextExpiry,
      payment_status: true,
      status: 'ACTIVE',
      trial_period: false,
      is_active: true,
      payment_method: paymentMethod,
      num_employees: seats,
    };

    const $unset = {
      validTill: 1,
      paymentStatus: 1,
      trialPeriod: 1,
      isActive: 1,
      numEmployees: 1,
    };

    await Organization.updateOne({ _id: org._id }, { $set: updateFields, $unset });

    // Generate real invoice
    const invCount = await Invoice.countDocuments().exec();
    const invNumber = `INV-${nextExpiry.getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
    const invoiceDoc = await Invoice.create({
      invoice_number: invNumber,
      organization_id: String(org.organization_id || org.organizationId || org._id),
      billing_type: 'RENEWAL',
      description: `Subscription Renewal (${seats} Seats for ${months} Month${months > 1 ? 's' : ''})`,
      seats,
      tenure_months: months,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      currency: 'INR',
      payment_method: paymentMethod,
      payment_status: 'PAID',
      transaction_id: `PAY-${Date.now().toString(36).toUpperCase()}`,
      invoice_date: new Date(),
    });

    res.json({
      success: true,
      message: `Subscription renewed for ${months} month(s) with ${seats} seats! Valid till ${nextExpiry.toLocaleDateString()}`,
      validTill: nextExpiry,
      numEmployees: seats,
      invoice: invoiceDoc,
    });
  } catch (err) {
    next(err);
  }
};

exports.upgradeSeats = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const Coupon = mongoose.model('Coupon');
    const { Invoice } = require('../models/invoiceModel');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const { additionalSeats, targetSeats, couponCode, paymentMethod = 'Online / Razorpay' } = req.body || {};
    const { numEmployees: currentSeats, costPerLicense } = await resolveOrganizationPricingPlan(org, req.user);

    let newTotalSeats = currentSeats;
    let addSeats = 0;

    if (targetSeats !== undefined && Number(targetSeats) > 0) {
      newTotalSeats = Math.max(1, Number(targetSeats));
      addSeats = newTotalSeats - currentSeats;
    } else {
      addSeats = parseInt(additionalSeats, 10) || 0;
      newTotalSeats = Math.max(1, currentSeats + addSeats);
    }

    // Downscaling seats (e.g. 10 -> 7 seats)
    if (addSeats <= 0) {
      // Validate that newTotalSeats is not less than currently active users!
      const User = mongoose.model('User');
      const activeCount = await User.countDocuments({
        $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }],
        is_active: true
      }).exec();

      if (newTotalSeats < activeCount) {
        return res.status(400).json({
          message: `Cannot reduce seats to ${newTotalSeats}. You currently have ${activeCount} active team members. Please deactivate unused users in User List first.`
        });
      }

      await Organization.updateOne(
        { _id: org._id },
        {
          $set: { num_employees: newTotalSeats, payment_method: paymentMethod },
          $unset: { numEmployees: 1 }
        }
      );
      return res.json({
        success: true,
        message: `Seats adjusted from ${currentSeats} to ${newTotalSeats}. Your monthly billing will be ₹${(newTotalSeats * costPerLicense).toLocaleString('en-IN')}/mo on next renewal.`,
        numEmployees: newTotalSeats,
      });
    }

    // Upscaling seats mid-cycle (e.g. 5 -> 10, i.e. +5 seats) on prorata basis
    const now = new Date();
    const currentExpiry = org.valid_till || org.validTill ? new Date(org.valid_till || org.validTill) : new Date(now.getTime() + 30 * 86400000);
    const remainingDays = Math.max(1, Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const perDayCost = costPerLicense / 30;
    const subtotal = Math.round(addSeats * perDayCost * remainingDays);

    let discountAmount = 0;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).exec();
      if (coupon && coupon.status === 'Active' && (coupon.usage_count || 0) < (coupon.usage_limit || 999999)) {
        if (coupon.discount_type === 'Percentage') {
          discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
        } else {
          discountAmount = Math.min(subtotal, coupon.discount_value);
        }
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usage_count: 1 } });
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(discountedSubtotal * 0.18);
    const totalAmount = discountedSubtotal + taxAmount;

    await Organization.updateOne(
      { _id: org._id },
      {
        $set: {
          num_employees: newTotalSeats,
          payment_method: paymentMethod,
        },
        $unset: { numEmployees: 1 }
      }
    );

    // Generate real invoice
    const invCount = await Invoice.countDocuments().exec();
    const invNumber = `INV-${now.getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
    const invoiceDoc = await Invoice.create({
      invoice_number: invNumber,
      organization_id: String(org.organization_id || org.organizationId || org._id),
      billing_type: 'SEAT_UPGRADE',
      description: `Seat Upgrade (+${addSeats} Seats for ${remainingDays} days prorata)`,
      seats: addSeats,
      tenure_months: 1,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      currency: 'INR',
      payment_method: paymentMethod,
      payment_status: 'PAID',
      transaction_id: `PAY-${Date.now().toString(36).toUpperCase()}`,
      invoice_date: new Date(),
    });

    res.json({
      success: true,
      message: `Successfully added ${addSeats} seats! Total seats is now ${newTotalSeats}.`,
      numEmployees: newTotalSeats,
      invoice: invoiceDoc,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSeats = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { seats } = req.body || {};
    const newSeats = Math.max(1, parseInt(seats, 10) || 10);

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    await Organization.updateOne(
      orgQuery,
      {
        $set: { num_employees: newSeats },
        $unset: { numEmployees: 1 }
      }
    );

    res.json({
      success: true,
      message: `Organization seats successfully set to ${newSeats}`,
      numEmployees: newSeats,
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { cardholderName, cardNumber, expiry, cvc, brand } = req.body || {};
    if (!cardholderName || !String(cardholderName).trim()) {
      return res.status(400).json({ message: 'Cardholder name is required' });
    }
    const sanitizedNumber = cardNumber ? String(cardNumber).replace(/\s+/g, '') : '';
    if (!sanitizedNumber || sanitizedNumber.length < 13 || sanitizedNumber.length > 19 || !/^\d+$/.test(sanitizedNumber)) {
      return res.status(400).json({ message: 'Valid card number (13-19 digits) is required' });
    }
    if (!expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry).trim())) {
      return res.status(400).json({ message: 'Valid expiry date (MM/YY) is required' });
    }
    const last4 = sanitizedNumber.slice(-4);
    const cardBrand = brand || 'Card';
    const paymentMethodStr = `${cardBrand} ending in ${last4}`;

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const cardDetails = {
      cardholderName: cardholderName ? String(cardholderName).trim() : '',
      last4,
      brand: cardBrand,
      expiry: expiry ? String(expiry).trim() : '',
    };

    await Organization.updateOne(
      orgQuery,
      {
        $set: {
          payment_method: paymentMethodStr,
          card_details: cardDetails,
        },
        $unset: { paymentMethod: 1 }
      }
    );

    res.json({
      success: true,
      message: 'Payment card updated successfully!',
      registeredMethod: paymentMethodStr,
      cardDetails,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBillingDetails = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { legalName, billingEmail, billingPhone, billingAddress, gstin, pan } = req.body || {};

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const billingData = {
      legalName: legalName || '',
      billingEmail: billingEmail || '',
      billingPhone: billingPhone || '',
      billingAddress: billingAddress || '',
      gstin: gstin || '',
      pan: pan || '',
    };

    await Organization.updateOne(
      orgQuery,
      {
        $set: {
          billing_details: billingData,
          gstin: gstin || '',
        }
      }
    );

    res.json({
      success: true,
      message: 'Billing details updated successfully!',
      billingDetails: billingData,
    });
  } catch (err) {
    next(err);
  }
};

exports.upgradeSubscription = exports.renewSubscription;
