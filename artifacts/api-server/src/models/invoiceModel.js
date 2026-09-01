const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, required: true, unique: true, alias: 'invoiceNumber' },
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    billing_type: { type: String, enum: ['RENEWAL', 'SEAT_UPGRADE', 'INITIAL'], default: 'RENEWAL', alias: 'billingType' },
    description: { type: String, default: '' },
    seats: { type: Number, default: 1 },
    tenure_months: { type: Number, default: 1, alias: 'tenureMonths' },
    subtotal: { type: Number, required: true },
    tax_amount: { type: Number, required: true, default: 0, alias: 'taxAmount' },
    discount_amount: { type: Number, default: 0, alias: 'discountAmount' },
    total_amount: { type: Number, required: true, alias: 'totalAmount' },
    currency: { type: String, default: 'INR' },
    payment_method: { type: String, default: 'Online / Razorpay', alias: 'paymentMethod' },
    payment_status: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], default: 'PAID', alias: 'paymentStatus' },
    transaction_id: { type: String, default: '', alias: 'transactionId' },
    invoice_date: { type: Date, default: Date.now, alias: 'invoiceDate' },
  },
  {
    timestamps: true,
    strict: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

module.exports = { Invoice };
