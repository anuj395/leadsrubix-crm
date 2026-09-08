const express = require('express');
const router = express.Router();
const leadDistributionService = require('../services/leadDistributionService');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// GET /api/lead-distribution
router.get('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const config = await leadDistributionService.getConfig(orgId);
    res.json({ success: true, item: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lead-distribution
router.post('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const updated = await leadDistributionService.updateConfig(orgId, req.body);
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
