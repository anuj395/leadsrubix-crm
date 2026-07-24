const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    discount_type: { type: String, enum: ['Percentage', 'Fixed Amount'], required: true, alias: 'discountType' },
    discount_value: { type: Number, required: true, alias: 'discountValue' },
    status: { type: String, enum: ['Active', 'Expired', 'Disabled'], default: 'Active' },
    expiry_date: { type: Date, required: true, alias: 'expiryDate' },
    usage_limit: { type: Number, default: 100, alias: 'usageLimit' },
    usage_count: { type: Number, default: 0, alias: 'usageCount' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const Coupon = mongoose.model('Coupon', couponSchema, 'coupons');

exports.Coupon = Coupon;
