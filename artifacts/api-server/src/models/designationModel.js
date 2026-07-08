const mongoose = require('mongoose');

const designationItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true }
});

const designationSchema = new mongoose.Schema(
  {
    industryId: { type: String, default: null, index: true },
    organizationId: { type: String, default: null, index: true },
    designations: [designationItemSchema]
  },
  { timestamps: true }
);

const Designation = mongoose.model('Designation', designationSchema, 'designations');
exports.Designation = Designation;
