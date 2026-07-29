const mongoose = require('mongoose');
const moment = require('moment');
const { Task } = require('../models/taskModel');
const { User } = require('../models/userModel');
const { Contact } = require('../models/contactModel');
const { convertKeysToCamelCase } = require('../services/crudFactory');

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

const getBranchUsers = async (uid, organizationId, permission) => {
  const users = await User.find({
    organizationId,
    branch: { $in: permission },
  });
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

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

const taskController = {};

taskController.TasksReport = async (req, res) => {
  try {
    const uid = req.body.uid;
    const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
    const resultUser = await User.find(userQuery);
    if (resultUser.length === 0) {
      return res.send({ error: 'User Not Found' });
    }

    const user = resultUser[0];
    const profile = user.role || user.profile;
    const organizationId = user.organizationId;
    const status = req.body.status || '';

    let stage;
    let date_type;

    if (status === 'Completed') {
      date_type = 'completedAt';
      stage = { stage: { $in: ['INTERESTED', 'WON', 'LOST'] } };
    } else {
      date_type = 'dueDate';
      stage = { stage: { $in: ['CALLBACK', 'INTERESTED'] } };
    }

    const date_parameter = `${date_type}`;
    let start_date, end_date, date_condition;

    if (req.body.start_date) {
      start_date = moment(req.body.start_date)
        .utcOffset('+05:30')
        .startOf('day')
        .toDate();
    }

    if (req.body.end_date) {
      end_date = moment(req.body.end_date)
        .utcOffset('+05:30')
        .endOf('day')
        .toDate();
    }

    if (req.body.start_date && req.body.end_date) {
      date_condition = {
        [`${date_parameter}`]: {
          $gte: start_date,
          $lte: end_date,
        },
      };
    }

    const type = req.params.type;
    let status_type = type === 'associate' ? 'associateStatus' : 'sourceStatus';
    const parameter = req.body.parameter;
    let statusCondition;

    if (status === 'Pending') {
      statusCondition = [
        { status: { $eq: 'Pending' } },
        {
          dueDate: {
            $gte: moment().utcOffset('+05:30').toDate(),
          },
        },
      ];
    } else if (status === 'Overdue') {
      statusCondition = [
        { status: { $eq: 'Pending' } },
        {
          dueDate: {
            $lte: moment().utcOffset('+05:30').toDate(),
          },
        },
      ];
    } else {
      statusCondition = [{ status: 'Completed' }];
    }

    const groupByOwner = {
      $group: {
        _id: { owner: '$uid', [`${parameter}`]: `$${parameter}` },
        num: { $sum: 1 },
      },
    };

    const groupByParameter = {
      $group: {
        _id: '$_id.owner',
        [`${parameter}`]: {
          $push: { [`${parameter}`]: `$_id.${parameter}`, count: '$num' },
        },
      },
    };

    const groupByOwnerSource = {
      $group: {
        _id: {
          source: '$leads.source',
          [`${parameter}`]: `$${parameter}`,
        },
        num: { $sum: 1 },
      },
    };

    const groupByParameterSource = {
      $group: {
        _id: '$_id.source',
        [`${parameter}`]: {
          $push: { [`${parameter}`]: `$_id.${parameter}`, count: '$num' },
        },
      },
    };

    const project = {
      $project: {
        owner: '$_id',
        _id: 0,
        [`${parameter}`]: 1,
        total: {
          $sum: `$${parameter}.count`,
        },
      },
    };

    let uidKeys = [];
    const taskFilter = req.body.taskFilter || {};
    const leadFilter = req.body.leadFilter || {};
    const leadUserFilter = req.body.leadUserFilter || {};

    if (!isObjectEmpty(leadUserFilter)) {
      var query = "";
      const regex = /],/gi;
      const regex1 = /:/gi;
      var cc = JSON.stringify(leadUserFilter);
      var dd = cc.replace(regex, ']##').replace(regex1, ':{"$in":').slice(1).slice(0, -1);
      var ee = dd.split('##');

      Object.keys(ee).forEach((key) => {
        query = query + ee[key] + '},';
      });
      var finalQuery = '{' + query.slice(0, -1) + '}';
    }

    !isObjectEmpty(taskFilter) &&
      Object.keys(taskFilter).forEach((key) => {
        if (datesField.includes(key)) {
          if (taskFilter[key].length && taskFilter[key].length === 2) {
            taskFilter[key] = {
              $gte: moment(taskFilter[key][0]).utcOffset('+05:30').toDate(),
              $lte: moment(taskFilter[key][1]).utcOffset('+05:30').toDate(),
            };
          }
        } else {
          taskFilter[key] = { $in: taskFilter[key] };
        }
      });

    !isObjectEmpty(leadFilter) &&
      Object.keys(leadFilter).forEach((key) => {
        if (datesField.includes(key)) {
          if (leadFilter[key].length && leadFilter[key].length === 2) {
            if (key === "leadAssignTime") {
              leadFilter[`leads.${key}`] = {
                $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
                $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
              };
              delete leadFilter.leadAssignTime;
            } else {
              leadFilter[key] = {
                $gte: moment(leadFilter[key][0]).utcOffset('+05:30').toDate(),
                $lte: moment(leadFilter[key][1]).utcOffset('+05:30').toDate(),
              };
            }
          }
        } else {
          leadFilter[key] = { $in: leadFilter[key] };
        }
      });

    if (!isObjectEmpty(leadUserFilter) && finalQuery) {
      const fullFinalQuery = JSON.parse(finalQuery);
      const uidTeamTo = await User.find(fullFinalQuery, { "_id": 0, "uid": 1 });
      Object.keys(uidTeamTo).forEach((key) => {
        uidKeys.push(uidTeamTo[key].uid);
      });
    }

    let ChartCount = {};
    let Total = 0;

    const countHelp = (arr, para = parameter) => {
      arr.forEach((element) => {
        var makeKey = element[`${para}`] || [];
        makeKey.forEach((c) => {
          var key = c[`${para}`];
          if (!ChartCount[key]) {
            ChartCount[key] = c.count;
            Total += c.count;
          } else {
            ChartCount[key] += c.count;
            Total += c.count;
          }
        });
      });
    };

    const lookup = {
      $lookup: {
        from: 'contacts',
        localField: 'leadId',
        foreignField: 'id',
        as: 'leads',
      },
    };

    const resultArrayFormat = (report) => {
      report.forEach((rep) => {
        let meeting = false,
          callback = false,
          site = false;
        rep.type?.forEach((t) => {
          if (t.type === 'Meeting') meeting = true;
          else if (t.type === 'Call Back') callback = true;
          else if (t.type === 'Site Visit') site = true;
        });
        if (!meeting) rep.type?.push({ type: 'Meeting', count: 0 });
        if (!callback) rep.type?.push({ type: 'Call Back', count: 0 });
        if (!site) rep.type?.push({ type: 'Site Visit', count: 0 });
      });
    };

    const isLMOrAdmin = profile?.toLowerCase() === "lead manager" || profile?.toLowerCase() === "admin" || profile?.toLowerCase() === "superadmin";

    if (isLMOrAdmin) {
      const permission = user.branchPermission;
      if (
        permission === undefined ||
        (permission && permission.length === 0) ||
        (permission && permission.includes('All'))
      ) {
        try {
          let report;
          let and = [{ organizationId }];

          if (stage) {
            and.push(stage);
          }

          if (date_condition) {
            and.push(date_condition);
          }

          if (!isObjectEmpty(taskFilter)) {
            and.push(taskFilter);
          }

          and = and.concat(statusCondition);

          let group, groupBy;

          if (type === 'associate') {
            group = groupByOwner;
            groupBy = groupByParameter;
          } else if (type === 'source') {
            group = groupByOwnerSource;
            groupBy = groupByParameterSource;
          }

          let lookupand = [{ [`leads.${status_type}`]: true }];
          if (!isObjectEmpty(leadFilter)) {
            const keys = Object.keys(leadFilter);
            keys.forEach((key) => {
              lookupand.push({ [`${key}`]: leadFilter[key] });
            });
          }
          if (!isObjectEmpty(leadUserFilter)) {
            lookupand.push({ ["uid"]: { $in: uidKeys } });
          }

          report = await Task.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);

          if (report.length > 0) resultArrayFormat(report);
          if (report.length > 0) countHelp(report);

          res.send({ report, ChartCount, Total });
        } catch (error) {
          console.error(error);
          res.send({ error });
        }
      } else {
        let usersList = await getBranchUsers(uid, organizationId, permission);

        try {
          let report;
          let and = [{ uid: { $in: usersList } }];

          if (stage) {
            and.push(stage);
          }

          if (date_condition) {
            and.push(date_condition);
          }

          if (!isObjectEmpty(taskFilter)) {
            and.push(taskFilter);
          }

          and = and.concat(statusCondition);

          let group, groupBy;

          if (type === 'associate') {
            group = groupByOwner;
            groupBy = groupByParameter;
          } else if (type === 'source') {
            group = groupByOwnerSource;
            groupBy = groupByParameterSource;
          }

          let lookupand = [{ [`leads.${status_type}`]: true }];
          if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

          report = await Task.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookup,
            { $unwind: '$leads' },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);

          if (report.length > 0) resultArrayFormat(report);
          if (report.length > 0) countHelp(report);

          res.send({ report, ChartCount, Total });
        } catch (error) {
          console.error(error);
          res.send({ error });
        }
      }
    } else if (profile?.toLowerCase() === 'team lead') {
      if (type === 'source') {
        return res.send('Only for Lead manager');
      }
      let usersList = await getTeamUsers(uid, organizationId);
      try {
        let report;
        let and = [{ uid: { $in: usersList } }];

        if (stage) {
          and.push(stage);
        }

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(taskFilter)) {
          and.push(taskFilter);
        }

        and = and.concat(statusCondition);

        let group = groupByOwner;
        let groupBy = groupByParameter;

        let lookupand = [{ [`leads.${status_type}`]: true }];
        if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

        report = await Task.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);

        if (report.length > 0) resultArrayFormat(report);
        if (report.length > 0) countHelp(report);

        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    } else {
      try {
        let report;
        let and = [{ uid }];

        if (stage) {
          and.push(stage);
        }

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(taskFilter)) {
          and.push(taskFilter);
        }

        and = and.concat(statusCondition);

        let group = groupByOwner;
        let groupBy = groupByParameter;

        let lookupand = [{ [`leads.${status_type}`]: true }];
        if (!isObjectEmpty(leadFilter)) lookupand.push(leadFilter);

        report = await Task.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookup,
          { $unwind: '$leads' },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);

        if (report.length > 0) resultArrayFormat(report);
        if (report.length > 0) countHelp(report);

        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

