const mongoose = require('mongoose');

const teamItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true }
});

const teamSchema = new mongoose.Schema(
  {
    industryId: { type: String, default: null, index: true },
    organizationId: { type: String, default: null, index: true },
    teams: [teamItemSchema]
  },
  { timestamps: true }
);

const Team = mongoose.model('Team', teamSchema, 'teams');
exports.Team = Team;
