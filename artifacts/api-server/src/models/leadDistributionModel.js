const mongoose = require('mongoose');

const leadDistributionRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    location: { type: [String], default: [] },
    budget: { type: [String], default: [] },
    property_type: { type: [String], default: [] },
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    usersQueue: { type: [String], default: [] },
    leadManager_users: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    distribution_type: { type: String, enum: ['Normal', 'Roundrobin'], default: 'Normal' },
    userIndex: { type: Number, default: 0 },
    lead_dist_id: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const leadRotationRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    rotation_time: { type: Number, required: true }, // rotation time in minutes
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    usersQueue: { type: [String], default: [] },
    leadManager_users: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    userIndex: { type: Number, default: 0 },
    reloc_id: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

mongoose.model('LeadDistributionRule', leadDistributionRuleSchema, 'lead_distribution_rules');
mongoose.model('LeadRotationRule', leadRotationRuleSchema, 'lead_rotation_rules');
