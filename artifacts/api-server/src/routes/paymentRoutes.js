const express = require('express');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/paymentController');
const razorpayService = require('../services/razorpayService');

const router = express.Router();

router.use(authenticate);

// GET /api/payments/key - returns Razorpay public key ID
router.get('/key', (req, res) => {
  res.json({ keyId: razorpayService.getKeyId() });
});

// POST /api/payments/create-order - creates Razorpay Order
router.post('/create-order', ctrl.createSubscriptionOrder);

// POST /api/payments/verify - verifies Razorpay HMAC signature & activates subscription
router.post('/verify', ctrl.verifySubscriptionPayment);

module.exports = router;
