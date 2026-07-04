const { Branch } = require('../models/branchModel');
const { authenticate } = require('../middlewares/auth');
const { buildController, buildRouter } = require('../services/crudFactory');

const controller = buildController({
  Model: Branch,
  resourceName: 'Branch',
  searchKeys: ['name', 'code'],
  allowedSort: ['createdAt', 'updatedAt', 'name', 'isActive'],
});

module.exports = buildRouter(controller, { authenticate });
