const mongoose = require('mongoose');
const moment = require('moment');
const { getVisibleUserIds } = require('./userHierarchyService');

// Helper to filter dates
function getDateRangeFilter(fieldName, startDate, endDate) {
  if (!startDate && !endDate) return {};
  const filter = {};
  if (startDate) {
    filter.$gte = moment(startDate).startOf('day').toDate();
  }
  if (endDate) {
    filter.$lte = moment(endDate).endOf('day').toDate();
  }
  return { [fieldName]: filter };
}

// Maps contact status/stage to visual cards/buckets
function getStatusCategory(status) {
  if (!status) return 'fresh';
  const s = String(status).toUpperCase().trim();
  if (s === 'FRESH' || s === 'NEW' || s === 'ACTIVE' || s === 'PENDING') return 'fresh';
  if (s === 'CALL BACK' || s === 'CALLBACK') return 'callBack';
  if (s === 'INTERESTED') return 'interested';
  if (s === 'CLOSED WON' || s === 'WON') return 'closedWon';
  if (s === 'NOT INTERESTED') return 'notInterested';
  if (s === 'CLOSED LOST' || s === 'LOST' || s === 'INACTIVE') return 'closedLost';
  return 'fresh';
}

function resolveAssociateName(creatorId, userMap) {
  if (!creatorId) return 'System / Unassigned';
  const resolved = userMap.get(String(creatorId));
  if (resolved) return resolved;
  
  // If not found in userMap, check if it's a name/email instead of an ID
  const isId = /^[0-9a-fA-F]{24}$/.test(String(creatorId)) || (String(creatorId).length > 20 && !String(creatorId).includes(' ') && !String(creatorId).includes('@'));
  if (!isId && String(creatorId).trim() !== '') {
    return String(creatorId);
  }
  return 'System / Unassigned';
}