module.exports = taskController;

const getOrganizationName = async (orgId) => {
  try {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ organization_id: orgId }).lean().exec();
    return org ? (org.organization_name || org.name) : "Unknown Organization";
  } catch (error) {
    console.error("Error fetching organization name:", error);
    return "Unknown Organization";
  }
};

const buildTaskQuery = async (req) => {
  let filter = req.body.filter || {};
  const missed = req.body.missed;
  const searchString = req.body.searchString ? req.body.searchString.trim() : '';

  const resolvedFilter = {};

  if (filter.organization_name) {
    const Organization = mongoose.model('Organization');
    const orgDocs = await Organization.find(
      { organization_name: { $in: filter.organization_name } },
      { organization_id: 1, _id: 0 }
    );
    const orgIds = orgDocs.map((o) => o.organization_id.toString());
    resolvedFilter.organization_id = { $in: orgIds };
  }

  const taskDates = ['dueDate', 'due_date', 'completedAt', 'completed_at', 'createdAt', 'updatedAt'];
  const taskBools = ['transferStatus', 'transfer_status', 'uniqueMeeting', 'unique_meeting', 'uniqueSiteVisit', 'unique_site_visit'];

  Object.keys(filter).forEach((key) => {
    if (key === 'organization_name') return;

    let dbKey = key;
    if (key === 'organizationId') dbKey = 'organization_id';
    else if (key === 'dueDate') dbKey = 'due_date';
    else if (key === 'callbackReason') dbKey = 'callback_reason';
    else if (key === 'customerName') dbKey = 'customer_name';
    else if (key === 'contactNumber') dbKey = 'contact_number';
    else if (key === 'createdBy') dbKey = 'created_by';
    else if (key === 'contactOwnerEmail') dbKey = 'contact_owner_email';
    else if (key === 'projectName') dbKey = 'project_name';
    else if (key === 'transferStatus') dbKey = 'transfer_status';
    else if (key === 'uniqueMeeting') dbKey = 'unique_meeting';
    else if (key === 'uniqueSiteVisit') dbKey = 'unique_site_visit';
    else if (key === 'completedAt') dbKey = 'completed_at';
    else if (key === 'inventoryType') dbKey = 'inventory_type';
    else if (key === 'taskType') dbKey = 'task_type';
    else if (key === 'nextFollowUp') dbKey = 'next_follow_up';

    if (taskDates.includes(key) || taskDates.includes(dbKey)) {
      if (Array.isArray(filter[key]) && filter[key].length === 2) {
        resolvedFilter[dbKey] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      }
    } else if (taskBools.includes(key) || taskBools.includes(dbKey)) {
      resolvedFilter[dbKey] = filter[key].map((v) =>
        v === "True" || v === true ? true : false
      );
    } else {
      resolvedFilter[dbKey] = { $in: filter[key] };
      
      if (dbKey === 'status' && resolvedFilter[dbKey]['$in'].includes('Overdue')) {
        resolvedFilter[dbKey]['$in'] = resolvedFilter[dbKey]['$in'].filter((k) => k !== 'Overdue');
        if (!resolvedFilter[dbKey]['$in'].includes('PENDING') && !resolvedFilter[dbKey]['$in'].includes('Pending')) {
          resolvedFilter[dbKey]['$in'].push('PENDING');
          resolvedFilter['due_date'] = { $lte: moment().utcOffset('+05:30').toDate() };
        }
      } else if (
        dbKey === 'status' &&
        (resolvedFilter[dbKey]['$in'].includes('PENDING') || resolvedFilter[dbKey]['$in'].includes('Pending')) &&
        !resolvedFilter[dbKey]['$in'].includes('Overdue')
      ) {
        resolvedFilter['due_date'] = { $gt: moment().utcOffset('+05:30').toDate() };
      }
    }
  });

  if (missed === true) {
    resolvedFilter['next_follow_up'] = {
      $lt: moment().utcOffset('+05:30').toDate(),
    };
  }

  let customer_name_list = [];
  let contact_list = [];

  if (searchString) {
    searchString.split(',').forEach((string) => {
      const search = string.trim();
      if (!search) return;
      const re = new RegExp(search, 'i');
      if (search.match(/^[0-9]+$/)) {
        contact_list.push(re);
      } else {
        customer_name_list.push(re);
      }
    });
  }

  if (contact_list.length > 0) {
    resolvedFilter['$or'] = [
      { contact_number: { $in: contact_list } }
    ];
  }

  if (customer_name_list.length > 0) {
    resolvedFilter['customer_name'] = { $in: customer_name_list };
  }

  if (req.user?.role !== 'superAdmin') {
    resolvedFilter['organization_id'] = req.user?.organizationId;
  }

  return resolvedFilter;
};

