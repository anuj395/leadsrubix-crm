const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const News = mongoose.model('News');
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

    const docs = await News.find(query).exec();
    let newsItems = [];
    let seenKeys = new Set();

    // Prioritize organization-specific news documents over global news documents
    docs.sort((a, b) => {
      const aHasOrg = !!a.organizationId;
      const bHasOrg = !!b.organizationId;
      if (aHasOrg && !bHasOrg) return -1;
      if (!aHasOrg && bHasOrg) return 1;
      return 0;
    });

    docs.forEach(doc => {
      if (doc.news && Array.isArray(doc.news)) {
        doc.news.forEach(item => {
          const key = `${item.name}::${item.link}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            newsItems.push({
              _id: item._id,
              id: item._id,
              name: item.name,
              link: item.link,
              status: item.status,
              created_by: item.created_by,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              organizationId: doc.organizationId
            });
          }
        });
      }
    });

    newsItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(newsItems);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const News = mongoose.model('News');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can create news articles' });
    }

    let orgId = null;
    if (req.user.role === 'admin') {
      const org = await Organization.findOne({ industryId: req.user.industry_id }).exec();
      orgId = org ? (org.organizationId || org.organization_id) : null;
    } else if (req.user.role === 'superAdmin') {
      orgId = req.body.organizationId || null;
    }

    let doc = await News.findOne({ organizationId: orgId }).exec();
    if (!doc) {
      doc = new News({ organizationId: orgId, news: [] });
    }

    const duplicate = doc.news.find(item => item.name === req.body.name && item.link === req.body.link);
    if (duplicate) {
      return res.status(200).json({
        _id: duplicate._id,
        id: duplicate._id,
        name: duplicate.name,
        link: duplicate.link,
        status: duplicate.status,
        created_by: duplicate.created_by,
        organizationId: doc.organizationId
      });
    }

    doc.news.push({
      name: req.body.name,
      link: req.body.link,
      status: req.body.status || 'Active',
      created_by: req.user.id
    });

    await doc.save();
    const createdItem = doc.news[doc.news.length - 1];
    res.status(201).json({
      _id: createdItem._id,
      id: createdItem._id,
      name: createdItem.name,
      link: createdItem.link,
      status: createdItem.status,
      created_by: createdItem.created_by,
      organizationId: doc.organizationId
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const News = mongoose.model('News');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can edit news articles' });
    }

    const doc = await News.findOne({ "news._id": req.params.id }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'News article not found' });
    }

    const item = doc.news.id(req.params.id);
    if (req.user.role === 'admin') {
      if (String(item.created_by) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only edit news articles that you created' });
      }
    }

    if (req.body.name) item.name = req.body.name;
    if (req.body.link) item.link = req.body.link;
    if (req.body.status) item.status = req.body.status;

    doc.markModified('news');
    await doc.save();
    res.json({
      _id: item._id,
      id: item._id,
      name: item.name,
      link: item.link,
      status: item.status,
      created_by: item.created_by,
      organizationId: doc.organizationId
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const News = mongoose.model('News');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can delete news articles' });
    }

    const doc = await News.findOne({ "news._id": req.params.id }).exec();
    if (!doc) {
      return res.status(404).json({ message: 'News article not found' });
    }

    const item = doc.news.id(req.params.id);
    if (req.user.role === 'admin') {
      if (String(item.created_by) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only delete news articles that you created' });
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
