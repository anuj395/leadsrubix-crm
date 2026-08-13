const express = require('express');
const ctrl = require('../controllers/sidebarMenuController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.get);
router.post('/', authenticate, permit('superAdmin'), ctrl.create);
router.put('/:id', authenticate, permit('superAdmin'), ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
