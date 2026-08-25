const accountModel = require('../models/accountModel');
const { mapWithDualCase } = require('../utils/caseConverter');

exports.list = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superAdmin';
    const orgId = req.query.organizationId || req.headers['x-organization-id'] || req.user.organization_id || req.user.organizationId;
    const filter = {};
    if (orgId && orgId !== 'all') {
      filter.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (!isSuperAdmin) {
      filter.organization_id = 'non_existent_scope';
    }
    const items = await accountModel.list({ filter });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const payload = {
      ...req.body,
      organization_id: orgId,
      created_by: req.user._id || req.user.id
    };
    const item = await accountModel.create(payload);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await accountModel.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await accountModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await accountModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Account not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};
