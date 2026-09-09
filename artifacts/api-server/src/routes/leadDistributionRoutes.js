const express = require('express');
const router = express.Router();
const leadDistributionService = require('../services/leadDistributionService');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

function resolveTargetOrg(req) {
  if (req.user?.role === 'superAdmin' && (req.query?.organizationId || req.body?.organizationId)) {
    return req.query?.organizationId || req.body?.organizationId;
  }
  return req.organizationId || req.user?.organizationId || req.user?.organization_id;
}

// ── General Logic Config ───────────────────────────────────────────────────
// GET /api/lead-distribution (and /api/lead-distribution/logic)
router.get(['/', '/logic'], async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const config = await leadDistributionService.getConfig(orgId);
    res.json(config);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lead-distribution & PUT /api/lead-distribution/logic
router.post('/', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const updated = await leadDistributionService.updateConfig(orgId, req.body);
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/logic', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const updated = await leadDistributionService.updateConfig(orgId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Distribution Rules ─────────────────────────────────────────────────────
// GET /api/lead-distribution/rules
router.get('/rules', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const rules = await leadDistributionService.listRules(orgId);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/lead-distribution/rules/:id
router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await leadDistributionService.getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json(rule);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lead-distribution/rules
router.post('/rules', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const payload = { ...req.body, organizationId: orgId };
    const created = await leadDistributionService.createRule(payload, req.user);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/lead-distribution/rules/:id
router.put('/rules/:id', async (req, res) => {
  try {
    const updated = await leadDistributionService.updateRule(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/lead-distribution/rules/:id
router.delete('/rules/:id', async (req, res) => {
  try {
    await leadDistributionService.deleteRule(req.params.id);
    res.json({ success: true, message: 'Distribution rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Rotation Rules ─────────────────────────────────────────────────────────
// GET /api/lead-distribution/rotation-rules
router.get('/rotation-rules', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const rules = await leadDistributionService.listRotationRules(orgId);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/lead-distribution/rotation-rules/:id
router.get('/rotation-rules/:id', async (req, res) => {
  try {
    const rule = await leadDistributionService.getRotationRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rotation rule not found' });
    }
    res.json(rule);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lead-distribution/rotation-rules
router.post('/rotation-rules', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const payload = { ...req.body, organizationId: orgId };
    const created = await leadDistributionService.createRotationRule(payload, req.user);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/lead-distribution/rotation-rules/:id
router.put('/rotation-rules/:id', async (req, res) => {
  try {
    const updated = await leadDistributionService.updateRotationRule(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/lead-distribution/rotation-rules/:id
router.delete('/rotation-rules/:id', async (req, res) => {
  try {
    await leadDistributionService.deleteRotationRule(req.params.id);
    res.json({ success: true, message: 'Rotation rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Reassignment History ───────────────────────────────────────────────────
// GET /api/lead-distribution/reassign-history
router.get('/reassign-history', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const history = await leadDistributionService.listReassignHistory(orgId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lead-distribution/reassign-history
router.post('/reassign-history', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const payload = { ...req.body, organizationId: orgId };
    const created = await leadDistributionService.createReassignHistory(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Automated Trigger ──────────────────────────────────────────────────────
// POST /api/lead-distribution/run-rotation
router.post('/run-rotation', async (req, res) => {
  try {
    const orgId = resolveTargetOrg(req);
    const result = await leadDistributionService.executeLeadRotation(orgId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
