// src/routes/userRoutes.js
const express = require('express');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getManagerCandidates,
  changePasswordByEmail,
} = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// Manager dropdown for the user form. MUST be declared before the `/:id`
// route below so `managers` is not interpreted as an ObjectId.
router.get('/managers', authenticate, getManagerCandidates);

// Per-role View/Add/Edit/Delete on the `users` screen.
// SuperAdmin + admin pass implicitly; other roles need an explicit
// role_action_permission row enabling the action.
const canEditUser = (req, res, next) => {
  if (req.user && String(req.user.id || req.user._id) === String(req.params.id)) {
    return next();
  }
  requireScreenAction('users', 'edit')(req, res, next);
};

router.get('/',       authenticate, requireScreenAction('users', 'view'),   getAllUsers);
router.post('/',      authenticate, requireScreenAction('users', 'add'),    createUser);
router.put('/:id',    authenticate, canEditUser,                            updateUser);
router.delete('/:id', authenticate, requireScreenAction('users', 'delete'), deleteUser);

// Reading an individual user record still goes through service-level
// object authz (same-industry / self / admin+).
router.get('/:id', authenticate, getUserById);

router.post('/change-password', authenticate, permit('superAdmin'), changePasswordByEmail);

module.exports = router;
