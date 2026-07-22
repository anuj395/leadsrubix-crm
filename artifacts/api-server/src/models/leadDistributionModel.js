const mongoose = require('mongoose');

const leadDistributionRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    location: { type: [String], default: [] },
    budget: { type: [String], default: [] },
    propertyType: { type: [String], default: [] },
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    usersQueue: { type: [String], default: [] },
    leadManagerUsers: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    distributionType: { type: String, enum: ['Normal', 'Roundrobin'], default: 'Normal' },
    userIndex: { type: Number, default: 0 },
    leadDistId: { type: String, required: true }
  },
  { timestamps: true }
);

const leadRotationRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: String, required: true },
    project: { type: [String], default: [] },
    rotationTime: { type: Number, required: true }, // rotation time in minutes
    users: [
      {
        uid: { type: String, required: true },
        user_email: { type: String, required: true }
      }
    ],
    usersQueue: { type: [String], default: [] },
    leadManagerUsers: [
      {
        uid: { type: String, default: '' },
        user_email: { type: String, default: '' }
      }
    ],
    userIndex: { type: Number, default: 0 },
    relocId: { type: String, required: true }
  },
  { timestamps: true }
);

mongoose.model('LeadDistributionRule', leadDistributionRuleSchema, 'lead_distribution_rules');
mongoose.model('LeadRotationRule', leadRotationRuleSchema, 'lead_rotation_rules');
