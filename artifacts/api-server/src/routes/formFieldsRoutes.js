const express = require('express');
const ctrl = require('../controllers/formFieldsController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/:organizationId/:form_name', authenticate, ctrl.get);

// Writes intentionally 501 — see controller for rationale.
router.post('/', authenticate, ctrl.create);
router.put('/:organizationId/:form_name', authenticate, ctrl.replace);
router.patch('/:organizationId/:form_name/field/:key', authenticate, ctrl.patchField);
router.delete('/:organizationId/:form_name', authenticate, ctrl.remove);

module.exports = router;
