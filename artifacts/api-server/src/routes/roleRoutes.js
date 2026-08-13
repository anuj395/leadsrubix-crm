const express = require('express');
const ctrl = require('../controllers/roleController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.get);
router.post('/', authenticate, permit('superAdmin', 'admin'), ctrl.create);
router.put('/:id', authenticate, permit('superAdmin', 'admin'), ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin', 'admin'), ctrl.remove);

module.exports = router;
