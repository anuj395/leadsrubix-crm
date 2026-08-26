const mongoose = require('mongoose');
const moment = require('moment');

// Import models from the new project
const { User: userModel } = require('../models/userModel');
const { Contact: leadModel } = require('../models/contactModel');

const datesField = [
  "createdAt",
  "nextFollowUpDateTime",
  "stageChangeAt",
  "modifiedAt",
  "leadAssignTime",
  "callResponseTime"
];

const isObjectEmpty = (object) => {
  if (!object) return true;
  var isEmpty = true;
  for (var key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      isEmpty = false;
      break;
    }
  }
  return isEmpty;
};

const getBranchUsers = async (
  uid,
  organizationId,
  permission
) => {
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const baseUser = await userModel.findOne(userQuery);
  const orgId = organizationId || baseUser?.organizationId;

  const users = await userModel.find({
    organizationId: orgId,
    branch: { $in: permission },
  });
  let usersList = [uid];
  users.forEach((user) => {
    if (user.uid) usersList.push(user.uid);
    if (user._id) usersList.push(String(user._id));
  });
  return usersList;
};

const getTeamUsers = async (uid, organizationId) => {
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const baseUser = await userModel.findOne(userQuery);
  const orgId = organizationId || baseUser?.organizationId;

  const users = await userModel.find({
    organizationId: orgId
  });
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

const feedbackReport = async (req, res) => {
  const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const resultUser = await userModel.find(userQuery);
  if (resultUser.length === 0) {
    return res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.role || user.profile;
  const organizationId = user.organizationId;
  const date_parameter = "leadAssignTime";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
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

  const groupByOwner = {
    $group: {
      _id: { owner: "$uid", stage: "$stage" },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      stage: {
        $push: { stage: "$_id.stage", count: "$num" },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      stage: 1,
      total: {
        $sum: "$stage.count",
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: { source: "$source", stage: "$stage" },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.source",
      stage: {
        $push: { stage: "$_id.stage", count: "$num" },
      },
    },
  };

  const projectSource = {
    $project: {
      source: "$_id",
      _id: false,
      stage: 1,
      total: {
        $sum: "$stage.count",
      },
    },
  };

  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associateStatus: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { sourceStatus: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};
  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element.stage || [];
      makeKey.forEach((c) => {
        var key = c.stage;
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

  let uidKeys = [];
  const leadFilter = req.body.leadFilter || {};
  const taskFilter = req.body.taskFilter || {};
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

  !isObjectEmpty(leadUserFilter) &&
    Object.keys(leadUserFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadUserFilter[key].length &&
          leadUserFilter[key].length === 2
        ) {
          leadUserFilter[key] = {
            $gte: new Date(leadUserFilter[key][0]),
            $lte: new Date(leadUserFilter[key][1]),
          };
        }
      } else {
        leadUserFilter[key] = { $in: leadUserFilter[key] };
      }
    });

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
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  if (!isObjectEmpty(leadUserFilter) && finalQuery) {
    const fullFinalQuery = JSON.parse(finalQuery);
    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    uidTeamTo.forEach((item) => {
      if (item.uid) uidKeys.push(item.uid);
    });
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const isLMOrAdmin = profile?.toLowerCase() === "lead manager" || profile?.toLowerCase() === "admin" || profile?.toLowerCase() === "superadmin";

  if (isLMOrAdmin) {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [{ organizationId }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key) => {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          });
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organizationId,
        permission
      );
      try {
        const and = [{ uid: { $in: usersList } }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    }
  } else if (profile?.toLowerCase() === "team lead") {
    if (type.sourceStatus === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organizationId
    );
    try {
      const and = [{ uid: { $in: usersList } }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key) => {
          if (key == "reporting_to" || key == "branch") {
            and.push({ [`uid`]: { $in: uidKeys } });
          } else {
            and.push({ [`${key}`]: leadFilter[key] });
          }
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }
      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.sourceStatus === true) {
        return res.send("Only for Lead manager");
      }
      const and = [{ uid }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }
      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  }
};

const callBackReasonReport = async (req, res) => {
  const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const resultUser = await userModel.find(userQuery);
  if (resultUser.length === 0) {
    return res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.role || user.profile;
  const organizationId = user.organizationId;
  const date_parameter = "leadAssignTime";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
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

  const groupByOwner = {
    $group: {
      _id: { owner: "$uid", callBackReason: "$callBackReason" },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      callBackReason: {
        $push: { callBackReason: "$_id.callBackReason", count: "$num" },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      callBackReason: 1,
      total: {
        $sum: "$callBackReason.count",
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: { source: "$source", callBackReason: "$callBackReason" },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.source",
      callBackReason: {
        $push: { callBackReason: "$_id.callBackReason", count: "$num" },
      },
    },
  };

  const projectSource = {
    $project: {
      source: "$_id",
      _id: false,
      callBackReason: 1,
      total: {
        $sum: "$callBackReason.count",
      },
    },
  };

  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associateStatus: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { sourceStatus: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};
  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element.callBackReason || [];
      makeKey.forEach((c) => {
        var key = c.callBackReason;
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

  let uidKeys = [];
  const leadFilter = req.body.leadFilter || {};
  const taskFilter = req.body.taskFilter || {};
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

  !isObjectEmpty(leadUserFilter) &&
    Object.keys(leadUserFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          leadUserFilter[key].length &&
          leadUserFilter[key].length === 2
        ) {
          leadUserFilter[key] = {
            $gte: new Date(leadUserFilter[key][0]),
            $lte: new Date(leadUserFilter[key][1]),
          };
        }
      } else {
        leadUserFilter[key] = { $in: leadUserFilter[key] };
      }
    });

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
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  if (!isObjectEmpty(leadUserFilter) && finalQuery) {
    const fullFinalQuery = JSON.parse(finalQuery);
    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    uidTeamTo.forEach((item) => {
      if (item.uid) uidKeys.push(item.uid);
    });
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const isLMOrAdmin = profile?.toLowerCase() === "lead manager" || profile?.toLowerCase() === "admin" || profile?.toLowerCase() === "superadmin";

  if (isLMOrAdmin) {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [{ organizationId }, { stage: "CALLBACK" }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }
        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key) => {
            and.push({ [`${key == "reporting_to" ? "uid" : key}`]: key == "reporting_to" ? { $in: uidKeys } : leadFilter[key] });
          });
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organizationId,
        permission
      );
      try {
        const and = [{ uid: { $in: usersList } }, { stage: "CALLBACK" }, type];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadFilter)) {
          const keys = Object.keys(leadFilter);
          keys.forEach((key) => {
            and.push({ [`${key}`]: leadFilter[key] });
          });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }
        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    }
  } else if (profile?.toLowerCase() === "team lead") {
    if (type.sourceStatus === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organizationId
    );
    try {
      const and = [{ uid: { $in: usersList } }, { stage: "CALLBACK" }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key) => {
          if (key == "reporting_to" || key == "branch") {
            and.push({ [`uid`]: { $in: uidKeys } });
          } else {
            and.push({ [`${key}`]: leadFilter[key] });
          }
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }
      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.sourceStatus === true) {
        return res.send("Only for Lead manager");
      }
      const and = [{ uid }, { stage: "CALLBACK" }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }
      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }
      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }
      let lookupand = [];
      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }
      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  }
};

