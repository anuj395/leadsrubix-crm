// src/routes/index.js
// central router that aggregates sub-routers
const express = require('express');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const sidebarRoutes = require('./sidebarRoutes');
const industryRoutes = require('./industryRoutes');
const roleRoutes = require('./roleRoutes');
const sidebarMenuRoutes = require('./sidebarMenuRoutes');
const sidebarPermissionRoutes = require('./sidebarPermissionRoutes');
const screenRoutes = require('./screenRoutes');
const screenFieldRoutes = require('./screenFieldRoutes');
const screenPermissionRoutes = require('./screenPermissionRoutes');
const roleActionPermissionRoutes = require('./roleActionPermissionRoutes');
const contactRoutes = require('./contactRoutes');
const organizationRoutes = require('./organizationRoutes');
const branchRoutes = require('./branchRoutes');
const teamRoutes = require('./teamRoutes');
const bookingRoutes = require('./bookingRoutes');
const taskRoutes = require('./taskRoutes');
const callLogRoutes = require('./callLogRoutes');
const headersRoutes = require('./headersRoutes');
const formFieldsRoutes = require('./formFieldsRoutes');
const optionsRoutes = require('./optionsRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const analyticsLeadsRoutes = require('./analyticsLeads');
const analyticsTasksRoutes = require('./analyticsTasks');
const analyticsCallsRoutes = require('./analyticsCalls');
const pricingPlanRoutes = require('./pricingPlanRoutes');
const designationRoutes = require('./designationRoutes');
const roleKeyRoutes = require('./roleKeyRoutes');
const couponRoutes = require('./couponRoutes');
const faqRoutes = require('./faqRoutes');
const newsRoutes = require('./newsRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const resourceItemRoutes = require('./resourceItemRoutes');
const apiTokenRoutes = require('./apiTokenRoutes');
const leadDistributionRoutes = require('./leadDistributionRoutes');
const holidayRoutes = require('./holidayRoutes');
const webhookRoutes = require('./webhookRoutes');
const workingDayRoutes = require('./workingDayRoutes');
const drilldownRoutes = require('./drilldownRoutes');
const screenController = require('../controllers/screenController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pricing-plans', pricingPlanRoutes);
router.use('/coupons', couponRoutes);
router.use('/faqs', faqRoutes);
router.use('/news', newsRoutes);
router.use('/sidebar', sidebarRoutes);
router.use('/industries', industryRoutes);
router.use('/roles', roleRoutes);
router.use('/sidebar-menus', sidebarMenuRoutes);
router.use('/sidebar-permissions', sidebarPermissionRoutes);
router.use('/screens', screenRoutes);
router.use('/screen-fields', screenFieldRoutes);
router.use('/screen-permissions', screenPermissionRoutes);
router.use('/role-action-permissions', roleActionPermissionRoutes);
router.use('/contacts', contactRoutes);
router.use('/leads', contactRoutes);
router.use('/organizations', organizationRoutes);
router.use('/branches', branchRoutes);
router.use('/teams', teamRoutes);
router.use('/designations', designationRoutes);
router.use('/role-keys', roleKeyRoutes);
// router.use('/bookings', bookingRoutes);
router.use('/tasks', taskRoutes);
router.use('/call-logs', callLogRoutes);
router.use('/headers', headersRoutes);
router.use('/form-fields', formFieldsRoutes);
router.use('/formFields', formFieldsRoutes);
router.use('/options', optionsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics-leads', analyticsLeadsRoutes);
router.use('/analyticsLeads', analyticsLeadsRoutes);
router.use('/analytics-tasks', analyticsTasksRoutes);
router.use('/analyticsTasks', analyticsTasksRoutes);
router.use('/analytics-calls', analyticsCallsRoutes);
router.use('/analyticsCalls', analyticsCallsRoutes);
router.use('/whatsapp-config', whatsappRoutes);
router.use('/resources', resourceItemRoutes);
router.use('/api-tokens', apiTokenRoutes);
router.use('/lead-distribution', leadDistributionRoutes);
router.use('/holidays', holidayRoutes);
router.use('/working-days', workingDayRoutes);
router.use('/webhook', webhookRoutes);
router.use('/', drilldownRoutes);


// Compat alias: GET /api/form-config?screen=contacts → flat form_fields[]
// (matches the legacy contract some clients still use; internally calls the
// same resolver as POST /api/screens/resolve so behavior stays in sync.)
router.get('/form-config', authenticate, async (req, res, next) => {
  try {
    const fakeReq = {
      user: req.user,
      body: { screen_key: req.query.screen },
    };
    const fakeRes = { json: (out) => res.json(out.form_fields || []) };
    await screenController.resolve(fakeReq, fakeRes, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
