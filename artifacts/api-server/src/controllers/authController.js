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
    next(err);
  }
};
