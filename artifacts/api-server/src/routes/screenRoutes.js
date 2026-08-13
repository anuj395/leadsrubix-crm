const express = require('express');
const ctrl = require('../controllers/screenController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// Compose endpoint — used by all client pages to resolve their dynamic config.
router.post('/resolve', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, (err) => {
      if (err) return next(err);
      return ctrl.resolve(req, res, next);
    });
  }
  if (req.body?.screen_key === 'organization' || req.body?.screenKey === 'organization') {
    return ctrl.resolve(req, res, next);
  }
  return authenticate(req, res, next);
}, ctrl.resolve);

// reads — any authenticated user
router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.get);

// writes — superAdmin
router.post('/', authenticate, permit('superAdmin'), ctrl.create);
router.put('/:id', authenticate, permit('superAdmin'), ctrl.update);
router.delete('/:id', authenticate, permit('superAdmin'), ctrl.remove);

module.exports = router;
