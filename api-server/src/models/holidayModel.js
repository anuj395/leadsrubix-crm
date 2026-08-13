const mongoose = require('mongoose');

const holidayItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  day_of_week: { type: String, default: '', alias: 'dayOfWeek' },
  type: { type: String, default: 'Company Holiday' }, // 'National' | 'State' | 'Company Holiday'
  description: { type: String, default: '' }
});

const holidaySchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    workspace_id: { type: String, default: null, index: true, alias: 'workspaceId' },
    industry_id: { type: String, default: null, index: true, alias: 'industryId' },
    holidays: [holidayItemSchema]
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

module.exports = mongoose.model('Holiday', holidaySchema, 'holidays');
