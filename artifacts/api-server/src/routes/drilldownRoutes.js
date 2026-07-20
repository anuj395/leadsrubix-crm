const express = require('express');
const mongoose = require('mongoose');
const { Contact: leadModel } = require('../models/contactModel');
const { Task: taskModel } = require('../models/taskModel');
const { CallLog: callLogModel } = require('../models/callLogModel');
const { User: userModel } = require('../models/userModel');
const { Organization } = require('../models/organizationModel');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Helper to check if object is empty
const isObjectEmpty = (obj) => !obj || Object.keys(obj).length === 0;

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

// 1. Leads / Contacts Drilldown endpoints
router.post('/leads/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, leadFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      // Map industryId to organizationId if needed
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (leadFilter) {
      for (const [key, value] of Object.entries(leadFilter)) {
        let dbKey = key;
        if (key === 'created_at' || key === 'createdAt') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
          continue;
        } else if (key === 'lead_source') {
          dbKey = 'source';
        } else if (key === 'contact_owner_email') {
          dbKey = 'contactOwnerEmail';
        } else if (key === 'source_status') {
          dbKey = 'sourceStatus';
        } else if (key === 'associate_status') {
          dbKey = 'associateStatus';
        } else if (key === 'transfer_status') {
          dbKey = 'transferStatus';
        }

        if (Array.isArray(value) && value.length > 0) {
          query[dbKey] = { $in: value };
        }
      }
    }

    // Scoping permissions by role
    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }
    // For admin / superAdmin, we don't append query.uid so they see all records in organizationId

    console.log('drillDownSearch body:', JSON.stringify(req.body, null, 2));
    console.log('drillDownSearch built query:', JSON.stringify(query, null, 2));

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
    next(err);
  }
});

router.post('/leads/contacttotalcount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, leadFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (leadFilter) {
      for (const [key, value] of Object.entries(leadFilter)) {
        if (key === 'created_at') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
        } else if (Array.isArray(value) && value.length > 0) {
          query[key] = { $in: value };
        }
      }
    }

    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }

    const total = await leadModel.countDocuments(query).exec();
    res.json({ total });
  } catch (err) {
    next(err);
  }
});

// 2. Tasks Drilldown endpoints
router.post('/tasks/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, taskFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (taskFilter) {
      for (const [key, value] of Object.entries(taskFilter)) {
        let dbKey = key;
        if (key === 'created_at' || key === 'createdAt') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
          continue;
        } else if (key === 'task_type') {
          dbKey = 'taskType';
        } else if (key === 'assigned_to') {
          dbKey = 'assignedTo';
        } else if (key === 'due_date') {
          dbKey = 'dueDate';
        } else if (key === 'project_name') {
          dbKey = 'projectName';
        } else if (key === 'contact_owner_email') {
          dbKey = 'contactOwnerEmail';
        }

        if (Array.isArray(value) && value.length > 0) {
          query[dbKey] = { $in: value };
        }
      }
    }

    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }

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
    next(err);
  }
});

router.post('/tasks/drillDownCount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, taskFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (taskFilter) {
      for (const [key, value] of Object.entries(taskFilter)) {
        if (key === 'created_at') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
        } else if (Array.isArray(value) && value.length > 0) {
          query[key] = { $in: value };
        }
      }
    }

    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }

    const total = await taskModel.countDocuments(query).exec();
    res.json([{ total }]);
  } catch (err) {
    next(err);
  }
});

// 3. Call Logs Drilldown endpoints
router.post('/callLogs/drillDownSearch', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, page, pageSize, callFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (callFilter) {
      for (const [key, value] of Object.entries(callFilter)) {
        if (key === 'created_at') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
        } else if (Array.isArray(value) && value.length > 0) {
          query[key] = { $in: value };
        }
      }
    }

    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }

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
    next(err);
  }
});

router.post('/callLogs/callLogsDrillDownCount', authenticate, async (req, res, next) => {
  try {
    const { uid, organizationid, callFilter, role } = req.body;
    const query = {};

    if (organizationid) {
      const org = await Organization.findOne({
        $or: [
          { industryId: organizationid },
          { organizationId: organizationid }
        ]
      }).lean().exec();
      query.organizationId = org ? org.organizationId : organizationid;
    }

    if (callFilter) {
      for (const [key, value] of Object.entries(callFilter)) {
        if (key === 'created_at') {
          query.createdAt = {};
          if (value.start_date) query.createdAt.$gte = new Date(value.start_date);
          if (value.end_date) query.createdAt.$lte = new Date(value.end_date);
        } else if (Array.isArray(value) && value.length > 0) {
          query[key] = { $in: value };
        }
      }
    }

    const dbUser = await userModel.findOne({ $or: [{ _id: mongoose.isValidObjectId(uid) ? uid : null }, { uid }] }).lean().exec();
    const userRole = dbUser?.role || '';

    if (userRole === 'sales' || userRole === 'associate') {
      query.uid = dbUser?.uid || uid;
    } else if (userRole === 'teamLead') {
      const usersList = await getTeamUsers(uid, query.organizationId);
      query.uid = { $in: usersList };
    }

    const total = await callLogModel.countDocuments(query).exec();
    res.json([{ total }]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
