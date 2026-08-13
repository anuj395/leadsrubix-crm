const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
    video_url: { type: String, default: '', alias: 'videoUrl' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, alias: 'createdBy' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const faqSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    faqs: [faqItemSchema],
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const FAQ = mongoose.model('FAQ', faqSchema, 'faqs');

exports.FAQ = FAQ;
