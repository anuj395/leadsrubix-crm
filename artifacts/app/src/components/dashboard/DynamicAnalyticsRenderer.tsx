import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIndustrySemantics } from '../../utils/industryLabels';

interface Props {
  dashboardConfig: any;
  data: any;
  groupBy: 'team' | 'source' | 'teamWise';
  onGroupByChange: (mode: 'team' | 'source' | 'teamWise') => void;
  industryId?: string;
  onNavigateToLeads?: (filterParams: any) => void;
  onNavigateToTasks?: (filterParams: any) => void;
}

// Built-in industry master KPI sets
const INDUSTRY_GLOBAL_KPIS: Record<string, any[]> = {
  temp0003: [
    { id: 'totalPatients', title: 'Total Patients', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'people', data_key: 'cards.totalLeads' },
    { id: 'newAppointments', title: 'Appointments', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'calendar', data_key: 'cards.fresh' },
    { id: 'consultations', title: 'Consultations', color: '#10B981', lightBg: '#D1FAE5', icon: 'medkit', data_key: 'cards.completedVisits' },
    { id: 'treatmentPlans', title: 'Treatments', color: '#F59E0B', lightBg: '#FEF3C7', icon: 'checkmark-circle', data_key: 'cards.closedWon' },
  ],
  temp0004: [
    { id: 'totalApplicants', title: 'Applicants', color: '#3B82F6', lightBg: '#DBEAFE', icon: 'school', data_key: 'cards.totalLeads' },
    { id: 'counseling', title: 'Counseling', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'chatbubbles', data_key: 'cards.fresh' },
    { id: 'entrancePassed', title: 'Qualified', color: '#10B981', lightBg: '#D1FAE5', icon: 'checkmark-circle', data_key: 'cards.interested' },
    { id: 'enrolled', title: 'Enrolled', color: '#EC4899', lightBg: '#FCE7F3', icon: 'ribbon', data_key: 'cards.closedWon' },
  ],
  temp0001: [
    { id: 'totalLeads', title: 'Total Leads', color: '#272944', lightBg: '#EEF2F6', icon: 'people', data_key: 'cards.totalLeads' },
    { id: 'fresh', title: 'Fresh', color: '#0EA5E9', lightBg: '#E0F2FE', icon: 'sparkles', data_key: 'cards.fresh' },
    { id: 'callBack', title: 'Call Back', color: '#F59E0B', lightBg: '#FEF3C7', icon: 'call', data_key: 'cards.callBack' },
    { id: 'interested', title: 'Interested', color: '#8B5CF6', lightBg: '#EDE9FE', icon: 'heart', data_key: 'cards.interested' },
    { id: 'closedWon', title: 'Closed Won', color: '#10B981', lightBg: '#D1FAE5', icon: 'trophy', data_key: 'cards.closedWon' },
    { id: 'notInterested', title: 'Not Int.', color: '#64748B', lightBg: '#F1F5F9', icon: 'close-circle', data_key: 'cards.notInterested' },
    { id: 'closedLost', title: 'Closed Lost', color: '#EF4444', lightBg: '#FEE2E2', icon: 'trending-down', data_key: 'cards.closedLost' },
    { id: 'completedVisits', title: 'Comp. Visits', color: '#06B6D4', lightBg: '#ECFEFF', icon: 'trail-sign', data_key: 'cards.completedVisits' },
    { id: 'scheduledVisits', title: 'Sched. Visits', color: '#14B8A6', lightBg: '#CCFBF1', icon: 'calendar', data_key: 'cards.scheduledVisits' },
  ],
};