const InterestedReport = async (req, res) => {
  const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const resultUser = await userModel.find(userQuery);
  if (resultUser.length === 0) {
    return res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.role || user.profile;
  const organizationId = user.organizationId;
  const date_parameter = "leadAssignTime";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
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

  const parameter = req.body.parameter;
  let groupByAssociate;

  if (parameter === "stageChangeAt") {
    groupByAssociate = {
      $group: {
        _id: {
          owner: "$uid",
          [`${parameter}`]: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: `$${parameter}`,
              timezone: "+05:30",
            },
          },
        },
        num: { $sum: 1 },
      },
    };
  } else {
    groupByAssociate = {
      $group: {
        _id: {
          owner: "$uid",
          [`${parameter}`]: `$${parameter}`,
        },
        num: { $sum: 1 },
      },
    };
  }

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  let groupBySource;

  if (parameter === "stageChangeAt") {
    groupBySource = {
      $group: {
        _id: {
          source: "$source",
          [`${parameter}`]: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: `$${parameter}`,
              timezone: "+05:30",
            },
          },
        },
        num: { $sum: 1 },
      },
    };
  } else {
    groupBySource = {
      $group: {
        _id: {
          source: "$source",
          [`${parameter}`]: `$${parameter}`,
        },
        num: { $sum: 1 },
      },
    };
  }

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.source",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectSource = {
    $project: {
      source: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associateStatus: true };
    group = groupByAssociate;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { sourceStatus: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};
  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element[`${parameter}`] || [];
      makeKey.forEach((c) => {
        var key = c[`${parameter}`];
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

  let uidKeys = [];
  const leadFilter = req.body.leadFilter || {};
  const taskFilter = req.body.taskFilter || {};
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
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  if (!isObjectEmpty(leadUserFilter) && finalQuery) {
    const fullFinalQuery = JSON.parse(finalQuery);
    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    uidTeamTo.forEach((item) => {
      if (item.uid) uidKeys.push(item.uid);
    });
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const isLMOrAdmin = profile?.toLowerCase() === "lead manager" || profile?.toLowerCase() === "admin" || profile?.toLowerCase() === "superadmin";

  if (isLMOrAdmin) {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [
          { organizationId },
          { stage: "INTERESTED" },
          type,
        ];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organizationId,
        permission
      );
      try {
        const and = [
          { uid: { $in: usersList } },
          { stage: "INTERESTED" },
          type,
        ];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    }
  } else if (profile?.toLowerCase() === "team lead") {
    if (type.sourceStatus === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organizationId
    );
    try {
      const and = [
        { uid: { $in: usersList } },
        { stage: "INTERESTED" },
        type,
      ];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key) => {
          if (key == "reporting_to" || key == "branch") {
            and.push({ [`uid`]: { $in: uidKeys } });
          } else {
            and.push({ [`${key}`]: leadFilter[key] });
          }
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.sourceStatus === true) {
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, { stage: "INTERESTED" }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  }
};

const ReasonReport = async (req, res) => {
  const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
  const userQuery = mongoose.isValidObjectId(uid) ? { _id: uid } : { uid };
  const resultUser = await userModel.find(userQuery);
  if (resultUser.length === 0) {
    return res.send({ error: "User Not Found" });
  }

  const user = resultUser[0];
  const profile = user.role || user.profile;
  const organizationId = user.organizationId;
  const date_parameter = "leadAssignTime";

  let start_date, end_date, date_condition;

  if (req.body.start_date) {
    start_date = moment(req.body.start_date)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
  }

  if (req.body.end_date) {
    end_date = moment(req.body.end_date)
      .utcOffset("+05:30")
      .endOf("day")
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

  const parameter = req.body.parameter || "";
  const stage = req.body.stage || "";

  const groupByOwner = {
    $group: {
      _id: {
        owner: "$uid",
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  const groupByAssociatePropertyType = {
    $group: {
      _id: "$_id.owner",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectAssociate = {
    $project: {
      owner: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  const groupBySource = {
    $group: {
      _id: {
        source: "$source",
        [`${parameter}`]: `$${parameter}`,
      },
      num: { $sum: 1 },
    },
  };

  const groupBySourcePropertyType = {
    $group: {
      _id: "$_id.source",
      [`${parameter}`]: {
        $push: {
          [`${parameter}`]: `$_id.${parameter}`,
          count: "$num",
        },
      },
    },
  };

  const projectSource = {
    $project: {
      source: "$_id",
      _id: false,
      [`${parameter}`]: 1,
      total: {
        $sum: `$${parameter}.count`,
      },
    },
  };

  let type, group, groupBy, project;

  if (req.params.type === "associate") {
    type = { associateStatus: true };
    group = groupByOwner;
    groupBy = groupByAssociatePropertyType;
    project = projectAssociate;
  } else if (req.params.type === "source") {
    type = { sourceStatus: true };
    group = groupBySource;
    groupBy = groupBySourcePropertyType;
    project = projectSource;
  }

  let ChartCount = {};
  let Total = 0;

  const countHelp = (arr) => {
    arr.forEach((element) => {
      var makeKey = element[`${parameter}`] || [];
      makeKey.forEach((c) => {
        var key = c[`${parameter}`];
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

  let uidKeys = [];
  const leadFilter = req.body.leadFilter || {};
  const taskFilter = req.body.taskFilter || {};
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
      } else {
        leadFilter[key] = { $in: leadFilter[key] };
      }
    });

  if (!isObjectEmpty(leadUserFilter) && finalQuery) {
    const fullFinalQuery = JSON.parse(finalQuery);
    const uidTeamTo = await userModel.find(fullFinalQuery, { "_id": 0, "uid": 1 });
    uidTeamTo.forEach((item) => {
      if (item.uid) uidKeys.push(item.uid);
    });
  }

  !isObjectEmpty(taskFilter) &&
    Object.keys(taskFilter).forEach((key) => {
      if (datesField.includes(key)) {
        if (
          taskFilter[key].length &&
          taskFilter[key].length === 2
        ) {
          taskFilter[key] = {
            $gte: new Date(taskFilter[key][0]),
            $lte: new Date(taskFilter[key][1]),
          };
        }
      } else {
        taskFilter[key] = { $in: taskFilter[key] };
      }
    });

  const lookupTask = {
    $lookup: {
      from: "tasks",
      localField: "id",
      foreignField: "leadId",
      as: "tasks",
    },
  };

  const isLMOrAdmin = profile?.toLowerCase() === "lead manager" || profile?.toLowerCase() === "admin" || profile?.toLowerCase() === "superadmin";

  if (isLMOrAdmin) {
    const permission = user.branchPermission;
    if (
      permission === undefined ||
      (permission && permission.length === 0) ||
      (permission && permission.includes("All"))
    ) {
      try {
        const and = [
          { organizationId },
          { stage: stage },
          type,
        ];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    } else {
      let usersList = await getBranchUsers(
        uid,
        organizationId,
        permission
      );
      try {
        const and = [
          { uid: { $in: usersList } },
          { stage: stage },
          type,
        ];
        let report;

        if (date_condition) {
          and.push(date_condition);
        }

        if (!isObjectEmpty(leadUserFilter)) {
          and.push({ ["uid"]: { $in: uidKeys } });
        }

        let lookupand = [];

        if (!isObjectEmpty(taskFilter)) {
          const keys = Object.keys(taskFilter);
          keys.forEach((key) => {
            lookupand.push({ [`${key}`]: taskFilter[key] });
          });

          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            lookupTask,
            { $unwind: "$tasks" },
            {
              $match: {
                $and: lookupand,
              },
            },
            group,
            groupBy,
            project,
          ]);
        } else {
          report = await leadModel.aggregate([
            {
              $match: {
                $and: and,
              },
            },
            group,
            groupBy,
            project,
          ]);
        }

        countHelp(report);
        res.send({ report, ChartCount, Total });
      } catch (error) {
        console.error(error);
        res.send({ error });
      }
    }
  } else if (profile?.toLowerCase() === "team lead") {
    if (type.sourceStatus === true) {
      return res.send("Only for Lead manager");
    }
    let usersList = await getTeamUsers(
      uid,
      organizationId
    );
    try {
      const and = [
        { uid: { $in: usersList } },
        { stage: stage },
        type,
      ];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        const keys = Object.keys(leadFilter);
        keys.forEach((key) => {
          if (key == "reporting_to" || key == "branch") {
            and.push({ [`uid`]: { $in: uidKeys } });
          } else {
            and.push({ [`${key}`]: leadFilter[key] });
          }
        });
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        const keys = Object.keys(taskFilter);
        keys.forEach((key) => {
          lookupand.push({ [`${key}`]: taskFilter[key] });
        });

        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  } else {
    try {
      if (type.sourceStatus === true) {
        return res.send("Only for Lead manager");
      }

      const and = [{ uid }, { stage: stage }, type];
      let report;

      if (date_condition) {
        and.push(date_condition);
      }

      if (!isObjectEmpty(leadUserFilter)) {
        and.push({ ["uid"]: { $in: uidKeys } });
      }

      if (!isObjectEmpty(leadFilter)) {
        and.push(leadFilter);
      }

      let lookupand = [];

      if (!isObjectEmpty(taskFilter)) {
        lookupand.push(taskFilter);
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          lookupTask,
          { $unwind: "$tasks" },
          {
            $match: {
              $and: lookupand,
            },
          },
          group,
          groupBy,
          project,
        ]);
      } else {
        report = await leadModel.aggregate([
          {
            $match: {
              $and: and,
            },
          },
          group,
          groupBy,
          project,
        ]);
      }

      countHelp(report);
      res.send({ report, ChartCount, Total });
    } catch (error) {
      res.send({ error });
    }
  }
};

const QUERY_TIMEOUT_MS = 30000;

const cloneValue = (value) => JSON.parse(JSON.stringify(value ?? {}));

const createMockReqRes = (body, params = {}) => {
  const req = { body: cloneValue(body), params: { ...params } };
  let resolvePromise;

  const rawPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const promise = Promise.race([
    rawPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analytics sub-query timed out')), QUERY_TIMEOUT_MS)
    ),
  ]).catch((err) => {
    console.error('Analytics sub-query error:', err.message);
    return null;
  });

  const res = {
    status: function (code) {
      this._statusCode = code;
      return this;
    },
    send: function (data) {
      resolvePromise(data);
    },
    json: function (data) {
      resolvePromise(data);
    },
  };

  return { req, res, promise };
};

const dashboard = async (req, res) => {
  const type = req.params.type;
  console.log('Received analytics dashboard request with body:', req.body);
  try {
    const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
    const { start_date, end_date, callFilter, leadFilter, taskFilter, leadUserFilter } = req.body;

    console.log('Analytics dashboard request:', { uid, start_date, end_date });

    if (!uid) {
      return res.status(400).json({ success: false, message: 'Authentication required' });
    }

    const buildAnalyticsBody = () => ({
      uid,
      start_date,
      end_date,
      callFilter: cloneValue(callFilter),
      leadFilter: cloneValue(leadFilter),
      taskFilter: cloneValue(taskFilter),
      leadUserFilter: cloneValue(leadUserFilter),
    });

    const feedbackReq = createMockReqRes(
      buildAnalyticsBody(),
      { type }
    );

    const callBackReasonReportReq = createMockReqRes(
      buildAnalyticsBody(),
      { type }
    );

    const interestedStageReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'stageChangeAt' },
      { type }
    );

    const interestedBudgetReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'budget' },
      { type }
    );

    const interestedLocationReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'location' },
      { type }
    );

    const interestedProjectReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'projectName' },
      { type }
    );

    const interestedPropertyTypeReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'propertyType' },
      { type }
    );

    const interestedPropertyStageReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'propertyStage' },
      { type }
    );

    const lostReasonReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'lostReason', stage: 'LOST' },
      { type }
    );

    const notInterestedReasonReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'notIntReason', stage: 'NOT INTERESTED' },
      { type }
    );

    // Call individual reports locally
    feedbackReport(feedbackReq.req, feedbackReq.res);
    callBackReasonReport(callBackReasonReportReq.req, callBackReasonReportReq.res);
    InterestedReport(interestedStageReq.req, interestedStageReq.res);
    InterestedReport(interestedBudgetReq.req, interestedBudgetReq.res);
    InterestedReport(interestedLocationReq.req, interestedLocationReq.res);
    InterestedReport(interestedProjectReq.req, interestedProjectReq.res);
    InterestedReport(interestedPropertyTypeReq.req, interestedPropertyTypeReq.res);
    InterestedReport(interestedPropertyStageReq.req, interestedPropertyStageReq.res);
    ReasonReport(lostReasonReq.req, lostReasonReq.res);
    ReasonReport(notInterestedReasonReq.req, notInterestedReasonReq.res);

    const [
      feedback,
      callBackReason,
      interestedStage,
      interestedBudget,
      interestedLocation,
      interestedProject,
      interestedPropertyType,
      interestedPropertyStage,
      lostReason,
      notInterestedReason,
    ] = await Promise.all([
      feedbackReq.promise,
      callBackReasonReportReq.promise,
      interestedStageReq.promise,
      interestedBudgetReq.promise,
      interestedLocationReq.promise,
      interestedProjectReq.promise,
      interestedPropertyTypeReq.promise,
      interestedPropertyStageReq.promise,
      lostReasonReq.promise,
      notInterestedReasonReq.promise,
    ]);

    return res.status(200).json({
      success: true,
      feedback,
      callBackReason,
      interested: {
        stage: interestedStage,
        budget: interestedBudget,
        location: interestedLocation,
        project: interestedProject,
        propertyType: interestedPropertyType,
        propertyStage: interestedPropertyStage,
      },
      reasons: {
        lostReason,
        notInterestedReason,
      },
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
};

module.exports = {
  dashboard,
  feedbackReport,
  callBackReasonReport,
  InterestedReport,
  ReasonReport
};
