const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

router.get('/', authenticate, requireScreenAction('holidays', 'view'), async (req, res) => {
  try {
    const Holiday = mongoose.model('Holiday');
    const doc = await Holiday.findOne({ organization_id: req.user.organizationId }).lean().exec();
    const items = doc ? doc.holidays.map(h => ({ ...h, id: h._id })) : [];
    items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

router.post('/', authenticate, requireScreenAction('holidays', 'add'), async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and Date are required' });

    const Holiday = mongoose.model('Holiday');
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    let doc = await Holiday.findOne({ organization_id: req.user.organizationId });
    if (!doc) {
      doc = await Holiday.create({
        organization_id: req.user.organizationId,
        workspace_id: req.user.workspaceId,
        industry_id: req.user.industryId,
        holidays: []
      });
    }

    doc.holidays.push({
      name,
      date,
      dayOfWeek: dayName,
      type: type || 'Company Holiday',
      description: description || ''
    });

    await doc.save();
    const created = doc.holidays[doc.holidays.length - 1];
    res.status(201).json({ ...created.toObject(), id: created._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create holiday' });
  }
});

router.put('/:id', authenticate, requireScreenAction('holidays', 'edit'), async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and Date are required' });

    const Holiday = mongoose.model('Holiday');
    const query = { 'holidays._id': req.params.id };
    if (req.user?.role !== 'superAdmin') {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Holiday.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Holiday not found' });

    const subDoc = doc.holidays.id(req.params.id);
    if (!subDoc) return res.status(404).json({ message: 'Holiday not found' });

    subDoc.name = name;
    subDoc.date = date;
    subDoc.dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    if (type) subDoc.type = type;
    if (description !== undefined) subDoc.description = description;

    await doc.save();
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update holiday' });
  }
});

router.delete('/:id', authenticate, requireScreenAction('holidays', 'delete'), async (req, res) => {
  try {
    const Holiday = mongoose.model('Holiday');
    const query = { 'holidays._id': req.params.id };
    if (req.user?.role !== 'superAdmin') {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Holiday.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Holiday config not found' });

    doc.holidays.pull(req.params.id);
    await doc.save();
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete holiday' });
  }
});

module.exports = router;
