const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  day: { type: String, required: true },
  closed: { type: Boolean, default: false },
  opens_at: { type: String, default: '09:00', alias: 'opensAt' },
  closes_at: { type: String, default: '19:00', alias: 'closesAt' },
  notes: { type: String, default: '' },
});

const workingDaySchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, unique: true, index: true, alias: 'organizationId' },
    days: [daySchema],
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

module.exports = mongoose.model('WorkingDay', workingDaySchema, 'working_days');
