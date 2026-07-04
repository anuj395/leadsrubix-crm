const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const DropdownOption = mongoose.model('DropdownOption');
    const items = await DropdownOption.find({ key: 'designations' }).lean().exec();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch designations' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const DropdownOption = mongoose.model('DropdownOption');
    const item = await DropdownOption.create({ key: 'designations', value: name, label: name });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create designation' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const DropdownOption = mongoose.model('DropdownOption');
    const item = await DropdownOption.findByIdAndUpdate(req.params.id, { value: name, label: name }, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update designation' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const DropdownOption = mongoose.model('DropdownOption');
    await DropdownOption.findByIdAndDelete(req.params.id);
    res.json({ message: 'Designation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete designation' });
  }
});

module.exports = router;
