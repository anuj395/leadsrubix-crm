const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

function isSuperAdmin(user) {
  return user?.role === 'superAdmin';
}

router.get('/', authenticate, async (req, res) => {
  try {
    const Designation = mongoose.model('Designation');
    const industryId = isSuperAdmin(req.user) ? req.query.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.query.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    let doc = await Designation.findOne(query).exec();
    if (!doc && organizationId) {
      doc = await Designation.findOne({ industry_id: industryId, organization_id: null }).exec();
    }
    const items = doc ? doc.designations.map(d => ({ ...d.toObject(), id: d._id })) : [];
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch designations' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const Designation = mongoose.model('Designation');
    const industryId = isSuperAdmin(req.user) ? req.body.industryId || req.user?.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.body.organizationId || req.user?.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    let doc = await Designation.findOne(query);
    if (!doc) {
      doc = await Designation.create({
        industry_id: industryId,
        organization_id: organizationId,
        designations: []
      });
    }

    doc.designations.push({ name, value: name, label: name });
    await doc.save();

    const created = doc.designations[doc.designations.length - 1];
    res.status(201).json({ ...created.toObject(), id: created._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create designation' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const Designation = mongoose.model('Designation');
    const query = { 'designations._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Designation.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Designation not found' });

    const subDoc = doc.designations.id(req.params.id);
    subDoc.name = name;
    subDoc.value = name;
    subDoc.label = name;

    await doc.save();
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update designation' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Designation = mongoose.model('Designation');
    const query = { 'designations._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Designation.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Designation not found' });

    doc.designations.pull(req.params.id);
    await doc.save();
    res.json({ message: 'Designation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete designation' });
  }
});

module.exports = router;
