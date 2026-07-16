const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    contactId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    uid:            { type: String, default: null, index: true },
    industryId:     { type: String, default: null, index: true },
    type:           { type: String, required: true }, // e.g., Call Back, Site Visit
    dueDate:        { type: Date, required: true },
    status:         { type: String, default: 'PENDING' }, // e.g., PENDING, COMPLETED, ACTIVE, CANCELLED
    callbackReason: { type: String, default: '' },
    customerName:   { type: String, default: '' },
    contactNumber:  { type: String, default: '' },
    createdBy:      { type: String, default: '' },
    latitude:       { type: Number, default: null },
    longitude:      { type: Number, default: null },
    stage:              { type: String, default: '' },
    contactOwnerEmail:  { type: String, default: '' },
    projectName:        { type: String, default: '' },
    location:           { type: String, default: '' },
    budget:             { type: String, default: '' },
    transferStatus:     { type: Boolean, default: false },
    uniqueMeeting:      { type: Boolean, default: false },
    uniqueSiteVisit:    { type: Boolean, default: false },
    completedAt:        { type: Date, default: null },
    source:             { type: String, default: '' },
    inventoryType:      { type: String, default: '' },
    notes:              { type: String, default: '' },
    taskType:           { type: String, default: '' },
    nextFollowUp:       { type: Date, default: null },
    assignedTo:         { type: String, default: '' },
  },
  { 
    timestamps: true
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
