const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const FAQ = mongoose.model('FAQ');
    const Organization = mongoose.model('Organization');

    let query = {};
    if (req.user.role !== 'superAdmin') {
      const org = await Organization.findOne({ industryId: req.user.industry_id }).exec();
      const orgId = org ? (org.organizationId || org.organization_id) : null;
      query = {
        $or: [
          { organizationId: null },
          { organizationId: '' },
          ...(orgId ? [{ organizationId: orgId }] : [])
        ]
      };
    }

    const docs = await FAQ.find(query).exec();
    let faqItems = [];
    let seenKeys = new Set();

    // Prioritize organization-specific FAQs over global FAQs
    docs.sort((a, b) => {
      const aHasOrg = !!a.organizationId;
      const bHasOrg = !!b.organizationId;
      if (aHasOrg && !bHasOrg) return -1;
      if (!aHasOrg && bHasOrg) return 1;
      return 0;
    });

    docs.forEach(doc => {
      if (doc.faqs && Array.isArray(doc.faqs)) {
        doc.faqs.forEach(item => {
          const key = `${item.question}::${item.answer}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            faqItems.push({
              _id: item._id,
              id: item._id,
              question: item.question,
              answer: item.answer,
              status: item.status,
              videoUrl: item.videoUrl || '',
              created_by: item.created_by,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              organizationId: doc.organizationId
            });
          }
        });
      }
    });

    faqItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(faqItems);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const FAQ = mongoose.model('FAQ');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can create FAQs' });
    }

    let orgId = null;
    if (req.user.role === 'admin') {
      const org = await Organization.findOne({ industryId: req.user.industry_id }).exec();
      orgId = org ? (org.organizationId || org.organization_id) : null;
    } else if (req.user.role === 'superAdmin') {
      orgId = req.body.organizationId || null;
    }

    let doc = await FAQ.findOne({ organizationId: orgId }).exec();
    if (!doc) {
      doc = new FAQ({ organizationId: orgId, faqs: [] });
    }

    const duplicate = doc.faqs.find(item => item.question === req.body.question && item.answer === req.body.answer);
    if (duplicate) {
      return res.status(200).json({
        _id: duplicate._id,
        id: duplicate._id,
        question: duplicate.question,
        answer: duplicate.answer,
        status: duplicate.status,
        videoUrl: duplicate.videoUrl || '',
        created_by: duplicate.created_by,
        organizationId: doc.organizationId
      });
    }

    doc.faqs.push({
      question: req.body.question,
      answer: req.body.answer,
      status: req.body.status || 'Active',
      videoUrl: req.body.videoUrl || '',
      created_by: req.user.id
    });

    await doc.save();
    const createdItem = doc.faqs[doc.faqs.length - 1];
    res.status(201).json({
      _id: createdItem._id,
      id: createdItem._id,
      question: createdItem.question,
      answer: createdItem.answer,
      status: createdItem.status,
      videoUrl: createdItem.videoUrl || '',
      created_by: createdItem.created_by,
      organizationId: doc.organizationId
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const FAQ = mongoose.model('FAQ');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can edit FAQs' });
    }

    const doc = await FAQ.findOne({ "faqs._id": req.params.id }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    const item = doc.faqs.id(req.params.id);
    if (req.user.role === 'admin') {
      if (String(item.created_by) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only edit FAQs that you created' });
      }
    }

    if (req.body.question) item.question = req.body.question;
    if (req.body.answer) item.answer = req.body.answer;
    if (req.body.status) item.status = req.body.status;
    if (req.body.hasOwnProperty('videoUrl')) item.videoUrl = req.body.videoUrl || '';

    doc.markModified('faqs');
    await doc.save();
    res.json({
      _id: item._id,
      id: item._id,
      question: item.question,
      answer: item.answer,
      status: item.status,
      videoUrl: item.videoUrl || '',
      created_by: item.created_by,
      organizationId: doc.organizationId
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const FAQ = mongoose.model('FAQ');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can delete FAQs' });
    }

    const doc = await FAQ.findOne({ "faqs._id": req.params.id }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    const item = doc.faqs.id(req.params.id);
    if (req.user.role === 'admin') {
      if (String(item.created_by) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only delete FAQs that you created' });
      }
    }

    item.deleteOne();
    await doc.save();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
