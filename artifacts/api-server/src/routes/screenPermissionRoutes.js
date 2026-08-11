const express = require('express');
const ctrl = require('../controllers/screenPermissionController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.post('/bulk', authenticate, permit('superAdmin', 'admin'), ctrl.bulkSet);

module.exports = router;
