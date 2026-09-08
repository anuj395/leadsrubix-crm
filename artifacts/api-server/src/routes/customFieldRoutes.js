const express = require('express');
const router = express.Router();
const customFieldService = require('../services/customFieldService');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// GET /api/custom-fields?module=leads
router.get('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const module = req.query.module || 'leads';
    const fields = await customFieldService.getCustomFields(orgId, module);
    res.json({ success: true, items: fields });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/custom-fields
router.post('/', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const created = await customFieldService.createCustomField(orgId, req.body);
    res.json({ success: true, item: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/custom-fields/:id
router.put('/:id', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    const updated = await customFieldService.updateCustomField(orgId, req.params.id, req.body);
    res.json({ success: true, items: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/custom-fields/:id
router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    await customFieldService.deleteCustomField(orgId, req.params.id);
    res.json({ success: true, message: 'Custom field deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
