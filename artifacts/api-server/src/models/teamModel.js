// src/models/teamModel.js
// Team records owned by an industry tenant. Used by the User form (`team`).
// Same freeform-schema approach as Branch / Organization.

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    industryId: { type: String, default: null, index: true },
    name:        { type: String, required: true, trim: true },
    code:        { type: String, default: '', trim: true },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, strict: false, minimize: false },
);

const Team = mongoose.model('Team', teamSchema, 'teams');
exports.Team = Team;
