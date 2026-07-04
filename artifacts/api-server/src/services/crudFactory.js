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

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Resolves the industry filter the caller is allowed to see.
  // Super-admin: pass any industryId explicitly, or omit it to see all.
  // Everyone else: pinned to their own industry regardless of input.
  function resolveTenantFilter(authedUser, requested) {
    if (isSuperAdmin(authedUser)) {
      if (requested) return { industryId: requested };
      return {};
    }
    return authedUser?.industryId ? { industryId: authedUser.industryId } : { industryId: '__none__' };
  }

  async function list(req, res, next) {
    try {
      const filter = resolveTenantFilter(req.user, req.query.industryId);
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
      res.json({ items, total });
    } catch (err) { next(err); }
  }

  async function getOne(req, res, next) {
    try {
      const doc = await Model.findById(req.params.id).lean().exec();
      if (!doc) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user) && doc.industryId !== req.user?.industryId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.json(doc);
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const payload = { ...(req.body || {}) };
      // Tenant + ownership stamping. Super-admin may override industryId;
      // everyone else is pinned to their own.
      payload.industryId = isSuperAdmin(req.user)
        ? payload.industryId || req.user?.industryId
        : req.user?.industryId;
      payload.createdBy = req.user?.id;
      const doc = await Model.create(payload);
      res.status(201).json(doc.toObject());
    } catch (err) { next(err); }
  }

  async function update(req, res, next) {
    try {
      const existing = await Model.findById(req.params.id).lean().exec();
      if (!existing) return res.status(404).json({ message: `${resourceName} not found` });
      if (!isSuperAdmin(req.user) && existing.industryId !== req.user?.industryId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const patch = { ...(req.body || {}) };
      // Don't let a non-super-admin reparent the row to another tenant.
      if (!isSuperAdmin(req.user)) delete patch.industryId;
      delete patch.createdBy;
      delete patch.createdAt;
      const updated = await Model.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true })
        .lean()
        .exec();
      res.json(updated);
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

module.exports = { buildController, buildRouter };
