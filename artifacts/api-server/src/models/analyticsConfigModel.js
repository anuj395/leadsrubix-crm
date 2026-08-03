const mongoose = require('mongoose');

const analyticsConfigSchema = new mongoose.Schema({
  organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
  workspace_id: { type: String, default: null, index: true, alias: 'workspaceId' },
  industry_id: { type: String, default: null, index: true, alias: 'industryId' },
  dashboard_key: { type: String, required: true, default: 'default' },
  tabs: [{
    id: { type: Number, required: true },
    label: { type: String, required: true },
    widgets: [{
      id: { type: String, required: true },
      type: { type: String, enum: ['KPI', 'CHART', 'TABLE'], required: true },
      title: { type: String, required: true },
      color: { type: String },
      bg: { type: String },
      icon: { type: String },
      chart_type: { type: String },
      data_key: { type: String },
      columns: [{
        key: { type: String },
        label: { type: String }
      }]
    }],
    sections: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      order: { type: Number, default: 0 },
      is_active: { type: Boolean, default: true, alias: 'isActive' },
      widgets: [{
        id: { type: String, required: true },
        type: { type: String, enum: ['KPI', 'CHART', 'TABLE'], required: true },
        title: { type: String, required: true },
        color: { type: String },
        bg: { type: String },
        icon: { type: String },
        chart_type: { type: String },
        data_key: { type: String },
        columns: [{
          key: { type: String },
          label: { type: String }
        }]
      }]
    }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsConfig', analyticsConfigSchema, 'analytics_configs');
