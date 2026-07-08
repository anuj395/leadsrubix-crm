const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  day: { type: String, required: true },
  closed: { type: Boolean, default: false },
  opensAt: { type: String, default: '09:00' },
  closesAt: { type: String, default: '19:00' },
  notes: { type: String, default: '' },
});

const workingDaySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    days: [daySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkingDay', workingDaySchema, 'working_days');
