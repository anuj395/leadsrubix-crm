// src/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const organizationService = require('./organizationService');
const mailer = require('../utils/mailer');

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
      industryId: payload.industryId || 'basic_crm',
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
    industryId: user.industryId || user.industry_id || '',
    organizationId: user.organizationId || user.organization_id || '',
    needsPasswordChange: !!(user.needsPasswordChange || user.needs_password_change),
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
    industryId: user.industryId || user.industry_id || '',
    organizationId: user.organizationId || user.organization_id || '',
    needsPasswordChange: !!(user.needsPasswordChange || user.needs_password_change),
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

exports.forgotPassword = async (email) => {
  if (!email) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  const userDoc = await userModel.findByEmail(email);
  if (!userDoc) {
    const err = new Error('No account found with this email address.');
    err.status = 404;
    throw err;
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(20).toString('hex');
  
  userDoc.reset_password_token = token;
  userDoc.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour expiry
  await userDoc.save();

  const resetLink = `http://localhost:22333/reset-password?token=${token}`;
  console.log('=====================================================');
  console.log(`[PASSWORD RESET LINK for ${email}]: ${resetLink}`);
  console.log('=====================================================');

  try {
    const fs = require('fs');
    const path = require('path');
    const workspaceRoot = path.resolve(__dirname, '../../../../');
    const filePath = path.join(workspaceRoot, 'sent_emails.txt');
    const emailLog = `[${new Date().toISOString()}] To: ${email} | Subject: Password Reset | Link: ${resetLink}\n`;
    fs.appendFileSync(filePath, emailLog, 'utf8');
  } catch (err) {
    console.error('Failed to log email to sent_emails.txt:', err);
  }

  try {
    await mailer.sendResetPasswordEmail({
      emailAddress: email,
      resetLink
    });
  } catch (mailErr) {
    console.error('[authService] Failed to send SMTP reset email:', mailErr);
  }

  return { message: 'A password reset link has been sent to your email.' };
};

exports.resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    const err = new Error('Token and password are required');
    err.status = 400;
    throw err;
  }

  const userDoc = await userModel.User.findOne({
    reset_password_token: token,
    reset_password_expires: { $gt: new Date() }
  });

  if (!userDoc) {
    const err = new Error('Password reset token is invalid or has expired.');
    err.status = 400;
    throw err;
  }

  userDoc.password = newPassword;
  userDoc.reset_password_token = null;
  userDoc.reset_password_expires = null;
  await userDoc.save();

  return { message: 'Password has been reset successfully.' };
};
