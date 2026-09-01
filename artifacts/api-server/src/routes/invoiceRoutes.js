const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { Invoice } = require('../models/invoiceModel');

const router = express.Router();

router.use(authenticate);

// GET /api/invoices - List invoices for tenant
router.get('/', async (req, res, next) => {
  try {
    const userRole = req.user?.role || req.user?.roleKey || req.user?.role_key;
    const orgId = req.user?.organizationId || req.user?.organization_id;

    let filter = {};
    if (userRole !== 'superAdmin') {
      if (!orgId) {
        return res.json([]);
      }
      filter = {
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      };
    }

    const docs = await Invoice.find(filter).sort({ createdAt: -1 }).lean().exec();
    
    // Normalize format for frontend
    const invoices = (docs || []).map(inv => {
      const invDate = inv.invoice_date || inv.invoiceDate || inv.createdAt || new Date();
      const dateStr = new Date(invDate).toISOString().split('T')[0];
      const amountVal = Number(inv.total_amount || inv.totalAmount || 0);
      const subtotalVal = Number(inv.subtotal || 0);
      const taxVal = Number(inv.tax_amount || inv.taxAmount || 0);

      return {
        _id: String(inv._id),
        id: inv.invoice_number || inv.invoiceNumber || String(inv._id),
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN')}.00`,
        rawAmount: amountVal,
        subtotal: `₹${subtotalVal.toLocaleString('en-IN')}.00`,
        rawSubtotal: subtotalVal,
        gst: `₹${taxVal.toLocaleString('en-IN')}.00`,
        rawGst: taxVal,
        planName: inv.description || (inv.billing_type === 'SEAT_UPGRADE' ? `Seat Upgrade (+${inv.seats} seats)` : `Enterprise License Plan (${inv.seats || 1} seats)`),
        method: inv.payment_method || inv.paymentMethod || 'Online / Razorpay',
        status: inv.payment_status || inv.paymentStatus || 'PAID',
        txnId: inv.transaction_id || inv.transactionId || `TXN-${String(inv._id).slice(-8).toUpperCase()}`,
        seats: inv.seats || 1,
        tenureMonths: inv.tenure_months || inv.tenureMonths || 1,
      };
    });

    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/receipts - Receipts summary & historical charges
router.get('/receipts', async (req, res, next) => {
  try {
    const userRole = req.user?.role || req.user?.roleKey || req.user?.role_key;
    const orgId = req.user?.organizationId || req.user?.organization_id;

    let filter = {};
    if (userRole !== 'superAdmin') {
      if (!orgId) {
        return res.json({ receipts: [], totalGstPaid: 0, totalPaid: 0 });
      }
      filter = {
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      };
    }

    const docs = await Invoice.find(filter).sort({ createdAt: -1 }).lean().exec();

    let totalGstPaid = 0;
    let totalPaid = 0;

    const receipts = (docs || []).map((inv, idx) => {
      const invDate = inv.invoice_date || inv.invoiceDate || inv.createdAt || new Date();
      const dateStr = new Date(invDate).toISOString().split('T')[0];
      const amountVal = Number(inv.total_amount || inv.totalAmount || 0);
      const subtotalVal = Number(inv.subtotal || 0);
      const taxVal = Number(inv.tax_amount || inv.taxAmount || 0);

      totalGstPaid += taxVal;
      totalPaid += amountVal;

      return {
        _id: String(inv._id),
        receiptNo: `REC-LR-${String(inv.invoice_number || inv._id).replace(/[^0-9]/g, '').slice(-8) || (1000 + idx)}`,
        linkedInvoice: inv.invoice_number || inv.invoiceNumber || String(inv._id),
        date: dateStr,
        description: inv.description || (inv.billing_type === 'SEAT_UPGRADE' ? `Seat Upgrade (+${inv.seats} seats)` : `Enterprise License Plan (${inv.seats || 1} seats)`),
        subtotal: `₹${subtotalVal.toLocaleString('en-IN')}.00`,
        gst: `₹${taxVal.toLocaleString('en-IN')}.00`,
        totalPaid: `₹${amountVal.toLocaleString('en-IN')}.00`,
        status: inv.payment_status || inv.paymentStatus || 'PAID',
      };
    });

    res.json({
      receipts,
      totalGstPaid: `₹${totalGstPaid.toLocaleString('en-IN')}.00`,
      totalPaid: `₹${totalPaid.toLocaleString('en-IN')}.00`,
      count: receipts.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id - Single invoice
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await Invoice.findById(req.params.id).lean().exec();
    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(inv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
