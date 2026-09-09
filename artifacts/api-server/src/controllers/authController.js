// src/controllers/authController.js
const authService = require('../services/authService');

exports.signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    console.error('[authController.login error]:', err);
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, platform } = req.body || {};
    const userId = req.user?.id || req.user?._id;
    const result = await authService.registerPushToken({ userId, pushToken, platform });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.unregisterPushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body || {};
    const userId = req.user?.id || req.user?._id;
    const result = await authService.unregisterPushToken({ userId, pushToken });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
