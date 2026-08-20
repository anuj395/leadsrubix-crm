const service = require('../services/organizationService');

exports.list = async (req, res, next) => {
  try {
    const { items, total } = await service.listPaged({
      authedUser: req.user,
      industryId: req.query.industryId,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortField: req.query.sortField,
      sortDir: req.query.sortDir,
    });
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await service.fetchById({ id: req.params.id, authedUser: req.user });
    if (!item) return res.status(404).json({ message: 'Organization not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await service.create({ payload: req.body, authedUser: req.user });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await service.update({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove({ id: req.params.id, authedUser: req.user });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.getMySubscription = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const { calculateSubscriptionStatus } = require('../utils/subscriptionUtils');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.json({
        status: 'SUPER_ADMIN',
        isExpired: false,
        isTrial: false,
        isGracePeriod: false,
        paymentStatus: true,
        daysRemaining: 9999,
        reason: 'Super Admin or user without organization',
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const subState = calculateSubscriptionStatus(org);
    res.json({
      organizationId: org.organizationId || org._id,
      organizationName: org.organizationName || org.organization_name || '',
      ...subState,
    });
  } catch (err) {
    next(err);
  }
};

exports.upgradeSubscription = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const Coupon = mongoose.model('Coupon');

    const userOrgId = req.user?.organizationId || req.user?.organization_id;
    if (!userOrgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgId);
    const orgQuery = isObjectId
      ? { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }, { _id: userOrgId }] }
      : { $or: [{ organization_id: userOrgId }, { organizationId: userOrgId }] };

    const org = await Organization.findOne(orgQuery).exec();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const { planName = 'Enterprise Gold Plan', billingFrequency = 'Monthly', seats = 10, couponCode, paymentMethod } = req.body || {};

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).exec();
      if (coupon && coupon.status === 'Active' && coupon.usage_count < coupon.usage_limit) {
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usage_count: 1 } });
      }
    }

    const now = new Date();
    const currentExpiry = org.valid_till || org.validTill;
    const baseDate = (currentExpiry && new Date(currentExpiry) > now) ? new Date(currentExpiry) : now;

    const nextExpiry = new Date(baseDate);
    if (billingFrequency === 'Yearly') {
      nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
    } else {
      nextExpiry.setMonth(nextExpiry.getMonth() + 1);
    }

    const updateFields = {
      valid_till: nextExpiry,
      payment_status: true,
      status: 'ACTIVE',
      trial_period: false,
      is_active: true,
      num_employees: seats,
    };

    if (paymentMethod) {
      updateFields.payment_method = paymentMethod;
    }

    const $unset = {
      validTill: 1,
      paymentStatus: 1,
      trialPeriod: 1,
      isActive: 1,
      numEmployees: 1,
      registeredMethod: 1,
      paymentMethod: 1
    };

    await Organization.updateOne({ _id: org._id }, { $set: updateFields, $unset });

    res.json({
      success: true,
      message: `Successfully upgraded to ${planName}! Subscription valid till ${nextExpiry.toLocaleDateString()}`,
      validTill: nextExpiry,
    });
  } catch (err) {
    next(err);
  }
};

exports.requestDeletion = async (req, res, next) => {
  try {
    const result = await service.requestDeletion({
      authedUser: req.user,
      reason: req.body?.reason,
      feedback: req.body?.feedback,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.listDeletionRequests = async (req, res, next) => {
  try {
    const items = await service.listDeletionRequests({ authedUser: req.user });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.approveDeletionRequest = async (req, res, next) => {
  try {
    const result = await service.approveDeletionRequest({
      id: req.params.id,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.rejectDeletionRequest = async (req, res, next) => {
  try {
    const result = await service.rejectDeletionRequest({
      id: req.params.id,
      authedUser: req.user,
      rejectionReason: req.body?.rejectionReason,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.exportWorkspaceBackup = async (req, res, next) => {
  try {
    const backup = await service.exportWorkspaceBackup({
      id: req.params.id,
      authedUser: req.user,
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="workspace-backup-${backup.exportMetadata.subdomain || 'crm'}-${Date.now()}.json"`);
    res.json(backup);
  } catch (err) {
    next(err);
  }
};
