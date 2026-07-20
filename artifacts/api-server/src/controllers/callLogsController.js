const { CallLog } = require('../models/callLogModel');
const { User } = require('../models/userModel');
const { Organization } = require('../models/organizationModel');
const moment = require('moment');
const mongoose = require('mongoose');

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
    organizationId,
    branch: { $in: permission },
  });
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

// to get all the users under a certain user
const getTeamUsers = async (uid, organizationId) => {
  const users = await User.find({ organizationId });
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
    const organization = await Organization.findOne({ organizationId });
    return organization ? organization.name : "Unknown Organization";
  } catch (error) {
    console.error("Error fetching organization name:", error);
    return "Unknown Organization";
  }
};

const callLogController = {};

callLogController.Create = async (req, res) => {
  try {
    const userQuery = mongoose.isValidObjectId(req.body.uid) ? { _id: req.body.uid } : { uid: req.body.uid };
    const user = await User.findOne(userQuery);
    let createdBy = '';
    if (user) {
      createdBy = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }
    const data = new CallLog({
      leadId: req.body.leadId || '',
      customerName: req.body.customerName || req.body.customer_name || '',
      contactNumber: req.body.contactNumber || req.body.contact_no || '',
      stage: req.body.stage || '',
      contactOwnerEmail: req.body.contactOwnerEmail || req.body.contact_owner_email || '',
      location: req.body.location || '',
      projectName: req.body.projectName || req.body.project || '',
      budget: req.body.budget || '',
      transferStatus: req.body.transferStatus || req.body.transfer_status || false,
      createdBy,
      source: req.body.source || req.body.lead_source || '',
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : new Date(),
      type: req.body.type || '',
      inventoryType: req.body.inventoryType || req.body.inventory_type || '',
      duration: mapSeconds(req.body.callTime || req.body.duration),
      uid: req.body.uid || '',
      organizationId: req.body.organizationId || req.body.organization_id || '',
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null
    });
    await data.save();
    res.send('Task Created');
  } catch (error) {
    console.error("Error in CallLog.Create:", error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.Update = async (req, res) => {
  try {
    const leadId = req.body.leadId;
    await CallLog.updateMany({ leadId }, { $set: req.body }).exec();
    res.status(200).send('Updation DONE!');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

callLogController.DeleteCallLogs = async (req, res) => {
  try {
    const leadId = req.body.leadId;
    await CallLog.findOneAndDelete({ leadId }).exec();
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

    const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
    const resultUser = await User.find(userQuery);
    if (resultUser.length === 0) {
      return res.send({ error: 'User Not Found' });
    }

    const user = resultUser[0];
    const role = user.role;
    const organizationId = user.organizationId;

    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        const callLogs = await CallLog.find({ organizationId, ...filter })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        res.send(callLogs);
      } else {
        let usersList = await getBranchUsers(uid, organizationId, permission);
        const callLogs = await CallLog.find({ uid: { $in: usersList }, ...filter })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
        res.send(callLogs);
      }
    } else if (role === 'teamLead') {
      let usersList = await getTeamUsers(uid, organizationId);
      const callLogs = await CallLog.find({ uid: { $in: usersList }, ...filter })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize);
      res.send(callLogs);
    } else {
      const callLogs = await CallLog.find({ uid, ...filter })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      res.send(callLogs);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MasterSearch = async (req, res) => {
  try {
    let filter = req.body.filter || {};
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
        const orgIds = orgDocs.map((o) => o.organizationId);
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

    const callLogs = await CallLog.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedCallLogs = await Promise.all(
      callLogs.map(async (callLog) => {
        const callLogObj = (typeof callLog.toObject === "function") ? callLog.toObject() : callLog;
        const orgId = callLogObj.organizationId;
        const organizationName = await getOrganizationName(orgId);
        return { ...callLogObj, organizationName };
      })
    );
    res.send(enrichedCallLogs);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

callLogController.MaskMasterSearch = async (req, res) => {
  try {
    let filter = req.body.filter || {};
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
        const orgIds = orgDocs.map((o) => o.organizationId);
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

    const callLogs = await CallLog.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedCallLogs = await Promise.all(
      callLogs.map(async (callLog) => {
        const callLogObj = (typeof callLog.toObject === "function") ? callLog.toObject() : callLog;
        callLogObj.contactNumber = maskPhone(callLogObj.contactNumber);
        callLogObj.alternateNumber = maskPhone(callLogObj.alternateNumber);
        callLogObj.email = maskEmail(callLogObj.email);
        const orgId = callLogObj.organizationId;
        const organizationName = await getOrganizationName(orgId);
        return { ...callLogObj, organizationName };
      })
    );
    res.send(enrichedCallLogs);
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
        contactOwnerEmail: { $addToSet: "$contactOwnerEmail" },
        createdBy: { $addToSet: "$createdBy" },
        source: { $addToSet: "$source" },
        location: { $addToSet: "$location" },
        projectName: { $addToSet: "$projectName" },
        stage: { $addToSet: "$stage" },
        inventoryType: { $addToSet: "$inventoryType" },
        duration: { $addToSet: "$duration" },
        organizationId: { $addToSet: "$organizationId" },
      },
    };

    const filters = await CallLog.aggregate([
      {
        $match: {
          ...finalFilters,
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
      const orgDocs = await Organization.find(
        { organizationId: { $in: result.organizationId } }
      );

      organizationMap = orgDocs.reduce((acc, org) => {
        acc[org.organizationId] = org.name;
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

    const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
    const resultUser = await User.find(userQuery);
    if (resultUser.length === 0) {
      return res.send({ error: 'User Not Found' });
    }

    const user = resultUser[0];
    const role = user.role;
    const organizationId = user.organizationId;

    const group = {
      $group: {
        _id: 0,
        budget: { $addToSet: '$budget' },
        contactOwnerEmail: { $addToSet: '$contactOwnerEmail' },
        createdBy: { $addToSet: '$createdBy' },
        source: { $addToSet: '$source' },
        location: { $addToSet: '$location' },
        projectName: { $addToSet: '$projectName' },
        stage: { $addToSet: '$stage' },
        inventoryType: { $addToSet: '$inventoryType' },
        duration: { $addToSet: '$duration' },
      },
    };

    let filters;
    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        filters = await CallLog.aggregate([
          { $match: { organizationId, ...finalFilters } },
          group,
        ]);
      } else {
        let usersList = await getBranchUsers(uid, organizationId, permission);
        filters = await CallLog.aggregate([
          { $match: { uid: { $in: usersList }, ...finalFilters } },
          group,
        ]);
      }
    } else if (role === 'teamLead') {
      let usersList = await getTeamUsers(uid, organizationId);
      filters = await CallLog.aggregate([
        { $match: { uid: { $in: usersList }, ...finalFilters } },
        group,
      ]);
    } else {
      filters = await CallLog.aggregate([
        { $match: { uid, ...finalFilters } },
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
      const orgIds = orgDocs.map((o) => o.organizationId);
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

    const and = [];
    if (leadFilter && Object.keys(leadFilter).length > 0) {
      for (const key of Object.keys(leadFilter)) {
        if (!datesField.includes(key)) {
          const val = leadFilter[key];
          if (val && val.$in) {
            and.push({ [key]: val });
          } else {
            and.push({ [key]: { $in: Array.isArray(val) ? val : [val] } });
          }
        } else {
          and.push({ [key]: leadFilter[key] });
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
    const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
    const resultUser = await User.find(userQuery);
    if (resultUser.length === 0) {
      return res.send({ error: 'User Not Found' });
    }

    const user = resultUser[0];
    const role = user.role;
    const organizationId = user.organizationId;

    if (role === 'leadManager' || role === 'admin') {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        const and = [{ organizationId }];
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: leadFilter[key] } });
            } else {
              and.push({ [key]: leadFilter[key] });
            }
          });
        }
        const count = await CallLog.aggregate([
          { $match: { $and: and } },
          { $count: "total" },
        ]);
        res.send(count[0] || { total: 0 });
      } else {
        let usersList = await getBranchUsers(uid, organizationId, permission);
        const and = [{ uid: { $in: usersList } }];
        if (!isObjectEmpty(leadFilter)) {
          Object.keys(leadFilter).forEach((key) => {
            if (!datesField.includes(key)) {
              and.push({ [key]: { $in: leadFilter[key] } });
            } else {
              and.push({ [key]: leadFilter[key] });
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
      let usersList = await getTeamUsers(uid, organizationId);
      const and = [{ uid: { $in: usersList } }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: leadFilter[key] } });
          } else {
            and.push({ [key]: leadFilter[key] });
          }
        });
      }
      const count = await CallLog.aggregate([
        { $match: { $and: and } },
        { $count: "total" },
      ]);
      res.send(count[0] || { total: 0 });
    } else {
      const and = [{ uid }];
      if (!isObjectEmpty(leadFilter)) {
        Object.keys(leadFilter).forEach((key) => {
          if (!datesField.includes(key)) {
            and.push({ [key]: { $in: leadFilter[key] } });
          } else {
            and.push({ [key]: leadFilter[key] });
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
