const mongoose = require('mongoose');

const branchItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  is_active: { type: Boolean, default: true, alias: 'isActive' }
});

const branchSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, index: true, alias: 'industryId' },
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    branches: [branchItemSchema]
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Branch = mongoose.model('Branch', branchSchema, 'branches');
exports.Branch = Branch;
