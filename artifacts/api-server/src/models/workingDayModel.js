const mongoose = require('mongoose');

const workingDaySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    day: { type: String, required: true },
    closed: { type: Boolean, default: false },
    opensAt: { type: String, default: '09:00' },
    closesAt: { type: String, default: '19:00' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkingDay', workingDaySchema);