taskController.MasterSearch = async (req, res, next) => {
  try {
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;
    const sort = req.body.sort || {};

    const query = await buildTaskQuery(req);
    const tasks = await Task.find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const orgId = task.organization_id || task.organizationId;
        const orgName = await getOrganizationName(orgId);
        return {
          ...(task.toObject?.() || task),
          organization_name: orgName,
        };
      })
    );

    res.json(convertKeysToCamelCase(enrichedTasks));
  } catch (err) {
    next(err);
  }
};

taskController.MaskMasterSearch = async (req, res, next) => {
  try {
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;
    const sort = req.body.sort || {};

    const query = await buildTaskQuery(req);
    const tasks = await Task.find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const orgId = task.organization_id || task.organizationId;
        const orgName = await getOrganizationName(orgId);
        const taskObj = task.toObject?.() || task;

        if (taskObj.contact_number) taskObj.contact_number = maskPhone(taskObj.contact_number);
        if (taskObj.contactNumber) taskObj.contactNumber = maskPhone(taskObj.contactNumber);
        if (taskObj.email) taskObj.email = maskEmail(taskObj.email);
        if (taskObj.contactOwnerEmail) taskObj.contactOwnerEmail = maskEmail(taskObj.contactOwnerEmail);

        return {
          ...taskObj,
          organization_name: orgName,
        };
      })
    );

    res.json(convertKeysToCamelCase(enrichedTasks));
  } catch (err) {
    next(err);
  }
};

