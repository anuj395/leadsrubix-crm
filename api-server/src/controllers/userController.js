// src/controllers/userController.js
const userService = require('../services/userService');
const { listManagerCandidates, MANAGER_OF } = require('../services/userHierarchyService');

/**
 * GET /api/users/managers?profile=<role>&industryId=<id>
 * Returns the candidate managers for a user with the given role, used to
 * populate the `reporting_to` dropdown on the user create/edit form.
 * Tenant-scoped: non-superAdmins are pinned to their own industry.
 */
exports.getManagerCandidates = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const role = req.query.profile || req.query.role;
    if (!role || !MANAGER_OF[role]) {
      return res.json({ items: [] });
    }
    const industryId =
      req.user?.role === 'superAdmin'
        ? req.query.industryId || req.user?.industryId
        : req.user?.industryId;
    const organizationId = req.user?.role !== 'superAdmin' ? req.user?.organizationId : undefined;
    const items = await listManagerCandidates({ role, industryId, organizationId });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    // Paged mode kicks in when ANY of the pagination params are present so old
    // callers that just fetch the array keep working untouched.
    const isPaged =
      req.query.page !== undefined ||
      req.query.pageSize !== undefined ||
      req.query.q !== undefined ||
      req.query.sortField !== undefined;

    if (isPaged) {
      const { items, total } = await userService.fetchPaged({
        authedUser: req.user,
        industryId: req.query.industryId,
        organizationId: req.query.organizationId,
        q: req.query.q,
        page: req.query.page,
        pageSize: req.query.pageSize,
        sortField: req.query.sortField,
        sortDir: req.query.sortDir,
      });
      return res.json({ items, total });
    }

    const items = await userService.fetchAll({
      authedUser: req.user,
      industryId: req.query.industryId,
      organizationId: req.query.organizationId,
      includeAdmin: req.query.includeAdmin === 'true',
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.fetchById({ id: req.params.id, authedUser: req.user });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const created = await userService.create({ payload: req.body, authedUser: req.user });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const updated = await userService.update({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await userService.remove({ id: req.params.id, authedUser: req.user });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.changePasswordByEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await userService.changePasswordByEmail({
      email,
      password,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
