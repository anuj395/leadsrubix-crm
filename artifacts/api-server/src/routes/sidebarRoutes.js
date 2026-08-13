const express = require('express');
const {
  upsert,
  getByIndustry,
  getForUser,
  resolve,
} = require('../controllers/sidebarController');
const {
  validateUpsert,
  validateGet,
  validateUserRequest,
  validateResolve,
} = require('../middlewares/validateSidebar');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// All sidebar endpoints require authentication so industry/role probing isn't anonymous.
// Compose endpoint — primary entry point used by the new system.
router.post('/resolve', authenticate, validateResolve, resolve);

// Legacy compat endpoints (kept so older clients keep working):
//   - upsert is a write path → superAdmin only
//   - read endpoints just need a logged-in user
router.post('/', authenticate, permit('superAdmin'), validateUpsert, upsert);
router.get('/:industryId', authenticate, validateGet, getByIndustry);
router.post('/user', authenticate, validateUserRequest, getForUser);

module.exports = router;
