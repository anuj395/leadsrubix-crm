// src/services/crudFactory.js
//
// Generic tenant-scoped CRUD factory used by the lightweight collections
// added per the migration spec (Branch, Team, Booking, and the additional
// "newX" auxiliary collections to come). Each model is a freeform mongoose
// schema (`strict: false`) so its visible fields can later be governed by
// the screen-config system, exactly like Contacts/Organization. The factory
// gives every collection the same predictable behaviour:
//
//   - GET  /         → paginated list scoped to the caller's industry
//                      (super-admin sees all unless ?industryId= is passed)
//   - GET  /:id      → single document (tenant-checked)
//   - POST /         → create, auto-stamping createdBy + industryId
//   - PUT  /:id      → patch (tenant-checked)
//   - DELETE /:id    → hard delete (tenant-checked)
//
// Anything specific to a collection (validation, business rules) should be
// layered on top of this factory in its own controller, not pushed into the
// factory itself.

const mongoose = require('mongoose');
const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldBypass(v) {
  if (!v || typeof v !== 'object') return true;
  if (v instanceof Date || v instanceof RegExp) return true;
  if (
    v.constructor?.name === 'ObjectID' ||
    v.constructor?.name === 'ObjectId' ||
    v._bsontype === 'ObjectID' ||
    v._bsontype === 'ObjectId' ||
    (typeof v.toHexString === 'function')
  ) {
    return true;
  }
  return false;
}

function convertKeysToCamelCase(obj) {
  if (shouldBypass(obj)) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) {
      out[k] = v;
      continue;
    }
    const camelKey = k.replace(/_([a-z])/g, (m, letter) => letter.toUpperCase());
    out[camelKey] = convertKeysToCamelCase(v);
  }
  return out;
}

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizePayload(payload) {
  if (shouldBypass(payload)) return payload;
  if (Array.isArray(payload)) return payload.map(normalizePayload);
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k.startsWith('_')) {
      out[k] = v;
      continue;
    }
    const snakeKey = k.includes('_') ? k : camelToSnakeCase(k);
    out[snakeKey] = normalizePayload(v);
  }
  return out;
}

async function enrichTasks(Model, items) {
  if (!items || items.length === 0) return;
  const isTaskModel = Model?.modelName === 'Task' || Model?.tableName === 'tasks' || Model?.collection?.name === 'tasks';
  if (!isTaskModel) return;
  const mongoose = require('mongoose');
  const User = mongoose.model('User');
  let Contact = null;
  try {
    Contact = mongoose.model('Contact');
  } catch {
    const contactModel = require('../models/contactModel');
    Contact = contactModel.Contact;
  }

  const rawKeys = items.flatMap(item => [
    item.assignedTo, item.assigned_to,
    item.createdBy, item.created_by,
    item.contactOwnerEmail, item.contact_owner_email,
    item.uid
  ]).filter(Boolean);

  const keys = [...new Set(rawKeys.map(String))];
  const userMap = {};
  if (keys.length > 0) {
    const users = await User.find({
      $or: [
        { _id: { $in: keys } },
        { email: { $in: keys } },
        { uid: { $in: keys } }
      ]
    }).lean().exec();

    users.forEach(u => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
      userMap[String(u._id)] = fullName;
      if (u.email) {
        userMap[String(u.email).toLowerCase()] = fullName;
        userMap[String(u.email)] = fullName;
      }
      if (u.uid) userMap[String(u.uid)] = fullName;
    });
  }

  const contactIds = [...new Set(items.map(item => item.contact_id || item.contactId).filter(Boolean).map(String))];
  const contactMap = {};
  if (contactIds.length > 0 && Contact) {
    const contacts = await Contact.find({
      _id: { $in: contactIds }
    }).lean().exec();

    contacts.forEach(c => {
      contactMap[String(c._id)] = c;
    });
  }

  items.forEach(item => {
    // 1. Resolve Assigned To
    const aKey = item.assignedTo || item.assigned_to;
    if (aKey) {
      const match = userMap[String(aKey).toLowerCase()] || userMap[String(aKey)];
      if (match) {
        item.assignedTo = match;
        item.assigned_to = match;
        item.assignedToName = match;
      }
    }
    // 2. Resolve Created By
    const cKey = item.createdBy || item.created_by;
    if (cKey) {
      const match = userMap[String(cKey).toLowerCase()] || userMap[String(cKey)];
      if (match) {
        item.createdBy = match;
        item.created_by = match;
        item.createdByName = match;
      }
    }
    // 3. Fallback: if createdBy is still a hex ID and assignedTo has a readable name, use assignedTo
    if (item.createdBy && item.createdBy.length === 24 && /^[0-9a-fA-F]+$/.test(item.createdBy) && item.assignedTo && !/^[0-9a-fA-F]{24}$/.test(item.assignedTo)) {
      item.createdBy = item.assignedTo;
      item.created_by = item.assignedTo;
    }

    // 4. Enrich from Linked Contact
    const cId = item.contact_id || item.contactId;
    const contact = cId ? contactMap[String(cId)] : null;
    if (contact) {
      const phone = contact.contact_number || contact.contactNumber || contact.phone || '';
      if (!item.contact_number && !item.contactNumber) {
        item.contact_number = phone;
        item.contactNumber = phone;
      }
      if (!item.customer_name && !item.customerName) {
        const cName = contact.customer_name || contact.customerName || '';
        item.customer_name = cName;
        item.customerName = cName;
      }
      if (!item.project_name && !item.projectName) {
        const pName = contact.project_name || contact.projectName || '';
        item.project_name = pName;
        item.projectName = pName;
      }
      if (!item.location) {
        item.location = contact.location || '';
      }
      if (!item.stage) {
        item.stage = contact.stage || '';
      }
      if (!item.source) {
        item.source = contact.source || contact.lead_source || '';
      }
      if (!item.budget) {
        item.budget = contact.budget || '';
      }
      if (!item.contact_owner_email && !item.contactOwnerEmail) {
        const oEmail = contact.contact_owner_email || contact.contactOwnerEmail || '';
        item.contact_owner_email = oEmail;
        item.contactOwnerEmail = oEmail;
      }
    }

    // 5. Dual-case aliases for Task Type & Dates & Contact Number
    const tType = item.task_type || item.taskType || item.type || '';
    item.task_type = tType;
    item.taskType = tType;
    item.type = tType;

    const phone = item.contact_number || item.contactNumber || '';
    item.contact_number = phone;
    item.contactNumber = phone;

    const dDate = item.due_date || item.dueDate || item.next_follow_up || item.nextFollowUp;
    if (dDate) {
      item.due_date = dDate;
      item.dueDate = dDate;
      item.next_follow_up = dDate;
      item.nextFollowUp = dDate;
    }
  });
}

