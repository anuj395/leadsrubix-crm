const express = require('express');
const mongoose = require('mongoose');
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

async function resolveTenantFields(orgId) {
  if (!orgId) return { industryId: null, workspaceId: null };
  try {
    const Organization = mongoose.model('Organization');
    const Workspace = mongoose.model('Workspace');
    const org = await Organization.findOne({
      $or: [
        { organization_id: orgId },
        { _id: mongoose.Types.ObjectId.isValid(orgId) ? orgId : undefined }
      ].filter(Boolean)
    }).lean().exec();
    const industryId = org ? (org.industry_id || org.industryId || null) : null;
    const ws = await Workspace.findOne({ organization_id: orgId }).lean().exec();
    const workspaceId = ws ? ws.workspace_id : ('ws_' + orgId);
    return { industryId, workspaceId };
  } catch (err) {
    console.error('[resolveTenantFields] Error:', err);
    return { industryId: null, workspaceId: 'ws_' + orgId };
  }
}

function formatApiToken(t, orgMap = {}) {
  if (!t) return null;
  const orgId = t.organization_id || t.organizationId || '';
  return {
    id: String(t._id || t.id || ''),
    apiKey: t.api_key || t.apiKey || '',
    organizationId: orgId,
    organizationName: orgMap[orgId] || t.organizationName || '',
    industryId: t.industry_id || t.industryId || '',
    workspaceId: t.workspace_id || t.workspaceId || '',
    source: t.source || '',
    leadSourceId: t.lead_source_id || t.leadSourceId || null,
    countryCode: t.country_code || t.countryCode || '+91',
    status: t.status || 'ACTIVE',
    createdAt: t.created_at || t.createdAt || null,
    updatedAt: t.updated_at || t.updatedAt || null,
    accessToken: t.access_token || t.accessToken || undefined,
    facebookPages: t.facebook_pages || t.facebookPages || undefined,
    pageId: t.page_id || t.pageId || undefined,
    appId: t.app_id || t.appId || undefined,
    appSecret: t.app_secret || t.appSecret || undefined,
  };
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

    let query = {};
    let andFilters = [];
    let orgMap = {};

    if (req.user.role === 'superAdmin') {
      const { industryId, organizationId, workspaceId } = req.query;
      let targetOrgIds = [];
      if (organizationId && organizationId !== 'all') {
        targetOrgIds = [organizationId];
      } else if (industryId && industryId !== 'all') {
        const Industry = mongoose.model('Industry');
        let industryDoc = null;
        if (mongoose.Types.ObjectId.isValid(industryId)) {
          industryDoc = await Industry.findById(industryId).lean().exec();
        } else {
          industryDoc = await Industry.findOne({ code: industryId }).lean().exec();
        }

        if (industryDoc) {
          const orgDocs = await Organization.find({
            $or: [
              { industryId: String(industryDoc._id) },
              { industry_id: industryDoc._id },
              { industryId: industryDoc.code },
              { industry_code: industryDoc.code }
            ]
          }).lean().exec();
          targetOrgIds = orgDocs.map(o => o.organizationId || o.organization_id).filter(Boolean);
        }
      }

      if (targetOrgIds.length > 0) {
        andFilters.push({ organization_id: { $in: targetOrgIds } });
      }

      if (industryId && industryId !== 'all') {
        const Industry = mongoose.model('Industry');
        let industryDoc = null;
        if (mongoose.Types.ObjectId.isValid(industryId)) {
          industryDoc = await Industry.findById(industryId).lean().exec();
        } else {
          industryDoc = await Industry.findOne({ code: industryId }).lean().exec();
        }
        if (industryDoc) {
          andFilters.push({
            $or: [
              { industry_id: String(industryDoc._id) },
              { industry_id: industryDoc._id },
              { industry_id: industryDoc.code }
            ]
          });
        } else {
          andFilters.push({ industry_id: industryId });
        }
      }

      if (workspaceId && workspaceId !== 'all') {
        andFilters.push({ workspace_id: workspaceId });
      }

      const orgs = await Organization.find({}).lean().exec();
      orgs.forEach(o => {
        const idVal = o.organization_id || o.organizationId;
        if (idVal) {
          orgMap[idVal] = o.organization_name || o.organizationName || o.name || idVal;
        }
      });
    } else {
      const orgId = req.user.organizationId || req.user.organization_id;
      const workspaceId = req.user.workspaceId || req.user.workspace_id;
      const industryId = req.user.industryId || req.user.industry_id;
      if (!orgId) {
        return res.json([]);
      }
      andFilters.push({ organization_id: orgId });
      if (workspaceId) {
        andFilters.push({
          $or: [
            { workspace_id: workspaceId },
            { workspace_id: null },
            { workspace_id: { $exists: false } }
          ]
        });
      }
      if (industryId) {
        const Industry = mongoose.model('Industry');
        let industryDoc = null;
        if (mongoose.Types.ObjectId.isValid(industryId)) {
          industryDoc = await Industry.findById(industryId).lean().exec();
        } else {
          industryDoc = await Industry.findOne({ code: industryId }).lean().exec();
        }
        if (industryDoc) {
          andFilters.push({
            $or: [
              { industry_id: String(industryDoc._id) },
              { industry_id: industryDoc._id },
              { industry_id: industryDoc.code }
            ]
          });
        } else {
          andFilters.push({ industry_id: industryId });
        }
      }
      const org = await Organization.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      }).exec();
      orgMap[orgId] = org ? (org.organization_name || org.organizationName || org.name || orgId) : orgId;
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const tokens = await ApiToken.find(query).sort({ createdAt: -1 }).lean().exec();

    const formatted = tokens.map(t => formatApiToken(t, orgMap));

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

    let orgId = req.body.organizationId || req.body.organization_id || null;

    if (req.user.role !== 'superAdmin') {
      orgId = req.user.organizationId || req.user.organization_id;
      if (!orgId) {
        return res.status(400).json({ message: 'Organization ID is mandatory for Admin users' });
      }
    }

    if (req.body.source) {
      const existing = await ApiToken.findOne({
        organization_id: orgId,
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

    const { industryId, workspaceId } = await resolveTenantFields(orgId);

    const payload = {
      organization_id: orgId,
      industry_id: req.body.industryId || req.body.industry_id || industryId || req.user.industryId || null,
      workspace_id: req.body.workspaceId || req.body.workspace_id || workspaceId || req.user.workspaceId || null,
      source: req.body.source,
      lead_source_id: leadSourceId,
      country_code: req.body.countryCode || req.body.country_code || '+91',
      status: req.body.status || 'ACTIVE',
      api_key: req.body.api_key || req.body.apiKey || generateApiKey(),
    };

    const doc = await ApiToken.create(payload);
    res.status(201).json(formatApiToken(doc));
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
      const orgId = req.user.organizationId || req.user.organization_id;
      if (String(doc.organization_id || doc.organizationId) !== String(orgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit configuration of another organization' });
      }
      const workspaceId = req.user.workspaceId || req.user.workspace_id;
      if (doc.workspace_id && String(doc.workspace_id) !== String(workspaceId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit configuration of another workspace' });
      }
    }

    const { api_key, organizationId, organization_id, _id, id: bodyId, countryCode, country_code, leadSourceId, leadSource_id, ...updatePayload } = req.body || {};

    let resolvedLeadSourceId = leadSourceId || leadSource_id || doc.leadSourceId;
    if ((leadSourceId === undefined && leadSource_id === undefined) && updatePayload.source && updatePayload.source !== doc.source) {
      try {
        const OrganizationResources = mongoose.model('OrganizationResources');
        const orgId = doc.organization_id || doc.organizationId;
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
    
    const targetOrgId = organizationId || organization_id;
    if (req.user.role === 'superAdmin' && targetOrgId !== undefined) {
      doc.organization_id = targetOrgId;
      const { industryId, workspaceId } = await resolveTenantFields(targetOrgId);
      doc.industry_id = industryId;
      doc.workspace_id = workspaceId;
    }

    await doc.save();

    res.json(formatApiToken(doc));
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
      const orgId = req.user.organizationId || req.user.organization_id;
      if (String(doc.organization_id || doc.organizationId) !== String(orgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete configuration of another organization' });
      }
      const workspaceId = req.user.workspaceId || req.user.workspace_id;
      if (doc.workspace_id && String(doc.workspace_id) !== String(workspaceId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete configuration of another workspace' });
      }
    }

    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Facebook Integration Endpoints ---

router.post('/facebook/exchange', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { shortToken } = req.body;
    if (!shortToken) {
      return res.status(400).json({ message: 'shortToken is required' });
    }
    const axios = require('axios');
    const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FB_APP_ID || '296542553118517',
        client_secret: process.env.FB_APP_SECRET || '143f8ed7ddec986f25598654d8b686f6',
        fb_exchange_token: shortToken,
      },
    });
    res.json({ longToken: response.data.access_token });
  } catch (err) {
    next(err);
  }
});

router.get('/facebook', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    let doc = await ApiToken.findOne({ organization_id: orgId, source: { $regex: /^facebook$/i } }).exec();
    if (!doc) {
      const { industryId, workspaceId } = await resolveTenantFields(orgId);
      doc = await ApiToken.create({
        organization_id: orgId,
        industry_id: industryId,
        workspace_id: workspaceId,
        source: 'Facebook',
        api_key: generateApiKey(),
        status: 'ACTIVE',
      });
    }
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/token', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    
    const { accessToken, appId, appSecret } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);
    const doc = await ApiToken.findOneAndUpdate(
      { organization_id: orgId, source: { $regex: /^facebook$/i } },
      { 
        $set: { access_token: accessToken, app_id: appId, app_secret: appSecret },
        $setOnInsert: { industry_id: industryId, workspace_id: workspaceId, api_key: generateApiKey(), status: 'ACTIVE' }
      },
      { new: true, upsert: true }
    );
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/pages', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    
    const { facebookPages } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);
    const doc = await ApiToken.findOneAndUpdate(
      { organization_id: orgId, source: { $regex: /^facebook$/i } },
      { 
        $set: { facebook_pages: facebookPages },
        $setOnInsert: { industry_id: industryId, workspace_id: workspaceId, api_key: generateApiKey(), status: 'ACTIVE' }
      },
      { new: true, upsert: true }
    );
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/subscribe', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    
    const { pageId } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);
    const doc = await ApiToken.findOneAndUpdate(
      { organization_id: orgId, source: { $regex: /^facebook$/i } },
      { 
        $addToSet: { page_id: { $each: Array.isArray(pageId) ? pageId : [pageId] } },
        $setOnInsert: { industry_id: industryId, workspace_id: workspaceId, api_key: generateApiKey(), status: 'ACTIVE' }
      },
      { new: true, upsert: true }
    );
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

router.put('/facebook/unsubscribe', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    
    const { pageId } = req.body;
    const doc = await ApiToken.findOneAndUpdate(
      { organization_id: orgId, source: { $regex: /^facebook$/i } },
      { $pull: { page_id: pageId } },
      { new: true }
    );
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

router.delete('/facebook/token', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const orgId = req.user.role === 'superAdmin'
      ? (req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id)
      : (req.user.organizationId || req.user.organization_id);
    
    const doc = await ApiToken.findOneAndUpdate(
      { organization_id: orgId, source: { $regex: /^facebook$/i } },
      { access_token: '', facebook_pages: [], page_id: [] },
      { new: true }
    );
    res.json(formatApiToken(doc));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
