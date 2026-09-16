const express = require('express');
const { authenticate } = require('../middlewares/auth');
const telephonyController = require('../controllers/telephonyController');

const router = express.Router();

router.get('/providers', authenticate, telephonyController.getProvidersCatalog);
router.get('/channels', authenticate, telephonyController.listChannels);
router.post('/channels', authenticate, telephonyController.createChannel);
router.put('/channels/:id', authenticate, telephonyController.updateChannel);
router.delete('/channels/:id', authenticate, telephonyController.deleteChannel);
router.post('/channels/:id/test', authenticate, telephonyController.testChannelCall);

module.exports = router;
