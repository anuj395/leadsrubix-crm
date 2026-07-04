const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
    videoUrl: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const faqSchema = new mongoose.Schema(
  {
    organizationId: { type: String, default: null, index: true },
    faqs: [faqItemSchema],
  },
  { timestamps: true },
);

const FAQ = mongoose.model('FAQ', faqSchema, 'faqs');

exports.FAQ = FAQ;
