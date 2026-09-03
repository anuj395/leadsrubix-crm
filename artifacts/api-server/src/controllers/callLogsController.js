const { CallLog } = require('../models/callLogModel');
const { User } = require('../models/userModel');
const { Organization } = require('../models/organizationModel');
const moment = require('moment');
const mongoose = require('mongoose');
const { convertKeysToCamelCase } = require('../services/crudFactory');

function translateFilterKeys(filter) {
  if (!filter || typeof filter !== 'object') return filter;
  const camelToSnake = (s) => s.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const out = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith('$')) {
      out[k] = Array.isArray(v) ? v.map(translateFilterKeys) : translateFilterKeys(v);
      continue;
    }
    const snakeKey = k.includes('_') ? k : camelToSnake(k);
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp)) {
      out[snakeKey] = translateFilterKeys(v);
    } else {
      out[snakeKey] = v;
    }
  }
  return out;
}

async function applyCallLogTenantFilter(user, filter, industryId, organizationId) {
  const isSuperAdmin = user?.role === 'superAdmin';
  if (isSuperAdmin) {
    if (organizationId && organizationId !== 'all') {
      filter.$or = [
        { organizationId: organizationId },
        { organization_id: organizationId }
      ];
    } else if (industryId && industryId !== 'all') {
      const Industry = mongoose.model('Industry');
      const Organization = mongoose.model('Organization');
      let industryDoc = null;
      if (mongoose.Types.ObjectId.isValid(industryId)) {
        industryDoc = await Industry.findById(industryId).lean().exec();
      } else {
        industryDoc = await Industry.findOne({ code: industryId }).lean().exec();
      }
      if (industryDoc) {
        const indIdStr = String(industryDoc._id);
        const indCode = industryDoc.code;
        const orgDocs = await Organization.find({
          $or: [
            { industryId: indIdStr },
            { industry_id: indIdStr },
            { industryId: indCode },
            { industry_id: indCode },
            { industryCode: indCode },
            { industry_code: indCode }
          ]
        }).lean().exec();
        const orgIds = orgDocs.map(o => o.organizationId || o.organization_id || String(o._id)).filter(Boolean);
        filter.$or = [
          { organizationId: { $in: orgIds } },
          { organization_id: { $in: orgIds } },
          { industryId: indIdStr },
          { industry_id: indIdStr },
          { industryId: indCode },
          { industry_id: indCode }
        ];
      }
    }
  } else {
    if (user?.organizationId) {
      filter.$or = [
        { organizationId: user.organizationId },
        { organization_id: user.organizationId }
      ];
    }
  }
}

function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

function maskEmail(email) {
  if (!email) return '';
  const parts = String(email).split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return '*'.repeat(name.length) + '@' + domain;
  return name.slice(0, 2) + '*'.repeat(name.length - 2) + '@' + domain;
}

const datesField = [
  'createdAt',
  'nextFollowUpDateTime',
  'stageChangeAt',
  'modifiedAt',
  'leadAssignTime',
  'completedAt',
  'dueDate',
];

const isObjectEmpty = (object) => {
  if (!object) return true;
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      return false;
    }
  }
  return true;
};

const booleanField = ['associateStatus', 'sourceStatus', 'transferStatus'];

