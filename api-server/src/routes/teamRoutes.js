const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

function isSuperAdmin(user) {
  return user?.role === 'superAdmin';
}

router.get('/', authenticate, async (req, res) => {
  try {
    const Team = mongoose.model('Team');
    const industryId = isSuperAdmin(req.user) ? req.query.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.query.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    const doc = await Team.findOne(query).exec();
    const items = doc ? doc.teams.map(t => ({ ...t.toObject(), id: t._id })) : [];
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const Team = mongoose.model('Team');
    const query = { 'teams._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Team.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Team not found' });
    const subDoc = doc.teams.id(req.params.id);
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch team' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const Team = mongoose.model('Team');
    const industryId = isSuperAdmin(req.user) ? req.body.industryId || req.user?.industryId : req.user?.industryId;
    const organizationId = isSuperAdmin(req.user) ? req.body.organizationId || req.user?.organizationId : req.user?.organizationId;

    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;

    let doc = await Team.findOne(query);
    if (!doc) {
      doc = await Team.create({
        industry_id: industryId,
        organization_id: organizationId,
        teams: []
      });
    }

    doc.teams.push({ name, code, isActive: isActive !== false });
    await doc.save();

    const created = doc.teams[doc.teams.length - 1];
    res.status(201).json({ ...created.toObject(), id: created._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create team' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const Team = mongoose.model('Team');
    const query = { 'teams._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Team.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Team not found' });

    const subDoc = doc.teams.id(req.params.id);
    if (name !== undefined) subDoc.name = name;
    if (code !== undefined) subDoc.code = code;
    if (isActive !== undefined) subDoc.isActive = isActive;

    await doc.save();
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update team' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Team = mongoose.model('Team');
    const query = { 'teams._id': req.params.id };
    if (!isSuperAdmin(req.user)) {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Team.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Team not found' });

    doc.teams.pull(req.params.id);
    await doc.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete team' });
  }
});

module.exports = router;
