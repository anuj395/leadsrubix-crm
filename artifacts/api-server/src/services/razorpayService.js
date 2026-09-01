const crypto = require('crypto');
const axios = require('axios');

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

/**
 * Basic Auth header for Razorpay REST API calls
 */
function getAuthHeader() {
  return 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
}

/**
 * Creates a Razorpay Order
 * @param {Object} opts
 * @param {number} opts.amountInPaise
 * @param {string} [opts.currency='INR']
 * @param {string} [opts.receipt]
 * @param {Object} [opts.notes]
 */
exports.createOrder = async ({ amountInPaise, currency = 'INR', receipt, notes = {} }) => {
  try {
    const res = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: Math.round(amountInPaise),
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error('[razorpayService] Failed to create Razorpay order:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error?.description || err.message || 'Razorpay order creation failed';
    const error = new Error(errorMsg);
    error.status = err.response?.status || 500;
    throw error;
  }
};

/**
 * Verifies Razorpay HMAC SHA256 signature
 * @param {Object} opts
 * @param {string} opts.razorpayOrderId
 * @param {string} opts.razorpayPaymentId
 * @param {string} opts.razorpaySignature
 * @returns {boolean}
 */
exports.verifySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

/**
 * Fetches payment details from Razorpay API
 * @param {string} paymentId
 */
exports.fetchPayment = async (paymentId) => {
  try {
    const res = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: getAuthHeader() },
    });
    return res.data;
  } catch (err) {
    console.error(`[razorpayService] Failed to fetch payment ${paymentId}:`, err.response?.data || err.message);
    return null;
  }
};

/**
 * Returns public Key ID for client checkout initialization
 */
exports.getKeyId = () => KEY_ID;
