const express = require('express');
const ctrl = require('../controllers/headersController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Read-only spec-compliant alias over the existing screen-config system.
router.get('/:organizationId/:module', authenticate, ctrl.get);

// Writes are intentionally NOT supported here — they would create a second
// source of truth alongside `/api/screen-fields`. The handlers respond 501
// with a pointer to the canonical endpoints.
router.post('/', authenticate, ctrl.create);
router.put('/:organizationId/:module', authenticate, ctrl.replace);
router.patch('/:organizationId/:module/column/:key', authenticate, ctrl.patchColumn);
router.delete('/:organizationId/:module', authenticate, ctrl.remove);

module.exports = router;
