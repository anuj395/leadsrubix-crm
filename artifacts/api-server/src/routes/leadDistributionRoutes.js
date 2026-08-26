const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

const router = express.Router();

function resolveOrgId(req) {
  if (req.user.role === 'superAdmin') {
    const org = req.query.organizationId || req.body.organizationId || req.headers['x-organization-id'];
    return (org === 'null' || org === 'all' || !org) ? null : org;
  }
  return req.user.organizationId || req.user.organization_id || null;
}

function ensureAdminRole(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
    return res.status(403).json({ message: 'Forbidden: Lead Distribution is restricted to Admin role only.' });
  }
  next();
}

// Get list of distribution rules
router.get('/rules', authenticate, ensureAdminRole, requireScreenAction('leadDistribution', 'view'), async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = resolveOrgId(req);
    const query = {};
    if (orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (req.user.role !== 'superAdmin') {
      return res.json([]);
    }
    const rules = await LeadDistributionRule.find(query).exec();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single distribution rule by ID
router.get('/rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadDistribution', 'view'), async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }
    const rule = await LeadDistributionRule.findOne(query).exec();
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create distribution rule
router.post('/rules', authenticate, ensureAdminRole, requireScreenAction('leadDistribution', 'add'), async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is mandatory' });
    }

    // Check if duplicate rule with exact same source and criteria already exists
    const existingRules = await LeadDistributionRule.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
      source: req.body.source
    }).exec();

    const isSameArray = (a = [], b = []) => {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      if (arrA.length !== arrB.length) return false;
      const sortedA = [...arrA].sort();
      const sortedB = [...arrB].sort();
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    const duplicate = existingRules.find(r => 
      isSameArray(r.project, req.body.project) &&
      isSameArray(r.location, req.body.location) &&
      isSameArray(r.budget, req.body.budget) &&
      isSameArray(r.propertyType, req.body.propertyType)
    );

    const usersQueue = req.body.usersQueue || req.body.users_queue || (req.body.users || []).map(u => u.user_email || u.email);
    const usersList = req.body.users || [];
    const leadManagers = req.body.leadManagerUsers || req.body.lead_manager_users || [];
    const distType = req.body.distributionType || req.body.distribution_type || 'Normal';

    if (duplicate) {
      duplicate.users = usersList;
      duplicate.users_queue = usersQueue;
      duplicate.usersQueue = usersQueue;
      duplicate.lead_manager_users = leadManagers;
      duplicate.leadManagerUsers = leadManagers;
      duplicate.distribution_type = distType;
      duplicate.distributionType = distType;
      duplicate.user_index = 0;
      duplicate.userIndex = 0;
      const saved = await duplicate.save();
      await LeadDistributionRule.updateOne(
        { _id: duplicate._id },
        { $set: { users: usersList, users_queue: usersQueue, usersQueue: usersQueue, distribution_type: distType, distributionType: distType, user_index: 0, userIndex: 0 } }
      ).exec();
      return res.status(200).json(saved);
    }

    const rule = new LeadDistributionRule({
      organizationId: orgId,
      organization_id: orgId,
      industryId: req.body.industryId || req.user.industryId || null,
      source: req.body.source,
      project: req.body.project || [],
      location: req.body.location || [],
      budget: req.body.budget || [],
      propertyType: req.body.propertyType || [],
      users: usersList,
      usersQueue: usersQueue,
      users_queue: usersQueue,
      leadManagerUsers: leadManagers,
      lead_manager_users: leadManagers,
      distributionType: distType,
      distribution_type: distType,
      userIndex: 0,
      user_index: 0,
      leadDistId: req.body.leadDistId || ('ld-' + Date.now()),
    });

    const saved = await rule.save();
    await LeadDistributionRule.updateOne(
      { _id: saved._id },
      { $set: { users: usersList, users_queue: usersQueue, usersQueue: usersQueue, distribution_type: distType, distributionType: distType, user_index: 0, userIndex: 0 } }
    ).exec();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update distribution rule
router.put('/rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadDistribution', 'edit'), async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const rule = await LeadDistributionRule.findOne(query).exec();
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    if (req.body.source !== undefined) rule.source = req.body.source;
    if (req.body.project !== undefined) rule.project = req.body.project;
    if (req.body.location !== undefined) rule.location = req.body.location;
    if (req.body.budget !== undefined) rule.budget = req.body.budget;
    if (req.body.propertyType !== undefined) rule.propertyType = req.body.propertyType;
    if (req.body.users !== undefined) rule.users = req.body.users;
    if (req.body.usersQueue !== undefined || req.body.users_queue !== undefined) {
      rule.usersQueue = req.body.usersQueue || req.body.users_queue;
      rule.users_queue = req.body.usersQueue || req.body.users_queue;
    }
    if (req.body.leadManagerUsers !== undefined) rule.leadManagerUsers = req.body.leadManagerUsers;
    if (req.body.distributionType !== undefined || req.body.distribution_type !== undefined) {
      rule.distributionType = req.body.distributionType || req.body.distribution_type;
      rule.distribution_type = req.body.distributionType || req.body.distribution_type;
    }
    if (req.body.userIndex !== undefined) rule.userIndex = req.body.userIndex;

    const saved = await rule.save();
    await LeadDistributionRule.updateOne(
      { _id: rule._id },
      { $set: {
        users: rule.users,
        users_queue: rule.users_queue || rule.usersQueue,
        usersQueue: rule.users_queue || rule.usersQueue,
        distribution_type: rule.distribution_type || rule.distributionType,
        distributionType: rule.distribution_type || rule.distributionType
      } }
    ).exec();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete distribution rule
router.delete('/rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadDistribution', 'delete'), async (req, res) => {
  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const result = await LeadDistributionRule.deleteOne(query).exec();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get list of rotation rules
router.get('/rotation-rules', authenticate, ensureAdminRole, requireScreenAction('leadRotation', 'view'), async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = resolveOrgId(req);
    const query = {};
    if (orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (req.user.role !== 'superAdmin') {
      return res.json([]);
    }
    const rules = await LeadRotationRule.find(query).exec();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single rotation rule by ID
router.get('/rotation-rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadRotation', 'view'), async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }
    const rule = await LeadRotationRule.findOne(query).exec();
    if (!rule) {
      return res.status(404).json({ message: 'Rotation rule not found' });
    }
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create rotation rule
router.post('/rotation-rules', authenticate, ensureAdminRole, requireScreenAction('leadRotation', 'add'), async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is mandatory' });
    }

    const usersQueue = req.body.usersQueue || req.body.users_queue || (req.body.users || []).map(u => u.user_email || u.email);
    const usersList = req.body.users || [];
    const leadManagers = req.body.leadManagerUsers || req.body.lead_manager_users || [];
    const rotationTime = Number(req.body.rotationTime || req.body.rotation_time || 30);
    const projectList = Array.isArray(req.body.project) ? req.body.project : (req.body.project ? [req.body.project] : []);

    // Check duplicate rule for same source and project
    const existingRules = await LeadRotationRule.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
      source: req.body.source
    }).exec();

    const isSameArray = (a = [], b = []) => {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      if (arrA.length !== arrB.length) return false;
      return [...arrA].sort().every((val, idx) => val === [...arrB].sort()[idx]);
    };

    const duplicate = existingRules.find(r => isSameArray(r.project, projectList));

    if (duplicate) {
      duplicate.rotation_time = rotationTime;
      duplicate.rotationTime = rotationTime;
      duplicate.users = usersList;
      duplicate.users_queue = usersQueue;
      duplicate.usersQueue = usersQueue;
      duplicate.lead_manager_users = leadManagers;
      duplicate.leadManagerUsers = leadManagers;
      duplicate.user_index = 0;
      duplicate.userIndex = 0;
      const saved = await duplicate.save();
      await LeadRotationRule.updateOne(
        { _id: duplicate._id },
        { $set: { rotation_time: rotationTime, rotationTime: rotationTime, users: usersList, users_queue: usersQueue, usersQueue: usersQueue, user_index: 0, userIndex: 0 } }
      ).exec();
      return res.status(200).json(saved);
    }

    const rule = new LeadRotationRule({
      organizationId: orgId,
      organization_id: orgId,
      industryId: req.body.industryId || req.user.industryId || null,
      source: req.body.source,
      project: projectList,
      rotationTime: rotationTime,
      rotation_time: rotationTime,
      users: usersList,
      usersQueue: usersQueue,
      users_queue: usersQueue,
      leadManagerUsers: leadManagers,
      lead_manager_users: leadManagers,
      userIndex: 0,
      user_index: 0,
      relocId: req.body.relocId || ('reloc-' + Date.now()),
    });

    const saved = await rule.save();
    await LeadRotationRule.updateOne(
      { _id: saved._id },
      { $set: { rotation_time: rotationTime, rotationTime: rotationTime, users: usersList, users_queue: usersQueue, usersQueue: usersQueue, user_index: 0, userIndex: 0 } }
    ).exec();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update rotation rule
router.put('/rotation-rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadRotation', 'edit'), async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const rule = await LeadRotationRule.findOne(query).exec();
    if (!rule) {
      return res.status(404).json({ message: 'Rotation rule not found' });
    }

    if (req.body.source !== undefined) rule.source = req.body.source;
    if (req.body.project !== undefined) rule.project = Array.isArray(req.body.project) ? req.body.project : [req.body.project];
    if (req.body.rotationTime !== undefined || req.body.rotation_time !== undefined) {
      const rt = Number(req.body.rotationTime || req.body.rotation_time);
      rule.rotationTime = rt;
      rule.rotation_time = rt;
    }
    if (req.body.users !== undefined) rule.users = req.body.users;
    if (req.body.usersQueue !== undefined || req.body.users_queue !== undefined) {
      rule.usersQueue = req.body.usersQueue || req.body.users_queue;
      rule.users_queue = req.body.usersQueue || req.body.users_queue;
    }
    if (req.body.leadManagerUsers !== undefined) rule.leadManagerUsers = req.body.leadManagerUsers;
    if (req.body.userIndex !== undefined) rule.userIndex = req.body.userIndex;

    const saved = await rule.save();
    await LeadRotationRule.updateOne(
      { _id: rule._id },
      { $set: {
        source: rule.source,
        project: rule.project,
        rotation_time: rule.rotation_time || rule.rotationTime,
        rotationTime: rule.rotation_time || rule.rotationTime,
        users: rule.users,
        users_queue: rule.users_queue || rule.usersQueue,
        usersQueue: rule.users_queue || rule.usersQueue
      } }
    ).exec();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete rotation rule
router.delete('/rotation-rules/:id', authenticate, ensureAdminRole, requireScreenAction('leadRotation', 'delete'), async (req, res) => {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const orgId = resolveOrgId(req);
    const query = { _id: req.params.id };
    if (req.user.role !== 'superAdmin' && orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const result = await LeadRotationRule.deleteOne(query).exec();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Rotation rule not found' });
    }
    res.json({ message: 'Rotation rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Reassignment History Logs
router.get('/reassign-history', authenticate, ensureAdminRole, async (req, res) => {
  try {
    const LeadReassignmentHistory = mongoose.model('LeadReassignmentHistory');
    const orgId = resolveOrgId(req);
    const query = {};
    if (orgId) {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (req.user.role !== 'superAdmin') {
      return res.json([]);
    }
    const history = await LeadReassignmentHistory.find(query).sort({ createdAt: -1 }).limit(100).exec();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
