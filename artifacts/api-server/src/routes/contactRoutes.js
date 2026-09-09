const express = require('express');
const ctrl = require('../controllers/contactController');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

const router = express.Router();

router.post('/transfer', authenticate, requireScreenAction('contacts', 'edit'), ctrl.transfer);
router.post('/bulkReassign', authenticate, requireScreenAction('contacts', 'edit'), ctrl.bulkReassign);
router.post('/bulkImport', authenticate, requireScreenAction('contacts', 'add'), ctrl.bulkImport);
router.get('/importHistory', authenticate, requireScreenAction('contacts', 'view'), ctrl.importHistory);
router.delete('/importHistory/:id', authenticate, requireScreenAction('contacts', 'delete'), ctrl.deleteImportHistory);
router.delete('/import-history/:id', authenticate, requireScreenAction('contacts', 'delete'), ctrl.deleteImportHistory);
router.post('/masterSortSearch', authenticate, requireScreenAction('contacts', 'view'), ctrl.masterSortSearch);
router.get('/check-duplicate', authenticate, requireScreenAction('contacts', 'view'), ctrl.checkDuplicate);
router.get('/stats', authenticate, requireScreenAction('contacts', 'view'), ctrl.getStats);
router.post('/:id/inquiries', authenticate, requireScreenAction('contacts', 'add'), ctrl.appendInquiry);
router.post('/:id/schedule-callback', authenticate, requireScreenAction('contacts', 'edit'), ctrl.scheduleCallback);
router.post('/:id/log-call', authenticate, requireScreenAction('contacts', 'edit'), ctrl.logCall);
router.post('/:id/convert', authenticate, requireScreenAction('contacts', 'edit'), ctrl.convert);
router.post('/:id/qualify', authenticate, requireScreenAction('contacts', 'edit'), ctrl.qualifyInquiry);

router.post('/:id/attachments', authenticate, requireScreenAction('contacts', 'edit'), ctrl.addAttachment);
router.delete('/:id/attachments/:attachmentId', authenticate, requireScreenAction('contacts', 'edit'), ctrl.deleteAttachment);
router.get('/:id', authenticate, requireScreenAction('contacts', 'view'), ctrl.retrieve);
router.get('/', authenticate, requireScreenAction('contacts', 'view'), ctrl.list);
router.post('/', authenticate, requireScreenAction('contacts', 'add'), ctrl.create);
router.put('/:id', authenticate, requireScreenAction('contacts', 'edit'), ctrl.update);
router.delete('/:id', authenticate, requireScreenAction('contacts', 'delete'), ctrl.remove);

module.exports = router;
