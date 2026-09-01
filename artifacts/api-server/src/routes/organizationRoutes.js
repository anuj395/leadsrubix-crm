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
router.post('/my-subscription/renew', authenticate, ctrl.renewSubscription);
router.post('/my-subscription/upgrade-seats', authenticate, ctrl.upgradeSeats);
router.post('/my-subscription/seats', authenticate, ctrl.updateSeats);
router.post('/my-subscription/payment-method', authenticate, ctrl.updatePaymentMethod);
router.post('/my-subscription/billing-details', authenticate, ctrl.updateBillingDetails);
router.post('/my-subscription/upgrade', authenticate, ctrl.upgradeSubscription);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
