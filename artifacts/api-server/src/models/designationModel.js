const mongoose = require('mongoose');

const designationItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true }
});

const designationSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, index: true, alias: 'industryId' },
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    designations: [designationItemSchema]
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Designation = mongoose.model('Designation', designationSchema, 'designations');
exports.Designation = Designation;
