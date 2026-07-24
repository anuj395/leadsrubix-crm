const mongoose = require('mongoose');

const leadDistributionRuleSchema = new mongoose.Schema(
  {
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

mongoose.model('LeadDistributionRule', leadDistributionRuleSchema, 'lead_distribution_rules');
mongoose.model('LeadRotationRule', leadRotationRuleSchema, 'lead_rotation_rules');
