const express = require('express');
const mongoose = require('mongoose');
const { Contact: leadModel } = require('../models/contactModel');
const { Task: taskModel } = require('../models/taskModel');
const { CallLog: callLogModel } = require('../models/callLogModel');
const { User: userModel } = require('../models/userModel');
const { Organization } = require('../models/organizationModel');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Resolve children reporting team users
const getTeamUsers = async (uid, organizationId) => {
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const baseUser = await userModel.findOne(userQuery);
  const orgId = organizationId || baseUser?.organizationId;

  const users = await userModel.find({ organizationId: orgId }).lean().exec();
  const targetUser = users.find((u) => String(u.uid) === String(uid) || String(u._id) === String(uid));
  if (!targetUser) return [uid];

  let reportingToMap = {};
  let usersList = [targetUser.uid || String(targetUser._id)];

  users.forEach((item) => {
    const rep = item.reportingTo || "";
    if (rep === "") return;
    if (reportingToMap[rep]) {
      reportingToMap[rep].push({
        user_email: item.email || item.user_email,
        uid: item.uid || String(item._id),
      });
    } else {
      reportingToMap[rep] = [
        { user_email: item.email || item.user_email, uid: item.uid || String(item._id) },
      ];
    }
  });

  const createUsersList = (email, data) => {
    if (data[email] === undefined) {
      return;
    } else {
      data[email].forEach((user) => {
        if (usersList.includes(user.uid)) {
          return;
        }
        usersList.push(user.uid);
        createUsersList(user.user_email, data);
      });
    }
  };

  createUsersList(targetUser.email, reportingToMap);
  return usersList;
};

// Helper builder to build the tenant-scoped query
const buildDrilldownQuery = async (req, bodyUid, bodyOrgId, filters, isLead, isTask) => {
  const query = {};

  // 1. Resolve and lock Organization ID
  let orgId = bodyOrgId || req.body.organizationId;
  if (req.user?.role !== 'superAdmin') {
    orgId = req.user?.organizationId;
  } else if (orgId) {
    const org = await Organization.findOne({
      $or: [
        { industryId: orgId },
        { organizationId: orgId }
      ]
    }).lean().exec();
    orgId = org ? org.organizationId : orgId;
  }

  if (orgId) {
    query.organization_id = orgId;
  }

  // 2. Resolve target user and validate tenant isolation
  const targetUid = bodyUid || req.user?.uid || req.user?.id;
  const dbUser = await userModel.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(targetUid) ? targetUid : null },
      { uid: targetUid }
    ]
  }).lean().exec();

  if (req.user?.role !== 'superAdmin') {
    if (dbUser && String(dbUser.organization_id || dbUser.organizationId) !== String(req.user?.organizationId)) {
      const err = new Error('Forbidden: User does not belong to your organization');
      err.status = 403;
      throw err;
    }
  }

  // 3. Apply role-based uid filtering
  const callerRole = req.user?.role || '';
  if (callerRole === 'sales' || callerRole === 'associate') {
    query.uid = req.user?.uid || req.user?.id;
  } else if (callerRole === 'teamLead') {
    const usersList = await getTeamUsers(req.user?.uid || req.user?.id, orgId);
    query.uid = { $in: usersList };
  } else {
    // For admin / superAdmin callers:
    const targetUserRole = dbUser?.role || '';
    if (targetUserRole === 'sales' || targetUserRole === 'associate') {
      query.uid = dbUser?.uid || targetUid;
    } else if (targetUserRole === 'teamLead') {
      const usersList = await getTeamUsers(targetUid, orgId);
      query.uid = { $in: usersList };
    }
  }

  // 4. Map filters
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      let dbKey = key;
      if (key === 'created_at' || key === 'createdAt') {
        query.createdAt = {};
        const start = value.startDate || value.start_date;
        const end = value.endDate || value.end_date;
        if (start) query.createdAt.$gte = new Date(start);
        if (end) query.createdAt.$lte = new Date(end);
        continue;
      }

      if (isLead) {
        if (key === 'lead_source') dbKey = 'source';
        else if (key === 'contact_owner_email') dbKey = 'contactOwnerEmail';
        else if (key === 'source_status') dbKey = 'sourceStatus';
        else if (key === 'associate_status') dbKey = 'associateStatus';
        else if (key === 'transfer_status') dbKey = 'transferStatus';
      } else if (isTask) {
        if (key === 'task_type') dbKey = 'taskType';
        else if (key === 'assigned_to') dbKey = 'assignedTo';
        else if (key === 'due_date') dbKey = 'dueDate';
        else if (key === 'project_name') dbKey = 'projectName';
        else if (key === 'contact_owner_email') dbKey = 'contactOwnerEmail';
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          query[dbKey] = { $in: value };
        }
      } else if (value !== undefined && value !== null && value !== '') {
        query[dbKey] = value;
      }
    }
  }

  return query;
};

// 1. Leads / Contacts Drilldown endpoints
router.post('/leads/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, leadFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, leadFilter, true, false);

    const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
    const skip = Math.max((Number(page) - 1) || 0, 0) * limit;

    const items = await leadModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    res.json(items);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

router.post('/leads/contacttotalcount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, leadFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, leadFilter, true, false);

    const total = await leadModel.countDocuments(query).exec();
    res.json({ total });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

// 2. Tasks Drilldown endpoints
router.post('/tasks/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, taskFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, taskFilter, false, true);

    const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
    const skip = Math.max((Number(page) - 1) || 0, 0) * limit;

    const items = await taskModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Map user names
    const enriched = await Promise.all(items.map(async (item) => {
      if (item.assignedTo) {
        const u = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(item.assignedTo) ? item.assignedTo : null }, { uid: item.assignedTo }] }).select('name').lean().exec();
        if (u) item.assignedToName = u.name;
      }
      return item;
    }));

    res.json(enriched);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

router.post('/tasks/drillDownCount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, taskFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, taskFilter, false, true);

    const total = await taskModel.countDocuments(query).exec();
    res.json([{ total }]);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

// 3. Call Logs Drilldown endpoints
router.post('/callLogs/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, callFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, callFilter, false, false);

    const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
    const skip = Math.max((Number(page) - 1) || 0, 0) * limit;

    const items = await callLogModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    res.json(items);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

router.post('/callLogs/callLogsDrillDownCount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, callFilter } = req.body;
    const query = await buildDrilldownQuery(req, uid, organizationid, callFilter, false, false);

    const total = await callLogModel.countDocuments(query).exec();
    res.json([{ total }]);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

module.exports = router;
