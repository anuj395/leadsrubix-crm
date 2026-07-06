const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const DropdownOption = mongoose.model('DropdownOption');
    const items = await DropdownOption.find({ key: 'role_keys' }).lean().exec();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch role keys' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const DropdownOption = mongoose.model('DropdownOption');
    const item = await DropdownOption.create({ key: 'role_keys', value: name, label: name });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create role key' });
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
    res.status(500).json({ message: 'Failed to update role key' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const DropdownOption = mongoose.model('DropdownOption');
    await DropdownOption.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role key deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete role key' });
  }
});

module.exports = router;
