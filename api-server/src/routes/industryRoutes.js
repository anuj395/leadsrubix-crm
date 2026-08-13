const express = require('express');
const ctrl = require('../controllers/industryController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// reads — public access for signup and selection
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

// writes — superAdmin only
router.post('/', authenticate, permit('superAdmin'), ctrl.create);
router.put('/:id', authenticate, permit('superAdmin'), ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