taskController.MasterContactCount = async (req, res, next) => {
  try {
    const query = await buildTaskQuery(req);
    const total = await Task.countDocuments(query);
    res.json({ total });
  } catch (err) {
    next(err);
  }
};

taskController.MasterFilterValues = async (req, res, next) => {
  try {
    const query = await buildTaskQuery(req);
    
    const budget = await Task.distinct('budget', query);
    const source = await Task.distinct('source', query);
    const location = await Task.distinct('location', query);
    const stage = await Task.distinct('stage', query);
    const projectName = await Task.distinct('project_name', query);
    const type = await Task.distinct('type', query);
    const contactOwnerEmail = await Task.distinct('contact_owner_email', query);

    const organizationIds = await Task.distinct('organization_id', query);
    const Organization = mongoose.model('Organization');
    const orgDocs = await Organization.find({ organization_id: { $in: organizationIds } }).lean().exec();
    const organizationNames = orgDocs.map(o => o.organization_name || o.name).filter(Boolean);

    res.json([{
      budget: budget.filter(Boolean).sort(),
      source: source.filter(Boolean).sort(),
      location: location.filter(Boolean).sort(),
      stage: stage.filter(Boolean).sort(),
      projectName: projectName.filter(Boolean).sort(),
      type: type.filter(Boolean).sort(),
      contactOwnerEmail: contactOwnerEmail.filter(Boolean).sort(),
      organizationName: organizationNames.sort(),
    }]);
  } catch (err) {
    next(err);
  }
};
