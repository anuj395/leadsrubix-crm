const mongoose = require('mongoose');

const paymentDetailsSchema = new mongoose.Schema(
  {
    razorpay_order_id: { type: String, required: true, alias: 'razorpayOrderId' },
    razorpay_payment_id: { type: String, required: true, alias: 'razorpayPaymentId' },
    razorpay_signature: { type: String, required: true, alias: 'razorpaySignature' },
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    user_id: { type: String, default: '', alias: 'userId' },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    receipt: { type: String, default: '' },
    invoice_number: { type: String, default: '', alias: 'invoiceNumber' },
    billing_type: { type: String, default: 'RENEWAL', alias: 'billingType' },
    verified_at: { type: Date, default: Date.now, alias: 'verifiedAt' },
  },
  {
    timestamps: true,
    strict: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true },
  }
);

const PaymentDetails = mongoose.model('PaymentDetails', paymentDetailsSchema, 'paymentsDetails');

module.exports = { PaymentDetails };
