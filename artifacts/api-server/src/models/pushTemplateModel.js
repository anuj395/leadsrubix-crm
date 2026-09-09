const mongoose = require('mongoose');

const pushTemplateSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true },
    industry_id: { type: String, default: null, index: true },
    event_type: { 
      type: String, 
      required: true, 
      enum: ['LEAD_ASSIGNED', 'TASK_DUE', 'SYSTEM_ALERT', 'THIRD_PARTY_LEAD', 'LEAD_TRANSFERRED'] 
    },
    title_template: { type: String, required: true },
    body_template: { type: String, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PushTemplate = mongoose.model('PushTemplate', pushTemplateSchema, 'push_templates');

module.exports = {
  PushTemplate
};