// for lead manager profile having branches
const getBranchUsers = async (uid, organizationId, permission) => {
  const users = await User.find({
    organization_id: organizationId,
    branch: { $in: permission },
  });
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

// to get all the users under a certain user
const getTeamUsers = async (uid, organizationId) => {
  const users = await User.find({ organization_id: organizationId });
  const user = users.filter((u) => u.uid === uid);
  if (user.length === 0) return [uid];
  let reportingToMap = {};
  let usersList = [user[0].uid];

  users.forEach((item) => {
    const reportingTo = item.reportingTo || '';
    if (reportingTo === '') {
      return;
    }
    if (reportingToMap[reportingTo]) {
      reportingToMap[reportingTo].push({
        email: item.email,
        uid: item.uid,
      });
    } else {
      reportingToMap[reportingTo] = [
        { email: item.email, uid: item.uid },
      ];
    }
  });

  const createUsersList = (email, data) => {
    if (data[email] === undefined) {
      return;
    } else {
      data[email].forEach((u) => {
        if (usersList.includes(u.uid)) {
          return;
        }
        usersList.push(u.uid);
        createUsersList(u.email, data);
      });
    }
  };

  createUsersList(user[0].email, reportingToMap);

  return usersList;
};

const mapSeconds = (time) => {
  if (!time) return 0;
  var a = String(time).split(':');
  var seconds = 0;
  if (a.length === 3) {
    seconds = 3600 * Number(a[0]) + 60 * Number(a[1]) + Number(a[2]);
  } else if (a.length === 2) {
    seconds = 60 * Number(a[0]) + Number(a[1]);
  } else {
    seconds = Number(a[0]) || 0;
  }
  return seconds;
};

const getOrganizationName = async (organizationId) => {
  try {
    const organization = await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        ...(mongoose.Types.ObjectId.isValid(organizationId) ? [{ _id: organizationId }] : [])
      ]
    });
    return organization ? (organization.name || organization.organizationName || '') : "Unknown Organization";
  } catch (error) {
    console.error("Error fetching organization name:", error);
    return "Unknown Organization";
  }
};

const callLogController = {};

