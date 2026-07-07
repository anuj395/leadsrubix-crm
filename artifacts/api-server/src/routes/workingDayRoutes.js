const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const DEFAULT_DAYS = [
  { day: 'Monday', closed: false, opensAt: '09:00', closesAt: '18:00', notes: 'Standard business hours' },
  { day: 'Tuesday', closed: false, opensAt: '09:00', closesAt: '18:00', notes: 'Standard business hours' },
  { day: 'Wednesday', closed: false, opensAt: '09:00', closesAt: '18:00', notes: 'Standard business hours' },
  { day: 'Thursday', closed: false, opensAt: '09:00', closesAt: '18:00', notes: 'Standard business hours' },
  { day: 'Friday', closed: false, opensAt: '09:00', closesAt: '18:00', notes: 'Standard business hours' },
  { day: 'Saturday', closed: true, opensAt: '10:00', closesAt: '14:00', notes: 'Weekend standby support' },
  { day: 'Sunday', closed: true, opensAt: '', closesAt: '', notes: 'Off-duty' },
];

router.get('/', authenticate, async (req, res) => {
  try {
    const WorkingDay = mongoose.model('WorkingDay');
    let items = await WorkingDay.find({ organizationId: req.user.organizationId }).sort({ createdAt: 1 }).lean().exec();
    
    // If not seeded yet, seed default days
    if (items.length === 0) {
      const docs = DEFAULT_DAYS.map(d => ({
        ...d,
        organizationId: req.user.organizationId,
      }));
      await WorkingDay.insertMany(docs);
      items = await WorkingDay.find({ organizationId: req.user.organizationId }).sort({ createdAt: 1 }).lean().exec();
    }
    
    res.json({ items: items.map(d => ({ ...d, id: d._id })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch working days schedule' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { closed, opensAt, closesAt, notes } = req.body;
    const WorkingDay = mongoose.model('WorkingDay');
    const item = await WorkingDay.findByIdAndUpdate(
      req.params.id,
      { closed, opensAt, closesAt, notes },
      { new: true }
    );
    res.json({ ...item.toObject(), id: item._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update working day schedule' });
  }
});

module.exports = router;
