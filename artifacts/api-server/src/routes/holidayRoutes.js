const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const Holiday = mongoose.model('Holiday');
    const items = await Holiday.find({ organizationId: req.user.organizationId }).sort({ date: 1 }).lean().exec();
    res.json({ items: items.map(h => ({ ...h, id: h._id })) });
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
    const item = await Holiday.create({
      organizationId: req.user.organizationId,
      name,
      date,
      dayOfWeek: dayName,
      type: type || 'Company Holiday',
      description: description || '',
    });
    res.status(201).json({ ...item.toObject(), id: item._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create holiday' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and Date are required' });
    const Holiday = mongoose.model('Holiday');
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const item = await Holiday.findByIdAndUpdate(
      req.params.id,
      { name, date, dayOfWeek: dayName, type, description },
      { new: true }
    );
    res.json({ ...item.toObject(), id: item._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update holiday' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Holiday = mongoose.model('Holiday');
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete holiday' });
  }
});

module.exports = router;
