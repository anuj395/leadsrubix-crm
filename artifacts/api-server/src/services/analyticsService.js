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
  if (s.includes('LOST') || s.includes('REFUSED') || s.includes('INACTIVE')) return 'closedLost';
  if (s.includes('NOT INTEREST') || s.includes('NOT_INTEREST') || s.includes('NOT-INTEREST')) return 'notInterested';
  if (s.includes('WON') || s.includes('DEAL') || s.includes('BOOKED') || s.includes('CONVERT')) return 'closedWon';
  if (s.includes('INTEREST') || s.includes('QUALIF') || s.includes('VISIT')) return 'interested';
  if (s.includes('CALLBACK') || s.includes('CALL BACK') || s.includes('RESCHEDULE')) return 'callBack';
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

async function getAnalyticsDashboardData({ authedUser, industryIdQuery, organizationIdQuery, workspaceIdQuery, groupBy = 'team', startDate, endDate }) {
  const User = mongoose.model('User');
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  const CallLog = mongoose.model('CallLog');
  const Organization = mongoose.model('Organization');
  const Industry = mongoose.model('Industry');

  const role = authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  // 0. Non-SuperAdmin Access Check: Only organizations with show_analytics active can access Analytics
  if (!isSuperAdmin) {
    const userOrgId = authedUser.organizationId || authedUser.organization_id;
    if (userOrgId) {
      const orgDoc = await Organization.findOne({
        $or: [
          { organizationId: userOrgId },
          { organization_id: userOrgId },
          ...(mongoose.Types.ObjectId.isValid(userOrgId) ? [{ _id: userOrgId }] : [])
        ]
      }).lean().exec();

      if (orgDoc && (orgDoc.show_analytics === false || orgDoc.showAnalytics === false)) {
        return {
          showAnalytics: false,
          message: 'Analytics is disabled for your organization.',
          organizationsList: [],
          cards: {
            totalLeads: 0,
            fresh: 0,
            callBack: 0,
            interested: 0,
            closedWon: 0,
            notInterested: 0,
            closedLost: 0,
            completedVisits: 0,
            scheduledVisits: 0
          },
          contacts: {
            feedbackSummary: [],
            callBackReasons: [],
            callBackReasonsChart: [],
            chartData: []
          },
          tasks: {
            completedTasks: [],
            completedChartData: [],
            pendingTasks: [],
            pendingChartData: []
          },
          callLogs: {
            callingTrends: [],
            callLogSummary: []
          }
        };
      }
    }
  }

  // 1. Resolve organization/tenant/workspace filters
  let targetIndustry = null;
  let targetOrgId = null;
  let targetWorkspaceId = null;

  if (isSuperAdmin) {
    if (industryIdQuery && industryIdQuery !== 'all') {
      targetIndustry = industryIdQuery;
    }
    if (organizationIdQuery && organizationIdQuery !== 'all') {
      targetOrgId = organizationIdQuery;
    }
    if (workspaceIdQuery && workspaceIdQuery !== 'all') {
      targetWorkspaceId = workspaceIdQuery;
    }
  } else {
    // Non-superAdmin (Role Admin, Team Lead, Sales, etc.) MUST strictly and ONLY see their own organization's data
    targetOrgId = authedUser.organizationId || authedUser.organization_id || null;
    targetIndustry = authedUser.industryId || null;
    targetWorkspaceId = workspaceIdQuery || authedUser.workspaceId || authedUser.workspace_id || null;
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
    // Strictly isolate data to this organization only
    allowedOrgIds = [targetOrgId];
  } else if (isSuperAdmin && industryDoc) {
    const orgOrFilter = [
      { industryId: industryDoc.code },
      { industry_code: industryDoc.code },
      { industryId: String(industryDoc._id) },
      { industry_id: String(industryDoc._id) }
    ];
    if (mongoose.Types.ObjectId.isValid(industryDoc._id)) {
      orgOrFilter.push({ industry_id: industryDoc._id });
    }
    const orgs = await Organization.find({ $or: orgOrFilter }).lean().exec();
    allowedOrgIds = orgs
      .filter(o => o.show_analytics !== false && o.showAnalytics !== false)
      .map(o => o.organizationId || o.organization_id)
      .filter(Boolean);
  } else if (isSuperAdmin) {
    // Global Super Admin aggregation across all organizations with active analytics
    const orgs = await Organization.find({
      $or: [
        { isActive: { $ne: false } },
        { is_active: { $ne: false } }
      ]
    }).lean().exec();
    allowedOrgIds = orgs
      .filter(o => o.show_analytics !== false && o.showAnalytics !== false)
      .map(o => o.organizationId || o.organization_id)
      .filter(Boolean);
  } else {
    // Non-superAdmin without an organization ID has NO access to any records
    allowedOrgIds = ['__NO_ORG_ACCESS__'];
  }

  // 2. Fetch list of organizations with active analytics for Super Admin dropdown
  let organizationsList = [];
  if (isSuperAdmin) {
    const orgDocs = await Organization.find({
      $or: [
        { isActive: { $ne: false } },
        { is_active: { $ne: false } }
      ]
    })
      .select('organizationId organization_id organizationName organization_name industryId industry_id show_analytics showAnalytics')
      .lean()
      .exec();
    organizationsList = orgDocs
      .filter(o => o.show_analytics !== false && o.showAnalytics !== false)
      .map(o => ({
        code: o.organizationId || o.organization_id,
        name: o.organizationName || o.organization_name || 'Unnamed Organization',
        industryId: String(o.industryId || o.industry_id || ''),
        showAnalytics: true
      }));
  }

  // 3. Resolve role-based visibility filter
  const visibleUserIds = await getVisibleUserIds(authedUser);

  // 4. Build filters
  const contactFilter = {};
  const taskFilter = {};
  const callLogFilter = {};

  if (allowedOrgIds.length > 0) {
    const orgOr = [
      { organization_id: { $in: allowedOrgIds } },
      { organizationId: { $in: allowedOrgIds } }
    ];
    contactFilter.$or = orgOr;
    taskFilter.$or = orgOr;
    callLogFilter.$or = orgOr;
  } else if (targetOrgId || targetIndustry) {
    // If a specific organization or industry was requested but resolved to no active orgs,
    // explicitly restrict to an empty set so we do not fall back to exposing all records.
    contactFilter.organization_id = { $in: [] };
    taskFilter.organization_id = { $in: [] };
    callLogFilter.organization_id = { $in: [] };
  }

  // Only filter workspace if explicitly requested in query parameters
  if (workspaceIdQuery && workspaceIdQuery !== 'all') {
    const wsOr = [
      { workspace_id: workspaceIdQuery },
      { workspaceId: workspaceIdQuery }
    ];
    contactFilter.$and = contactFilter.$and || [];
    contactFilter.$and.push({ $or: wsOr });
    taskFilter.$and = taskFilter.$and || [];
    taskFilter.$and.push({ $or: wsOr });
    callLogFilter.$and = callLogFilter.$and || [];
    callLogFilter.$and.push({ $or: wsOr });
  }

  // Enforce hierarchical user permissions securely
  if (visibleUserIds !== null) {
    const allowedUserIds = visibleUserIds.map(id => String(id));
    const matchedUsers = await User.find({ _id: { $in: allowedUserIds } }).select('_id uid email name firstName lastName').lean().exec();
    
    const allowedUids = matchedUsers.map(u => u.uid).filter(Boolean);
    const allowedEmails = matchedUsers.map(u => u.email).filter(Boolean);
    const allowedEmailsLower = allowedEmails.map(e => e.toLowerCase());
    const allowedNames = matchedUsers.map(u => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()).filter(Boolean);

    const allUserIdentifiers = Array.from(new Set([
      ...allowedUserIds,
      ...allowedUids,
      ...allowedEmails,
      ...allowedEmailsLower,
      ...allowedNames
    ]));

    const contactUserOr = [
      { createdBy: { $in: allUserIdentifiers } },
      { uid: { $in: allUserIdentifiers } },
      { assigned_to: { $in: allUserIdentifiers } },
      { assignedTo: { $in: allUserIdentifiers } },
      { contact_owner_email: { $in: allUserIdentifiers } },
      { contactOwnerEmail: { $in: allUserIdentifiers } },
      { owner_id: { $in: allUserIdentifiers } },
      { ownerId: { $in: allUserIdentifiers } }
    ];

    const taskUserOr = [
      { createdBy: { $in: allUserIdentifiers } },
      { uid: { $in: allUserIdentifiers } },
      { assigned_to: { $in: allUserIdentifiers } },
      { assignedTo: { $in: allUserIdentifiers } },
      { userId: { $in: allUserIdentifiers } },
      { user_id: { $in: allUserIdentifiers } }
    ];

    const callLogUserOr = [
      { createdBy: { $in: allUserIdentifiers } },
      { uid: { $in: allUserIdentifiers } },
      { userId: { $in: allUserIdentifiers } },
      { user_id: { $in: allUserIdentifiers } },
      { caller_id: { $in: allUserIdentifiers } },
      { callerId: { $in: allUserIdentifiers } },
      { caller_email: { $in: allUserIdentifiers } },
      { callerEmail: { $in: allUserIdentifiers } }
    ];

    contactFilter.$and = contactFilter.$and || [];
    contactFilter.$and.push({ $or: contactUserOr });

    taskFilter.$and = taskFilter.$and || [];
    taskFilter.$and.push({ $or: taskUserOr });

    callLogFilter.$and = callLogFilter.$and || [];
    callLogFilter.$and.push({ $or: callLogUserOr });
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
    Contact.find(contactFilter).lean().exec().catch(() => []),
    Task.find(taskFilter).lean().exec().catch(() => []),
    CallLog.find(callLogFilter).lean().exec().catch(() => []),
    User.find(targetOrgId ? { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }] } : {}).select('_id uid name firstName lastName email role team').lean().exec().catch(() => [])
  ]);

  const allLeads = contacts.map(c => ({
    ...c,
    stage: c.stage || c.status || c.lead_status || c.property_stage || c.propertyStage || 'FRESH',
    status: c.stage || c.status || c.lead_status || c.property_stage || c.propertyStage || 'FRESH',
    customerName: c.name || c.customerName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Lead',
    contactNumber: c.phone || c.contactNo || c.contactNumber || c.contact_number || ''
  }));

  // Create lookups
  const userMap = new Map();
  const teamMap = new Map();
  usersList.forEach(u => {
    const displayName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
    userMap.set(String(u._id), displayName);
    if (u.email) {
      userMap.set(u.email.toLowerCase(), displayName);
      userMap.set(u.email, displayName);
    }
    if (u.uid) {
      userMap.set(u.uid, displayName);
    }
    teamMap.set(String(u._id), u.team || 'Unknown Team');
    if (u.email) {
      teamMap.set(u.email.toLowerCase(), u.team || 'Unknown Team');
      teamMap.set(u.email, u.team || 'Unknown Team');
    }
    if (u.uid) {
      teamMap.set(u.uid, u.team || 'Unknown Team');
    }
  });

  // ── KPI CARDS COMPUTATION ──────────────────────────────────────────────────
  const cards = {
    totalLeads: allLeads.length,
    fresh: 0,
    callBack: 0,
    interested: 0,
    closedWon: 0,
    notInterested: 0,
    closedLost: 0,
    completedVisits: 0,
    scheduledVisits: 0
  };

  allLeads.forEach(c => {
    const cat = getStatusCategory(c.stage || c.status || c.lead_status || c.property_stage || c.propertyStage);
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

  allLeads.forEach(c => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = c.source || c.lead_source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      const userRef = c.assigned_to || c.assignedTo || c.contact_owner_email || c.createdBy || c.uid;
      key = teamMap.get(String(userRef).toLowerCase()) || teamMap.get(String(userRef)) || 'Unknown Team';
    } else {
      const userRef = c.assigned_to || c.assignedTo || c.contact_owner_email || c.createdBy || c.uid;
      key = resolveAssociateName(userRef, userMap);
    }

    if (!contactsGroupMap.has(key)) {
      contactsGroupMap.set(key, getInitContactRow(key));
    }
    const row = contactsGroupMap.get(key);
    row.total += 1;

    const cat = getStatusCategory(c.stage || c.status || c.lead_status || c.property_stage || c.propertyStage);
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
    total,
    name: label,
    value: total
  }));

  const chartData = [
    { name: 'Not Interested', value: cards.notInterested },
    { name: 'Won', value: cards.closedWon },
    { name: 'Interested', value: cards.interested }
  ];

  const callBackReasonsChart = callBackReasons.map(r => ({
    name: r.associate,
    value: r.total
  }));

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
      const userRef = t.assignedTo || t.assigned_to || t.userId || t.user_id || t.uid || t.createdBy;
      key = teamMap.get(String(userRef).toLowerCase()) || teamMap.get(String(userRef)) || 'Unknown Team';
    } else {
      const userRef = t.assignedTo || t.assigned_to || t.userId || t.user_id || t.createdBy || t.uid;
      key = resolveAssociateName(userRef, userMap);
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
      const userRef = log.userId || log.user_id || log.caller_id || log.callerId || log.caller_email || log.uid || log.createdBy;
      key = teamMap.get(String(userRef).toLowerCase()) || teamMap.get(String(userRef)) || 'Unknown Team';
    } else {
      const userRef = log.userId || log.user_id || log.caller_id || log.callerId || log.caller_email || log.createdBy || log.uid;
      key = resolveAssociateName(userRef, userMap);
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
    showAnalytics: true,
    organizationsList,
    cards,
    contacts: {
      feedbackSummary,
      callBackReasons,
      callBackReasonsChart,
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

  let orgId = organizationIdQuery || authedUser.organizationId || authedUser.organization_id;
  let industryCode = industryIdQuery || authedUser.industryId || authedUser.industry_id || 'temp0001';

  if (authedUser.role !== 'superAdmin' && orgId) {
    const orgDoc = await Organization.findOne({
      $or: [
        { organizationId: orgId },
        { organization_id: orgId },
        ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
      ]
    }).lean().exec();

    if (orgDoc && (orgDoc.show_analytics === false || orgDoc.showAnalytics === false)) {
      return { showAnalytics: false };
    }
  }

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
  let industryDoc = await Industry.findOne({
    $or: [
      { code: industryCode },
      { id: industryCode },
      ...(mongoose.Types.ObjectId.isValid(industryCode) ? [{ _id: industryCode }] : [])
    ]
  }).lean().exec();

  const indIds = [industryCode];
  if (industryDoc) {
    indIds.push(String(industryDoc._id));
    if (industryDoc.code) indIds.push(industryDoc.code);
    if (industryDoc.id) indIds.push(industryDoc.id);
  }

  const indConfig = await AnalyticsConfig.findOne({ industry_id: { $in: indIds } }).lean().exec();
  if (indConfig) return indConfig;

  // 3. Fallback to default Real Estate config
  const fallback = await AnalyticsConfig.findOne({ organization_id: null }).lean().exec();
  return fallback;
}

module.exports = { getAnalyticsDashboardData, getDashboardConfig };