async function getAnalyticsDashboardData({ authedUser, industryIdQuery, organizationIdQuery, groupBy = 'team', startDate, endDate }) {
  const User = mongoose.model('User');
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  const CallLog = mongoose.model('CallLog');
  const Organization = mongoose.model('Organization');
  const Industry = mongoose.model('Industry');

  const role = authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  // 1. Resolve organization/tenant filters
  let targetIndustry = null;
  let targetOrgId = null;

  if (isSuperAdmin) {
    if (industryIdQuery && industryIdQuery !== 'all') {
      targetIndustry = industryIdQuery;
    }
    if (organizationIdQuery && organizationIdQuery !== 'all') {
      targetOrgId = organizationIdQuery;
    }
  } else {
    targetIndustry = authedUser.industryId;
    targetOrgId = authedUser.organizationId;
  }

  let industryDoc = null;
  if (targetIndustry) {
    if (mongoose.Types.ObjectId.isValid(targetIndustry)) {
      industryDoc = await Industry.findById(targetIndustry).lean().exec();
    } else {
      industryDoc = await Industry.findOne({ code: targetIndustry }).lean().exec();
    }
  }

  let allowedOrgIds = [];
  if (targetOrgId) {
    allowedOrgIds = [targetOrgId];
  } else if (industryDoc) {
    const orgs = await Organization.find({
      $or: [
        { industryId: String(industryDoc._id) },
        { industry_id: industryDoc._id },
        { industryId: industryDoc.code },
        { industry_code: industryDoc.code }
      ]
    }).lean().exec();
    allowedOrgIds = orgs.map(o => o.organizationId || o.organization_id).filter(Boolean);
  }

  // 2. Fetch list of organizations from the Organizations collection (Super Admin only)
  let organizationsList = [];
  if (isSuperAdmin) {
    const orgDocs = await Organization.find({
      $or: [
        { isActive: { $ne: false } },
        { is_active: { $ne: false } }
      ]
    })
      .select('organizationId organization_id organizationName organization_name industryId industry_id')
      .lean()
      .exec();
    organizationsList = orgDocs.map(o => ({
      code: o.organizationId || o.organization_id,
      name: o.organizationName || o.organization_name || 'Unnamed Organization',
      industryId: String(o.industryId || o.industry_id || '')
    }));
  }

  // 3. Resolve role-based visibility filter
  const visibleUserIds = await getVisibleUserIds(authedUser);

  // 4. Build filters
  const contactFilter = {};
  const taskFilter = {};
  const callLogFilter = {};

  if (allowedOrgIds.length > 0) {
    contactFilter.organization_id = { $in: allowedOrgIds };
    taskFilter.organization_id = { $in: allowedOrgIds };
    callLogFilter.organization_id = { $in: allowedOrgIds };
  } else if (targetOrgId || targetIndustry) {
    // If a specific organization or industry was requested but resolved to no active orgs,
    // explicitly restrict to an empty set so we do not fall back to exposing all records.
    contactFilter.organization_id = { $in: [] };
    taskFilter.organization_id = { $in: [] };
    callLogFilter.organization_id = { $in: [] };
  }

  // Enforce hierarchical user permissions securely
  if (visibleUserIds !== null) {
    const allowedUserIds = visibleUserIds.map(id => String(id));
    const matchedUsers = await User.find({ _id: { $in: allowedUserIds } }).select('_id uid email name firstName lastName').lean().exec();
    
    const allowedUids = matchedUsers.map(u => u.uid).filter(Boolean);
    const allowedEmails = matchedUsers.map(u => u.email).filter(Boolean);
    const allowedNames = matchedUsers.map(u => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()).filter(Boolean);

    contactFilter.$or = [
      { createdBy: { $in: allowedUserIds } },
      { createdBy: { $in: allowedNames } },
      { createdBy: { $in: allowedEmails } },
      { uid: { $in: allowedUids } }
    ];
    taskFilter.$or = [
      { createdBy: { $in: allowedUserIds } },
      { createdBy: { $in: allowedNames } },
      { createdBy: { $in: allowedEmails } },
      { uid: { $in: allowedUids } }
    ];
    callLogFilter.$or = [
      { createdBy: { $in: allowedUserIds } },
      { createdBy: { $in: allowedNames } },
      { createdBy: { $in: allowedEmails } },
      { uid: { $in: allowedUids } }
    ];
  }

  // Apply date filters
  if (startDate || endDate) {
    const contactDate = getDateRangeFilter('createdAt', startDate, endDate);
    if (contactDate.createdAt) contactFilter.createdAt = contactDate.createdAt;

    const taskDate = getDateRangeFilter('createdAt', startDate, endDate);
    if (taskDate.createdAt) taskFilter.createdAt = taskDate.createdAt;

    const callLogDate = getDateRangeFilter('createdAt', startDate, endDate);
    if (callLogDate.createdAt) callLogFilter.createdAt = callLogDate.createdAt;
  }

  // Fetch all base data in parallel from tasks, calllogs, and contacts collections
  const [contacts, tasks, callLogs, usersList] = await Promise.all([
    Contact.find(contactFilter).lean().exec(),
    Task.find(taskFilter).lean().exec(),
    CallLog.find(callLogFilter).lean().exec(),
    User.find(targetOrgId ? { organization_id: targetOrgId } : {}).select('_id uid name firstName lastName email role team').lean().exec()
  ]);

  // Create lookups
  const userMap = new Map();
  const teamMap = new Map();
  usersList.forEach(u => {
    const displayName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
    userMap.set(String(u._id), displayName);
    if (u.uid) {
      userMap.set(u.uid, displayName);
    }
    teamMap.set(String(u._id), u.team || 'Unknown Team');
    if (u.uid) {
      teamMap.set(u.uid, u.team || 'Unknown Team');
    }
  });

  // ── KPI CARDS COMPUTATION ──────────────────────────────────────────────────
  const cards = {
    totalLeads: contacts.length,
    fresh: 0,
    callBack: 0,
    interested: 0,
    closedWon: 0,
    notInterested: 0,
    closedLost: 0,
    completedVisits: 0,
    scheduledVisits: 0
  };

  contacts.forEach(c => {
    const cat = getStatusCategory(c.stage || c.status);
    if (cards[cat] !== undefined) {
      cards[cat] += 1;
    }
  });

  tasks.forEach(t => {
    if (t.type === 'Site Visit' || t.taskType === 'Site Visit') {
      if (t.status === 'Completed' || t.status === 'COMPLETED') {
        cards.completedVisits += 1;
      } else {
        cards.scheduledVisits += 1;
      }
    }
  });

  // ── CONTACTS ANALYTICS ─────────────────────────────────────────────────────
  const contactsGroupMap = new Map();
  const callbackReasonsMap = new Map();

  const getInitContactRow = (label) => ({
    sNo: 0,
    associate: label,
    total: 0,
    fresh: 0,
    callBack: 0,
    interested: 0,
    won: 0,
    notInterested: 0,
    lost: 0,
    completedVisits: 0,
    scheduledVisits: 0
  });

  contacts.forEach(c => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = c.source || c.lead_source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      const creatorId = c.createdBy || c.uid;
      key = teamMap.get(String(creatorId)) || 'Unknown Team';
    } else {
      const creatorId = c.createdBy || c.uid;
      key = resolveAssociateName(creatorId, userMap);
    }

    if (!contactsGroupMap.has(key)) {
      contactsGroupMap.set(key, getInitContactRow(key));
    }
    const row = contactsGroupMap.get(key);
    row.total += 1;

    const cat = getStatusCategory(c.stage || c.status);
    if (cat === 'fresh') row.fresh += 1;
    else if (cat === 'callBack') {
      row.callBack += 1;
      callbackReasonsMap.set(key, (callbackReasonsMap.get(key) || 0) + 1);
    }
    else if (cat === 'interested') row.interested += 1;
    else if (cat === 'closedWon') row.won += 1;
    else if (cat === 'notInterested') row.notInterested += 1;
    else if (cat === 'closedLost') row.lost += 1;
  });

  // Merge visits from tasks into the contact groups
  tasks.forEach(t => {
    if (t.type === 'Site Visit' || t.taskType === 'Site Visit') {
      let key = 'Unknown';
      if (groupBy === 'source') {
        key = t.source || 'Unknown';
      } else if (groupBy === 'teamWise') {
        const creatorId = t.uid || t.createdBy;
        key = teamMap.get(String(creatorId)) || 'Unknown Team';
      } else {
        const creatorId = t.createdBy || t.uid;
        key = resolveAssociateName(creatorId, userMap);
      }

      if (contactsGroupMap.has(key)) {
        const row = contactsGroupMap.get(key);
        if (t.status === 'Completed' || t.status === 'COMPLETED') row.completedVisits += 1;
        else row.scheduledVisits += 1;
      }
    }
  });

  const feedbackSummary = Array.from(contactsGroupMap.values()).map((row, idx) => {
    row.sNo = idx + 1;
    return row;
  });

  const callBackReasons = Array.from(callbackReasonsMap.entries()).map(([label, total], idx) => ({
    sNo: idx + 1,
    associate: label,
    total
  }));

  const chartData = [
    { name: 'Not Interested', value: cards.notInterested },
    { name: 'Won', value: cards.closedWon },
    { name: 'Interested', value: cards.interested }
  ];

  // ── TASKS ANALYTICS ────────────────────────────────────────────────────────
  const completedTasksMap = new Map();
  const pendingTasksMap = new Map();
  const completedChartCounter = { Meeting: 0, Call: 0, 'Site Visit': 0 };
  const pendingChartCounter = { Meeting: 0, Call: 0, 'Site Visit': 0 };

  const getInitTaskRow = (label) => ({
    sNo: 0,
    associate: label,
    total: 0,
    meeting: 0,
    callBack: 0,
    siteVisit: 0
  });

  tasks.forEach(t => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = t.source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      const creatorId = t.uid || t.createdBy;
      key = teamMap.get(String(creatorId)) || 'Unknown Team';
    } else {
      const creatorId = t.createdBy || t.uid;
      key = resolveAssociateName(creatorId, userMap);
    }

    const type = t.type || t.taskType || 'Call';
    const isCompleted = t.status === 'Completed' || t.status === 'COMPLETED';

    const targetMap = isCompleted ? completedTasksMap : pendingTasksMap;
    const chartCounter = isCompleted ? completedChartCounter : pendingChartCounter;

    if (!targetMap.has(key)) {
      targetMap.set(key, getInitTaskRow(key));
    }
    const row = targetMap.get(key);
    row.total += 1;

    if (type === 'Meeting') {
      row.meeting += 1;
      chartCounter.Meeting += 1;
    } else if (type === 'Site Visit') {
      row.siteVisit += 1;
      chartCounter['Site Visit'] += 1;
    } else {
      row.callBack += 1; // treat calls/callbacks
      chartCounter.Call += 1;
    }
  });

  const completedTasks = Array.from(completedTasksMap.values()).map((row, idx) => {
    row.sNo = idx + 1;
    return row;
  });

  const pendingTasks = Array.from(pendingTasksMap.values()).map((row, idx) => {
    row.sNo = idx + 1;
    return row;
  });

  const completedChartData = Object.entries(completedChartCounter).map(([name, value]) => ({ name, value }));
  const pendingChartData = Object.entries(pendingChartCounter).map(([name, value]) => ({ name, value }));

  // ── CALL LOGS ANALYTICS ────────────────────────────────────────────────────
  const callingTrendsMap = new Map();
  const callLogSummaryMap = new Map();

  const getInitCallLogRow = (label) => ({
    sNo: 0,
    associate: label,
    total: 0,
    duration0: 0,
    duration0_30: 0,
    duration31_60: 0,
    duration61_120: 0,
    durationAbove120: 0
  });

  callLogs.forEach(log => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = log.source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      const creatorId = log.uid || log.createdBy;
      key = teamMap.get(String(creatorId)) || 'Unknown Team';
    } else {
      const creatorId = log.createdBy || log.uid;
      key = resolveAssociateName(creatorId, userMap);
    }

    if (!callLogSummaryMap.has(key)) {
      callLogSummaryMap.set(key, getInitCallLogRow(key));
    }
    const summaryRow = callLogSummaryMap.get(key);
    summaryRow.total += 1;

    const d = Number(log.duration) || 0;
    if (d === 0) summaryRow.duration0 += 1;
    else if (d <= 30) summaryRow.duration0_30 += 1;
    else if (d <= 60) summaryRow.duration31_60 += 1;
    else if (d <= 120) summaryRow.duration61_120 += 1;
    else summaryRow.durationAbove120 += 1;

    if (log.createdAt) {
      const dObj = new Date(log.createdAt);
      if (!isNaN(dObj.getTime())) {
        const formattedDate = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        callingTrendsMap.set(formattedDate, (callingTrendsMap.get(formattedDate) || 0) + 1);
      }
    }
  });

  const callLogSummary = Array.from(callLogSummaryMap.values()).map((row, idx) => {
    row.sNo = idx + 1;
    return row;
  });

  const callingTrends = Array.from(callingTrendsMap.entries())
    .map(([date, calls]) => ({ date, calls }))
    .sort((a, b) => {
      const partsA = a.date.split('-');
      const partsB = b.date.split('-');
      const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      return dateA.getTime() - dateB.getTime();
    });

  if (callingTrends.length === 0) {
    callingTrends.push({ date: moment().format('DD-MM-YYYY'), calls: 0 });
  }

  return {
    organizationsList,
    cards,
    contacts: {
      feedbackSummary,
      callBackReasons,
      chartData
    },
    tasks: {
      completedTasks,
      completedChartData,
      pendingTasks,
      pendingChartData
    },
    callLogs: {
      callingTrends,
      callLogSummary
    }
  };
}

