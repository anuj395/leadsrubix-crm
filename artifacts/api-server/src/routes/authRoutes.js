const express = require('express');
const { signup, login, forgotPassword, resetPassword, registerPushToken, unregisterPushToken } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/register-push-token', authenticate, registerPushToken);
router.post('/unregister-push-token', authenticate, unregisterPushToken);

module.exports = router;
