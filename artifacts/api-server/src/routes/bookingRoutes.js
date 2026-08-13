const { Booking } = require('../models/bookingModel');
const { authenticate } = require('../middlewares/auth');
const { buildController, buildRouter } = require('../services/crudFactory');

const controller = buildController({
  Model: Booking,
  resourceName: 'Booking',
  searchKeys: ['customer_name', 'contact_no', 'project', 'location'],
  allowedSort: ['createdAt', 'updatedAt', 'project', 'location'],
});

module.exports = buildRouter(controller, { authenticate });
