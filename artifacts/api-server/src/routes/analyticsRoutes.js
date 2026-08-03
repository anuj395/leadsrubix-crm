const express = require('express');
const ctrl = require('../controllers/analyticsController');
const { dashboard } = require('../controllers/analyticsLeadController');
const { authenticate } = require('../middlewares/auth');
const { permit } = require('../middlewares/rbac');

const router = express.Router();

// Existing analytics route
router.get('/dashboard', authenticate, ctrl.getAnalyticsDashboardData);
router.get('/dashboard-config', authenticate, ctrl.getDashboardConfig);

// CRUD routes for AnalyticsConfig (superAdmin only)
router.get('/configs', authenticate, permit('superAdmin'), ctrl.listConfigs);
router.get('/configs/:id', authenticate, permit('superAdmin'), ctrl.getConfigById);
router.post('/configs', authenticate, permit('superAdmin'), ctrl.createConfig);
router.put('/configs/:id', authenticate, permit('superAdmin'), ctrl.updateConfig);
router.delete('/configs/:id', authenticate, permit('superAdmin'), ctrl.deleteConfig);

// New legacy dashboard analytics route
router.post('/dashboard/:type', authenticate, dashboard);

module.exports = router;
