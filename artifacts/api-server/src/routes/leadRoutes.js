const express = require('express');
const ctrl = require('../controllers/leadController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/convert', authenticate, ctrl.convert);
router.get('/:id', authenticate, ctrl.retrieve);
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
