const express = require('express');
const ctrl = require('../controllers/sidebarPermissionController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, permit('superAdmin'), ctrl.upsert);
router.post('/bulk', authenticate, permit('superAdmin'), ctrl.bulkSet);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
