const mongoose = require('mongoose');
const razorpayService = require('../services/razorpayService');
const { Invoice } = require('../models/invoiceModel');
const { PaymentDetails } = require('../models/paymentModel');

/**
 * Resolve organization pricing plan and dynamic seats/rates
 */
async function resolveOrgPlan(org, user) {
  const PricingPlan = mongoose.model('PricingPlan');
  const orgIdStr = String(org?.organization_id || org?.organizationId || org?._id || '').trim();
  const indIdStr = String(org?.industry_id || org?.industryId || '').trim();

  let matchedPlan = null;
  if (orgIdStr) {
    matchedPlan = await PricingPlan.findOne({
      $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }]
    }).lean().exec();
  }
  if (!matchedPlan && indIdStr) {
    matchedPlan = await PricingPlan.findOne({
      $and: [
        { $or: [{ industry_id: indIdStr }, { industryId: indIdStr }] },
        { $or: [{ organization_id: null }, { organization_id: '' }] }
      ]
    }).lean().exec();
  }
  if (!matchedPlan) {
    matchedPlan = await PricingPlan.findOne({
      $and: [
        { $or: [{ organization_id: null }, { organization_id: '' }] },
        { $or: [{ industry_id: null }, { industry_id: '' }] }
      ]
    }).lean().exec();
  }

  const planLicensesCost = matchedPlan ? Number(matchedPlan.licenses_cost ?? matchedPlan.licensesCost ?? 1000) : 1000;
  const planTrialLicenses = matchedPlan ? Number(matchedPlan.trial_period_licenses ?? matchedPlan.trialPeriodLicenses ?? 10) : 10;

  let numEmployees = 0;
  if (org && (org.num_employees || org.numEmployees || org.no_of_employees)) {
    numEmployees = Number(org.num_employees || org.numEmployees || org.no_of_employees);
  } else {
    numEmployees = planTrialLicenses;
  }

  const orgExplicitCost = Number(org?.cost_per_license ?? org?.costPerLicense);
  let costPerLicense = 1000;
  if (!isNaN(orgExplicitCost) && orgExplicitCost > 0) {
    costPerLicense = orgExplicitCost;
  } else if (matchedPlan) {
    costPerLicense = planLicensesCost;
  }

  return { matchedPlan, numEmployees, costPerLicense };
}

/**
 * POST /api/payments/create-order
 * Initiates Razorpay Order for Renewal or Seat Upgrade
 */
