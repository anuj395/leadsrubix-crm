const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Get list of distribution rules
router.get('/rules', authenticate, async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = req.user.organizationId || req.user.organization_id;
    if (!orgId) {
      return res.json([]);
    }
    const rules = await LeadDistributionRule.find({ organizationId: orgId }).exec();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create distribution rule
router.post('/rules', authenticate, async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = req.user.organizationId || req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is mandatory' });
    }

    const rule = new LeadDistributionRule({
      organizationId: orgId,
      source: req.body.source,
      project: req.body.project || [],
      location: req.body.location || [],
      budget: req.body.budget || [],
      propertyType: req.body.propertyType || [],
      users: req.body.users || [],
      usersQueue: req.body.usersQueue || [],
      leadManagerUsers: req.body.leadManagerUsers || [],
      distributionType: req.body.distributionType || 'Normal',
      userIndex: req.body.userIndex || 0,
      leadDistId: req.body.leadDistId,
    });

    const saved = await rule.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update distribution rule
router.put('/rules/:id', authenticate, async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = req.user.organizationId || req.user.organization_id;

    const rule = await LeadDistributionRule.findOne({ _id: req.params.id, organizationId: orgId }).exec();
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    if (req.body.source !== undefined) rule.source = req.body.source;
    if (req.body.project !== undefined) rule.project = req.body.project;
    if (req.body.location !== undefined) rule.location = req.body.location;
    if (req.body.budget !== undefined) rule.budget = req.body.budget;
    if (req.body.propertyType !== undefined) rule.propertyType = req.body.propertyType;
    if (req.body.users !== undefined) rule.users = req.body.users;
    if (req.body.usersQueue !== undefined) rule.usersQueue = req.body.usersQueue;
    if (req.body.leadManagerUsers !== undefined) rule.leadManagerUsers = req.body.leadManagerUsers;
    if (req.body.distributionType !== undefined) rule.distributionType = req.body.distributionType;
    if (req.body.userIndex !== undefined) rule.userIndex = req.body.userIndex;

    const saved = await rule.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete distribution rule
router.delete('/rules/:id', authenticate, async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = req.user.organizationId || req.user.organization_id;

    const result = await LeadDistributionRule.deleteOne({ _id: req.params.id, organizationId: orgId }).exec();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get list of rotation rules
router.get('/rotation-rules', authenticate, async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = req.user.organizationId || req.user.organization_id;
    if (!orgId) {
      return res.json([]);
    }
    const rules = await LeadRotationRule.find({ organizationId: orgId }).exec();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create rotation rule
router.post('/rotation-rules', authenticate, async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = req.user.organizationId || req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is mandatory' });
    }

    const rule = new LeadRotationRule({
      organizationId: orgId,
      source: req.body.source,
      project: req.body.project || [],
      rotationTime: req.body.rotationTime,
      users: req.body.users || [],
      usersQueue: req.body.usersQueue || [],
      leadManagerUsers: req.body.leadManagerUsers || [],
      userIndex: req.body.userIndex || 0,
      relocId: req.body.relocId,
    });

    const saved = await rule.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete rotation rule
router.delete('/rotation-rules/:id', authenticate, async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = req.user.organizationId || req.user.organization_id;

    const result = await LeadRotationRule.deleteOne({ _id: req.params.id, organizationId: orgId }).exec();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Rotation rule not found' });
    }
    res.json({ message: 'Rotation rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
