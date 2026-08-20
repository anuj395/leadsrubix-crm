const express = require('express');
const ctrl = require('../controllers/quoteController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/:id/pdf', authenticate, ctrl.generatePdf);
router.post('/:id/convert-to-order', authenticate, ctrl.convertToOrder);
router.get('/:id', authenticate, ctrl.retrieve);
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
