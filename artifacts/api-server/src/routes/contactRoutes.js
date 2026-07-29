const express = require('express');
const ctrl = require('../controllers/contactController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/transfer', authenticate, ctrl.transfer);
router.post('/bulkReassign', authenticate, ctrl.bulkReassign);
router.post('/bulkImport', authenticate, ctrl.bulkImport);
router.get('/importHistory', authenticate, ctrl.importHistory);
router.post('/masterSortSearch', authenticate, ctrl.masterSortSearch);
router.post('/maskMasterSortSearch', authenticate, ctrl.maskMasterSortSearch);
router.post('/masterSearch', authenticate, ctrl.masterSearch);
router.post('/maskMasterSearch', authenticate, ctrl.maskMasterSearch);
router.post('/masterContactCount', authenticate, ctrl.masterContactCount);
router.post('/masterFilterValues', authenticate, ctrl.masterFilterValues);
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
