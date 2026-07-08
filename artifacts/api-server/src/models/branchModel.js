const mongoose = require('mongoose');

const branchItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true }
});

const branchSchema = new mongoose.Schema(
  {
    industryId: { type: String, default: null, index: true },
    organizationId: { type: String, default: null, index: true },
    branches: [branchItemSchema]
  },
  { timestamps: true }
);

const Branch = mongoose.model('Branch', branchSchema, 'branches');
exports.Branch = Branch;
