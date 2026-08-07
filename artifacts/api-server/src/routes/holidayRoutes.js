const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const Holiday = mongoose.model('Holiday');
    const doc = await Holiday.findOne({ organizationId: req.user.organizationId }).lean().exec();
    const items = doc ? doc.holidays.map(h => ({ ...h, id: h._id })) : [];
    items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and Date are required' });

    const Holiday = mongoose.model('Holiday');
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    let doc = await Holiday.findOne({ organizationId: req.user.organizationId });
    if (!doc) {
      doc = await Holiday.create({
        organizationId: req.user.organizationId,
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

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and Date are required' });

    const Holiday = mongoose.model('Holiday');
    const query = { 'holidays._id': req.params.id };
    if (req.user?.role !== 'superAdmin') {
      query.organization_id = req.user?.organizationId;
    }
    const doc = await Holiday.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Holiday config not found' });

    const subDoc = doc.holidays.id(req.params.id);
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    subDoc.name = name;
    subDoc.date = date;
    subDoc.dayOfWeek = dayName;
    subDoc.type = type || 'Company Holiday';
    subDoc.description = description || '';

    await doc.save();
    res.json({ ...subDoc.toObject(), id: subDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update holiday' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
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
