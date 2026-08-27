import { analyticsRepository, AnalyticsQueryParams } from '../repositories/analyticsRepository';

export interface CardMetrics {
  totalLeads: number;
  fresh: number;
  callBack: number;
  interested: number;
  closedWon: number;
  notInterested: number;
  closedLost: number;
  completedVisits: number;
  scheduledVisits: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  pct: string;
  color: string;
}

export interface CallingTrendItem {
  date: string;
  calls: number;
}

export interface CallDurationBuckets {
  duration0: number;
  duration0_30: number;
  duration31_60: number;
  duration61_120: number;
  durationAbove120: number;
}

export interface FeedbackRow {
  sNo: number;
  associate: string;
  total: number;
  fresh: number;
  callBack: number;
  interested: number;
  won: number;
  notInterested: number;
  lost: number;
  completedVisits: number;
  scheduledVisits: number;
}

export interface AnalyticsDashboardState {
  cards: CardMetrics;
  revenue: string;
  conversionRate: string;
  funnelStages: FunnelStage[];
  callingTrends: CallingTrendItem[];
  callDurations: CallDurationBuckets;
  feedbackSummary: FeedbackRow[];
  industryId?: string;
  organizationName?: string;
}

export type AnalyticsData = AnalyticsDashboardState;

export const analyticsService = {
  async getAnalyticsData(params?: AnalyticsQueryParams): Promise<AnalyticsDashboardState> {
    try {
      const data = await analyticsRepository.fetchRawAnalyticsOverview(params);

      const cards: CardMetrics = {
        totalLeads: Number(data?.cards?.totalLeads || data?.summary?.totalLeads || 0),
        fresh: Number(data?.cards?.fresh || data?.summary?.fresh || 0),
        callBack: Number(data?.cards?.callBack || data?.summary?.callBack || 0),
        interested: Number(data?.cards?.interested || data?.summary?.interested || 0),
        closedWon: Number(data?.cards?.closedWon || data?.summary?.closedWon || 0),
        notInterested: Number(data?.cards?.notInterested || data?.summary?.notInterested || 0),
        closedLost: Number(data?.cards?.closedLost || data?.summary?.closedLost || 0),
        completedVisits: Number(data?.cards?.completedVisits || data?.summary?.completedVisits || 0),
        scheduledVisits: Number(data?.cards?.scheduledVisits || data?.summary?.scheduledVisits || 0),
      };

      // Calculate conversion rate dynamically from closed won vs total leads
      const convPct = cards.totalLeads > 0
        ? ((cards.closedWon / cards.totalLeads) * 100).toFixed(1)
        : '0.0';

      const totalF = Math.max(cards.totalLeads, 1);
      const funnelStages: FunnelStage[] = [
        {
          stage: 'Fresh Inquiries',
          count: cards.fresh,
          pct: `${Math.round((cards.fresh / totalF) * 100)}%`,
          color: '#0284C7',
        },
        {
          stage: 'In Follow-up / Callback',
          count: cards.callBack + cards.interested,
          pct: `${Math.round(((cards.callBack + cards.interested) / totalF) * 100)}%`,
          color: '#D97706',
        },
        {
          stage: 'Site Visits / Qualified',
          count: cards.completedVisits + cards.scheduledVisits,
          pct: `${Math.round(((cards.completedVisits + cards.scheduledVisits) / totalF) * 100)}%`,
          color: '#7C3AED',
        },
        {
          stage: 'Deals Closed Won',
          count: cards.closedWon,
          pct: `${convPct}%`,
          color: '#059669',
        },
      ];

      // Calling summary & durations
      const callLogList = data?.callLogs?.callLogSummary || [];
      const durations: CallDurationBuckets = {
        duration0: 0,
        duration0_30: 0,
        duration31_60: 0,
        duration61_120: 0,
        durationAbove120: 0,
      };

      callLogList.forEach((c: any) => {
        durations.duration0 += Number(c.duration0 || 0);
        durations.duration0_30 += Number(c.duration0_30 || 0);
        durations.duration31_60 += Number(c.duration31_60 || 0);
        durations.duration61_120 += Number(c.duration61_120 || 0);
        durations.durationAbove120 += Number(c.durationAbove120 || 0);
      });

      // Feedback Summary by Associate / Source / Team
      const feedbackList: FeedbackRow[] = (data?.contacts?.feedbackSummary || []).map((row: any, idx: number) => ({
        sNo: row.sNo || idx + 1,
        associate: row.associate || 'System / Unassigned',
        total: Number(row.total || 0),
        fresh: Number(row.fresh || 0),
        callBack: Number(row.callBack || 0),
        interested: Number(row.interested || 0),
        won: Number(row.won || 0),
        notInterested: Number(row.notInterested || 0),
        lost: Number(row.lost || 0),
        completedVisits: Number(row.completedVisits || 0),
        scheduledVisits: Number(row.scheduledVisits || 0),
      }));

      return {
        cards,
        revenue: data.revenue || (cards.closedWon > 0 ? `₹${(cards.closedWon * 2.5).toFixed(1)} Cr` : '₹0.0 Cr'),
        conversionRate: `${convPct}%`,
        funnelStages,
        callingTrends: data?.callLogs?.callingTrends || [],
        callDurations: durations,
        feedbackSummary: feedbackList,
        industryId: data?.industryId,
        organizationName: data?.organizationName,
      };
    } catch (err) {
      console.warn('[analyticsService] Error fetching dashboard data:', err);
      return {
        cards: {
          totalLeads: 0,
          fresh: 0,
          callBack: 0,
          interested: 0,
          closedWon: 0,
          notInterested: 0,
          closedLost: 0,
          completedVisits: 0,
          scheduledVisits: 0,
        },
        revenue: '₹0.0 Cr',
        conversionRate: '0.0%',
        funnelStages: [
          { stage: 'Fresh Inquiries', count: 0, pct: '0%', color: '#0284C7' },
          { stage: 'In Follow-up / Callback', count: 0, pct: '0%', color: '#D97706' },
          { stage: 'Site Visits / Qualified', count: 0, pct: '0%', color: '#7C3AED' },
          { stage: 'Deals Closed Won', count: 0, pct: '0%', color: '#059669' },
        ],
        callingTrends: [],
        callDurations: {
          duration0: 0,
          duration0_30: 0,
          duration31_60: 0,
          duration61_120: 0,
          durationAbove120: 0,
        },
        feedbackSummary: [],
      };
    }
  },
};