// Built-in comprehensive tab breakdowns matching Web CRM exactly
const INDUSTRY_TAB_BREAKDOWNS: Record<string, any[]> = {
  temp0003: [
    {
      id: 0,
      label: 'Clinical & Patient Overview',
      sections: [
        {
          id: 'health_breakdown',
          title: 'Specialty & Department Breakdown',
          widgets: [
            {
              id: 'health_table',
              type: 'TABLE',
              title: 'Specialty Consultation Summary',
              data_key: 'contacts.feedbackSummary',
              columns: [
                { key: 'associate', label: 'Doctor / Dept' },
                { key: 'total', label: 'Inquiries' },
                { key: 'fresh', label: 'Appointments' },
                { key: 'completedVisits', label: 'Consulted' },
                { key: 'won', label: 'In Treatment' },
              ],
            },
            {
              id: 'health_donut',
              type: 'CHART',
              title: 'Specialty Inquiry Distribution',
              chart_type: 'donut',
              data_key: 'contacts.chartData',
            },
          ],
        },
      ],
    },
  ],
  temp0001: [
    {
      id: 0,
      label: 'Contacts Overview',
      sections: [
        {
          id: 're_breakdown',
          title: 'Leads Conversion & Breakdown',
          widgets: [
            {
              id: 'feedback_summary',
              type: 'TABLE',
              title: 'Leads Feedback Breakdown',
              data_key: 'contacts.feedbackSummary',
              columns: [
                { key: 'associate', label: 'ASSOCIATE / GROUP' },
                { key: 'total', label: 'TOTAL' },
                { key: 'fresh', label: 'FRESH' },
                { key: 'callBack', label: 'CALL BACK' },
                { key: 'interested', label: 'INTERESTED' },
              ],
            },
            {
              id: 're_donut',
              type: 'CHART',
              title: 'Leads Conversion Distribution',
              chart_type: 'donut',
              data_key: 'contacts.chartData',
            },
            {
              id: 'callback_summary',
              type: 'TABLE',
              title: 'Callback Reasons Summary',
              data_key: 'contacts.callBackReasons',
              columns: [
                { key: 'associate', label: 'ASSOCIATE / GROUP' },
                { key: 'total', label: 'TOTAL CALL BACKS' },
              ],
            },
            {
              id: 'callback_chart',
              type: 'CHART',
              title: 'Callback Reasons Distribution',
              chart_type: 'donut',
              data_key: 'contacts.callBackReasons',
            },
          ],
        },
      ],
    },
    {
      id: 1,
      label: 'Tasks & Meetings',
      sections: [
        {
          id: 'tasks_completed_section',
          title: 'Completed Task Metrics',
          widgets: [
            {
              id: 'tasks_completed_table',
              type: 'TABLE',
              title: 'Completed Tasks Summary',
              data_key: 'tasks.completedTasks',
              columns: [
                { key: 'associate', label: 'ASSOCIATE / GROUP' },
                { key: 'total', label: 'TOTAL COMPLETED' },
                { key: 'meeting', label: 'MEETING' },
                { key: 'callBack', label: 'CALL BACK' },
                { key: 'siteVisit', label: 'SITE VISIT' },
              ],
            },
            {
              id: 'tasks_completed_donut',
              type: 'CHART',
              title: 'Completed Tasks Breakdown',
              chart_type: 'donut',
              data_key: 'tasks.completedChartData',
            },
          ],
        },
        {
          id: 'tasks_pending_section',
          title: 'Pending Task Metrics',
          widgets: [
            {
              id: 'tasks_pending_table',
              type: 'TABLE',
              title: 'Pending Tasks Summary',
              data_key: 'tasks.pendingTasks',
              columns: [
                { key: 'associate', label: 'ASSOCIATE / GROUP' },
                { key: 'total', label: 'TOTAL PENDING' },
                { key: 'meeting', label: 'MEETING' },
                { key: 'callBack', label: 'CALL BACK' },
                { key: 'siteVisit', label: 'SITE VISIT' },
              ],
            },
            {
              id: 'tasks_pending_donut',
              type: 'CHART',
              title: 'Pending Tasks Breakdown',
              chart_type: 'donut',
              data_key: 'tasks.pendingChartData',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      label: 'Calling Analytics',
      sections: [
        {
          id: 'calling_insights',
          title: 'Call Tracking & Durations',
          widgets: [
            {
              id: 'calling_trends_chart',
              type: 'CHART',
              title: 'Calling Activity Trends',
              chart_type: 'trend',
              data_key: 'callLogs.callingTrends',
            },
            {
              id: 'call_logs_table',
              type: 'TABLE',
              title: 'Call Duration Summary',
              data_key: 'callLogs.callLogSummary',
              columns: [
                { key: 'associate', label: 'ASSOCIATE / GROUP' },
                { key: 'total', label: 'TOTAL CALLS' },
                { key: 'duration0', label: '0 Sec' },
                { key: 'duration0_30', label: '0-30s' },
                { key: 'duration31_60', label: '31-60s' },
                { key: 'duration61_120', label: '61-120s' },
                { key: 'durationAbove120', label: '>120s' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const DynamicAnalyticsRenderer: React.FC<Props> = ({
  dashboardConfig,
  data,
  groupBy,
  onGroupByChange,
  industryId = 'temp0001',
  onNavigateToLeads,
  onNavigateToTasks,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const [activeTabId, setActiveTabId] = useState<number>(0);

  // Global KPI cards always visible for active industry
  const kpiList = useMemo(() => {
    return INDUSTRY_GLOBAL_KPIS[industryId] || INDUSTRY_GLOBAL_KPIS.temp0001;
  }, [industryId]);

  // Tab definitions
  const tabs: any[] = useMemo(() => {
    return INDUSTRY_TAB_BREAKDOWNS[industryId] || INDUSTRY_TAB_BREAKDOWNS.temp0001;
  }, [industryId]);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const getNestedData = (pathStr: string) => {
    if (!pathStr || !data) return undefined;
    const parts = pathStr.split('.');
    let cur = data;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const handleExportCSV = (title: string, columns: any[], rows: any[]) => {
    Alert.alert(
      'Export Data Table',
      `Exporting "${title}" (${rows.length} records) to CSV report format.`,
      [{ text: 'OK' }]
    );
  };

  // Compact Executive KPI Card
  const renderKpiCardCompact = (widget: any, index: number, isFourGrid: boolean) => {
    const rawVal = getNestedData(widget.data_key);
    const displayVal = rawVal !== undefined ? rawVal : 0;
    const accentColor = widget.color || '#272944';
    const lightBg = widget.lightBg || '#F1F5F9';

    return (
      <TouchableOpacity
        key={widget.id || `kpi-${index}`}
        style={[
          styles.kpiCardCompact,
          isFourGrid && { width: '48.5%' },
          { borderTopColor: accentColor },
        ]}
        activeOpacity={0.82}
        onPress={() => {
          if (widget.title?.toLowerCase().includes('consult') || widget.title?.toLowerCase().includes('visit') || widget.title?.toLowerCase().includes('appoint')) {
            onNavigateToTasks?.({ title: widget.title });
          } else {
            onNavigateToLeads?.({ title: widget.title });
          }
        }}
      >
        <View style={styles.kpiCompactTop}>
          <Text style={styles.kpiCompactValue} numberOfLines={1}>
            {displayVal}
          </Text>
          <View style={[styles.kpiCompactIconCircle, { backgroundColor: lightBg }]}>
            <Ionicons name={widget.icon as any} size={13} color={accentColor} />
          </View>
        </View>

        <Text style={styles.kpiCompactTitle} numberOfLines={1}>
          {widget.title.toUpperCase()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTableWidget = (widget: any) => {
    const rawRows = getNestedData(widget.data_key);
    const rows = Array.isArray(rawRows) ? rawRows : [];

    const columns = widget.columns || [
      { key: 'associate', label: groupBy === 'source' ? 'CHANNEL / SOURCE' : 'ASSOCIATE / GROUP' },
      { key: 'total', label: 'TOTAL' },
    ];

    const isFullWidthTwoColumn = columns.length <= 2;

    return (
      <View key={widget.id} style={styles.cardBox}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleBadgeRow}>
              <View style={[styles.tableIconBox, { backgroundColor: '#EEF2F6' }]}>
                <Ionicons name="grid-outline" size={14} color="#272944" />
              </View>
              <Text style={styles.cardTitle}>{widget.title}</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} grouped by {groupBy === 'source' ? 'Source Channel' : groupBy === 'teamWise' ? 'Team' : 'Associate'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.csvBtnPill}
            onPress={() => handleExportCSV(widget.title, columns, rows)}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={12} color="#475569" />
            <Text style={styles.csvBtnPillText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyTableBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="analytics-outline" size={24} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTableTitle}>No activity records found</Text>
            <Text style={styles.emptyTableSub}>
              Data will update as soon as interactions and updates occur.
            </Text>
          </View>
        ) : isFullWidthTwoColumn ? (
          /* Full Width Clean Table for 2-column summaries (Callback Reasons etc.) with Fixed Max Height */
          <View style={styles.fullWidthTableContainer}>
            {/* Fixed Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: 34 }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>{columns[0].label.toUpperCase()}</Text>
              <Text style={[styles.tableHeaderCell, { width: 120, textAlign: 'right' }]}>{columns[1].label.toUpperCase()}</Text>
            </View>

            {/* Scrollable Rows for 20+ records */}
            <ScrollView
              style={styles.tableVerticalScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {rows.map((row: any, rIdx: number) => {
                const col0Val = row[columns[0].key] || 'Unassigned';
                const col1Val = row[columns[1].key] !== undefined ? row[columns[1].key] : 0;
                return (
                  <TouchableOpacity
                    key={`full-row-${rIdx}`}
                    style={[styles.tableBodyRow, rIdx % 2 === 1 && styles.tableBodyRowAlt]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onNavigateToLeads?.({
                        associate: row.associate,
                        title: `${row.associate} ${semantics.leadEntityPlural}`,
                      });
                    }}
                  >
                    <Text style={[styles.tableBodyCell, { width: 34, color: '#94A3B8', fontWeight: '700' }]}>
                      {rIdx + 1}
                    </Text>
                    <Text style={[styles.tableBodyCell, { flex: 1, fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>
                      {col0Val}
                    </Text>
                    <Text style={[styles.tableBodyCell, { width: 120, textAlign: 'right', fontWeight: '800', color: '#272944' }]}>
                      {col1Val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          /* Multi-column Horizontal + Vertical Scroll Table Container (Max Height for 20+ records) */
          <View style={styles.multiColumnTableWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
              <View style={styles.tableContainer}>
                {/* Fixed Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { width: 38 }]}>#</Text>
                  {columns.map((col: any) => (
                    <Text
                      key={col.key}
                      style={[
                        styles.tableHeaderCell,
                        col.key === 'associate' || col.key === 'name' ? { width: 140 } : { width: 85, textAlign: 'center' },
                      ]}
                    >
                      {col.label.toUpperCase()}
                    </Text>
                  ))}
                </View>

                {/* Vertical Scroll for 20+ records */}
                <ScrollView
                  style={styles.tableVerticalScroll}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {rows.map((row: any, rIdx: number) => (
                    <TouchableOpacity
                      key={`row-${rIdx}`}
                      style={[styles.tableBodyRow, rIdx % 2 === 1 && styles.tableBodyRowAlt]}
                      activeOpacity={0.7}
                      onPress={() => {
                        onNavigateToLeads?.({
                          associate: row.associate,
                          title: `${row.associate} ${semantics.leadEntityPlural}`,
                        });
                      }}
                    >
                      <Text style={[styles.tableBodyCell, { width: 38, color: '#94A3B8', fontWeight: '700' }]}>
                        {rIdx + 1}
                      </Text>
                      {columns.map((col: any) => {
                        const val = row[col.key] !== undefined ? row[col.key] : 0;
                        const isName = col.key === 'associate' || col.key === 'name';
                        return (
                          <Text
                            key={col.key}
                            numberOfLines={1}
                            style={[
                              styles.tableBodyCell,
                              isName ? { width: 140, fontWeight: '700', color: '#1E293B' } : { width: 85, textAlign: 'center', fontWeight: '600', color: '#475569' },
                              (col.key === 'total' || col.key.includes('total')) && { fontWeight: '800', color: '#272944' },
                            ]}
                          >
                            {val}
                          </Text>
                        );
                      })}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderChartWidget = (widget: any) => {
    const rawData = getNestedData(widget.data_key);
    let chartList: { name: string; value: number; color?: string }[] = [];

    if (Array.isArray(rawData) && rawData.length > 0) {
      chartList = rawData.map((item: any) => ({
        name: item.name || item.associate || item.stage || item.date || item.reason || 'Other',
        value: Number(item.value !== undefined ? item.value : (item.total !== undefined ? item.total : item.calls || 0)),
        color: item.color,
      }));
    } else if (widget.chart_type === 'trend') {
      // Calling Trends fallback representation
      chartList = [
        { name: 'Mon', value: 0 },
        { name: 'Tue', value: 0 },
        { name: 'Wed', value: 0 },
        { name: 'Thu', value: 0 },
        { name: 'Fri', value: 0 },
      ];
    } else if (widget.id?.includes('pending') || widget.title?.toLowerCase().includes('pending')) {
      const pTasks = data?.tasks?.pendingTasks || [];
      const pendingCalls = pTasks.reduce((acc: number, t: any) => acc + (t.callBack || 0), 0);
      const pendingMeetings = pTasks.reduce((acc: number, t: any) => acc + (t.meeting || 0), 0);
      const pendingVisits = pTasks.reduce((acc: number, t: any) => acc + (t.siteVisit || 0), 0);

      chartList = [
        { name: 'Call', value: pendingCalls, color: '#0EA5E9' },
        { name: 'Meeting', value: pendingMeetings, color: '#8B5CF6' },
        { name: 'Site Visit', value: pendingVisits, color: '#F59E0B' },
      ];
    } else if (widget.id?.includes('callback') || widget.title?.toLowerCase().includes('callback')) {
      const cbRows = data?.contacts?.callBackReasons || [];
      chartList = cbRows.map((r: any) => ({
        name: r.associate || 'Sales Advisor',
        value: Number(r.total || 0),
        color: '#F59E0B',
      }));
    } else if (data?.cards) {
      const c = data.cards;
      chartList = [
        { name: 'Interested', value: c.interested || 0, color: '#8B5CF6' },
        { name: 'Closed Won', value: c.closedWon || 0, color: '#10B981' },
        { name: 'Not Interested', value: c.notInterested || 0, color: '#64748B' },
        { name: 'Closed Lost', value: c.closedLost || 0, color: '#EF4444' },
      ].filter((x) => x.value > 0);

      if (chartList.length === 0) {
        chartList = [
          { name: 'Total Leads', value: c.totalLeads || 0, color: '#272944' },
        ];
      }
    }

    const totalVal = chartList.reduce((acc, curr) => acc + curr.value, 0);
    const defaultColors = ['#272944', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

    return (
      <View key={widget.id} style={styles.cardBox}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleBadgeRow}>
              <View style={[styles.tableIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons
                  name={widget.chart_type === 'trend' ? 'trending-up' : 'pie-chart-outline'}
                  size={14}
                  color="#10B981"
                />
              </View>
              <Text style={styles.cardTitle}>{widget.title}</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {widget.chart_type === 'trend'
                ? `Activity tracking over time (${totalVal} total logged)`
                : `Total volume: ${totalVal} records`}
            </Text>
          </View>
        </View>

        {/* Trend Bar Visualization for Calling Activity Trends */}
        {widget.chart_type === 'trend' ? (
          <View style={styles.trendContainer}>
            <View style={styles.trendBarRow}>
              {chartList.map((item, idx) => {
                const barHeight = totalVal > 0 ? Math.max((item.value / totalVal) * 90, 8) : 8;
                return (
                  <View key={`trend-bar-${idx}`} style={styles.trendBarCol}>
                    <Text style={styles.trendBarVal}>{item.value}</Text>
                    <View style={[styles.trendBarPill, { height: barHeight }]} />
                    <Text style={styles.trendBarLabel} numberOfLines={1}>
                      {item.name.slice(-5)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* Circular Donut Visualization */
          <View style={styles.donutContainer}>
            <View style={styles.donutRingWrapper}>
              <View style={styles.donutRingMock}>
                <View style={styles.donutInnerHole}>
                  <Text style={styles.donutTotalNumber}>{totalVal}</Text>
                  <Text style={styles.donutTotalLabel}>TOTAL</Text>
                </View>
              </View>
            </View>

            {/* Legend Chips */}
            <View style={styles.chartLegendGrid}>
              {chartList.map((item, idx) => {
                const itemColor = item.color || defaultColors[idx % defaultColors.length];
                const pct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                return (
                  <View key={`legend-${idx}`} style={styles.legendChip}>
                    <View style={[styles.legendDot, { backgroundColor: itemColor }]} />
                    <Text style={styles.legendText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.legendValueBadge}>
                      <Text style={styles.legendValueText}>{item.value}</Text>
                      <Text style={styles.legendPctText}>({pct}%)</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Executive Segmented Switcher (Associate / Source / Team) ─── */}
      <View style={styles.segmentContainer}>
        {(['team', 'source', 'teamWise'] as const).map((mode) => {
          const isActive = groupBy === mode;
          const label = mode === 'team' ? 'Associate' : mode === 'source' ? 'Source' : 'Team';
          const icon = mode === 'team' ? 'person' : mode === 'source' ? 'funnel' : 'people';
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              onPress={() => onGroupByChange(mode)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={icon as any}
                size={12}
                color={isActive ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── 1. Pinned Executive Key Metrics Overview (Always Visible) ─── */}
      <View style={styles.pinnedKpiSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeadingText}>KEY METRICS OVERVIEW</Text>
          <View style={styles.sectionHeadingLine} />
        </View>

        {/* Compact Grid */}
        <View style={styles.kpiGridCompact}>
          {kpiList.map((kpiW, idx) => renderKpiCardCompact(kpiW, idx, kpiList.length === 4))}
        </View>
      </View>

      {/* ─── 2. Brand Theme Dynamic Tabs Header ─── */}
      {tabs.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map((tab) => {
            const isTabSelected = tab.id === activeTabId;
            return (
              <TouchableOpacity
                key={`tab-${tab.id}`}
                style={[styles.tabButton, isTabSelected && styles.tabButtonActive]}
                onPress={() => setActiveTabId(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, isTabSelected && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ─── 3. Render Active Tab Breakdown (Tables & Charts) ─── */}
      {activeTab?.sections && (
        activeTab.sections.map((section: any, sIdx: number) => {
          const layoutWidgets = (section.widgets || []).filter((w: any) => w.type !== 'KPI');

          return (
            <View key={section.id || `sec-${sIdx}`} style={styles.sectionBlock}>
              {section.title && (
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeadingText}>{section.title}</Text>
                  <View style={styles.sectionHeadingLine} />
                </View>
              )}

              {layoutWidgets.map((w: any) => {
                if (w.type === 'TABLE') return renderTableWidget(w);
                if (w.type === 'CHART') return renderChartWidget(w);
                return null;
              })}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#272944',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pinnedKpiSection: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionHeadingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.2,
  },
  sectionHeadingLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  kpiGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  kpiCardCompact: {
    width: '31.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCompactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiCompactValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiCompactIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCompactTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 4,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tableIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1.5,
  },
  csvBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    gap: 3.5,
  },
  csvBtnPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  emptyTableBox: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTableTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  emptyTableSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
  },
  fullWidthTableContainer: {
    width: '100%',
  },
  multiColumnTableWrapper: {
    width: '100%',
  },
  tableScroll: {
    marginHorizontal: -6,
  },
  tableContainer: {
    minWidth: 320,
    paddingHorizontal: 6,
  },
  tableVerticalScroll: {
    maxHeight: 230,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9.5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableBodyRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableBodyCell: {
    fontSize: 11.5,
  },
  donutContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  donutRingWrapper: {
    marginBottom: 14,
  },
  donutRingMock: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 14,
    borderColor: '#272944',
    borderTopColor: '#10B981',
    borderRightColor: '#0EA5E9',
    borderBottomColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInnerHole: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotalNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  donutTotalLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  chartLegendGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  legendChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    flex: 1,
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  legendValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  legendValueText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  legendPctText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  trendContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  trendBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  trendBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  trendBarVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 4,
  },
  trendBarPill: {
    width: 22,
    backgroundColor: '#272944',
    borderRadius: 4,
  },
  trendBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
  },
});
