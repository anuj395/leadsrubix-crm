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

// 1. Get resource import history
router.get('/:resource_key/import-history', authenticate, async (req, res, next) => {
  try {
    const { resource_key } = req.params;
    const ImportLog = require('../models/importLogModel');
    let orgId = await resolveOrganizationId(req);
    const filter = { resource_key };
    if (orgId) {
      filter.organization_id = orgId;
    }
    const logs = await ImportLog.find(filter).sort({ createdAt: -1 }).lean().exec();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// 2. Resource Bulk Import with AWS S3 multi-tenant storage
router.post('/:resource_key/bulk-import', authenticate, async (req, res, next) => {
  try {
    const { resource_key } = req.params;
    const { items, fileName, csvContent } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for import' });
    }

    const ImportLog = require('../models/importLogModel');
    const requestId = 'REQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    let orgId = await resolveOrganizationId(req);
    let resolvedWorkspaceId = req.query.workspaceId || req.body.workspaceId || null;
    let resolvedIndustryId = await resolveIndustryId(req);
    if (req.user.role === 'superAdmin') {
      if (orgId) {
        const tenant = await resolveTenantFields(orgId);
        resolvedIndustryId = tenant.industryId || resolvedIndustryId;
        resolvedWorkspaceId = resolvedWorkspaceId || tenant.workspaceId;
      }
    } else {
      resolvedWorkspaceId = resolvedWorkspaceId || req.user.workspaceId || req.user.workspace_id || null;
    }

    let imported = 0;
    const errors = [];
    const processedRows = [];
    const createdDocs = [];

    for (let i = 0; i < items.length; i++) {
      const payloadData = items[i];
      try {
        const doc = await resourceItemModel.create({
          organizationId: orgId,
          industryId: resolvedIndustryId,
          resource_key,
          data: {
            ...payloadData,
            createdBy: req.user?.name || req.user?.email || 'Admin',
            created_by: req.user?.name || req.user?.email || 'Admin',
            userName: req.user?.name || req.user?.email || 'Admin',
            user_name: req.user?.name || req.user?.email || 'Admin',
            userEmail: req.user?.email || '',
            user_email: req.user?.email || '',
            workspaceId: resolvedWorkspaceId,
            workspace_id: resolvedWorkspaceId,
          }
        });
        imported++;
        processedRows.push({ ...payloadData, import_status: 'SUCCESS', error_message: '' });
        createdDocs.push(doc);
      } catch (err) {
        const errMsg = err?.message || 'Failed to save record';
        errors.push({ index: i, error: errMsg });
        processedRows.push({ ...payloadData, import_status: 'FAILED', error_message: errMsg });
      }
    }

    // Convert to CSV for S3 archival
    const rawCsv = csvContent || arrayToCsv(items);
    const processedCsv = arrayToCsv(processedRows);

    let fileUrl = '';
    let responseUrl = '';

    try {
      const [rawUpload, procUpload] = await Promise.all([
        s3Service.uploadImportFile({
          csvContent: rawCsv,
          filename: fileName || `${resource_key}_import.csv`,
          industryId: resolvedIndustryId,
          organizationId: orgId,
          workspaceId: resolvedWorkspaceId,
          module: `resources/${resource_key}`
        }),
        s3Service.uploadImportFile({
          csvContent: processedCsv,
          filename: `processed-${fileName || `${resource_key}_import.csv`}`,
          industryId: resolvedIndustryId,
          organizationId: orgId,
          workspaceId: resolvedWorkspaceId,
          module: `resources/${resource_key}`
        })
      ]);
      if (rawUpload?.url) fileUrl = rawUpload.url;
      if (procUpload?.url) responseUrl = procUpload.url;
    } catch (s3Err) {
      console.warn('[ResourceBulkImport] S3 upload error:', s3Err.message);
    }

    if (orgId) {
      await ImportLog.create({
        requestId,
        organization_id: orgId,
        module: 'resources',
        resource_key,
        createdBy: req.user?.name || req.user?.email || 'Admin',
        uid: String(req.user?.id || req.user?._id || ''),
        status: errors.length === 0 ? 'Completed' : 'Completed with Errors',
        uploadCount: imported,
        failedCount: errors.length,
        fileUrl,
        responseUrl
      });
    }

    return res.status(201).json({
      imported,
      errors,
      requestId,
      fileUrl,
      responseUrl,
      items: createdDocs
    });
  } catch (err) {
    next(err);
  }
});

// 3. Delete Resource Import History & S3 Files
router.delete('/:resource_key/import-history/:id', authenticate, async (req, res, next) => {
  try {
    const { resource_key, id } = req.params;
    const ImportLog = require('../models/importLogModel');
    const log = await ImportLog.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { requestId: id },
        { request_id: id }
      ].filter(Boolean)
    });

    if (!log) {
      return res.status(404).json({ message: 'Import history record not found' });
    }

    if (log.fileUrl) {
      await s3Service.deleteImage(log.fileUrl).catch(e => console.warn('[ResourceImportLog] S3 raw file delete error:', e.message));
    }
    if (log.responseUrl) {
      await s3Service.deleteImage(log.responseUrl).catch(e => console.warn('[ResourceImportLog] S3 response file delete error:', e.message));
    }

    await ImportLog.deleteOne({ _id: log._id });
    res.json({ success: true, message: 'Resource import history and S3 files deleted successfully' });
  } catch (err) {
    next(err);
  }
});

function arrayToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
  const lines = rows.map(r => 
    headers.map(h => {
      const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerLine, ...lines].join('\n');
}

// Upload raw import CSV file to S3 with multi-tenant path
router.post('/:resource_key/upload-import-file', authenticate, async (req, res, next) => {
  try {
    const { resource_key } = req.params;
    const { csvContent, fileBase64, filename } = req.body;
    let orgId = await resolveOrganizationId(req);
    let resolvedWorkspaceId = req.query.workspaceId || req.body.workspaceId || null;
    let resolvedIndustryId = await resolveIndustryId(req);
    if (req.user.role === 'superAdmin') {
      if (orgId) {
        const tenant = await resolveTenantFields(orgId);
        resolvedIndustryId = tenant.industryId || resolvedIndustryId;
        resolvedWorkspaceId = resolvedWorkspaceId || tenant.workspaceId;
      }
    } else {
      resolvedWorkspaceId = resolvedWorkspaceId || req.user.workspaceId || req.user.workspace_id || null;
    }

    const uploadRes = await s3Service.uploadImportFile({
      csvContent,
      fileBuffer: fileBase64 ? Buffer.from(fileBase64.split(',')[1] || fileBase64, 'base64') : undefined,
      filename: filename || `${resource_key}_import.csv`,
      industryId: resolvedIndustryId,
      organizationId: orgId,
      workspaceId: resolvedWorkspaceId,
      module: `resources/${resource_key}`
    });

    return res.json({
      success: true,
      fileUrl: uploadRes.url,
      key: uploadRes.key,
      name: uploadRes.name,
      size: uploadRes.size
    });
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

    let resolvedWorkspaceId = req.query.workspaceId || req.body.workspaceId || null;
    let resolvedIndustryId = await resolveIndustryId(req);
    if (req.user.role === 'superAdmin') {
      if (orgId) {
        const tenant = await resolveTenantFields(orgId);
        resolvedIndustryId = tenant.industryId || resolvedIndustryId;
        resolvedWorkspaceId = resolvedWorkspaceId || tenant.workspaceId;
      }
    } else {
      resolvedWorkspaceId = resolvedWorkspaceId || req.user.workspaceId || req.user.workspace_id || null;
    }

    if (payloadData.url && typeof payloadData.url === 'string' && payloadData.url.startsWith('data:')) {
      const uploadRes = await s3Service.uploadBase64Media({
        base64Data: payloadData.url,
        filename: payloadData.name || resource_key,
        industryId: resolvedIndustryId,
        organizationId: orgId,
        workspaceId: resolvedWorkspaceId,
        resourceType: resource_key
      });
      payloadData.url = typeof uploadRes === 'object' ? uploadRes.url : uploadRes;
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
    const targetOrgId = organizationId || req.body.organization_id || doc.organizationId || doc.organization_id;
    let targetWorkspaceId = undefined;
    let targetIndustryId = doc?.industryId || doc?.industry_id;
    if (req.user.role === 'superAdmin') {
      if (organizationId !== undefined || req.body.organization_id !== undefined) {
        const tenant = await resolveTenantFields(targetOrgId);
        targetWorkspaceId = tenant.workspaceId;
        targetIndustryId = tenant.industryId || targetIndustryId;
      }
    }

    if (payloadData.url && typeof payloadData.url === 'string' && payloadData.url.startsWith('data:')) {
      if (oldUrl) {
        await s3Service.deleteImage(oldUrl, resource_key);
      }
      const uploadRes = await s3Service.uploadBase64Media({
        base64Data: payloadData.url,
        filename: payloadData.name || resource_key,
        industryId: targetIndustryId,
        organizationId: targetOrgId,
        workspaceId: targetWorkspaceId,
        resourceType: resource_key
      });
      payloadData.url = typeof uploadRes === 'object' ? uploadRes.url : uploadRes;
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
