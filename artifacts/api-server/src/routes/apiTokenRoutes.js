const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

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
    facebookPages: t.facebook_pages || t.facebookPages || [],
    pageId: t.page_id || t.pageId || [],
    appId: t.app_id || t.appId || undefined,
    appSecret: t.app_secret || t.appSecret || undefined,
    userName: t.user_name || t.userName || undefined,
    userPicture: t.user_picture || t.userPicture || undefined,
    fbUserId: t.fb_user_id || t.fbUserId || undefined,
  };
}

router.get('/', authenticate, requireScreenAction('configApi', 'view'), async (req, res, next) => {
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

router.post('/', authenticate, requireScreenAction('configApi', 'add'), async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

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

router.delete('/:id', authenticate, requireScreenAction('configApi', 'delete'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');

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
    const { shortToken } = req.body;
    if (!shortToken) return res.status(400).json({ message: 'Missing shortToken' });

    const axios = require('axios');
    try {
      const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FB_APP_ID || '296542553118517',
          client_secret: process.env.FB_APP_SECRET || '143f8ed7ddec986f25598654d8b686f6',
          fb_exchange_token: shortToken,
        },
      });
      res.json({ longToken: response.data.access_token || shortToken });
    } catch (metaErr) {
      console.warn('Meta token exchange fallback to shortToken:', metaErr.message);
      res.json({ longToken: shortToken });
    }
  } catch (err) {
    next(err);
  }
});

function getPossibleOrgIds(req) {
  const ids = [
    req.query?.organizationId,
    req.body?.organizationId,
    req.user?.organizationId,
    req.user?.organization_id,
  ].filter(Boolean).map(String);
  return Array.from(new Set(ids));
}

function buildFacebookOrgQuery(possibleOrgIds) {
  return {
    $or: [
      { organization_id: { $in: possibleOrgIds } },
      { organizationId: { $in: possibleOrgIds } }
    ],
    source: { $regex: /^facebook$/i }
  };
}

router.get('/facebook', authenticate, async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    let doc = await ApiToken.findOne({
      ...orgQuery,
      access_token: { $exists: true, $ne: '', $ne: null }
    }).sort({ updated_at: -1 }).exec();

    if (!doc) {
      doc = await ApiToken.findOne(orgQuery).sort({ updated_at: -1 }).exec();
    }

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
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const { accessToken, appId, appSecret, userName, userPicture, fbUserId, facebookPages, pageId } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);
    
    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    let doc = await ApiToken.findOne(orgQuery).sort({ updated_at: -1 }).exec();

    const updateData = {
      organization_id: orgId,
      source: 'Facebook',
      status: 'ACTIVE',
      access_token: accessToken || '',
      app_id: appId || '296542553118517',
      app_secret: appSecret || '143f8ed7ddec986f25598654d8b686f6',
      user_name: userName || '',
      user_picture: userPicture || '',
      fb_user_id: fbUserId || '',
      facebook_pages: facebookPages || [],
      page_id: Array.isArray(pageId) ? pageId.map(String) : (pageId ? [String(pageId)] : [])
    };

    if (doc) {
      Object.assign(doc, updateData);
      if (!doc.api_key) doc.api_key = generateApiKey();
      await doc.save();
    } else {
      doc = await ApiToken.create({
        ...updateData,
        industry_id: industryId,
        workspace_id: workspaceId,
        api_key: generateApiKey(),
      });
    }

    // Clean up duplicate empty Facebook docs for this organization
    try {
      if (doc && doc._id) {
        await ApiToken.deleteMany({
          ...orgQuery,
          _id: { $ne: doc._id },
          $or: [{ access_token: '' }, { access_token: null }, { access_token: { $exists: false } }]
        }).exec();
      }
    } catch (cleanErr) {
      console.warn('Could not clean duplicate empty facebook tokens:', cleanErr);
    }

    res.json(formatApiToken(doc));
  } catch (err) {
    console.error('[PUT /facebook/token] Error:', err);
    next(err);
  }
});

router.put('/facebook/pages', authenticate, async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const { facebookPages, pageId } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);

    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    let doc = await ApiToken.findOne(orgQuery).sort({ updated_at: -1 }).exec();

    const ids = pageId !== undefined 
      ? (Array.isArray(pageId) ? pageId.map(String) : [String(pageId)])
      : (doc?.page_id || []);

    if (doc) {
      doc.facebook_pages = facebookPages;
      if (pageId !== undefined) doc.page_id = ids;
      doc.source = 'Facebook';
      doc.organization_id = orgId;
      if (!doc.api_key) doc.api_key = generateApiKey();
      await doc.save();
    } else {
      doc = await ApiToken.create({
        organization_id: orgId,
        source: 'Facebook',
        status: 'ACTIVE',
        facebook_pages: facebookPages,
        page_id: ids,
        industry_id: industryId,
        workspace_id: workspaceId,
        api_key: generateApiKey(),
      });
    }

    res.json(formatApiToken(doc));
  } catch (err) {
    console.error('[PUT /facebook/pages] Error:', err);
    next(err);
  }
});

router.put('/facebook/subscribe', authenticate, async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const { pageId } = req.body;
    const { industryId, workspaceId } = await resolveTenantFields(orgId);
    const ids = Array.isArray(pageId) ? pageId.map(String) : [String(pageId)];

    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    let doc = await ApiToken.findOne(orgQuery).sort({ updated_at: -1 }).exec();

    if (doc) {
      doc.page_id = ids;
      doc.source = 'Facebook';
      doc.organization_id = orgId;
      if (!doc.api_key) doc.api_key = generateApiKey();
      await doc.save();
    } else {
      doc = await ApiToken.create({
        organization_id: orgId,
        source: 'Facebook',
        status: 'ACTIVE',
        page_id: ids,
        industry_id: industryId,
        workspace_id: workspaceId,
        api_key: generateApiKey(),
      });
    }

    res.json(formatApiToken(doc));
  } catch (err) {
    console.error('[PUT /facebook/subscribe] Error:', err);
    next(err);
  }
});

router.put('/facebook/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const { pageId } = req.body;
    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    const doc = await ApiToken.findOne(orgQuery).exec();

    if (doc) {
      doc.page_id = (doc.page_id || []).map(String).filter(id => id !== String(pageId));
      doc.facebook_pages = (doc.facebook_pages || []).filter(p => String(p.id) !== String(pageId));
      await doc.save();
    }

    res.json(formatApiToken(doc));
  } catch (err) {
    console.error('[PUT /facebook/unsubscribe] Error:', err);
    next(err);
  }
});

router.delete('/facebook/token', authenticate, async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Facebook integration is restricted to Admin and SuperAdmin only' });
    }
    const ApiToken = mongoose.model('ApiToken');
    const possibleOrgIds = getPossibleOrgIds(req);
    const orgId = possibleOrgIds[0];
    if (!orgId) return res.status(400).json({ message: 'Organization not found' });
    
    const orgQuery = buildFacebookOrgQuery(possibleOrgIds);

    const doc = await ApiToken.findOne(orgQuery).exec();

    if (doc) {
      doc.access_token = '';
      doc.facebook_pages = [];
      doc.page_id = [];
      doc.user_name = '';
      doc.user_picture = '';
      doc.fb_user_id = '';
      await doc.save();
    }

    res.json(formatApiToken(doc));
  } catch (err) {
    console.error('[DELETE /facebook/token] Error:', err);
    next(err);
  }
});

module.exports = router;
