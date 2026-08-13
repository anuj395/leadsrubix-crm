const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

const notificationSettingController = require('../controllers/notificationSettingController');

router.use(authenticate);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.get('/settings', notificationSettingController.getSettings);
router.put('/settings', notificationSettingController.updateSetting);

module.exports = router;
