const express = require('express');
const ctrl = require('../controllers/analyticsController');
const { dashboard } = require('../controllers/analyticsLeadController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// Existing analytics route
router.get('/dashboard', authenticate, ctrl.getAnalyticsDashboardData);
router.get('/dashboard-config', authenticate, ctrl.getDashboardConfig);

// CRUD routes for AnalyticsConfig (superAdmin & admin)
router.get('/configs', authenticate, permit('superAdmin', 'admin'), ctrl.listConfigs);
router.get('/configs/:id', authenticate, permit('superAdmin', 'admin'), ctrl.getConfigById);
router.post('/configs', authenticate, permit('superAdmin', 'admin'), ctrl.createConfig);
router.put('/configs/:id', authenticate, permit('superAdmin', 'admin'), ctrl.updateConfig);
router.delete('/configs/:id', authenticate, permit('superAdmin', 'admin'), ctrl.deleteConfig);

// New legacy dashboard analytics route
router.post('/dashboard/:type', authenticate, dashboard);

module.exports = router;
