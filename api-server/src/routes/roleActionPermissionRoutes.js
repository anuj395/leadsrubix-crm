const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { permitAtLeast } = require('../middlewares/rbac');
const ctrl = require('../controllers/roleActionPermissionController');

const router = express.Router();

// Self-resolution: any authenticated user can ask "what can I do on screen X?"
router.get('/me', authenticate, ctrl.me);

// Admin/superAdmin only: read & upsert role permission rows.
router.get('/',  authenticate, permitAtLeast('admin'), ctrl.list);
router.post('/', authenticate, permitAtLeast('admin'), ctrl.upsert);

module.exports = router;
