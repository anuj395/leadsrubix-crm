const mongoose = require('mongoose');

const leadDistributionRuleSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, alias: 'industryId' },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    location: { type: [String], default: [] },
    budget: { type: [String], default: [] },
    property_type: { type: [String], default: [], alias: 'propertyType' },
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    users_queue: { type: [String], default: [], alias: 'usersQueue' },
    lead_manager_users: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    distribution_type: { type: String, enum: ['Normal', 'Roundrobin'], default: 'Normal', alias: 'distributionType' },
    user_index: { type: Number, default: 0, alias: 'userIndex' },
    lead_dist_id: { type: String, required: true, alias: 'leadDistId' }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const leadRotationRuleSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, alias: 'industryId' },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    rotation_time: { type: Number, required: true, alias: 'rotationTime' }, // rotation time in minutes
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    users_queue: { type: [String], default: [], alias: 'usersQueue' },
    lead_manager_users: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    user_index: { type: Number, default: 0, alias: 'userIndex' },
    reloc_id: { type: String, required: true, alias: 'relocId' }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const leadReassignmentHistorySchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, alias: 'organizationId' },
    lead_id: { type: String, required: true, alias: 'leadId' },
    customer_name: { type: String, default: '', alias: 'customerName' },
    contact_no: { type: String, default: '', alias: 'contactNo' },
    source: { type: String, default: '' },
    from_user: { type: String, default: '', alias: 'fromUser' },
    to_user: { type: String, required: true, alias: 'toUser' },
    reassigned_by: { type: String, default: 'SYSTEM', alias: 'reassignedBy' },
    reason: { type: String, default: 'Timeout Auto Rotation' },
    rotation_time: { type: Number, default: 15, alias: 'rotationTime' },
    created_at: { type: Date, default: Date.now, alias: 'createdAt' }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

mongoose.model('LeadDistributionRule', leadDistributionRuleSchema, 'lead_distribution_rules');
mongoose.model('LeadRotationRule', leadRotationRuleSchema, 'lead_rotation_rules');
mongoose.model('LeadReassignmentHistory', leadReassignmentHistorySchema, 'lead_reassignment_histories');
