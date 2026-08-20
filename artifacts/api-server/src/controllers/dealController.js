const dealModel = require('../models/dealModel');
const { mapWithDualCase } = require('../utils/caseConverter');

exports.list = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const filter = { organization_id: orgId };
    const items = await dealModel.list({ filter });
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
    const item = await dealModel.create(payload);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await dealModel.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await dealModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await dealModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Deal not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};
