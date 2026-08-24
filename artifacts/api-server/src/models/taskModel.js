const mongoose = require('mongoose');
const { withDualCase, mapWithDualCase } = require('../utils/caseConverter');

const taskSchema = new mongoose.Schema(
  {
    contact_id:          { type: mongoose.Schema.Types.Mixed, default: null, index: true, alias: 'contactId' },
    related_to_type:     { type: String, alias: 'relatedToType' },
    related_to_id:       { type: mongoose.Schema.Types.Mixed, default: null, alias: 'relatedToId' },
    organization_id:     { type: String, default: null, index: true, alias: 'organizationId' },
    workspace_id:        { type: String, default: null, index: true, alias: 'workspaceId' },
    uid:                { type: String, default: null, index: true },
    industry_id:         { type: String, default: null, index: true, alias: 'industryId' },
    type:               { type: String, required: true }, // e.g., Call Back, Site Visit
    due_date:            { type: Date, required: true, alias: 'dueDate' },
    status:             { type: String, default: 'PENDING' }, // e.g., PENDING, COMPLETED, ACTIVE, CANCELLED
    callback_reason:     { type: String, default: '', alias: 'callbackReason' },
    customer_name:       { type: String, default: '', alias: 'customerName' },
    contact_number:      { type: String, default: '', alias: 'contactNumber' },
    created_by:          { type: String, default: '', alias: 'createdBy' },
    latitude:           { type: Number, default: null },
    longitude:          { type: Number, default: null },
    stage:              { type: String, default: '' },
    contact_owner_email: { type: String, default: '', alias: 'contactOwnerEmail' },
    project_name:        { type: String, default: '', alias: 'projectName' },
    location:           { type: String, default: '' },
    budget:             { type: String, default: '' },
    transfer_status:     { type: Boolean, default: false, alias: 'transferStatus' },
    unique_meeting:      { type: Boolean, default: false, alias: 'uniqueMeeting' },
    unique_site_visit:    { type: Boolean, default: false, alias: 'uniqueSiteVisit' },
    completed_at:        { type: Date, default: null, alias: 'completedAt' },
    source:             { type: String, default: '' },
    inventory_type:      { type: String, default: '', alias: 'inventoryType' },
    notes:              { type: String, default: '' },
    task_type:           { type: String, default: '', alias: 'taskType' },
    next_follow_up:       { type: Date, default: null, alias: 'nextFollowUp' },
    assigned_to:         { type: String, default: '', alias: 'assignedTo' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

taskSchema.pre('validate', function(next) {
  if (this.type && !this.taskType) this.taskType = this.type;
  if (this.taskType && !this.type) this.type = this.taskType;

  if (this.dueDate && !this.nextFollowUp) this.nextFollowUp = this.dueDate;
  if (this.nextFollowUp && !this.dueDate) this.dueDate = this.nextFollowUp;

  if ((this.createdBy || this.contactOwnerEmail) && !this.assignedTo) {
    this.assignedTo = this.createdBy || this.contactOwnerEmail;
  }
  if (this.assignedTo) {
    if (!this.createdBy) this.createdBy = this.assignedTo;
    if (!this.contactOwnerEmail) this.contactOwnerEmail = this.assignedTo;
  }
  next();
});

const Task = mongoose.model('Task', taskSchema, 'tasks');
exports.Task = Task;
exports.shapePublic = (doc) => withDualCase(doc);
exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await Task.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  return mapWithDualCase(docs);
};
