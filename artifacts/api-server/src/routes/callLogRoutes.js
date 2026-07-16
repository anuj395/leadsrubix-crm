const { CallLog } = require('../models/callLogModel');
const { authenticate } = require('../middlewares/auth');
const { buildController, buildRouter } = require('../services/crudFactory');

const controller = buildController({
  Model: CallLog,
  resourceName: 'CallLog',
  searchKeys: ['customerName', 'contactNumber', 'details'],
  allowedSort: ['createdAt', 'updatedAt'],
});

module.exports = buildRouter(controller, { authenticate });