async function getDashboardConfig({ authedUser, industryIdQuery, organizationIdQuery }) {
  const AnalyticsConfig = mongoose.model('AnalyticsConfig');
  const Industry = mongoose.model('Industry');
  const Organization = mongoose.model('Organization');

  let orgId = authedUser.organizationId;
  let industryCode = authedUser.industryId || 'temp0001';

  // Super admin can request configuration for a specific organization/industry
  if (authedUser.role === 'superAdmin') {
    if (organizationIdQuery && organizationIdQuery !== 'all') {
      orgId = organizationIdQuery;
    } else {
      orgId = null;
    }

    if (industryIdQuery && industryIdQuery !== 'all') {
      const org = await Organization.findOne({
        $or: [
          { organizationId: industryIdQuery },
          { industryId: industryIdQuery }
        ]
      }).lean().exec();

      if (org) {
        if (!orgId) orgId = org.organizationId;
        industryCode = org.industryId;
      } else {
        industryCode = industryIdQuery;
      }
    }
  }

  // 1. Try to find organization-specific config
  if (orgId) {
    const orgConfig = await AnalyticsConfig.findOne({ organization_id: orgId }).lean().exec();
    if (orgConfig) return orgConfig;
  }

  // 2. Try to find industry-specific config
  let industryDoc = await Industry.findOne({ code: industryCode }).lean().exec();
  if (!industryDoc && mongoose.Types.ObjectId.isValid(industryCode)) {
    industryDoc = await Industry.findById(industryCode).lean().exec();
  }

  if (industryDoc) {
    const indConfig = await AnalyticsConfig.findOne({ industry_id: String(industryDoc._id) }).lean().exec();
    if (indConfig) return indConfig;
  }

  // 3. Fallback to default Real Estate config
  const fallback = await AnalyticsConfig.findOne({ organization_id: null }).lean().exec();
  return fallback;
}

module.exports = { getAnalyticsDashboardData, getDashboardConfig };
