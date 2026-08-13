const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// GET list - authed users may view
router.get('/', authenticate, async (req, res, next) => {
  try {
    const Coupon = mongoose.model('Coupon');
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).exec();
    res.json(coupons);
  } catch (err) {
    next(err);
  }
});

// POST validate coupon for subscription upgrade
router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const Coupon = mongoose.model('Coupon');
    const { code, planPrice = 4999 } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required' });
    }

    const cleanCode = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: cleanCode }).exec();

    if (!coupon) {
      return res.status(404).json({ valid: false, message: `Invalid coupon code '${cleanCode}'` });
    }

    if (coupon.status !== 'Active') {
      return res.status(400).json({ valid: false, message: `Coupon '${cleanCode}' is ${coupon.status.toLowerCase()}` });
    }

    const now = new Date();
    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
      return res.status(400).json({ valid: false, message: `Coupon '${cleanCode}' has expired` });
    }

    if (coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ valid: false, message: `Coupon '${cleanCode}' usage limit exceeded` });
    }

    const basePrice = Number(planPrice) || 0;
    let discountAmount = 0;
    const isPercentage = coupon.discount_type === 'Percentage';

    if (isPercentage) {
      discountAmount = Math.round((basePrice * coupon.discount_value) / 100);
    } else {
      discountAmount = Number(coupon.discount_value) || 0;
    }

    discountAmount = Math.min(discountAmount, basePrice);
    const finalPrice = Math.max(0, basePrice - discountAmount);

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
      finalPrice,
      message: `Coupon '${coupon.code}' applied successfully! ${isPercentage ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}`,
    });
  } catch (err) {
    next(err);
  }
});

// POST create (Super Admin only)
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only Super Admin can create coupons' });
    }
    const Coupon = mongoose.model('Coupon');
    const doc = await Coupon.create(req.body || {});
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// PUT update (Super Admin only)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only Super Admin can edit coupons' });
    }
    const Coupon = mongoose.model('Coupon');
    const doc = await Coupon.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// DELETE remove (Super Admin only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only Super Admin can delete coupons' });
    }
    const Coupon = mongoose.model('Coupon');
    const doc = await Coupon.findByIdAndDelete(req.params.id).exec();
    if (!doc) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
