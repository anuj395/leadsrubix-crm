const express = require('express');
const ctrl = require('../controllers/activityController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/timeline', authenticate, ctrl.timeline);

module.exports = router;