callLogController.Create = async (req, res) => {
  try {
    const uid = req.body.uid || req.user?.uid || req.user?._id || req.user?.id || '';
    let user = null;
    if (uid) {
      const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
      user = await User.findOne(userQuery);
    }
    let createdBy = '';
    if (user) {
      createdBy = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email;
    }
    if (!createdBy && req.user) {
      createdBy = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.name || req.user.email;
    }
    if (!createdBy) {
      createdBy = req.body.created_by || req.body.createdBy || req.body.agent || 'Sales Agent';
    }

    const orgId = req.user?.role === 'superAdmin'
      ? (req.body.organizationId || req.body.organization_id || req.user?.organizationId || '')
      : (req.user?.organizationId || req.body.organizationId || req.body.organization_id || (user ? user.organizationId : ''));

    const indId = req.body.industryId || req.body.industry_id || req.user?.industryId || '';

    let durationSeconds = 0;
    if (typeof req.body.duration === 'number') {
      durationSeconds = req.body.duration;
    } else if (typeof req.body.duration === 'string' && req.body.duration.includes(':')) {
      durationSeconds = mapSeconds(req.body.duration);
    } else if (req.body.duration) {
      durationSeconds = Number(req.body.duration) || 0;
    } else if (req.body.callTime || req.body.call_time) {
      durationSeconds = mapSeconds(req.body.callTime || req.body.call_time);
    }

    const data = new CallLog({
      contact_id: req.body.contactId || req.body.contact_id || null,
      lead_id: req.body.leadId || req.body.lead_id || '',
      customer_name: req.body.customerName || req.body.customer_name || req.body.buyerName || req.body.name || 'Contact',
      contact_number: req.body.contactNumber || req.body.contact_number || req.body.contact_no || req.body.phone || req.body.phoneNumber || '',
      stage: req.body.stage || req.body.status || req.body.outcome || 'Answered',
      contact_owner_email: req.body.contactOwnerEmail || req.body.contact_owner_email || req.user?.email || '',
      location: req.body.location || '',
      project_name: req.body.projectName || req.body.project_name || req.body.project || '',
      budget: req.body.budget || '',
      transfer_status: req.body.transferStatus || req.body.transfer_status || false,
      created_by: createdBy,
      details: req.body.details || req.body.notes || req.body.remark || req.body.callSummary || '',
      source: req.body.source || req.body.lead_source || '',
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : new Date(),
      type: req.body.type || req.body.direction || 'Outbound',
      inventory_type: req.body.inventoryType || req.body.inventory_type || '',
      duration: durationSeconds,
      uid: uid || '',
      industry_id: indId,
      organization_id: orgId || '',
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null
    });
    await data.save();
    res.status(201).json({ message: 'Call log created successfully', data });
  } catch (error) {
    console.error("Error in CallLog.Create:", error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.Update = async (req, res) => {
  try {
    const leadId = req.body.leadId;
    const query = { lead_id: leadId };
    if (req.user?.role !== 'superAdmin') {
      const uOrg = req.user?.organizationId || req.user?.organization_id;
      query.$or = [{ organization_id: uOrg }, { organizationId: uOrg }];
    }
    await CallLog.updateMany(query, { $set: translateFilterKeys(req.body) }).exec();
    res.status(200).send('Updation DONE!');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

callLogController.DeleteCallLogs = async (req, res) => {
  try {
    const leadId = req.body.leadId;
    const query = { lead_id: leadId };
    if (req.user?.role !== 'superAdmin') {
      const uOrg = req.user?.organizationId || req.user?.organization_id;
      query.$or = [{ organization_id: uOrg }, { organizationId: uOrg }];
    }
    await CallLog.findOneAndDelete(query).exec();
    res.status(200).send("Deletion DONE!");
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

callLogController.Search = async (req, res) => {
  try {
    const uid = req.body.uid;
    let filter = req.body.filter || {};
    await applyCallLogTenantFilter(req.user, filter, req.body.industryId, req.body.organizationId);
    const sort = req.body.sort || {};
    const missed = req.body.missed;
    const searchString = req.body.searchString ? req.body.searchString : '';
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;

    Object.keys(filter).forEach((key) => {
      if (datesField.includes(key)) {
        if (filter[key].length && filter[key].length === 2) {
          filter[key] = {
            $gte: new Date(filter[key][0]),
            $lte: new Date(filter[key][1]),
          };
        }
      } else if (booleanField.includes(key)) {
        filter[key].forEach((element, index) => {
          if (element === 'True') {
            filter[key][index] = true;
          } else if (element === 'False') {
            filter[key][index] = false;
          }
        });
      } else {
        filter[key] = { $in: filter[key] };
      }
    });

    if (missed === true) {
      filter['nextFollowUpDateTime'] = { $lt: new Date() };
    }

    let customer_name_list = [];
    let contact_list = [];

    if (searchString) {
      searchString.split(',').forEach((string) => {
        const search = string.trim();
        const re = new RegExp(search, 'i');
        if (search.match(/^[0-9]+$/) != null) {
          contact_list.push(re);
        } else if (search !== '') {
          customer_name_list.push(re);
        }
      });
    }

    if (contact_list.length !== 0) {
      filter['contactNumber'] = { $in: contact_list };
    }
    if (customer_name_list.length !== 0) {
      filter['customerName'] = { $in: customer_name_list };
    }

    let user = null;
    if (uid) {
      const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
      user = await User.findOne(userQuery);
    }
    if (!user && req.user) {
      user = req.user;
    }
    if (!user) {
      return res.status(401).send({ error: 'User Not Found or Not Authenticated' });
    }

    const role = user.role;
    const organizationId = user.organizationId || user.organization_id;

    const dbFilter = translateFilterKeys(filter);

    if (role === 'superAdmin') {
      const callLogs = await CallLog.find(dbFilter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      return res.send(convertKeysToCamelCase(callLogs));
    }

    const orgTenantCondition = {
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
      ],
    };

    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        const callLogs = await CallLog.find({ ...orgTenantCondition, ...dbFilter })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        res.send(convertKeysToCamelCase(callLogs));
      } else {
        let usersList = await getBranchUsers(user.uid || user._id || uid, organizationId, permission);
        const callLogs = await CallLog.find({ ...orgTenantCondition, uid: { $in: usersList }, ...dbFilter })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        res.send(convertKeysToCamelCase(callLogs));
      }
    } else if (role === 'teamLead') {
      let usersList = await getTeamUsers(user.uid || user._id || uid, organizationId);
      const callLogs = await CallLog.find({ ...orgTenantCondition, uid: { $in: usersList }, ...dbFilter })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(convertKeysToCamelCase(callLogs));
    } else {
      const callLogs = await CallLog.find({ ...orgTenantCondition, uid: user.uid || user._id || uid, ...dbFilter })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(convertKeysToCamelCase(callLogs));
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MasterSearch = async (req, res) => {
  try {
    let filter = req.body.filter || {};
    await applyCallLogTenantFilter(req.user, filter, req.body.industryId || req.query.industryId, req.body.organizationId || req.query.organizationId);
    const sort = req.body.sort || {};
    const missed = req.body.missed;
    const searchString = req.body.searchString ? req.body.searchString.trim() : "";
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;

    for (const key of Object.keys(filter)) {
      if (key === "organizationName") {
        const orgDocs = await Organization.find(
          { name: { $in: filter.organizationName } }
        );
        const orgIds = orgDocs.map((o) => o.organization_id || o.organizationId);
        filter.organizationId = { $in: orgIds };
        delete filter.organizationName;
      } else if (datesField.includes(key)) {
        if (Array.isArray(filter[key]) && filter[key].length === 2) {
          filter[key] = {
            $gte: new Date(filter[key][0]),
            $lte: new Date(filter[key][1]),
          };
        }
      } else if (booleanField.includes(key)) {
        filter[key] = filter[key].map((element) => {
          if (element === "True" || element === true) return true;
          if (element === "False" || element === false) return false;
          return element;
        });
      } else {
        filter[key] = { $in: filter[key] };
      }
    }

    if (missed === true) {
      filter["nextFollowUpDateTime"] = { $lt: new Date() };
    }

    let customer_name_list = [];
    let contact_list = [];

    if (searchString) {
      searchString.split(",").forEach((string) => {
        const search = string.trim();
        if (!search) return;
        const re = new RegExp(search, "i");
        if (search.match(/^[0-9]+$/)) {
          contact_list.push(re);
        } else {
          customer_name_list.push(re);
        }
      });
    }

    if (contact_list.length !== 0) {
      filter["$or"] = [
        { contactNumber: { $in: contact_list } },
        { alternateNumber: { $in: contact_list } },
      ];
    }

    if (customer_name_list.length !== 0) {
      filter["customerName"] = { $in: customer_name_list };
    }

    const dbFilter = translateFilterKeys(filter);
    const callLogs = await CallLog.find(dbFilter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedCallLogs = await Promise.all(
      callLogs.map(async (callLog) => {
        const callLogObj = (typeof callLog.toObject === "function") ? callLog.toObject() : callLog;
        const orgId = callLogObj.organization_id || callLogObj.organizationId;
        const organizationName = await getOrganizationName(orgId);
        return { ...callLogObj, organizationName };
      })
    );
    res.send(convertKeysToCamelCase(enrichedCallLogs));
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MaskMasterSearch = async (req, res) => {
  try {
    let filter = req.body.filter || {};
    await applyCallLogTenantFilter(req.user, filter, req.body.industryId || req.query.industryId, req.body.organizationId || req.query.organizationId);
    const sort = req.body.sort || {};
    const missed = req.body.missed;
    const searchString = req.body.searchString ? req.body.searchString.trim() : "";
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;

    for (const key of Object.keys(filter)) {
      if (key === "organizationName") {
        const orgDocs = await Organization.find(
          { name: { $in: filter.organizationName } }
        );
        const orgIds = orgDocs.map((o) => o.organization_id || o.organizationId);
        filter.organizationId = { $in: orgIds };
        delete filter.organizationName;
      } else if (datesField.includes(key)) {
        if (Array.isArray(filter[key]) && filter[key].length === 2) {
          filter[key] = {
            $gte: new Date(filter[key][0]),
            $lte: new Date(filter[key][1]),
          };
        }
      } else if (booleanField.includes(key)) {
        filter[key] = filter[key].map((element) => {
          if (element === "True" || element === true) return true;
          if (element === "False" || element === false) return false;
          return element;
        });
      } else {
        filter[key] = { $in: filter[key] };
      }
    }

    if (missed === true) {
      filter["nextFollowUpDateTime"] = { $lt: new Date() };
    }

    let customer_name_list = [];
    let contact_list = [];

    if (searchString) {
      searchString.split(",").forEach((string) => {
        const search = string.trim();
        if (!search) return;
        const re = new RegExp(search, "i");
        if (search.match(/^[0-9]+$/)) {
          contact_list.push(re);
        } else {
          customer_name_list.push(re);
        }
      });
    }

    if (contact_list.length !== 0) {
      filter["$or"] = [
        { contactNumber: { $in: contact_list } },
        { alternateNumber: { $in: contact_list } },
      ];
    }

    if (customer_name_list.length !== 0) {
      filter["customerName"] = { $in: customer_name_list };
    }

    const dbFilter = translateFilterKeys(filter);
    const callLogs = await CallLog.find(dbFilter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedCallLogs = await Promise.all(
      callLogs.map(async (callLog) => {
        const callLogObj = (typeof callLog.toObject === "function") ? callLog.toObject() : callLog;
        callLogObj.contactNumber = maskPhone(callLogObj.contact_number || callLogObj.contactNumber);
        callLogObj.alternateNumber = maskPhone(callLogObj.alternate_no || callLogObj.alternateNumber);
        callLogObj.email = maskEmail(callLogObj.email_id || callLogObj.email);
        const orgId = callLogObj.organization_id || callLogObj.organizationId;
        const organizationName = await getOrganizationName(orgId);
        return { ...callLogObj, organizationName };
      })
    );
    res.send(convertKeysToCamelCase(enrichedCallLogs));
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MasterFilterValues = async (req, res) => {
  try {
    const stage = req.body.stage;
    let stageFilter = stage ? { stage } : {};
    let missedFilter = {};

    if (stage === "FOLLOWUP") {
      stageFilter = { stage: { $in: ["CALLBACK", "INTERESTED"] } };
    }

    if (stage === "MISSED") {
      stageFilter = {};
      missedFilter["nextFollowUpDateTime"] = { $lt: new Date() };
    }

    const finalFilters = { ...stageFilter, ...missedFilter };

    const group = {
      $group: {
        _id: 0,
        budget: { $addToSet: "$budget" },
        contactOwnerEmail: { $addToSet: "$contact_owner_email" },
        createdBy: { $addToSet: "$created_by" },
        source: { $addToSet: "$source" },
        location: { $addToSet: "$location" },
        projectName: { $addToSet: "$project_name" },
        stage: { $addToSet: "$stage" },
        inventoryType: { $addToSet: "$inventory_type" },
        duration: { $addToSet: "$duration" },
        organizationId: { $addToSet: "$organization_id" },
      },
    };

    const filters = await CallLog.aggregate([
      {
        $match: {
          ...translateFilterKeys(finalFilters),
          stage: { $nin: ["LOST", "NOT INTERESTED"] },
        },
      },
      group,
    ]);

    if (!filters.length) {
      return res.send([]);
    }

    const result = filters[0];

    let organizationMap = {};
    if (result.organizationId && result.organizationId.length > 0) {
      const orgDocs = await Organization.find({
        organization_id: { $in: result.organizationId }
      });

      organizationMap = orgDocs.reduce((acc, org) => {
        acc[org.organization_id || org.organizationId] = org.name;
        return acc;
      }, {});

      result.organizationName = result.organizationId
        .map((id) => organizationMap[id])
        .filter(Boolean)
        .sort();
      delete result.organizationId;
    }

    const sortedResult = {};
    Object.keys(result).forEach((key) => {
      if (key !== "_id") {
        const val = Array.isArray(result[key])
          ? result[key].filter((v) => v != null && v !== "").sort()
          : result[key];
        sortedResult[key] = val;
      }
    });
    res.send([sortedResult]);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.FilterValues = async (req, res) => {
  try {
    const uid = req.body.uid;
    const stage = req.body.stage;
    let stageFilter = stage ? { stage } : {};
    let missedFilter = {};
    if (stage === 'FOLLOWUP') {
      stageFilter = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
    }

    if (stage === 'MISSED') {
      stageFilter = {};
      missedFilter['nextFollowUpDateTime'] = { $lt: new Date() };
    }
    const finalFilters = { ...stageFilter, ...missedFilter };

    let user = null;
    if (uid) {
      const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
      user = await User.findOne(userQuery);
    }
    if (!user && req.user) {
      user = req.user;
    }
    if (!user) {
      return res.send([]);
    }

    const role = user.role;
    const organizationId = user.organizationId || user.organization_id;

    const group = {
      $group: {
        _id: 0,
        budget: { $addToSet: '$budget' },
        contactOwnerEmail: { $addToSet: '$contact_owner_email' },
        createdBy: { $addToSet: '$created_by' },
        source: { $addToSet: '$source' },
        location: { $addToSet: '$location' },
        projectName: { $addToSet: '$project_name' },
        stage: { $addToSet: '$stage' },
        inventoryType: { $addToSet: '$inventory_type' },
        duration: { $addToSet: '$duration' },
      },
    };

    let filters;
    const dbFinalFilters = translateFilterKeys(finalFilters);
    const orgTenantCondition = {
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
      ],
    };

    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        filters = await CallLog.aggregate([
          { $match: { ...orgTenantCondition, ...dbFinalFilters } },
          group,
        ]);
      } else {
        let usersList = await getBranchUsers(user.uid || user._id || uid, organizationId, permission);
        filters = await CallLog.aggregate([
          { $match: { ...orgTenantCondition, uid: { $in: usersList }, ...dbFinalFilters } },
          group,
        ]);
      }
    } else if (role === 'teamLead') {
      let usersList = await getTeamUsers(user.uid || user._id || uid, organizationId);
      filters = await CallLog.aggregate([
        { $match: { ...orgTenantCondition, uid: { $in: usersList }, ...dbFinalFilters } },
        group,
      ]);
    } else {
      filters = await CallLog.aggregate([
        { $match: { ...orgTenantCondition, uid: user.uid || user._id || uid, ...dbFinalFilters } },
        group,
      ]);
    }

    if (!filters || filters.length === 0) {
      return res.send([]);
    }

    let singleArray = [];
    let finalFilterSorted = {};

    Object.keys(filters[0]).forEach((key) => {
      if (key !== "_id") {
        const val = filters[0][key].sort();
        finalFilterSorted[key] = val;
      }
    });
    singleArray.push(finalFilterSorted);
    res.send(singleArray);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MasterContactCount = async (req, res) => {
  try {
    let leadFilter = req.body.leadFilter || {};

    if (
      leadFilter.organizationName &&
      Array.isArray(leadFilter.organizationName) &&
      leadFilter.organizationName.length > 0
    ) {
      const orgDocs = await Organization.find(
        { name: { $in: leadFilter.organizationName } }
      );
      const orgIds = orgDocs.map((o) => o.organization_id || o.organizationId);
      leadFilter.organizationId = { $in: orgIds };
      delete leadFilter.organizationName;
    }

    for (const key of Object.keys(leadFilter)) {
      if (datesField.includes(key)) {
        const val = leadFilter[key];
        if (Array.isArray(val) && val.length === 2) {
          leadFilter[key] = {
            $gte: new Date(val[0]),
            $lte: new Date(val[1]),
          };
        }
      }
    }

    const dbLeadFilter = translateFilterKeys(leadFilter);
    const and = [];
    if (dbLeadFilter && Object.keys(dbLeadFilter).length > 0) {
      for (const key of Object.keys(dbLeadFilter)) {
        if (!datesField.includes(key)) {
          const val = dbLeadFilter[key];
          if (val && val.$in) {
            and.push({ [key]: val });
          } else {
            and.push({ [key]: { $in: Array.isArray(val) ? val : [val] } });
          }
        } else {
          and.push({ [key]: dbLeadFilter[key] });
        }
      }
    }

    const matchQuery = and.length > 0 ? { $and: and } : {};
    const count = await CallLog.aggregate([
      { $match: matchQuery },
      { $count: "total" },
    ]);

    res.send(count[0] || { total: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.CallLogCount = async (req, res) => {
  try {
    const uid = req.body.uid;
    let leadFilter = req.body.leadFilter || {};

    !isObjectEmpty(leadFilter) &&
      Object.keys(leadFilter).forEach((key) => {
        if (datesField.includes(key)) {
          if (
            leadFilter[key].length &&
            leadFilter[key].length === 2
          ) {
            leadFilter[key] = {
              $gte: new Date(leadFilter[key][0]),
              $lte: new Date(leadFilter[key][1]),
            };
          }
        }
      });
    let user = null;
    if (uid) {
      const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
      user = await User.findOne(userQuery);
    }
    if (!user && req.user) {
      user = req.user;
    }
    if (!user) {
      return res.send({ total: 0 });
    }

    const role = user.role;
    const organizationId = user.organizationId || user.organization_id;
    const dbLeadFilter = translateFilterKeys(leadFilter);

    const orgTenantCondition = {
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
      ],
    };

    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        const and = [orgTenantCondition];
        if (!isObjectEmpty(dbLeadFilter)) {
          Object.keys(dbLeadFilter).forEach((key) => {
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: dbLeadFilter[key] } });
            } else {
              and.push({ [key]: dbLeadFilter[key] });
            }
          });
        }
        const count = await CallLog.aggregate([
          { $match: { $and: and } },
          { $count: "total" },
        ]);
        res.send(count[0] || { total: 0 });
      } else {
        let usersList = await getBranchUsers(user.uid || user._id || uid, organizationId, permission);
        const and = [orgTenantCondition, { uid: { $in: usersList } }];
        if (!isObjectEmpty(dbLeadFilter)) {
          Object.keys(dbLeadFilter).forEach((key) => {
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: dbLeadFilter[key] } });
            } else {
              and.push({ [key]: dbLeadFilter[key] });
            }
          });
        }
        const count = await CallLog.aggregate([
          { $match: { $and: and } },
          { $count: "total" },
        ]);
        res.send(count[0] || { total: 0 });
      }
    } else if (role === 'teamLead') {
      let usersList = await getTeamUsers(user.uid || user._id || uid, organizationId);
      const and = [orgTenantCondition, { uid: { $in: usersList } }];
      if (!isObjectEmpty(dbLeadFilter)) {
        Object.keys(dbLeadFilter).forEach((key) => {
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: dbLeadFilter[key] } });
          } else {
            and.push({ [key]: dbLeadFilter[key] });
          }
        });
      }
      const count = await CallLog.aggregate([
        { $match: { $and: and } },
        { $count: "total" },
      ]);
      res.send(count[0] || { total: 0 });
    } else {
      const and = [orgTenantCondition, { uid: user.uid || user._id || uid }];
      if (!isObjectEmpty(dbLeadFilter)) {
        Object.keys(dbLeadFilter).forEach((key) => {
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: dbLeadFilter[key] } });
          } else {
            and.push({ [key]: dbLeadFilter[key] });
          }
        });
      }
      const count = await CallLog.aggregate([
        { $match: { $and: and } },
        { $count: "total" },
      ]);
      res.send(count[0] || { total: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.CallingReport = async (req, res) => {
  // Simple fallback calling report placeholder matching the structure expected
  res.send({ report: [], ChartCount: [], Total: 0 });
};

module.exports = callLogController;
