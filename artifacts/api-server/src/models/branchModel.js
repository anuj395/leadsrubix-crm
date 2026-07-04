// src/models/branchModel.js
// Office/branch records owned by an industry tenant. Used by the User form
// (`branch`, `branchPermission[]`) per the spec. Freeform schema so optional
// per-tenant fields (city, address, manager_uid, etc.) can be added through
// the screen-config system without a migration.

const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    industryId: { type: String, default: null, index: true },
    name:        { type: String, required: true, trim: true },
    code:        { type: String, default: '', trim: true },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, strict: false, minimize: false },
);

const Branch = mongoose.model('Branch', branchSchema, 'branches');
exports.Branch = Branch;
