const mongoose = require('mongoose');

const newsItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    link: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const newsSchema = new mongoose.Schema(
  {
    organizationId: { type: String, default: null, index: true },
    news: [newsItemSchema],
  },
  { timestamps: true },
);

const News = mongoose.model('News', newsSchema, 'news');

exports.News = News;
