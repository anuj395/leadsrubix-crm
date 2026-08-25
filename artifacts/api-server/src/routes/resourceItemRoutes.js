const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const resourceItemModel = require('../models/resourceItemModel');
const s3Service = require('../services/s3Service');
const { convertKeysToCamelCase, normalizePayload } = require('../services/crudFactory');

const { requireScreenAction } = require('../middlewares/screenAction');

const router = express.Router();

function mapResourceKeyToScreenKey(resourceKey) {
  if (!resourceKey) return '';
  const k = String(resourceKey);
  if (k === 'projects' || k === 'resourceProjects') return 'configProjects';
  if (k === 'notes' || k === 'resourceNotes') return 'notes';
  if (k.startsWith('resource')) return k;
  return 'resource' + k.charAt(0).toUpperCase() + k.slice(1);
}

// Helper to resolve Organization ID
async function resolveOrganizationId(req) {
  if (req.user.role === 'superAdmin') {
    const targetOrgId = req.query.organizationId || req.body.organizationId;
    if (targetOrgId === 'null' || targetOrgId === '') {
      return null;
    }
    return targetOrgId || null;
  }
  return req.user.organizationId || null;
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

// Helper to resolve Industry ID
async function resolveIndustryId(req) {
  const { industryId, industry_code } = { ...req.query, ...req.body };
  const target = industry_code || industryId || (req.user && req.user.industryId);
  if (target) {
    const Industry = mongoose.model('Industry');
    // Try to find by code first
    let ind = await Industry.findOne({ code: target }).lean().exec();
    if (ind) return ind._id;
    // If target is a valid ObjectId, try finding by _id
    if (mongoose.Types.ObjectId.isValid(target)) {
      ind = await Industry.findById(target).lean().exec();
      if (ind) return ind._id;
    }
  }
  return null;
}

router.get('/:resource_key', authenticate, requireScreenAction((req) => mapResourceKeyToScreenKey(req.params.resource_key), 'view'), async (req, res, next) => {
  try {
    const { resource_key } = req.params;

    const orgId = await resolveOrganizationId(req);
    if (req.user.role !== 'superAdmin' && !orgId) {
      return res.status(400).json({ message: 'Organization identifier is mandatory for Admin users' });
    }

    const industryId = await resolveIndustryId(req);
    const workspaceId = req.user.role === 'superAdmin'
      ? (req.query.workspaceId || req.body.workspaceId || null)
      : (req.user.workspaceId || req.user.workspace_id || null);

    const items = await resourceItemModel.list({
      resource_key,
      organizationId: orgId,
      industryId,
      workspaceId,
      all: req.query.all === 'true' || (req.user.role === 'superAdmin' && !orgId),
    });

    const formatted = items.map(item => {
      const converted = convertKeysToCamelCase(item);
      const orgVal = converted.organizationId || item.organization_id || item.organizationId || '';
      const indVal = converted.industryId || item.industry_id || item.industryId || '';
      const wsVal = converted.workspaceId || item.workspace_id || item.workspaceId || '';
      const result = {
        ...converted,
        id: converted.id || converted._id || item.id || item._id,
        organizationId: orgVal,
        industryId: indVal,
        workspaceId: wsVal,
      };
      delete result._id;
      return result;
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

router.post('/:resource_key', authenticate, requireScreenAction((req) => mapResourceKeyToScreenKey(req.params.resource_key), 'add'), async (req, res, next) => {
  try {
    const { resource_key } = req.params;

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const orgId = await resolveOrganizationId(req);
    if (req.user.role !== 'superAdmin' && !orgId) {
      return res.status(400).json({ message: 'Organization identifier is mandatory for Admin users' });
    }

    // Extract dynamic data (except system metadata)
    const { industry_code, industryId: bodyIndustryId, organizationId: bodyOrgId, ...payloadData } = req.body || {};

    // Validate image file size (max 20MB)
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
    for (const key of Object.keys(payloadData)) {
      const val = payloadData[key];
      if (typeof val === 'string' && val.startsWith('data:image')) {
        const base64Data = val.split(',')[1] || '';
        const sizeInBytes = (base64Data.length * 3) / 4;
        if (sizeInBytes > MAX_IMAGE_SIZE) {
          return res.status(400).json({ message: 'File size must not exceed 20 MB.' });
        }
      }
    }

    if (resource_key === 'resourceCarousel' && payloadData.url && payloadData.url.startsWith('data:image')) {
      payloadData.url = await s3Service.uploadImage(payloadData.url, 'carousel');
    }

    let resolvedWorkspaceId = null;
    let resolvedIndustryId = null;
    if (req.user.role === 'superAdmin') {
      const tenant = await resolveTenantFields(orgId);
      resolvedIndustryId = tenant.industryId;
      resolvedWorkspaceId = tenant.workspaceId;
    } else {
      resolvedIndustryId = await resolveIndustryId(req);
      resolvedWorkspaceId = req.user.workspaceId || req.user.workspace_id || null;
    }

    const doc = await resourceItemModel.create({
      organizationId: orgId,
      industryId: resolvedIndustryId,
      resource_key,
      data: {
        createdBy: req.user?.name || req.user?.email || 'Admin',
        created_by: req.user?.name || req.user?.email || 'Admin',
        userName: req.user?.name || req.user?.email || 'Admin',
        user_name: req.user?.name || req.user?.email || 'Admin',
        userEmail: req.user?.email || '',
        user_email: req.user?.email || '',
        ...normalizePayload(payloadData),
        workspaceId: resolvedWorkspaceId,
        workspace_id: resolvedWorkspaceId,
      },
    });

    const convertedDoc = convertKeysToCamelCase(doc);
    const orgVal = convertedDoc.organizationId || doc.organization_id || doc.organizationId || '';
    const indVal = convertedDoc.industryId || doc.industry_id || doc.industryId || '';
    const wsVal = convertedDoc.workspaceId || doc.workspace_id || doc.workspaceId || '';
    const result = {
      ...convertedDoc,
      id: convertedDoc.id || convertedDoc._id,
      organizationId: orgVal,
      industryId: indVal,
      workspaceId: wsVal,
    };
    delete result._id;
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:resource_key/:id', authenticate, requireScreenAction((req) => mapResourceKeyToScreenKey(req.params.resource_key), 'edit'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await resourceItemModel.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Resource item not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      if (!userOrgId || String(doc.organizationId || doc.organization_id) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit resource from another organization' });
      }
      const workspaceId = req.user.workspaceId || req.user.workspace_id;
      if (doc.workspaceId && String(doc.workspaceId) !== String(workspaceId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit resource from another workspace' });
      }
    }

    const { industry_code, industryId, organizationId: bodyOrgId, organizationId, id: bodyId, ...payloadData } = req.body || {};

    // Validate image file size (max 20MB)
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
    for (const key of Object.keys(payloadData)) {
      const val = payloadData[key];
      if (typeof val === 'string' && val.startsWith('data:image')) {
        const base64Data = val.split(',')[1] || '';
        const sizeInBytes = (base64Data.length * 3) / 4;
        if (sizeInBytes > MAX_IMAGE_SIZE) {
          return res.status(400).json({ message: 'File size must not exceed 20 MB.' });
        }
      }
    }

    const oldUrl = doc ? doc.url : null;
    const { resource_key } = req.params;
    if (resource_key === 'resourceCarousel' && payloadData.url && payloadData.url.startsWith('data:image')) {
      if (oldUrl) {
        await s3Service.deleteImage(oldUrl, 'carousel');
      }
      payloadData.url = await s3Service.uploadImage(payloadData.url, 'carousel');
    }

    const targetOrgId = organizationId || req.body.organization_id || doc.organizationId || doc.organization_id;
    let targetWorkspaceId = undefined;
    if (req.user.role === 'superAdmin') {
      if (organizationId !== undefined || req.body.organization_id !== undefined) {
        const tenant = await resolveTenantFields(targetOrgId);
        targetWorkspaceId = tenant.workspaceId;
      }
    }

    const updateData = normalizePayload(payloadData);
    if (targetWorkspaceId !== undefined) {
      updateData.workspaceId = targetWorkspaceId;
      updateData.workspace_id = targetWorkspaceId;
    }

    const updated = await resourceItemModel.update(id, updateData);

    const convertedUpdated = convertKeysToCamelCase(updated);
    const orgVal = convertedUpdated.organizationId || updated.organization_id || updated.organizationId || '';
    const indVal = convertedUpdated.industryId || updated.industry_id || updated.industryId || '';
    const wsVal = convertedUpdated.workspaceId || updated.workspace_id || updated.workspaceId || '';
    const result = {
      ...convertedUpdated,
      id: convertedUpdated.id || convertedUpdated._id,
      organizationId: orgVal,
      industryId: indVal,
      workspaceId: wsVal,
    };
    delete result._id;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:resource_key/:id', authenticate, requireScreenAction((req) => mapResourceKeyToScreenKey(req.params.resource_key), 'delete'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await resourceItemModel.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Resource item not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      if (!userOrgId || String(doc.organizationId || doc.organization_id) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete resource from another organization' });
      }
      const workspaceId = req.user.workspaceId || req.user.workspace_id;
      if (doc.workspaceId && String(doc.workspaceId) !== String(workspaceId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete resource from another workspace' });
      }
    }

    const { resource_key } = req.params;
    const fileUrl = doc ? doc.url : null;
    if (resource_key === 'resourceCarousel' && fileUrl) {
      await s3Service.deleteImage(fileUrl, 'carousel');
    }

    await resourceItemModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
