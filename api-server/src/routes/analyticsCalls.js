const express = require('express');
const router = express.Router();
const { dashboard } = require('../controllers/analyticsCallsController');
const { authenticate } = require('../middlewares/auth');

router.post('/dashboard/:type', authenticate, dashboard);

module.exports = router;
