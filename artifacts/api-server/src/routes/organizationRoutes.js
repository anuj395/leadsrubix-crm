const express = require('express');
const ctrl = require('../controllers/organizationController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// All authed users may read; tenant-scoping is enforced inside the service.
// Writes are open to any authed user but the service rejects fields the role
// hasn't been granted on the `organization` screen — same model as Contacts.
router.get('/', authenticate, ctrl.list);
router.get('/my-subscription', authenticate, ctrl.getMySubscription);
router.post('/my-subscription/upgrade', authenticate, ctrl.upgradeSubscription);

// Account Deletion Request & Approval Workflow
router.post('/request-deletion', authenticate, ctrl.requestDeletion);
router.get('/deletion-requests', authenticate, permit('superAdmin'), ctrl.listDeletionRequests);
router.post('/deletion-requests/:id/approve', authenticate, permit('superAdmin'), ctrl.approveDeletionRequest);
router.post('/deletion-requests/:id/reject', authenticate, permit('superAdmin'), ctrl.rejectDeletionRequest);

// Workspace Data Download & Backup Export
router.get('/backup', authenticate, ctrl.exportWorkspaceBackup);
router.get('/:id/backup', authenticate, ctrl.exportWorkspaceBackup);

router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
