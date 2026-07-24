const mongoose = require('mongoose');

const newsItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    link: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, alias: 'createdBy' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const newsSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    news: [newsItemSchema],
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const News = mongoose.model('News', newsSchema, 'news');

exports.News = News;