async function enrichOrganizationNames(Model, items) {
  if (!items || items.length === 0) return;
  const mongoose = require('mongoose');
  const Organization = mongoose.model('Organization');

  const orgKeys = [...new Set(items.map(item => item.organization_id || item.organizationId).filter(Boolean))];
  if (orgKeys.length === 0) return;

  const orgs = await Organization.find({
    $or: [
      { organization_id: { $in: orgKeys } },
      { _id: { $in: orgKeys.filter(k => mongoose.Types.ObjectId.isValid(k)) } }
    ]
  }).lean().exec();

  const orgMap = {};
  orgs.forEach(o => {
    const name = o.organization_name || o.organizationName || o.name || '';
    orgMap[String(o.organization_id || o.organizationId)] = name;
    orgMap[String(o._id)] = name;
  });

  items.forEach(item => {
    const orgIdVal = item.organization_id || item.organizationId;
    if (orgIdVal) {
      const lookup = String(orgIdVal);
      if (orgMap[lookup]) {
        item.organization_id = orgMap[lookup];
      }
    }
  });
}

function buildController({
  Model,
  resourceName,
  searchKeys = ['name'],
  // Sort fields the API will accept; everything else falls back to createdAt.
  allowedSort = ['createdAt', 'updatedAt'],
}) {
  const ALLOWED_SORT = new Set(allowedSort);

  function isSuperAdmin(authedUser) {
    return authedUser?.role === 'superAdmin';
  }

  function resolveTenantFilter(authedUser, requestedIndustry, requestedOrganization) {
    const filter = {};
    if (isSuperAdmin(authedUser)) {
      if (requestedOrganization && requestedOrganization !== 'all') {
        filter.organization_id = requestedOrganization;
      } else if (requestedIndustry && requestedIndustry !== 'all') {
        filter.industry_id = requestedIndustry;
      }
    } else {
      if (authedUser?.industryId) filter.industry_id = authedUser.industryId;
      if (authedUser?.organizationId) filter.organization_id = authedUser.organizationId;
    }
    return filter;
  }

  async function list(req, res, next) {
    try {
      const filter = resolveTenantFilter(req.user, req.query.industryId, req.query.organizationId);
      Object.keys(req.query).forEach((key) => {
        if (['page', 'pageSize', 'sortField', 'sortDir', 'q', 'industryId', 'organizationId'].includes(key)) return;
        let targetKey = key;
        if (Model.schema.paths[key]) {
          targetKey = key;
        } else {
          // Check snake_case version
          const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          if (Model.schema.paths[snake]) {
            targetKey = snake;
          }
        }
        if (Model.schema.paths[targetKey]) {
          filter[targetKey] = req.query[key];
        }
      });
      const q = (req.query.q || '').toString().trim();
      if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = searchKeys.map((k) => ({ [k]: re }));
      }
      const sortField = ALLOWED_SORT.has(req.query.sortField) ? req.query.sortField : 'createdAt';
      const dir = req.query.sortDir === 'asc' ? 1 : -1;
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 200);
      const page = Math.max(Number(req.query.page) || 0, 0);

      const [items, total] = await Promise.all([
        Model.find(filter)
          .sort({ [sortField]: dir })
          .skip(page * pageSize)
          .limit(pageSize)
          .lean()
          .exec(),
        Model.countDocuments(filter).exec(),
      ]);

      await enrichTasks(Model, items);
      await enrichOrganizationNames(Model, items);
      res.json({ items: mapWithDualCase(items), total });
    } catch (err) { next(err); }
  }

  async function getOne(req, res, next) {
    try {
      const doc = await Model.findById(req.params.id).lean().exec();
      if (!doc) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user)) {
        const docOrgId = doc.organization_id || doc.organizationId;
        const docIndustryId = doc.industry_id || doc.industryId;
        if (docOrgId && String(docOrgId) !== String(req.user?.organizationId)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        if (!docOrgId && docIndustryId !== req.user?.industryId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      await enrichTasks(Model, [doc]);
      await enrichOrganizationNames(Model, [doc]);
      res.json(withDualCase(doc));
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const payload = normalizePayload({ ...(req.body || {}) });
      if (isSuperAdmin(req.user)) {
        payload.industry_id = payload.industry_id || payload.industryId || req.user?.industryId;
      } else {
        payload.industry_id = req.user?.industryId;
      }
      if (!payload.created_by) {
        payload.created_by = req.user?.name || req.user?.email || req.user?.id;
      }
      if (req.user?.organizationId) {
        payload.organization_id = String(req.user.organizationId);
      }
      if (req.user?.uid) {
        payload.uid = String(req.user.uid);
      }
      const doc = await Model.create(payload);
      const docObj = doc.toObject();

      if (resourceName === 'Task') {
        try {
          const assignedUserEmail = doc.assignedTo || doc.contactOwnerEmail;
          const mongoose = require('mongoose');
          let targetUserId = doc.uid;
          if (!targetUserId && assignedUserEmail) {
            const userObj = await mongoose.model('User').findOne({ email: assignedUserEmail }).exec();
            if (userObj) targetUserId = userObj._id || userObj.uid;
          }
          if (targetUserId) {
            const { createNotification } = require('./notificationService');
            await createNotification({
              userId: targetUserId,
              organizationId: doc.organization_id || req.user?.organizationId,
              workspaceId: doc.workspaceId || doc.workspace_id || null,
              title: 'New Task Assigned',
              message: `A new task "${doc.title || doc.name || 'Task Details'}" has been assigned to you. Due date: ${doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A'}.`,
              type: 'TASK_ASSIGNED',
              relatedId: doc._id
            });
          }
        } catch (nErr) {
          console.error('[Notification] Failed to create task assignment notification:', nErr);
        }
      }

      await enrichTasks(Model, [docObj]);
      res.status(201).json(withDualCase(docObj));
    } catch (err) { next(err); }
  }

  async function update(req, res, next) {
    try {
      const existing = await Model.findById(req.params.id).lean().exec();
      if (!existing) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user)) {
        const existingOrgId = existing.organization_id || existing.organizationId;
        const existingIndustryId = existing.industry_id || existing.industryId;
        if (existingOrgId && String(existingOrgId) !== String(req.user?.organizationId)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        if (!existingOrgId && existingIndustryId !== req.user?.industryId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      const patch = normalizePayload({ ...(req.body || {}) });
      delete patch._id;
      delete patch.id;
      delete patch.__v;
      if (!isSuperAdmin(req.user)) {
        delete patch.industry_id;
        delete patch.industryId;
      }
      delete patch.created_by;
      delete patch.createdBy;
      delete patch.created_at;
      delete patch.createdAt;
      const updated = await Model.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true })
        .lean()
        .exec();
      await enrichTasks(Model, [updated]);
      res.json(withDualCase(updated));
    } catch (err) { next(err); }
  }

  async function remove(req, res, next) {
    try {
      const existing = await Model.findById(req.params.id).lean().exec();
      if (!existing) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user)) {
        const existingOrgId = existing.organization_id || existing.organizationId;
        const existingIndustryId = existing.industry_id || existing.industryId;
        if (existingOrgId && String(existingOrgId) !== String(req.user?.organizationId)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        if (!existingOrgId && existingIndustryId !== req.user?.industryId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      await Model.findByIdAndDelete(req.params.id).exec();
      res.status(204).end();
    } catch (err) { next(err); }
  }

  return { list, getOne, create, update, remove };
}

function buildRouter(controller, { authenticate, screenKey }) {
  const express = require('express');
  const router = express.Router();
  const { requireScreenAction } = require('../middlewares/screenAction');

  if (screenKey) {
    router.get('/', authenticate, requireScreenAction(screenKey, 'view'), controller.list);
    router.get('/:id', authenticate, requireScreenAction(screenKey, 'view'), controller.getOne);
    router.post('/', authenticate, requireScreenAction(screenKey, 'add'), controller.create);
    router.put('/:id', authenticate, requireScreenAction(screenKey, 'edit'), controller.update);
    router.delete('/:id', authenticate, requireScreenAction(screenKey, 'delete'), controller.remove);
  } else {
    router.get('/', authenticate, controller.list);
    router.get('/:id', authenticate, controller.getOne);
    router.post('/', authenticate, controller.create);
    router.put('/:id', authenticate, controller.update);
    router.delete('/:id', authenticate, controller.remove);
  }
  return router;
}

module.exports = { buildController, buildRouter, convertKeysToCamelCase, normalizePayload };
