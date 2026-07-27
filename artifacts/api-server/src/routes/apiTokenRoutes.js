const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Helper to generate a unique API Key matching old project style (12 chars uppercase alphanumeric)
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

    let query = {};
    let orgMap = {};

    if (req.user.role === 'superAdmin') {
      const orgs = await Organization.find({}).lean().exec();
      orgs.forEach(o => {
        const idVal = o.organization_id || o.organizationId;
        if (idVal) {
          orgMap[idVal] = o.organization_name || o.organizationName || o.name || idVal;
        }
      });
    } else {
      const orgId = req.user.organizationId || req.user.organization_id;
      if (!orgId) {
        return res.json([]);
      }
      query = { organization_id: orgId };
      const org = await Organization.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      }).exec();
      orgMap[orgId] = org ? (org.organization_name || org.organizationName || org.name || orgId) : orgId;
    }

    const tokens = await ApiToken.find(query).sort({ createdAt: -1 }).lean().exec();

    const formatted = tokens.map(t => ({
      ...t,
      id: t._id,
      organizationName: orgMap[t.organization_id || t.organizationId] || '',
      countryCode: t.countryCode || t.country_code || '+91',
      country_code: t.countryCode || t.country_code || '+91',
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let orgId = req.body.organizationId || req.body.organizationId || null;

    if (req.user.role !== 'superAdmin') {
      orgId = req.user.organizationId || req.user.organization_id;
      if (!orgId) {
        return res.status(400).json({ message: 'Organization ID is mandatory for Admin users' });
      }
    }

    if (req.body.source) {
      const existing = await ApiToken.findOne({
        organizationId: orgId,
        source: { $regex: new RegExp(`^${req.body.source}$`, 'i') }
      }).exec();
      if (existing) {
        return res.status(400).json({ message: `API Token for source '${req.body.source}' already exists` });
      }
    }

    let leadSourceId = req.body.leadSourceId || req.body.leadSource_id || null;
    if (!leadSourceId && req.body.source) {
      try {
        const OrganizationResources = mongoose.model('OrganizationResources');
        const resDoc = await OrganizationResources.findOne({
          $or: [
            { organizationId: orgId },
            { organizationId: null },
            { organizationId: '' }
          ]
        }).exec();
        if (resDoc && resDoc.leadSources) {
          const matched = resDoc.leadSources.find(s => 
            String(s.leadSource || s.name || s.value || '').toLowerCase() === String(req.body.source).toLowerCase()
          );
          if (matched) {
            leadSourceId = matched.id || matched._id || null;
          }
        }
      } catch (err) {
        console.error('Failed to resolve leadSourceId from source:', err);
      }
    }

    const payload = {
      organizationId: orgId,
      source: req.body.source,
      leadSourceId,
      countryCode: req.body.countryCode || req.body.country_code || '+91',
      status: req.body.status || 'ACTIVE',
      api_key: req.body.api_key || generateApiKey(),
    };

    const doc = await ApiToken.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const doc = await ApiToken.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ message: 'API token config not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      const orgId = org ? (org.organizationId || org.organizationId) : null;
      if (String(doc.organizationId || doc.organizationId) !== String(orgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit configuration of another organization' });
      }
    }

    const { api_key, organizationId, _id, id: bodyId, countryCode, country_code, leadSourceId, leadSource_id, ...updatePayload } = req.body || {};

    let resolvedLeadSourceId = leadSourceId || leadSource_id || doc.leadSourceId;
    if ((leadSourceId === undefined && leadSource_id === undefined) && updatePayload.source && updatePayload.source !== doc.source) {
      try {
        const OrganizationResources = mongoose.model('OrganizationResources');
        const orgId = doc.organizationId || doc.organizationId;
        const resDoc = await OrganizationResources.findOne({
          $or: [
            { organizationId: orgId },
            { organizationId: null },
            { organizationId: '' }
          ]
        }).exec();
        if (resDoc && resDoc.leadSources) {
          const matched = resDoc.leadSources.find(s => 
            String(s.leadSource || s.name || s.value || '').toLowerCase() === String(updatePayload.source).toLowerCase()
          );
          if (matched) {
            resolvedLeadSourceId = matched.id || matched._id || null;
          }
        }
      } catch (err) {
        console.error('Failed to resolve leadSourceId from source inside PUT:', err);
      }
    }

    Object.assign(doc, updatePayload);
    doc.leadSourceId = resolvedLeadSourceId;
    if (countryCode !== undefined) doc.countryCode = countryCode;
    else if (country_code !== undefined) doc.countryCode = country_code;
    
    if (req.user.role === 'superAdmin' && (organizationId !== undefined || organizationId !== undefined)) {
      doc.organizationId = organizationId || organizationId;
    }

    await doc.save();

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const doc = await ApiToken.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ message: 'API token config not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      const orgId = org ? (org.organizationId || org.organizationId) : null;
      if (String(doc.organizationId || doc.organizationId) !== String(orgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete configuration of another organization' });
      }
    }

    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Facebook Integration Endpoints ---

router.get('/facebook', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    let doc = await ApiToken.findOne({ organizationId: orgId, source: { $regex: /^facebook$/i } }).exec();
    if (!doc) {
      doc = await ApiToken.create({
        organizationId: orgId,
        source: 'Facebook',
        api_key: generateApiKey(),
        status: 'ACTIVE',
      });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/token', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    
    const { access_token, app_id, app_secret } = req.body;
    const doc = await ApiToken.findOneAndUpdate(
      { organizationId: orgId, source: { $regex: /^facebook$/i } },
      { access_token, app_id, app_secret },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/pages', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    
    const { facebook_pages } = req.body;
    const doc = await ApiToken.findOneAndUpdate(
      { organizationId: orgId, source: { $regex: /^facebook$/i } },
      { facebook_pages },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/subscribe', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    
    const { page_id } = req.body;
    const doc = await ApiToken.findOneAndUpdate(
      { organizationId: orgId, source: { $regex: /^facebook$/i } },
      { $addToSet: { page_id: { $each: Array.isArray(page_id) ? page_id : [page_id] } } },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    
    const { page_id } = req.body;
    const doc = await ApiToken.findOneAndUpdate(
      { organizationId: orgId, source: { $regex: /^facebook$/i } },
      { $pull: { page_id: page_id } },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete('/facebook/token', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
    const orgId = org ? (org.organizationId || org.organizationId) : null;
    
    const doc = await ApiToken.findOneAndUpdate(
      { organizationId: orgId, source: { $regex: /^facebook$/i } },
      { access_token: '', facebook_pages: [], page_id: [] },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
