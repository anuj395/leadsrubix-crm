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
  if (Model.modelName !== 'Task' || !items || items.length === 0) return;
  const mongoose = require('mongoose');
  const User = mongoose.model('User');
  const Contact = mongoose.model('Contact');

  const keys = [...new Set(items.map(item => item.assignedTo).filter(Boolean))];
  const userMap = {};
  if (keys.length > 0) {
    const users = await User.find({
      $or: [
        { _id: { $in: keys.filter(k => mongoose.Types.ObjectId.isValid(k)) } },
        { email: { $in: keys } },
        { uid: { $in: keys } }
      ]
    }).lean().exec();

    users.forEach(u => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
      userMap[String(u._id)] = fullName;
      if (u.email) userMap[String(u.email).toLowerCase()] = fullName;
      if (u.uid) userMap[String(u.uid)] = fullName;
    });
  }

  const contactIds = [...new Set(items.map(item => item.contactId).filter(Boolean))];
  const contactMap = {};
  if (contactIds.length > 0) {
    const contacts = await Contact.find({
      _id: { $in: contactIds.filter(id => mongoose.Types.ObjectId.isValid(id)) }
    }).lean().exec();

    contacts.forEach(c => {
      contactMap[String(c._id)] = c.contactNumber || c.contact_no || '';
    });
  }

  items.forEach(item => {
    if (item.assignedTo) {
      const lookupKey = String(item.assignedTo).toLowerCase();
      if (userMap[lookupKey]) {
        item.assignedTo = userMap[lookupKey];
      } else if (userMap[String(item.assignedTo)]) {
        item.assignedTo = userMap[String(item.assignedTo)];
      }
    }
    if (item.contactId) {
      const lookupContactId = String(item.contactId);
      if (contactMap[lookupContactId]) {
        item.contactNumber = contactMap[lookupContactId];
      }
    }
  });
}

async function enrichOrganizationNames(Model, items) {
  if (!items || items.length === 0) return;
  const mongoose = require('mongoose');
  const Organization = mongoose.model('Organization');

  const orgKeys = [...new Set(items.map(item => item.organizationId).filter(Boolean))];
  if (orgKeys.length === 0) return;

  const orgs = await Organization.find({
    $or: [
      { organizationId: { $in: orgKeys } },
      { _id: { $in: orgKeys.filter(k => mongoose.Types.ObjectId.isValid(k)) } }
    ]
  }).lean().exec();

  const orgMap = {};
  orgs.forEach(o => {
    const name = o.name || o.organizationName || '';
    orgMap[String(o.organizationId)] = name;
    orgMap[String(o._id)] = name;
  });

  items.forEach(item => {
    if (item.organizationId) {
      const lookup = String(item.organizationId);
      if (orgMap[lookup]) {
        item.organizationId = orgMap[lookup];
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

  function resolveTenantFilter(authedUser, requested) {
    if (isSuperAdmin(authedUser)) {
      if (requested) return { industry_id: requested };
      return {};
    }
    return authedUser?.industryId ? { industry_id: authedUser.industryId } : { industry_id: '__none__' };
  }

  async function list(req, res, next) {
    try {
      const filter = resolveTenantFilter(req.user, req.query.industryId);
      Object.keys(req.query).forEach((key) => {
        if (['page', 'pageSize', 'sortField', 'sortDir', 'q', 'industryId'].includes(key)) return;
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
      res.json({ items: convertKeysToCamelCase(items), total });
    } catch (err) { next(err); }
  }

  async function getOne(req, res, next) {
    try {
      const doc = await Model.findById(req.params.id).lean().exec();
      if (!doc) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user) && doc.industryId !== req.user?.industryId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      await enrichTasks(Model, [doc]);
      await enrichOrganizationNames(Model, [doc]);
      res.json(convertKeysToCamelCase(doc));
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const payload = normalizePayload({ ...(req.body || {}) });
      // Tenant + ownership stamping. Super-admin may override industryId;
      // everyone else is pinned to their own.
      if (isSuperAdmin(req.user)) {
        payload.industry_id = payload.industry_id || payload.industryId || req.user?.industryId;
      } else {
        payload.industry_id = req.user?.industryId;
      }
      payload.created_by = req.user?.id;
      if (req.user?.organizationId) {
        payload.organization_id = String(req.user.organizationId);
      }
      if (req.user?.uid) {
        payload.uid = String(req.user.uid);
      }
      const doc = await Model.create(payload);
      const docObj = doc.toObject();
      await enrichTasks(Model, [docObj]);
      res.status(201).json(convertKeysToCamelCase(docObj));
    } catch (err) { next(err); }
  }

  async function update(req, res, next) {
    try {
      const existing = await Model.findById(req.params.id).lean().exec();
      if (!existing) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user) && existing.industry_id !== req.user?.industryId && existing.industryId !== req.user?.industryId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const patch = normalizePayload({ ...(req.body || {}) });
      // Don't let a non-super-admin reparent the row to another tenant.
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
      res.json(convertKeysToCamelCase(updated));
    } catch (err) { next(err); }
  }

  async function remove(req, res, next) {
    try {
      const existing = await Model.findById(req.params.id).lean().exec();
      if (!existing) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user) && existing.industryId !== req.user?.industryId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      await Model.findByIdAndDelete(req.params.id).exec();
      res.status(204).end();
    } catch (err) { next(err); }
  }

  return { list, getOne, create, update, remove };
}

function buildRouter(controller, { authenticate }) {
  const express = require('express');
  const router = express.Router();
  router.get('/', authenticate, controller.list);
  router.get('/:id', authenticate, controller.getOne);
  router.post('/', authenticate, controller.create);
  router.put('/:id', authenticate, controller.update);
  router.delete('/:id', authenticate, controller.remove);
  return router;
}

module.exports = { buildController, buildRouter, convertKeysToCamelCase, normalizePayload };
