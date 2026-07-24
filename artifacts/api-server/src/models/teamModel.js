const mongoose = require('mongoose');

const teamItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  is_active: { type: Boolean, default: true, alias: 'isActive' }
});

const teamSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, index: true, alias: 'industryId' },
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    teams: [teamItemSchema]
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Team = mongoose.model('Team', teamSchema, 'teams');
exports.Team = Team;
