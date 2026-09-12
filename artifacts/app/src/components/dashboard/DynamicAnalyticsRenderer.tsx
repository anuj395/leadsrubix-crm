import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIndustrySemantics } from '../../utils/industryLabels';
import {
  getIndustryBaselineTabs,
  getIndustryGlobalKpis,
  METRIC_DESCRIPTIONS,
  DefaultTabConfig,
  DefaultWidgetConfig,
} from '../../utils/analyticsBaseline';
import {
  ExecutiveDonutChart,
  ActivityTrendBarChart,
  EmptyAnalyticsState,
} from './AnalyticsVisualCharts';

interface Props {
  dashboardConfig: any;
  data: any;
  groupBy: 'team' | 'source' | 'teamWise';
  onGroupByChange: (mode: 'team' | 'source' | 'teamWise') => void;
  industryId?: string;
}

export const DynamicAnalyticsRenderer: React.FC<Props> = ({
  dashboardConfig,
  data,
  groupBy,
  onGroupByChange,
  industryId = 'temp0001',
}) => {
  const semantics = getIndustrySemantics(industryId);
  const [activeTabId, setActiveTabId] = useState<number>(0);
  const [expandedKpis, setExpandedKpis] = useState<boolean>(false);

  // Layman metric info modal
  const [metricModalData, setMetricModalData] = useState<{
    title: string;
    description: string;
    hint: string;
  } | null>(null);

  // Table sorting states: widgetId -> { colKey, direction: 'asc' | 'desc' }
  const [tableSorts, setTableSorts] = useState<
    Record<string, { colKey: string; direction: 'asc' | 'desc' }>
  >({});

  // Table search queries: widgetId -> string
  const [tableSearches, setTableSearches] = useState<Record<string, string>>({});

  // 1. Dynamic Tabs Resolution (Server Config with Baseline Fallback for all 7 Verticals)
  const tabs: DefaultTabConfig[] = useMemo(() => {
    if (
      dashboardConfig?.tabs &&
      Array.isArray(dashboardConfig.tabs) &&
      dashboardConfig.tabs.length > 0
    ) {
      return dashboardConfig.tabs;
    }
    return getIndustryBaselineTabs(industryId);
  }, [dashboardConfig, industryId]);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || { id: 0, label: 'Overview', sections: [] };
  }, [tabs, activeTabId]);

  // 2. Global KPI cards list
  const kpiList: DefaultWidgetConfig[] = useMemo(() => {
    return getIndustryGlobalKpis(industryId);
  }, [industryId]);

  // 3. Derived executive conversion ratios & pipeline health
  const executiveMetrics = useMemo(() => {
    const c = data?.cards || {};
    const totalLeads = Number(c.totalLeads || 0);
    const closedWon = Number(c.closedWon || 0);
    const completedVisits = Number(c.completedVisits || 0);
    const scheduledVisits = Number(c.scheduledVisits || 0);
    const totalVisits = completedVisits + scheduledVisits;

    const inPipelineCount =
      Number(c.fresh || 0) +
      Number(c.interested || 0) +
      Number(c.callBack || 0) +
      scheduledVisits;

    const winRatePct = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : '0.0';
    const pipelineRatePct = totalLeads > 0 ? ((inPipelineCount / totalLeads) * 100).toFixed(1) : '0.0';
    const visitRatePct = totalVisits > 0 ? ((completedVisits / totalVisits) * 100).toFixed(0) : '0';

    return {
      winRatePct,
      pipelineRatePct,
      visitRatePct,
      closedWon,
      inPipelineCount,
      completedVisits,
    };
  }, [data]);

  // Derived quick metrics for Tab 1 (Tasks & Meetings)
  const taskQuickKpis = useMemo(() => {
    const cTasks = data?.tasks?.completedTasks || [];
    const pTasks = data?.tasks?.pendingTasks || [];
    const totalCompleted = cTasks.reduce((acc: number, t: any) => acc + Number(t.total || 0), 0);
    const totalPending = pTasks.reduce((acc: number, t: any) => acc + Number(t.total || 0), 0);
    const completedVisits = cTasks.reduce((acc: number, t: any) => acc + Number(t.siteVisit || 0), 0);
    return [
      { id: 't-comp', title: 'COMPLETED TASKS', value: totalCompleted, icon: 'checkmark-done-circle', color: '#10B981', lightBg: '#D1FAE5' },
      { id: 't-pend', title: 'PENDING TASKS', value: totalPending, icon: 'time', color: '#F59E0B', lightBg: '#FEF3C7' },
      { id: 't-visit', title: (semantics.siteVisit || 'VISIT').toUpperCase(), value: completedVisits, icon: 'location', color: '#8B5CF6', lightBg: '#EDE9FE' },
    ];
  }, [data, semantics]);

  // Derived quick metrics for Tab 2 (Calling Reports)
  const callQuickKpis = useMemo(() => {
    const trends = data?.callLogs?.callingTrends || [];
    const summary = data?.callLogs?.callLogSummary || [];
    const totalCalls = trends.reduce((acc: number, t: any) => acc + Number(t.calls || 0), 0);
    const avgCalls = trends.length > 0 ? Math.round(totalCalls / trends.length) : 0;
    const activeCallers = summary.length;
    return [
      { id: 'c-total', title: 'TOTAL CALLS', value: totalCalls, icon: 'call', color: '#0EA5E9', lightBg: '#E0F2FE' },
      { id: 'c-avg', title: 'AVG / DAY', value: avgCalls, icon: 'trending-up', color: '#10B981', lightBg: '#D1FAE5' },
      { id: 'c-users', title: semantics.agentEntityPlural.toUpperCase(), value: activeCallers, icon: 'people', color: '#6366F1', lightBg: '#EEF2F6' },
    ];
  }, [data, semantics]);

  // Helper to read deeply nested paths (e.g. 'cards.totalLeads')
  const getNestedData = (pathStr?: string) => {
    if (!pathStr || !data) return undefined;
    const parts = pathStr.split('.');
    let cur = data;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return cur;
  };

  // CSV Exporter using RFC 4180 escaping and native Share sheet
  const handleExportCSV = async (title: string, columns: any[], rows: any[]) => {
    try {
      if (!rows || rows.length === 0) {
        Alert.alert('No Data to Export', 'There are no records in this table for the selected period.');
        return;
      }

      const escapeCsvCell = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      // Header row
      const headerRow = columns.map((col: any) => escapeCsvCell(col.label || col.key)).join(',');

      // Data rows
      const dataRows = rows.map((row: any) => {
        return columns.map((col: any) => escapeCsvCell(row[col.key] !== undefined ? row[col.key] : 0)).join(',');
      });

      const csvContent = `# LeadsRubix CRM Analytics Export: ${title}\n# Generated At: ${new Date().toISOString()}\n# Group By: ${groupBy}\n\n` +
        headerRow +
        '\n' +
        dataRows.join('\n');

      const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`;

      await Share.share({
        message: csvContent,
        title: filename,
      });
    } catch (err) {
      console.warn('[DynamicAnalyticsRenderer] CSV Export error:', err);
    }
  };

  // Table Column Sort Toggle
  const toggleColumnSort = (widgetId: string, colKey: string) => {
    setTableSorts((prev) => {
      const current = prev[widgetId];
      if (current?.colKey === colKey) {
        return {
          ...prev,
          [widgetId]: { colKey, direction: current.direction === 'asc' ? 'desc' : 'asc' },
        };
      }
      return {
        ...prev,
        [widgetId]: { colKey, direction: 'desc' },
      };
    });
  };

  // Open layman metric info explanation modal
  const openMetricInfo = (widget: DefaultWidgetConfig) => {
    const key = widget.id || widget.data_key?.split('.').pop() || '';
    const def = METRIC_DESCRIPTIONS[key] || {
      title: widget.title,
      description: `Tracked metric for ${widget.title} across active business campaigns and operations.`,
      hint: 'Consistently review this count to evaluate conversion health.',
    };
    setMetricModalData(def);
  };

  // Render Single KPI Card (Display Only - No Drill-Down Navigation)
  const renderKpiCard = (widget: DefaultWidgetConfig, index: number) => {
    const rawVal = getNestedData(widget.data_key);
    const displayVal = rawVal !== undefined ? rawVal : 0;
    const accentColor = widget.color || '#272944';
    const lightBg = widget.lightBg || '#F1F5F9';

    return (
      <View
        key={widget.id || `kpi-${index}`}
        style={[styles.kpiCard, { borderTopColor: accentColor }]}
      >
        <View style={styles.kpiTopRow}>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {displayVal}
          </Text>
          <View style={[styles.kpiIconCircle, { backgroundColor: lightBg }]}>
            <Ionicons name={(widget.icon as any) || 'sparkles'} size={14} color={accentColor} />
          </View>
        </View>

        <View style={styles.kpiBottomRow}>
          <Text style={styles.kpiTitle} numberOfLines={2}>
            {widget.title.toUpperCase()}
          </Text>
          <TouchableOpacity
            style={styles.kpiInfoHitSlop}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => openMetricInfo(widget)}
          >
            <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Table Widget (Display Only - No Drill-Down Navigation)
  const renderTableWidget = (widget: DefaultWidgetConfig) => {
    const rawRows = getNestedData(widget.data_key);
    const rows = Array.isArray(rawRows) ? rawRows : [];

    const sortConfig = tableSorts[widget.id];
    const searchQuery = (tableSearches[widget.id] || '').toLowerCase().trim();

    // First column label dynamically mapped to group-by
    const firstColLabel =
      groupBy === 'source'
        ? 'SOURCE CHANNEL'
        : groupBy === 'teamWise'
        ? 'TEAM NAME'
        : semantics.agentEntity.toUpperCase() + ' / GROUP';

    const columns = (widget.columns && widget.columns.length > 0 ? widget.columns : [
      { key: 'associate', label: firstColLabel },
      { key: 'total', label: 'TOTAL' },
    ]).map((c: any) => (c.key === 'associate' ? { ...c, label: firstColLabel } : c));

    // Filter by search
    let displayRows = rows.filter((r: any) => {
      if (!searchQuery) return true;
      const targetName = String(r.associate || r.name || r.source || '').toLowerCase();
      return targetName.includes(searchQuery);
    });

    // Sort rows
    if (sortConfig?.colKey) {
      displayRows = [...displayRows].sort((a, b) => {
        const valA = a[sortConfig.colKey] !== undefined ? a[sortConfig.colKey] : 0;
        const valB = b[sortConfig.colKey] !== undefined ? b[sortConfig.colKey] : 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return (
      <View key={widget.id} style={styles.cardBox}>
        {/* Table Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleBadgeRow}>
              <View style={[styles.tableIconBox, { backgroundColor: '#EEF2F6' }]}>
                <Ionicons name="grid-outline" size={14} color="#272944" />
              </View>
              <Text style={styles.cardTitle}>{widget.title}</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {displayRows.length} {displayRows.length === 1 ? 'record' : 'records'} grouped by{' '}
              {groupBy === 'source' ? 'Source Channel' : groupBy === 'teamWise' ? 'Team' : 'Associate'}
            </Text>
          </View>

          {/* Export CSV Pill */}
          <TouchableOpacity
            style={styles.csvBtnPill}
            onPress={() => handleExportCSV(widget.title, columns, rows)}
            activeOpacity={0.75}
          >
            <Ionicons name="download-outline" size={12} color="#475569" />
            <Text style={styles.csvBtnPillText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Search Bar for Large Teams */}
        {rows.length > 3 && (
          <View style={styles.tableSearchBox}>
            <Ionicons name="search-outline" size={13} color="#94A3B8" />
            <TextInput
              style={styles.tableSearchInput}
              placeholder={`Search ${firstColLabel.toLowerCase()}...`}
              placeholderTextColor="#94A3B8"
              value={tableSearches[widget.id] || ''}
              onChangeText={(text) => setTableSearches((prev) => ({ ...prev, [widget.id]: text }))}
            />
            {Boolean(tableSearches[widget.id]) && (
              <TouchableOpacity
                onPress={() => setTableSearches((prev) => ({ ...prev, [widget.id]: '' }))}
              >
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty records notice */}
        {displayRows.length === 0 ? (
          <EmptyAnalyticsState
            title="No Records Found"
            message={`No entries recorded for this breakdown in the selected time range.`}
            icon="file-tray-outline"
          />
        ) : columns.length <= 2 ? (
          /* Adaptive Full-Width Non-Scrolling Table for 2-Column Tables (Zero Truncation) */
          <View style={styles.tableOuterWrap}>
            {/* Header Row */}
            <View style={styles.tableHeaderRow}>
              {columns.map((col: any, cIdx: number) => {
                const isSortActive = sortConfig?.colKey === col.key;
                const isFirst = cIdx === 0;

                return (
                  <TouchableOpacity
                    key={col.key}
                    style={[
                      styles.tableHeaderCellBtn,
                      isFirst ? { flex: 1.4 } : { flex: 1, justifyContent: 'flex-end' },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleColumnSort(widget.id, col.key)}
                  >
                    <Text
                      style={[
                        styles.tableHeaderCellText,
                        isSortActive && styles.tableHeaderCellTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {col.label}
                    </Text>
                    <Ionicons
                      name={
                        isSortActive
                          ? sortConfig.direction === 'asc'
                            ? 'chevron-up'
                            : 'chevron-down'
                          : 'swap-vertical-outline'
                      }
                      size={11}
                      color={isSortActive ? '#272944' : '#94A3B8'}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Body Rows */}
            {displayRows.map((row: any, rIdx: number) => {
              return (
                <View
                  key={`row-${rIdx}`}
                  style={[
                    styles.tableBodyRow,
                    rIdx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                  ]}
                >
                  {columns.map((col: any, cIdx: number) => {
                    const val = row[col.key] !== undefined ? row[col.key] : 0;
                    const isFirst = cIdx === 0;
                    const isSortActive = sortConfig?.colKey === col.key;

                    return (
                      <View
                        key={col.key}
                        style={[
                          styles.tableBodyCellWrap,
                          isFirst ? { flex: 1.4 } : { flex: 1, alignItems: 'flex-end' },
                          isSortActive && styles.tableBodyCellActiveBg,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.tableBodyCellText,
                            isFirst ? styles.tableBodyCellTextName : styles.tableBodyCellTextTotal,
                          ]}
                        >
                          {val}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ) : (
          /* Multi-Column Scrollable Table with Scroll Affordance */
          <View>
            {columns.length > 3 && (
              <View style={styles.tableScrollHintRow}>
                <Ionicons name="swap-horizontal" size={12} color="#0EA5E9" />
                <Text style={styles.tableScrollHintText}>
                  Swipe horizontally to view all {columns.length} columns
                </Text>
              </View>
            )}
            <View style={styles.tableOuterWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                directionalLockEnabled={true}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
              >
                <View>
                  {/* Table Header Row */}
                  <View style={styles.tableHeaderRow}>
                    {columns.map((col: any) => {
                      const isSortActive = sortConfig?.colKey === col.key;
                      const isName = col.key === 'associate' || col.key === 'name';

                      return (
                        <TouchableOpacity
                          key={col.key}
                          style={[
                            styles.tableHeaderCellBtn,
                            isName ? { width: 145 } : { width: 90, justifyContent: 'center' },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => toggleColumnSort(widget.id, col.key)}
                        >
                          <Text
                            style={[
                              styles.tableHeaderCellText,
                              isSortActive && styles.tableHeaderCellTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {col.label}
                          </Text>
                          <Ionicons
                            name={
                              isSortActive
                                ? sortConfig.direction === 'asc'
                                  ? 'chevron-up'
                                  : 'chevron-down'
                                : 'swap-vertical-outline'
                            }
                            size={11}
                            color={isSortActive ? '#272944' : '#94A3B8'}
                            style={{ marginLeft: 3 }}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Table Body Rows (Clean Display - No Screen Navigation) */}
                  {displayRows.map((row: any, rIdx: number) => {
                    return (
                      <View
                        key={`row-${rIdx}`}
                        style={[
                          styles.tableBodyRow,
                          rIdx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                        ]}
                      >
                        {columns.map((col: any) => {
                          const val = row[col.key] !== undefined ? row[col.key] : 0;
                          const isName = col.key === 'associate' || col.key === 'name';
                          const isTotal = col.key === 'total' || col.key.includes('total');
                          const isSortActive = sortConfig?.colKey === col.key;

                          return (
                            <View
                              key={col.key}
                              style={[
                                styles.tableBodyCellWrap,
                                isName ? { width: 145 } : { width: 90, alignItems: 'center' },
                                isSortActive && styles.tableBodyCellActiveBg,
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.tableBodyCellText,
                                  isName && styles.tableBodyCellTextName,
                                  isTotal && styles.tableBodyCellTextTotal,
                                  isSortActive && styles.tableBodyCellTextSortActive,
                                ]}
                              >
                                {val}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render Chart Widget (Visual Only - No Drill-Down Navigation)
  const renderChartWidget = (widget: DefaultWidgetConfig) => {
    const rawData = getNestedData(widget.data_key);

    // Calling Trend Chart
    if (widget.chart_type === 'trend' || widget.data_key?.includes('callingTrends')) {
      const trends = Array.isArray(rawData) ? rawData : [];
      return (
        <ActivityTrendBarChart
          key={widget.id}
          data={trends}
          title={widget.title || 'Calling Activity Trends'}
          metricLabel="calls"
        />
      );
    }

    // Proportional Donut / Segment Chart
    let chartList: { name: string; value: number; color?: string }[] = [];

    if (Array.isArray(rawData) && rawData.length > 0) {
      chartList = rawData.map((item: any) => ({
        name: item.name || item.associate || item.stage || item.reason || 'Other',
        value: Number(item.value !== undefined ? item.value : (item.total !== undefined ? item.total : item.calls || 0)),
        color: item.color,
      }));
    } else if (widget.id?.includes('pending') || widget.title?.toLowerCase().includes('pending')) {
      const pTasks = data?.tasks?.pendingTasks || [];
      const pendingCalls = pTasks.reduce((acc: number, t: any) => acc + (t.callBack || 0), 0);
      const pendingMeetings = pTasks.reduce((acc: number, t: any) => acc + (t.meeting || 0), 0);
      const pendingVisits = pTasks.reduce((acc: number, t: any) => acc + (t.siteVisit || 0), 0);

      chartList = [
        { name: 'Follow-up Call', value: pendingCalls, color: '#0EA5E9' },
        { name: 'Meeting', value: pendingMeetings, color: '#8B5CF6' },
        { name: semantics.siteVisit, value: pendingVisits, color: '#F59E0B' },
      ];
    } else if (widget.id?.includes('completed') || widget.title?.toLowerCase().includes('completed')) {
      const cTasks = data?.tasks?.completedTasks || [];
      const cCalls = cTasks.reduce((acc: number, t: any) => acc + (t.callBack || 0), 0);
      const cMeetings = cTasks.reduce((acc: number, t: any) => acc + (t.meeting || 0), 0);
      const cVisits = cTasks.reduce((acc: number, t: any) => acc + (t.siteVisit || 0), 0);

      chartList = [
        { name: 'Completed Calls', value: cCalls, color: '#10B981' },
        { name: 'Completed Meetings', value: cMeetings, color: '#8B5CF6' },
        { name: `Completed ${semantics.siteVisit}`, value: cVisits, color: '#06B6D4' },
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
        { name: semantics.wonLabel || 'Closed Won', value: c.closedWon || 0, color: '#10B981' },
        { name: 'Not Interested', value: c.notInterested || 0, color: '#64748B' },
        { name: 'Closed Lost', value: c.closedLost || 0, color: '#EF4444' },
      ].filter((x) => x.value > 0);

      if (chartList.length === 0) {
        chartList = [{ name: 'Total Inquiries', value: c.totalLeads || 0, color: '#272944' }];
      }
    }

    return (
      <ExecutiveDonutChart
        key={widget.id}
        items={chartList}
        title={widget.title}
        totalLabel="RECORDS"
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Group By Switcher Segment ── */}
      <View style={styles.groupByWrapper}>
        <View style={styles.groupBySegmentBox}>
          {[
            { key: 'team', label: semantics.agentEntityPlural || 'Associates', icon: 'people-outline' },
            { key: 'source', label: 'Source Channels', icon: 'funnel-outline' },
            { key: 'teamWise', label: 'Team Groups', icon: 'git-network-outline' },
          ].map((seg) => {
            const isSelected = groupBy === seg.key;
            return (
              <TouchableOpacity
                key={seg.key}
                style={[styles.groupByBtn, isSelected && styles.groupByBtnActive]}
                onPress={() => onGroupByChange(seg.key as any)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={seg.icon as any}
                  size={12}
                  color={isSelected ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.groupByBtnText, isSelected && styles.groupByBtnTextActive]}>
                  {seg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Executive Conversion Intelligence Strip ── */}
      <View style={styles.executiveStripCard}>
        <View style={styles.executiveStripCol}>
          <View style={styles.executiveStripHeader}>
            <Ionicons name="trophy" size={11} color="#10B981" />
            <Text style={styles.executiveStripLabel}>WIN RATE</Text>
          </View>
          <Text style={[styles.executiveStripValue, { color: '#10B981' }]}>
            {executiveMetrics.winRatePct}%
          </Text>
          <Text style={styles.executiveStripSub}>{executiveMetrics.closedWon} won</Text>
        </View>

        <View style={styles.executiveStripDivider} />

        <View style={styles.executiveStripCol}>
          <View style={styles.executiveStripHeader}>
            <Ionicons name="funnel" size={11} color="#0EA5E9" />
            <Text style={styles.executiveStripLabel}>IN PIPELINE</Text>
          </View>
          <Text style={[styles.executiveStripValue, { color: '#0EA5E9' }]}>
            {executiveMetrics.pipelineRatePct}%
          </Text>
          <Text style={styles.executiveStripSub}>{executiveMetrics.inPipelineCount} active</Text>
        </View>

        <View style={styles.executiveStripDivider} />

        <View style={styles.executiveStripCol}>
          <View style={styles.executiveStripHeader}>
            <Ionicons name="checkbox" size={11} color="#8B5CF6" />
            <Text style={styles.executiveStripLabel}>
              {(semantics.siteVisit || 'VISIT').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.executiveStripValue, { color: '#8B5CF6' }]}>
            {executiveMetrics.visitRatePct}%
          </Text>
          <Text style={styles.executiveStripSub}>{executiveMetrics.completedVisits} done</Text>
        </View>
      </View>

      {/* ── Tabs Selector Pill Bar (Immediate Access to Key Categories) ── */}
      <View style={styles.tabsBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {tabs.map((tab) => {
            const isSelected = tab.id === activeTabId;
            return (
              <TouchableOpacity
                key={`tab-${tab.id}`}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                onPress={() => setActiveTabId(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.id === 0 ? 'person-circle-outline' : tab.id === 1 ? 'checkbox-outline' : 'call-outline'}
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Contextual KPI Header & Cards for Active Tab ── */}
      {activeTab.id === 0 && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Key Metrics Overview</Text>
          </View>
          <View style={styles.kpiGrid}>
            {(expandedKpis ? kpiList : kpiList.slice(0, 3)).map((kpi, idx) => renderKpiCard(kpi, idx))}
          </View>
          <TouchableOpacity
            style={styles.kpiToggleBtn}
            activeOpacity={0.75}
            onPress={() => setExpandedKpis(!expandedKpis)}
          >
            <Text style={styles.kpiToggleBtnText}>
              {expandedKpis ? 'Show Less' : 'Show All 9 Metrics'}
            </Text>
            <Ionicons
              name={expandedKpis ? 'chevron-up' : 'chevron-down'}
              size={13}
              color="#272944"
            />
          </TouchableOpacity>
        </View>
      )}

      {activeTab.id === 1 && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.sectionTitle}>Task Performance Metrics</Text>
          </View>
          <View style={styles.kpiGrid}>
            {taskQuickKpis.map((kpi, idx) => (
              <View
                key={kpi.id || `kpi-task-${idx}`}
                style={[styles.kpiCard, { borderTopColor: kpi.color }]}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiValue} numberOfLines={1}>
                    {kpi.value}
                  </Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: kpi.lightBg }]}>
                    <Ionicons name={(kpi.icon as any) || 'sparkles'} size={14} color={kpi.color} />
                  </View>
                </View>
                <View style={styles.kpiBottomRow}>
                  <Text style={styles.kpiTitle} numberOfLines={2}>
                    {kpi.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab.id === 2 && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#0EA5E9' }]} />
            <Text style={styles.sectionTitle}>Calling Analytics Metrics</Text>
          </View>
          <View style={styles.kpiGrid}>
            {callQuickKpis.map((kpi, idx) => (
              <View
                key={kpi.id || `kpi-call-${idx}`}
                style={[styles.kpiCard, { borderTopColor: kpi.color }]}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={styles.kpiValue} numberOfLines={1}>
                    {kpi.value}
                  </Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: kpi.lightBg }]}>
                    <Ionicons name={(kpi.icon as any) || 'sparkles'} size={14} color={kpi.color} />
                  </View>
                </View>
                <View style={styles.kpiBottomRow}>
                  <Text style={styles.kpiTitle} numberOfLines={2}>
                    {kpi.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Active Tab Sections & Widgets (Suppressing empty/orphaned section headers) ── */}
      <View style={styles.tabContentArea}>
        {activeTab.sections?.map((section) => {
          const visibleWidgets = section.widgets?.filter((w) => w.type !== 'KPI') || [];

          // If all widgets in this section were KPIs, do NOT render an orphaned section header!
          if (visibleWidgets.length === 0) return null;

          return (
            <View key={section.id} style={styles.sectionWrap}>
              {section.title && (
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
              )}

              {visibleWidgets.map((widget) => {
                if (widget.type === 'TABLE') {
                  return renderTableWidget(widget);
                }
                if (widget.type === 'CHART') {
                  return renderChartWidget(widget);
                }
                return null;
              })}
            </View>
          );
        })}
      </View>

      {/* ── Layman Metric Explanation Modal ── */}
      <Modal
        visible={Boolean(metricModalData)}
        transparent
        animationType="fade"
        onRequestClose={() => setMetricModalData(null)}
      >
        <TouchableOpacity
          style={styles.metricModalOverlay}
          activeOpacity={1}
          onPress={() => setMetricModalData(null)}
        >
          <View style={styles.metricModalBox}>
            <View style={styles.metricModalTop}>
              <View style={styles.metricModalIconBadge}>
                <Ionicons name="bulb-outline" size={18} color="#0EA5E9" />
              </View>
              <Text style={styles.metricModalTitle}>{metricModalData?.title}</Text>
              <TouchableOpacity onPress={() => setMetricModalData(null)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.metricModalDesc}>{metricModalData?.description}</Text>

            {metricModalData?.hint && (
              <View style={styles.metricModalHintBox}>
                <Ionicons name="information-circle" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.metricModalHintText}>{metricModalData.hint}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.metricModalDismissBtn}
              onPress={() => setMetricModalData(null)}
            >
              <Text style={styles.metricModalDismissText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  kpiToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: -8,
    gap: 4,
  },
  kpiToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#272944',
  },
  groupByWrapper: {
    marginBottom: 14,
  },
  groupBySegmentBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 10,
    padding: 3,
  },
  groupByBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  groupByBtnActive: {
    backgroundColor: '#272944',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupByBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  groupByBtnTextActive: {
    color: '#FFFFFF',
  },
  executiveStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  executiveStripCol: {
    flex: 1,
    alignItems: 'center',
  },
  executiveStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  executiveStripLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  executiveStripValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  executiveStripSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  executiveStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  kpiCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  kpiIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  kpiTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.2,
    lineHeight: 12,
    flex: 1,
    marginRight: 2,
  },
  kpiInfoHitSlop: {
    padding: 1,
    marginTop: 1,
  },
  tabsBarWrapper: {
    marginBottom: 14,
  },
  tabsScroll: {
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#272944',
    borderColor: '#272944',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabContentArea: {
    paddingBottom: 24,
  },
  sectionWrap: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5E9',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  csvBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  csvBtnPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tableSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 10,
  },
  tableSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    marginLeft: 6,
    padding: 0,
  },
  tableOuterWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderCellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tableHeaderCellText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableHeaderCellTextActive: {
    color: '#272944',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableBodyCellWrap: {
    paddingHorizontal: 4,
  },
  tableBodyCellText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  tableBodyCellTextName: {
    fontWeight: '700',
    color: '#1E293B',
  },
  tableBodyCellTextTotal: {
    fontWeight: '900',
    color: '#272944',
  },
  tableScrollHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tableScrollHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  tableBodyCellActiveBg: {
    backgroundColor: '#EEF2F6',
    borderRadius: 4,
  },
  tableBodyCellTextSortActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  metricModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  metricModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  metricModalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricModalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metricModalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricModalDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  metricModalHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  metricModalHintText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
    fontWeight: '500',
  },
  metricModalDismissBtn: {
    backgroundColor: '#272944',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricModalDismissText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
