const mongoose = require('mongoose');
const { getVisibleUserIds } = require('./userHierarchyService');

// Helper to filter dates
function getDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }
  return filter;
}

// Maps contact status to visual cards/buckets
function getStatusCategory(status) {
  if (!status) return 'fresh';
  const s = String(status).toLowerCase().trim();
  if (s === 'fresh' || s === 'new' || s === 'active' || s === 'pending') return 'fresh';
  if (s === 'call back' || s === 'callback') return 'callBack';
  if (s === 'interested') return 'interested';
  if (s === 'closed won' || s === 'won') return 'closedWon';
  if (s === 'not interested') return 'notInterested';
  if (s === 'closed lost' || s === 'lost' || s === 'inactive') return 'closedLost';
  return 'fresh';
}

async function getAnalyticsDashboardData({ authedUser, industryIdQuery, groupBy = 'team', startDate, endDate }) {
  const User = mongoose.model('User');
  const Contact = mongoose.model('Contact');
  const Booking = mongoose.model('Booking');
  const Industry = mongoose.model('Industry');

  const role = authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  // 1. Resolve organization filters
  let targetIndustry = null;
  if (isSuperAdmin) {
    if (industryIdQuery && industryIdQuery !== 'all') {
      targetIndustry = industryIdQuery;
    }
  } else {
    targetIndustry = authedUser.industryId;
  }

  // 2. Fetch list of organizations (Super Admin only)
  let organizationsList = [];
  if (isSuperAdmin) {
    organizationsList = await Industry.find({ isActive: { $ne: false } }).select('code name').lean().exec();
  }

  // 3. Resolve role-based visibility filter
  const visibleUserIds = await getVisibleUserIds(authedUser);

  // 4. Build filters
  const contactFilter = {};
  const bookingFilter = { isActive: { $ne: false } };

  if (targetIndustry) {
    contactFilter.industryId = targetIndustry;
    bookingFilter.industryId = targetIndustry;
  }

  if (visibleUserIds !== null) {
    contactFilter.createdBy = { $in: visibleUserIds };
    bookingFilter.createdBy = { $in: visibleUserIds };
  }

  const dateFilter = getDateFilter(startDate, endDate);
  if (dateFilter.createdAt) {
    contactFilter.createdAt = dateFilter.createdAt;
    bookingFilter.createdAt = dateFilter.createdAt;
  }

  // Fetch all base data in parallel to keep aggregation fast
  const [contacts, bookings, usersList] = await Promise.all([
    Contact.find(contactFilter).lean().exec(),
    Booking.find(bookingFilter).lean().exec(),
    User.find(targetIndustry ? { industryId: targetIndustry } : {}).select('_id name email role').lean().exec()
  ]);

  // Create lookups
  const userMap = new Map();
  usersList.forEach(u => {
    userMap.set(String(u._id), u.name || u.email);
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
    const cat = getStatusCategory(c.status);
    if (cards[cat] !== undefined) {
      cards[cat] += 1;
    }
  });

  bookings.forEach(b => {
    if (b.task_type === 'Site Visit') {
      if (b.status === 'Completed') {
        cards.completedVisits += 1;
      } else {
        cards.scheduledVisits += 1;
      }
    }
  });

  // ── CONTACTS ANALYTICS ─────────────────────────────────────────────────────
  // Group keys map dynamically depending on groupBy
  const contactsGroupMap = new Map(); // key -> contact stats object
  const callbackReasonsMap = new Map(); // key -> callback count

  // Initialize group slots helper
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

  // Fetch related bookings to map contact team/source
  const contactBookingMap = new Map();
  bookings.forEach(b => {
    if (b.contact_id) {
      contactBookingMap.set(String(b.contact_id), b);
    }
  });

  contacts.forEach(c => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = c.lead_source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      // Find booking for this contact to get team
      const b = contactBookingMap.get(String(c._id));
      key = b?.team || 'Unknown Team';
    } else {
      // Default: group by associate owner
      const uid = String(c.createdBy);
      key = userMap.get(uid) || 'System / Unassigned';
    }

    if (!contactsGroupMap.has(key)) {
      contactsGroupMap.set(key, getInitContactRow(key));
    }
    const row = contactsGroupMap.get(key);
    row.total += 1;

    const cat = getStatusCategory(c.status);
    if (cat === 'fresh') row.fresh += 1;
    else if (cat === 'callBack') {
      row.callBack += 1;
      // Record callback counts
      callbackReasonsMap.set(key, (callbackReasonsMap.get(key) || 0) + 1);
    }
    else if (cat === 'interested') row.interested += 1;
    else if (cat === 'closedWon') row.won += 1;
    else if (cat === 'notInterested') row.notInterested += 1;
    else if (cat === 'closedLost') row.lost += 1;
  });

  // Merge visits from bookings into the groups
  bookings.forEach(b => {
    if (b.task_type === 'Site Visit') {
      let key = 'Unknown';
      if (groupBy === 'source') {
        // Try mapping contact source
        key = b.contactDetails?.lead_source || 'Unknown';
      } else if (groupBy === 'teamWise') {
        key = b.team || 'Unknown Team';
      } else {
        key = userMap.get(String(b.createdBy)) || 'System / Unassigned';
      }

      if (contactsGroupMap.has(key)) {
        const row = contactsGroupMap.get(key);
        if (b.status === 'Completed') row.completedVisits += 1;
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

  bookings.forEach(b => {
    let key = 'Unknown';
    if (groupBy === 'source') {
      key = b.contactDetails?.lead_source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      key = b.team || 'Unknown Team';
    } else {
      key = userMap.get(String(b.createdBy)) || 'System / Unassigned';
    }

    const type = b.task_type || 'Call';
    const isCompleted = b.status === 'Completed';

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
      row.callBack += 1; // treat calls/callbacks underCallBack
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

  bookings.forEach(b => {
    const logs = b.callLogs || [];
    if (!logs.length) return;

    let key = 'Unknown';
    if (groupBy === 'source') {
      key = b.contactDetails?.lead_source || 'Unknown';
    } else if (groupBy === 'teamWise') {
      key = b.team || 'Unknown Team';
    } else {
      key = userMap.get(String(b.createdBy)) || 'System / Unassigned';
    }

    if (!callLogSummaryMap.has(key)) {
      callLogSummaryMap.set(key, getInitCallLogRow(key));
    }
    const summaryRow = callLogSummaryMap.get(key);

    logs.forEach(log => {
      summaryRow.total += 1;
      const d = Number(log.duration) || 0;

      if (d === 0) summaryRow.duration0 += 1;
      else if (d <= 30) summaryRow.duration0_30 += 1;
      else if (d <= 60) summaryRow.duration31_60 += 1;
      else if (d <= 120) summaryRow.duration61_120 += 1;
      else summaryRow.durationAbove120 += 1;

      // Extract trend date YYYY-MM-DD
      if (log.timestamp) {
        const dObj = new Date(log.timestamp);
        if (!isNaN(dObj.getTime())) {
          // Format date as DD-MM-YYYY or YYYY-MM-DD
          const formattedDate = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
          callingTrendsMap.set(formattedDate, (callingTrendsMap.get(formattedDate) || 0) + 1);
        }
      }
    });
  });

  const callLogSummary = Array.from(callLogSummaryMap.values()).map((row, idx) => {
    row.sNo = idx + 1;
    return row;
  });

  // Calling trends sorted by date
  const callingTrends = Array.from(callingTrendsMap.entries())
    .map(([date, calls]) => ({ date, calls }))
    .sort((a, b) => {
      const partsA = a.date.split('-');
      const partsB = b.date.split('-');
      const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      return dateA.getTime() - dateB.getTime();
    });

  // If callingTrends empty, pre-populate with current range or mock points
  if (callingTrends.length === 0) {
    callingTrends.push({ date: '13-06-2026', calls: 0 });
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

module.exports = { getAnalyticsDashboardData };
