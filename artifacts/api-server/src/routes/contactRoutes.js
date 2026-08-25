const express = require('express');
const ctrl = require('../controllers/contactController');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

const router = express.Router();

router.post('/transfer', authenticate, requireScreenAction('contacts', 'edit'), ctrl.transfer);
router.post('/bulkReassign', authenticate, requireScreenAction('contacts', 'edit'), ctrl.bulkReassign);
router.post('/bulkImport', authenticate, requireScreenAction('contacts', 'add'), ctrl.bulkImport);
router.post('/:id/convert', authenticate, requireScreenAction('contacts', 'edit'), ctrl.convert);
router.get('/importHistory', authenticate, requireScreenAction('contacts', 'view'), ctrl.importHistory);
router.post('/masterSortSearch', authenticate, requireScreenAction('contacts', 'view'), ctrl.masterSortSearch);
router.get('/:id', authenticate, requireScreenAction('contacts', 'view'), ctrl.retrieve);
router.get('/', authenticate, requireScreenAction('contacts', 'view'), ctrl.list);
router.post('/', authenticate, requireScreenAction('contacts', 'add'), ctrl.create);
router.put('/:id', authenticate, requireScreenAction('contacts', 'edit'), ctrl.update);
router.delete('/:id', authenticate, requireScreenAction('contacts', 'delete'), ctrl.remove);

module.exports = router;
