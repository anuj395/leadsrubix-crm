const express = require('express');
const { authenticate } = require('../middlewares/auth');
const {
  getLogs,
  getTemplates,
  updateTemplate,
  getQuotas,
  updateQuota
} = require('../controllers/pushNotificationController');

const router = express.Router();

router.use(authenticate);

router.get('/logs', getLogs);
router.get('/templates', getTemplates);
router.post('/templates', updateTemplate);
router.get('/quotas', getQuotas);
router.post('/quotas', updateQuota);

module.exports = router;