exports.createSubscriptionOrder = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const Coupon = mongoose.model('Coupon');

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

    const { type = 'RENEWAL', tenureMonths = 1, seats: requestedSeats, targetSeats, couponCode } = req.body || {};
    const { numEmployees: currentSeats, costPerLicense } = await resolveOrgPlan(org, req.user);

    let subtotal = 0;
    let description = '';
    let effectiveSeats = currentSeats;
    let months = 1;

    if (type === 'RENEWAL') {
      months = [1, 3, 6, 12].includes(Number(tenureMonths)) ? Number(tenureMonths) : 1;
      effectiveSeats = requestedSeats !== undefined && Number(requestedSeats) > 0 ? Math.max(1, Number(requestedSeats)) : currentSeats;
      subtotal = Math.round(effectiveSeats * costPerLicense * months);
      description = `Subscription Renewal (${effectiveSeats} Seats for ${months} Mo)`;
    } else if (type === 'SEAT_UPGRADE') {
      const newTotalSeats = targetSeats !== undefined && Number(targetSeats) > 0 ? Math.max(1, Number(targetSeats)) : currentSeats;
      const addSeats = newTotalSeats - currentSeats;

      if (addSeats <= 0) {
        return res.status(400).json({ message: 'Target seats must be greater than current seats for paid upgrade.' });
      }

      const now = new Date();
      const currentExpiry = org.valid_till || org.validTill ? new Date(org.valid_till || org.validTill) : new Date(now.getTime() + 30 * 86400000);
      const remainingDays = Math.max(1, Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const perDayCost = costPerLicense / 30;
      subtotal = Math.round(addSeats * perDayCost * remainingDays);
      effectiveSeats = newTotalSeats;
      description = `Seat Upgrade (+${addSeats} Seats for ${remainingDays} days prorata)`;
    }

    // Coupon calculation
    let discountAmount = 0;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).exec();
      if (coupon && coupon.status === 'Active' && (coupon.usage_count || 0) < (coupon.usage_limit || 999999)) {
        if (coupon.discount_type === 'Percentage') {
          discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
        } else {
          discountAmount = Math.min(subtotal, coupon.discount_value);
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(discountedSubtotal * 0.18);
    const totalAmount = discountedSubtotal + taxAmount;

    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'Payable amount must be greater than zero.' });
    }

    const amountInPaise = Math.round(totalAmount * 100);
    const receiptId = `rcpt_${Date.now().toString().slice(-8)}`;

    const order = await razorpayService.createOrder({
      amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        organizationId: String(org.organization_id || org.organizationId || org._id),
        type,
        seats: String(effectiveSeats),
        tenureMonths: String(months),
      },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayService.getKeyId(),
      description,
      prefill: {
        name: req.user?.name || req.user?.firstName || org.organizationName || 'Valued Client',
        email: req.user?.email || org.email_id || '',
        contact: req.user?.contactNumber || req.user?.mobileNumber || org.contact_number || '',
      },
      metadata: {
        type,
        seats: effectiveSeats,
        tenureMonths: months,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        couponCode: couponCode || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/verify
 * Cryptographically verifies Razorpay payment signature and activates subscription
 */
exports.verifySubscriptionPayment = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const Coupon = mongoose.model('Coupon');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type = 'RENEWAL',
      tenureMonths = 1,
      seats: requestedSeats,
      couponCode,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay verification parameters' });
    }

    const isValid = razorpayService.verifySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Razorpay payment signature verification failed' });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const months = [1, 3, 6, 12].includes(Number(tenureMonths)) ? Number(tenureMonths) : 1;
    const { numEmployees: currentSeats, costPerLicense } = await resolveOrgPlan(org, req.user);
    const seats = requestedSeats !== undefined && Number(requestedSeats) > 0 ? Math.max(1, Number(requestedSeats)) : currentSeats;

    // Calculate amounts
    let subtotal = 0;
    if (type === 'SEAT_UPGRADE') {
      const addSeats = Math.max(1, seats - currentSeats);
      const now = new Date();
      const currentExpiry = org.valid_till || org.validTill ? new Date(org.valid_till || org.validTill) : new Date(now.getTime() + 30 * 86400000);
      const remainingDays = Math.max(1, Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const perDayCost = costPerLicense / 30;
      subtotal = Math.round(addSeats * perDayCost * remainingDays);
    } else {
      subtotal = Math.round(seats * costPerLicense * months);
    }

    let discountAmount = 0;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).exec();
      if (coupon && coupon.status === 'Active') {
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

    // Extend validity if renewal
    const now = new Date();
    const currentExpiry = org.valid_till || org.validTill;
    const baseDate = (currentExpiry && new Date(currentExpiry) > now) ? new Date(currentExpiry) : now;
    const nextExpiry = new Date(baseDate);
    if (type === 'RENEWAL') {
      nextExpiry.setMonth(nextExpiry.getMonth() + months);
    }

    const orgUpdate = {
      payment_status: true,
      status: 'ACTIVE',
      trial_period: false,
      is_active: true,
      payment_method: 'Online / Razorpay',
      num_employees: seats,
    };
    if (type === 'RENEWAL') {
      orgUpdate.valid_till = nextExpiry;
    }

    await Organization.updateOne(
      { _id: org._id },
      {
        $set: orgUpdate,
        $unset: { validTill: 1, paymentStatus: 1, trialPeriod: 1, isActive: 1, numEmployees: 1 }
      }
    );

    // Create real invoice
    const invCount = await Invoice.countDocuments().exec();
    const invNumber = `INV-${now.getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
    const invoiceDoc = await Invoice.create({
      invoice_number: invNumber,
      organization_id: String(org.organization_id || org.organizationId || org._id),
      billing_type: type === 'SEAT_UPGRADE' ? 'SEAT_UPGRADE' : 'RENEWAL',
      description: type === 'SEAT_UPGRADE'
        ? `Seat Upgrade (+${seats - currentSeats} Seats) via Razorpay`
        : `Subscription Renewal (${seats} Seats for ${months} Mo) via Razorpay`,
      seats: type === 'SEAT_UPGRADE' ? (seats - currentSeats) : seats,
      tenure_months: months,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      currency: 'INR',
      payment_method: 'Online / Razorpay',
      payment_status: 'PAID',
      transaction_id: razorpay_payment_id,
      invoice_date: new Date(),
    });

    // Record in paymentsDetails
    await PaymentDetails.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      organization_id: String(org.organization_id || org.organizationId || org._id),
      user_id: String(req.user?._id || req.user?.id || ''),
      status: 'SUCCESS',
      amount: totalAmount,
      currency: 'INR',
      invoice_number: invNumber,
      billing_type: type,
      verified_at: new Date(),
    });

    res.json({
      success: true,
      message: type === 'SEAT_UPGRADE'
        ? `Payment verified! Seats successfully upgraded to ${seats}.`
        : `Payment verified! Subscription renewed till ${nextExpiry.toLocaleDateString()} with ${seats} seats.`,
      invoice: invoiceDoc,
      validTill: nextExpiry,
      numEmployees: seats,
    });
  } catch (err) {
    next(err);
  }
};
