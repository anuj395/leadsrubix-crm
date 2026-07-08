const mongoose = require('mongoose');

const holidayItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  dayOfWeek: { type: String, default: '' },
  type: { type: String, default: 'Company Holiday' }, // 'National' | 'State' | 'Company Holiday'
  description: { type: String, default: '' }
});

const holidaySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    holidays: [holidayItemSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema, 'holidays');
