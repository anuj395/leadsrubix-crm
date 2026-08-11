const express = require('express');
const ctrl = require('../controllers/sidebarPermissionController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, permit('superAdmin', 'admin'), ctrl.upsert);
router.post('/bulk', authenticate, permit('superAdmin', 'admin'), ctrl.bulkSet);
router.delete('/:id', authenticate, permit('superAdmin', 'admin'), ctrl.remove);

module.exports = router;
