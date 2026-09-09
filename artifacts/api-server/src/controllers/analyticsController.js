const service = require('../services/analyticsService');

exports.getAnalyticsDashboardData = async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy || req.query.group_by;
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const { industryId, organizationId, workspaceId, workspace_id } = req.query;
    const authedUser = req.user;

    const data = await service.getAnalyticsDashboardData({
      authedUser,
      industryIdQuery: industryId,
      organizationIdQuery: organizationId,
      workspaceIdQuery: workspaceId || workspace_id,
      groupBy,
      startDate,
      endDate
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getDashboardConfig = async (req, res, next) => {
  try {
    const { industryId, organizationId } = req.query;
    const authedUser = req.user;

    const data = await service.getDashboardConfig({
      authedUser,
      industryIdQuery: industryId,
      organizationIdQuery: organizationId
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

const mongoose = require('mongoose');

function getIndustryDefaultTabs(industryCode) {
  const code = String(industryCode || '').toLowerCase().trim();
  const isHealthcare = code.includes('health') || code.includes('medic') || code.includes('clinic') || code.includes('hospital') || code.includes('patient') || code === 'temp0003';

  if (isHealthcare) {
    return [
      {
        id: 0,
        label: 'Patient Care Overview',
        sections: [
          {
            id: 'health_kpis',
            title: 'Patient Care Metrics',
            order: 0,
            is_active: true,
            widgets: [
              { id: 'totalPatients', type: 'KPI', title: 'Total Patient Inquiries', color: '#0D9488', bg: 'rgba(13,148,136,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
              { id: 'freshInquiries', type: 'KPI', title: 'Fresh Inquiries', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
              { id: 'callBack', type: 'KPI', title: 'Follow-up / Call Back', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PhoneCallbackIcon', data_key: 'cards.callBack' },
              { id: 'consulted', type: 'KPI', title: 'Consulted / Diagnosis', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
              { id: 'treatmentApproved', type: 'KPI', title: 'Treatment Approved (Won)', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' },
              { id: 'declined', type: 'KPI', title: 'Not Interested / Declined', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CancelIcon', data_key: 'cards.notInterested' },
              { id: 'dropped', type: 'KPI', title: 'Dropped Cases (Lost)', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', icon: 'TrendingDownIcon', data_key: 'cards.closedLost' },
              { id: 'completedConsultations', type: 'KPI', title: 'Completed Consultations', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'EventAvailableIcon', data_key: 'cards.completedVisits' },
              { id: 'scheduledConsultations', type: 'KPI', title: 'Scheduled Consultations', color: '#0284C7', bg: 'rgba(2,132,199,0.06)', icon: 'EventIcon', data_key: 'cards.scheduledVisits' }
            ]
          },
          {
            id: 'health_details',
            title: 'Specialty & Consultation Breakdown',
            order: 1,
            is_active: true,
            widgets: [
              {
                id: 'contacts_feedback',
                type: 'TABLE',
                title: 'Patient Inquiries & Consultation Breakdown',
                data_key: 'contacts.feedbackSummary',
                columns: [
                  { key: 'associate', label: 'Doctor / Coordinator' },
                  { key: 'total', label: 'Total Inquiries' },
                  { key: 'fresh', label: 'Fresh' },
                  { key: 'callBack', label: 'Follow-up' },
                  { key: 'interested', label: 'Consulted' },
                  { key: 'won', label: 'Treatment Approved' },
                  { key: 'notInterested', label: 'Declined' },
                  { key: 'lost', label: 'Dropped' },
                  { key: 'completedVisits', label: 'Completed Consultations' }
                ]
              },
              {
                id: 'contacts_callback',
                type: 'TABLE',
                title: 'Follow-up / Reschedule Reasons Summary',
                data_key: 'contacts.callBackReasons',
                columns: [
                  { key: 'associate', label: 'Doctor / Coordinator' },
                  { key: 'total', label: 'Total Follow-ups' }
                ]
              },
              {
                id: 'contacts_conversion_donut',
                type: 'CHART',
                title: 'Patient Care & Conversion Distribution',
                chart_type: 'donut',
                data_key: 'contacts.chartData'
              },
              {
                id: 'contacts_callback_chart',
                type: 'CHART',
                title: 'Follow-up Reasons Distribution',
                chart_type: 'bar',
                data_key: 'contacts.callBackReasons'
              }
            ]
          }
        ]
      },
      {
        id: 1,
        label: 'Consultations & Clinical Tasks',
        sections: [
          {
            id: 'tasks_overview',
            title: 'Completed Consultation Metrics',
            order: 0,
            is_active: true,
            widgets: [
              {
                id: 'tasks_completed',
                type: 'TABLE',
                title: 'Completed Consultations by Doctor / Staff',
                data_key: 'tasks.completedTasks',
                columns: [
                  { key: 'associate', label: 'Doctor / Coordinator' },
                  { key: 'total', label: 'Total Completed' },
                  { key: 'meeting', label: 'Clinical Meeting' },
                  { key: 'callBack', label: 'Telehealth / Follow-up' },
                  { key: 'siteVisit', label: 'In-Clinic Consultation' }
                ]
              },
              {
                id: 'tasks_completed_donut',
                type: 'CHART',
                title: 'Completed Consultations Distribution',
                chart_type: 'rose',
                data_key: 'tasks.completedChartData'
              }
            ]
          },
          {
            id: 'tasks_pending_section',
            title: 'Pending Consultation Metrics',
            order: 1,
            is_active: true,
            widgets: [
              {
                id: 'tasks_pending',
                type: 'TABLE',
                title: 'Pending Consultations by Doctor / Staff',
                data_key: 'tasks.pendingTasks',
                columns: [
                  { key: 'associate', label: 'Doctor / Coordinator' },
                  { key: 'total', label: 'Total Pending' },
                  { key: 'meeting', label: 'Clinical Meeting' },
                  { key: 'callBack', label: 'Telehealth / Follow-up' },
                  { key: 'siteVisit', label: 'In-Clinic Consultation' }
                ]
              },
              {
                id: 'tasks_pending_donut',
                type: 'CHART',
                title: 'Pending Consultations Distribution',
                chart_type: 'bar',
                data_key: 'tasks.pendingChartData'
              }
            ]
          }
        ]
      },
      {
        id: 2,
        label: 'Telehealth & Calling Analytics',
        sections: [
          {
            id: 'calling_insights',
            title: 'Telehealth & Consultation Call Durations',
            order: 0,
            is_active: true,
            widgets: [
              {
                id: 'call_trends_trend',
                type: 'CHART',
                title: 'Telehealth & Call Trends',
                chart_type: 'trend',
                data_key: 'callLogs.callingTrends'
              },
              {
                id: 'call_logs_table',
                type: 'TABLE',
                title: 'Consultation Call Duration Summary',
                data_key: 'callLogs.callLogSummary',
                columns: [
                  { key: 'associate', label: 'Doctor / Coordinator' },
                  { key: 'total', label: 'Total Calls' },
                  { key: 'duration0', label: '0 Sec' },
                  { key: 'duration0_30', label: '0-30 Sec' },
                  { key: 'duration31_60', label: '31-60 Sec' },
                  { key: 'duration61_120', label: '61-120 Sec' },
                  { key: 'durationAbove120', label: '>120 Sec' }
                ]
              }
            ]
          }
        ]
      }
    ];
  }

  // Default: Real Estate (temp0001)
  return [
    {
      id: 0,
      label: 'Contacts Overview',
      sections: [
        {
          id: 'contacts_kpis',
          title: 'Key Metrics Overview',
          order: 0,
          is_active: true,
          widgets: [
            { id: 'totalLeads', type: 'KPI', title: 'Total Enquiries', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
            { id: 'fresh', type: 'KPI', title: 'Fresh Leads', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
            { id: 'callBack', type: 'KPI', title: 'Call Back', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PhoneCallbackIcon', data_key: 'cards.callBack' },
            { id: 'interested', type: 'KPI', title: 'Interested / Site Visit', color: '#EAB308', bg: 'rgba(234,179,8,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
            { id: 'closedWon', type: 'KPI', title: 'Token / Booked', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' },
            { id: 'notInterested', type: 'KPI', title: 'Not Interested', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CancelIcon', data_key: 'cards.notInterested' },
            { id: 'closedLost', type: 'KPI', title: 'Closed Lost', color: '#F97316', bg: 'rgba(249,115,22,0.06)', icon: 'TrendingDownIcon', data_key: 'cards.closedLost' },
            { id: 'completedVisits', type: 'KPI', title: 'Completed Visits', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'EventAvailableIcon', data_key: 'cards.completedVisits' },
            { id: 'scheduledVisits', type: 'KPI', title: 'Scheduled Visits', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'EventIcon', data_key: 'cards.scheduledVisits' }
          ]
        },
        {
          id: 'contacts_details',
          title: 'Leads Conversion & Breakdown',
          order: 1,
          is_active: true,
          widgets: [
            {
              id: 'contacts_feedback',
              type: 'TABLE',
              title: 'Leads Feedback Breakdown',
              data_key: 'contacts.feedbackSummary',
              columns: [
                { key: 'associate', label: 'Associate/Group' },
                { key: 'total', label: 'Total' },
                { key: 'fresh', label: 'Fresh' },
                { key: 'callBack', label: 'Call Back' },
                { key: 'interested', label: 'Interested' },
                { key: 'won', label: 'Won' },
                { key: 'notInterested', label: 'Not Interested' },
                { key: 'lost', label: 'Lost' },
                { key: 'completedVisits', label: 'Completed Visits' }
              ]
            },
            {
              id: 'contacts_callback',
              type: 'TABLE',
              title: 'Callback Reasons Summary',
              data_key: 'contacts.callBackReasons',
              columns: [
                { key: 'associate', label: 'Associate/Group' },
                { key: 'total', label: 'Total Call Backs' }
              ]
            },
            {
              id: 'contacts_conversion_donut',
              type: 'CHART',
              title: 'Leads Conversion Distribution',
              chart_type: 'donut',
              data_key: 'contacts.chartData'
            },
            {
              id: 'contacts_callback_chart',
              type: 'CHART',
              title: 'Callback Reasons Distribution',
              chart_type: 'bar',
              data_key: 'contacts.callBackReasons'
            }
          ]
        }
      ]
    },
    {
      id: 1,
      label: 'Tasks & Meetings',
      sections: [
        {
          id: 'tasks_overview',
          title: 'Completed Task Metrics',
          order: 0,
          is_active: true,
          widgets: [
            {
              id: 'tasks_completed',
              type: 'TABLE',
              title: 'Completed Tasks by Associate',
              data_key: 'tasks.completedTasks',
              columns: [
                { key: 'associate', label: 'Associate/Group' },
                { key: 'total', label: 'Total Completed' },
                { key: 'meeting', label: 'Meeting' },
                { key: 'callBack', label: 'Call Back' },
                { key: 'siteVisit', label: 'Site Visit' }
              ]
            },
            {
              id: 'tasks_completed_donut',
              type: 'CHART',
              title: 'Completed Tasks Distribution',
              chart_type: 'rose',
              data_key: 'tasks.completedChartData'
            }
          ]
        },
        {
          id: 'tasks_pending_section',
          title: 'Pending Task Metrics',
          order: 1,
          is_active: true,
          widgets: [
            {
              id: 'tasks_pending',
              type: 'TABLE',
              title: 'Pending Tasks by Associate',
              data_key: 'tasks.pendingTasks',
              columns: [
                { key: 'associate', label: 'Associate/Group' },
                { key: 'total', label: 'Total Pending' },
                { key: 'meeting', label: 'Meeting' },
                { key: 'callBack', label: 'Call Back' },
                { key: 'siteVisit', label: 'Site Visit' }
              ]
            },
            {
              id: 'tasks_pending_donut',
              type: 'CHART',
              title: 'Pending Tasks Distribution',
              chart_type: 'bar',
              data_key: 'tasks.pendingChartData'
            }
          ]
        }
      ]
    },
    {
      id: 2,
      label: 'Calling Analytics',
      sections: [
        {
          id: 'calling_insights',
          title: 'Call Tracking & Durations',
          order: 0,
          is_active: true,
          widgets: [
            {
              id: 'call_trends_trend',
              type: 'CHART',
              title: 'Calling Trend',
              chart_type: 'trend',
              data_key: 'callLogs.callingTrends'
            },
            {
              id: 'call_logs_table',
              type: 'TABLE',
              title: 'Call Duration Summary',
              data_key: 'callLogs.callLogSummary',
              columns: [
                { key: 'associate', label: 'Associate/Group' },
                { key: 'total', label: 'Total Calls' },
                { key: 'duration0', label: '0 Sec' },
                { key: 'duration0_30', label: '0-30 Sec' },
                { key: 'duration31_60', label: '31-60 Sec' },
                { key: 'duration61_120', label: '61-120 Sec' },
                { key: 'durationAbove120', label: '>120 Sec' }
              ]
            }
          ]
        }
      ]
    }
  ];
}

exports.listConfigs = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const Industry = mongoose.model('Industry');
    const { industryId, organizationId } = req.query;
    const isSuperAdmin = req.user.role === 'superAdmin';

    let targetIndCode = industryId || req.user.industryId || req.user.industry_id || 'temp0001';
    let industryDoc = await Industry.findOne({ code: targetIndCode }).lean().exec();
    if (!industryDoc && mongoose.Types.ObjectId.isValid(targetIndCode)) {
      industryDoc = await Industry.findById(targetIndCode).lean().exec();
    }

    const industryIds = [targetIndCode];
    if (industryDoc) {
      industryIds.push(String(industryDoc._id));
      if (industryDoc.code) industryIds.push(industryDoc.code);
    }

    const indClause = {
      $or: [
        { industry_id: { $in: industryIds } },
        { industryId: { $in: industryIds } }
      ]
    };

    let query = { ...indClause };

    if (isSuperAdmin) {
      if (organizationId && organizationId !== 'null' && organizationId !== 'undefined') {
        query = {
          ...indClause,
          $or: [
            { organization_id: organizationId },
            { organizationId: organizationId }
          ]
        };
      } else {
        query = {
          ...indClause,
          $and: [
            { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
            { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
          ]
        };
      }
    } else if (organizationId === 'null' || req.query.baselineOnly === 'true') {
      // Client explicitly requesting baseline template for their industry
      query = {
        ...indClause,
        $and: [
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
          { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
        ]
      };
    } else {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      if (userOrgId) {
        query = {
          ...indClause,
          $or: [
            { organization_id: userOrgId },
            { organizationId: userOrgId },
            {
              $and: [
                { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
                { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
              ]
            }
          ]
        };
      } else {
        query = {
          ...indClause,
          $and: [
            { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
            { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
          ]
        };
      }
    }

    let docs = await AnalyticsConfig.find(query).lean().exec();

    // 1. Fallback to industry default template if organization override does not exist
    if (isSuperAdmin && organizationId && organizationId !== 'null' && organizationId !== 'undefined' && docs.length === 0) {
      const fallbackQuery = {
        ...indClause,
        $and: [
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
          { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
        ]
      };
      docs = await AnalyticsConfig.find(fallbackQuery).lean().exec();
    }

    // 2. Fallback to any global baseline template if specific industry baseline is not seeded
    if (docs.length === 0) {
      const globalQuery = {
        $and: [
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
          { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
        ]
      };
      docs = await AnalyticsConfig.find(globalQuery).lean().exec();
    }

    // 3. Fallback to standard baseline schema if database has no config documents yet
    if (docs.length === 0) {
      docs = [{
        industry_id: targetIndCode,
        industryId: targetIndCode,
        dashboard_key: 'default',
        tabs: getIndustryDefaultTabs(targetIndCode)
      }];
    }

    res.json({ items: docs });
  } catch (err) {
    next(err);
  }
};

exports.getConfigById = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const doc = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!doc) return res.status(404).json({ message: 'Config not found' });

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const docOrgId = doc.organization_id || doc.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Access denied to other organization configuration' });
      }
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.createConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const Industry = mongoose.model('Industry');
    const payload = req.body || {};

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const userIndId = req.user.industryId || req.user.industry_id;
      const userWsId = req.user.workspaceId || req.user.workspace_id;
      payload.organization_id = userOrgId;
      payload.organizationId = userOrgId;
      payload.industry_id = userIndId;
      payload.industryId = userIndId;
      payload.workspace_id = userWsId;
      payload.workspaceId = userWsId;
    }

    if (payload.industry_id || payload.industryId) {
      const indVal = payload.industry_id || payload.industryId;
      let ind = await Industry.findOne({ code: indVal }).lean().exec();
      if (!ind && mongoose.Types.ObjectId.isValid(indVal)) {
        ind = await Industry.findById(indVal).lean().exec();
      }
      if (ind) {
        payload.industry_id = String(ind._id);
        payload.industryId = String(ind._id);
      }
    }

    const targetOrgId = req.user.role === 'superAdmin'
      ? (payload.organization_id || payload.organizationId || null)
      : (req.user.organizationId || req.user.organization_id || null);

    if (targetOrgId) {
      payload.organization_id = targetOrgId;
      payload.organizationId = targetOrgId;
      if (!payload.workspace_id && !payload.workspaceId) {
        payload.workspace_id = 'ws_' + targetOrgId;
        payload.workspaceId = 'ws_' + targetOrgId;
      }
    }

    const matchQuery = {
      industry_id: payload.industry_id,
      dashboard_key: payload.dashboard_key || 'default'
    };

    if (targetOrgId) {
      matchQuery.$or = [{ organization_id: targetOrgId }, { organizationId: targetOrgId }];
    } else {
      matchQuery.$and = [
        { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
        { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
      ];
    }

    const existingConfig = await AnalyticsConfig.findOne(matchQuery).exec();

    if (existingConfig) {
      const updated = await AnalyticsConfig.findByIdAndUpdate(
        existingConfig._id,
        { $set: payload },
        { new: true }
      ).lean().exec();
      return res.json(updated);
    }

    const doc = await AnalyticsConfig.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const existing = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!existing) return res.status(404).json({ message: 'Config not found' });

    const targetOrgId = req.user.role === 'superAdmin'
      ? (req.body?.organization_id || req.body?.organizationId || null)
      : (req.user.organizationId || req.user.organization_id || null);

    if (req.user.role !== 'superAdmin' && !existing.organization_id && !existing.organizationId && !targetOrgId) {
      return res.status(403).json({ message: 'Forbidden: Only Super Admins can manage template configurations' });
    }

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const userWsId = req.user.workspaceId || req.user.workspace_id;
      const docOrgId = existing.organization_id || existing.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Cannot update other organization configuration' });
      }
      if (req.body) {
        req.body.organization_id = userOrgId;
        req.body.organizationId = userOrgId;
        req.body.workspace_id = userWsId;
        req.body.workspaceId = userWsId;
      }
    }

    // If superAdmin is targeting an organization override on a config that is currently a baseline template
    const existingIsTemplate = (!existing.organization_id && !existing.organizationId);
    if (targetOrgId && (existingIsTemplate || (existing.organization_id !== targetOrgId && existing.organizationId !== targetOrgId))) {
      const query = {
        $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }],
        industry_id: existing.industry_id,
        dashboard_key: existing.dashboard_key || 'default'
      };
      
      const updateData = {
        ...req.body,
        organization_id: targetOrgId,
        organizationId: targetOrgId,
        workspace_id: req.user.role === 'superAdmin' ? (req.body?.workspace_id || req.body?.workspaceId || 'ws_' + targetOrgId) : (req.user.workspaceId || req.user.workspace_id || 'ws_' + targetOrgId),
        workspaceId: req.user.role === 'superAdmin' ? (req.body?.workspace_id || req.body?.workspaceId || 'ws_' + targetOrgId) : (req.user.workspaceId || req.user.workspace_id || 'ws_' + targetOrgId),
        industry_id: existing.industry_id,
        industryId: existing.industry_id,
        dashboard_key: existing.dashboard_key || 'default'
      };
      delete updateData._id;
      delete updateData.id;

      const doc = await AnalyticsConfig.findOneAndUpdate(
        query,
        { $set: updateData },
        { upsert: true, new: true }
      ).lean().exec();
      return res.json(doc);
    }

    if (req.body && (req.body.industry_id || req.body.industryId)) {
      const Industry = mongoose.model('Industry');
      const indVal = req.body.industry_id || req.body.industryId;
      let ind = await Industry.findOne({ code: indVal }).lean().exec();
      if (!ind && mongoose.Types.ObjectId.isValid(indVal)) {
        ind = await Industry.findById(indVal).lean().exec();
      }
      if (ind) {
        req.body.industry_id = String(ind._id);
        req.body.industryId = String(ind._id);
      }
    }

    const doc = await AnalyticsConfig.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).lean().exec();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const existing = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!existing) return res.status(404).json({ message: 'Config not found' });

    const isExistingTemplate = (!existing.organization_id && !existing.organizationId);
    if (isExistingTemplate && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Forbidden: Only Super Admins can manage template configurations' });
    }

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const docOrgId = existing.organization_id || existing.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete other organization configuration' });
      }
    }

    await AnalyticsConfig.findByIdAndDelete(req.params.id).exec();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
