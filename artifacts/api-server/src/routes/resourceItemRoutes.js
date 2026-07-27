const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const resourceItemModel = require('../models/resourceItemModel');
const s3Service = require('../services/s3Service');
const { convertKeysToCamelCase, normalizePayload } = require('../services/crudFactory');

const router = express.Router();

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

// Helper to resolve Industry ID
async function resolveIndustryId(req) {
  const { industryId, industry_code } = { ...req.query, ...req.body };
  const target = industry_code || industryId;
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

router.get('/:resource_key', authenticate, async (req, res, next) => {
  try {
    const { resource_key } = req.params;

    const orgId = await resolveOrganizationId(req);
    if (req.user.role !== 'superAdmin' && !orgId) {
      return res.status(400).json({ message: 'Organization identifier is mandatory for Admin users' });
    }

    const industryId = await resolveIndustryId(req);

    const items = await resourceItemModel.list({
      resource_key,
      organizationId: orgId,
      industryId,
      all: req.query.all === 'true' || (req.user.role === 'superAdmin' && !orgId),
    });

    const formatted = items.map(item => {
      const converted = convertKeysToCamelCase(item);
      return {
        id: converted.id || converted._id,
        ...converted,
        created_at: converted.createdAt,
        updated_at: converted.updatedAt,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

router.post('/:resource_key', authenticate, async (req, res, next) => {
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

    const resolvedIndustryId = await resolveIndustryId(req);

    const doc = await resourceItemModel.create({
      organizationId: orgId,
      industryId: resolvedIndustryId,
      resource_key,
      data: normalizePayload(payloadData),
    });

    const convertedDoc = convertKeysToCamelCase(doc);
    res.status(201).json({
      id: convertedDoc.id || convertedDoc._id,
      ...convertedDoc,
      created_at: convertedDoc.createdAt,
      updated_at: convertedDoc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:resource_key/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const doc = await resourceItemModel.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Resource item not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      const userOrgId = org ? (org.organizationId || org.organizationId) : null;
      if (!userOrgId || String(doc.organizationId || doc.organizationId) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot edit resource from another organization' });
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

    const updated = await resourceItemModel.update(id, normalizePayload(payloadData));

    const convertedUpdated = convertKeysToCamelCase(updated);
    res.json({
      id: convertedUpdated.id || convertedUpdated._id,
      ...convertedUpdated,
      created_at: convertedUpdated.createdAt,
      updated_at: convertedUpdated.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:resource_key/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const doc = await resourceItemModel.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Resource item not found' });
    }

    if (req.user.role !== 'superAdmin') {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      const userOrgId = org ? (org.organizationId || org.organizationId) : null;
      if (!userOrgId || String(doc.organizationId || doc.organizationId) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete resource from another organization' });
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
