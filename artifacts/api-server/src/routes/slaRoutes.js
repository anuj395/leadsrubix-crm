const express = require('express');
const router = express.Router();
const slaTriggerService = require('../services/slaTriggerService');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /api/sla-config
router.get('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const config = await slaTriggerService.getSlaConfig(orgId);
    res.json({ success: true, item: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sla-config
router.post('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const updated = await slaTriggerService.updateSlaConfig(orgId, req.body);
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
