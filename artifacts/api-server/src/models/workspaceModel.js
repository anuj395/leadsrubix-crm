const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, unique: true, index: true, alias: 'workspaceId' },
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    industry_id: { type: String, required: true, alias: 'industryId' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    created_by: { type: String, default: null, alias: 'createdBy' },
    updated_by: { type: String, default: null, alias: 'updatedBy' },
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true },
  }
);

const Workspace = mongoose.model('Workspace', workspaceSchema, 'workspaces');
exports.Workspace = Workspace;
