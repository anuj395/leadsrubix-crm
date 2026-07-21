const express = require('express');
const ctrl = require('../controllers/contactController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/transfer', authenticate, ctrl.transfer);
router.post('/bulkReassign', authenticate, ctrl.bulkReassign);
router.post('/bulkImport', authenticate, ctrl.bulkImport);
router.get('/importHistory', authenticate, ctrl.importHistory);
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
