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
    let doc = await WorkingDay.findOne({ organization_id: req.user.organizationId }).exec();
    
    // If not seeded yet, seed default days
    if (!doc) {
      doc = await WorkingDay.create({
        organization_id: req.user.organizationId,
        workspace_id: req.user.workspaceId,
        industry_id: req.user.industryId,
        days: DEFAULT_DAYS,
      });
    }
    
    const items = doc.days.map(d => {
      const obj = d.toObject();
      return {
        ...obj,
        id: d._id,
        opensAt: d.opensAt || d.opens_at,
        closesAt: d.closesAt || d.closes_at,
      };
    });
    
    res.json({ items });
  } catch (err) {
    console.error('Failed to fetch working days schedule:', err);
    res.status(500).json({ message: 'Failed to fetch working days schedule' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { closed, opensAt, closesAt, notes } = req.body;
    const WorkingDay = mongoose.model('WorkingDay');
    const doc = await WorkingDay.findOne({ organization_id: req.user.organizationId });
    if (!doc) return res.status(404).json({ message: 'Working days configuration not found' });
    
    const subDoc = doc.days.id(req.params.id);
    if (!subDoc) return res.status(404).json({ message: 'Day schedule not found' });
    
    if (closed !== undefined) subDoc.closed = closed;
    if (opensAt !== undefined) {
      subDoc.opensAt = opensAt;
      subDoc.opens_at = opensAt;
    }
    if (closesAt !== undefined) {
      subDoc.closesAt = closesAt;
      subDoc.closes_at = closesAt;
    }
    if (notes !== undefined) subDoc.notes = notes;
    
    await doc.save();
    
    res.json({
      ...subDoc.toObject(),
      id: subDoc._id,
      opensAt: subDoc.opensAt || subDoc.opens_at,
      closesAt: subDoc.closesAt || subDoc.closes_at,
    });
  } catch (err) {
    console.error('Failed to update working day schedule:', err);
    res.status(500).json({ message: 'Failed to update working day schedule' });
  }
});

module.exports = router;
