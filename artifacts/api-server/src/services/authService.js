// src/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const organizationService = require('./organizationService');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[auth] FATAL: JWT_SECRET environment variable must be set in production.',
  );
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const DEFAULT_ROLE = 'sales';

exports.signup = async (payload) => {
  const { fields, password } = payload || {};
  let finalFields = fields;

  if (!finalFields) {
    // Construct backward-compatible fields payload
    finalFields = {
      emailId: payload.email,
      email: payload.email,
      firstName: payload.name || 'Admin',
      organizationName: payload.name || 'Organization',
      industryId: payload.industryId || 'temp0001',
      industryId: payload.industryId || 'temp0001',
    };
  }

  const mongoose = require('mongoose');

  const email = finalFields.emailId || finalFields.email_id || finalFields.email || payload.email || payload.email_id;
  const finalPassword = password || payload.password;

  let isEmailRequired = true;
  try {
    const Screen = mongoose.model('Screen');
    const ScreenField = mongoose.model('ScreenField');
    const screen = await Screen.findOne({
      key: 'organization',
      organization_id: null,
      organizationId: null
    }).lean().exec();
    if (screen) {
      const emailField = await ScreenField.findOne({
        screen_id: screen._id,
        $or: [
          { field_key: 'emailId' },
          { field_key: 'email_id' },
          { fieldKey: 'emailId' },
          { fieldKey: 'email_id' }
        ],
        organization_id: null,
        organizationId: null
      }).lean().exec();
      if (emailField) {
        isEmailRequired = emailField.is_required === true || emailField.isRequired === true;
      }
    }
  } catch (err) {
    console.error('[authService] Failed to resolve email requirement:', err);
  }

  if (isEmailRequired && !email) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  if (email) {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.status = 400;
      throw err;
    }
  }

  // Create the organization and the corresponding admin user using the standardized service method
  const org = await organizationService.create({
    payload: {
      fields: finalFields,
      password: finalPassword,
    },
    authedUser: null,
  });

  // Retrieve the created admin user document
  let user;
  if (email) {
    user = await userModel.User.findOne({ email: email.toLowerCase().trim() }).lean().exec();
  } else {
    user = await userModel.User.findOne({ organizationId: org.organizationId, role: 'admin' }).lean().exec();
  }
  
  if (!user) {
    throw new Error('Failed to retrieve the created admin account');
  }

  const safeUser = {
    id: user._id || user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Admin',
    email: user.email || '',
    role: user.role,
    industryId: user.industryId || user.industryId,
    industryId: user.industryId || user.industryId,
    needsPasswordChange: !!(user.needsPasswordChange || user.needs_password_change),
    needs_password_change: !!(user.needsPasswordChange || user.needs_password_change),
  };

  const token = jwt.sign({ id: safeUser.id, role: safeUser.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { user: safeUser, token };
};

exports.login = async (email, password) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }
  const user = await userModel.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const safeUser = {
    id: user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    email: user.email,
    role: user.role,
    industryId: user.industryId || user.industryId,
    industryId: user.industryId || user.industryId,
    needsPasswordChange: !!(user.needsPasswordChange || user.needs_password_change),
    needs_password_change: !!(user.needsPasswordChange || user.needs_password_change),
  };
  return { user: safeUser, token };
};

exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};
