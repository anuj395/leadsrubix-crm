const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

function isSuperAdmin(user) {
  return user?.role === 'superAdmin';
}

router.get('/', authenticate, async (req, res) => {
  try {
    const Branch = mongoose.model('Branch');
    const industryId = isSuperAdmin(req.user) ? req.query.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.query.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    const doc = await Branch.findOne(query).exec();
    const items = doc ? doc.branches.map(b => ({ ...b.toObject(), id: b._id })) : [];
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const Branch = mongoose.model('Branch');
    const query = { 'branches._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Branch.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Branch not found' });
    const subDoc = doc.branches.id(req.params.id);
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch branch' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const Branch = mongoose.model('Branch');
    const industryId = isSuperAdmin(req.user) ? req.body.industryId || req.user?.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.body.organizationId || req.user?.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    let doc = await Branch.findOne(query);
    if (!doc) {
      doc = await Branch.create({
        industry_id: industryId,
        organization_id: organizationId,
        branches: []
      });
    }

    doc.branches.push({ name, code, isActive: isActive !== false });
    await doc.save();

    const created = doc.branches[doc.branches.length - 1];
    res.status(201).json({ ...created.toObject(), id: created._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create branch' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const Branch = mongoose.model('Branch');
    const query = { 'branches._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Branch.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Branch not found' });

    const subDoc = doc.branches.id(req.params.id);
    if (name !== undefined) subDoc.name = name;
    if (code !== undefined) subDoc.code = code;
    if (isActive !== undefined) subDoc.isActive = isActive;

    await doc.save();
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update branch' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Branch = mongoose.model('Branch');
    const query = { 'branches._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Branch.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Branch not found' });

    doc.branches.pull(req.params.id);
    await doc.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete branch' });
  }
});

module.exports = router;
