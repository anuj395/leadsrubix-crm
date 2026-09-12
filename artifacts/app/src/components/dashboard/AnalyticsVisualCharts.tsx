import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_CHART_COLORS = [
  '#272944',
  '#0EA5E9',
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
];

interface ChartItem {
  name: string;
  value: number;
  color?: string;
}

// ── 1. EXECUTIVE DONUT & PROPORTIONAL DISTRIBUTION CHART ─────────────────────
export const ExecutiveDonutChart: React.FC<{
  items: ChartItem[];
  title?: string;
  totalLabel?: string;
  onItemPress?: (item: ChartItem) => void;
}> = ({ items, title, totalLabel = 'TOTAL', onItemPress }) => {
  const allItems = items || [];
  const positiveItems = allItems.filter((it) => it && it.value > 0);
  const totalVal = positiveItems.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  // If total is 0, keep up to 4 items so legend shows tracked metrics
  const displayItems = totalVal > 0 ? positiveItems : allItems.slice(0, 4);

  return (
    <View style={styles.chartCard}>
      {title && (
        <View style={styles.chartHeader}>
          <View style={styles.chartIconBadge}>
            <Ionicons name="pie-chart-outline" size={14} color="#10B981" />
          </View>
          <Text style={styles.chartHeaderTitle}>{title}</Text>
        </View>
      )}

      {/* Proportional Multi-Segment Progress Bar */}
      <View style={styles.stackedBarContainer}>
        <View style={styles.stackedBarTrack}>
          {totalVal > 0 ? (
            positiveItems.map((item, idx) => {
              const pct = (item.value / totalVal) * 100;
              if (pct <= 0) return null;
              const itemColor = item.color || DEFAULT_CHART_COLORS[idx % DEFAULT_CHART_COLORS.length];
              return (
                <View
                  key={`stacked-${idx}`}
                  style={[
                    styles.stackedBarSegment,
                    {
                      width: `${pct}%`,
                      backgroundColor: itemColor,
                      borderTopLeftRadius: idx === 0 ? 6 : 0,
                      borderBottomLeftRadius: idx === 0 ? 6 : 0,
                      borderTopRightRadius: idx === positiveItems.length - 1 ? 6 : 0,
                      borderBottomRightRadius: idx === positiveItems.length - 1 ? 6 : 0,
                    },
                  ]}
                />
              );
            })
          ) : (
            <View style={[styles.stackedBarSegment, { width: '100%', backgroundColor: '#E2E8F0' }]} />
          )}
        </View>
        {totalVal === 0 && (
          <Text style={styles.emptyTrackNote}>No activity recorded in this period</Text>
        )}
      </View>

      {/* Center Metric Callout */}
      <View style={styles.donutHeroRow}>
        <View style={styles.donutHeroMetric}>
          <Text style={styles.donutHeroNumber}>{totalVal}</Text>
          <Text style={styles.donutHeroLabel}>{totalLabel}</Text>
        </View>
      </View>

      {/* Interactive Legend Grid */}
      {displayItems.length > 0 && (
        <View style={styles.legendGrid}>
          {displayItems.map((item, idx) => {
            const itemColor = item.color || DEFAULT_CHART_COLORS[idx % DEFAULT_CHART_COLORS.length];
            const pct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;

            return (
              <TouchableOpacity
                key={`legend-${idx}`}
                style={styles.legendChip}
                activeOpacity={onItemPress ? 0.7 : 1}
                onPress={() => onItemPress && onItemPress(item)}
              >
                <View style={[styles.legendDot, { backgroundColor: totalVal > 0 ? itemColor : '#94A3B8' }]} />
                <Text style={styles.legendName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.legendBadge}>
                  <Text style={styles.legendValueText}>{item.value || 0}</Text>
                  <Text style={styles.legendPctText}>({pct}%)</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ── 2. ACTIVITY TREND BAR CHART (Calling Volume Over Time) ───────────────────
export const ActivityTrendBarChart: React.FC<{
  data: { date: string; calls?: number; value?: number; name?: string }[];
  title?: string;
  metricLabel?: string;
}> = ({ data, title = 'Calling Activity Trends', metricLabel = 'calls' }) => {
  const cleanData = (data || []).map((d) => ({
    label: d.name || d.date ? String(d.name || d.date).slice(-5) : 'Day',
    fullDate: d.date || d.name || '',
    value: Number(d.calls !== undefined ? d.calls : d.value || 0),
  }));

  const totalCalls = cleanData.reduce((sum, d) => sum + d.value, 0);
  const maxCalls = cleanData.reduce((max, d) => Math.max(max, d.value), 0) || 1;
  const avgCalls = cleanData.length > 0 ? Math.round(totalCalls / cleanData.length) : 0;
  const isScrollable = cleanData.length > 7;

  return (
    <View style={styles.chartCard}>
      <View style={styles.trendHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="trending-up" size={14} color="#0EA5E9" />
            </View>
            <Text style={styles.chartHeaderTitle}>{title}</Text>
          </View>
          <Text style={styles.chartSub}>
            Total: {totalCalls} {metricLabel} across {cleanData.length} recorded dates
          </Text>
        </View>
        <View style={styles.avgPill}>
          <Text style={styles.avgPillLabel}>Avg / Day</Text>
          <Text style={styles.avgPillValue}>{avgCalls}</Text>
        </View>
      </View>

      {cleanData.length === 0 ? (
        <EmptyAnalyticsState message="No calling activities recorded in this date range" />
      ) : (
        <View style={styles.trendBarsBox}>
          {isScrollable ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendBarsScrollContent}
              directionalLockEnabled={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
            >
              <View style={styles.trendBarsRowScrollable}>
                {cleanData.map((item, idx) => {
                  const isPeak = item.value === maxCalls && maxCalls > 0;
                  const barHeightPct = maxCalls > 0 ? Math.max((item.value / maxCalls) * 85, 6) : 6;

                  return (
                    <View key={`trend-${idx}`} style={styles.trendBarColScrollable}>
                      <Text style={[styles.trendBarValue, isPeak && styles.trendBarValuePeak]}>
                        {item.value}
                      </Text>
                      <View style={styles.trendBarTrack}>
                        <View
                          style={[
                            styles.trendBarPill,
                            { height: barHeightPct },
                            isPeak ? styles.trendBarPillPeak : styles.trendBarPillStandard,
                          ]}
                        />
                      </View>
                      <Text style={styles.trendBarDate} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.trendBarsRow}>
              {cleanData.map((item, idx) => {
                const isPeak = item.value === maxCalls && maxCalls > 0;
                const barHeightPct = maxCalls > 0 ? Math.max((item.value / maxCalls) * 85, 6) : 6;

                return (
                  <View key={`trend-${idx}`} style={styles.trendBarCol}>
                    <Text style={[styles.trendBarValue, isPeak && styles.trendBarValuePeak]}>
                      {item.value}
                    </Text>
                    <View style={styles.trendBarTrack}>
                      <View
                        style={[
                          styles.trendBarPill,
                          { height: barHeightPct },
                          isPeak ? styles.trendBarPillPeak : styles.trendBarPillStandard,
                        ]}
                      />
                    </View>
                    <Text style={styles.trendBarDate} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ── 3. EMPTY STATE PLACEHOLDER ───────────────────────────────────────────────
export const EmptyAnalyticsState: React.FC<{
  title?: string;
  message?: string;
  icon?: string;
}> = ({
  title = 'No Data Available',
  message = 'There are no records matching your selected date range or team group.',
  icon = 'bar-chart-outline',
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon as any} size={28} color="#94A3B8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chartHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  chartSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stackedBarContainer: {
    marginVertical: 14,
  },
  stackedBarTrack: {
    flexDirection: 'row',
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stackedBarSegment: {
    height: '100%',
  },
  emptyTrackNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  donutHeroRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  donutHeroMetric: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  donutHeroNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  donutHeroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: '47%',
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  legendPctText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  trendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avgPill: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },
  avgPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16A34A',
    textTransform: 'uppercase',
  },
  avgPillValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803D',
  },
  trendBarsBox: {
    height: 120,
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
  },
  trendBarsScrollContent: {
    paddingHorizontal: 4,
  },
  trendBarsRowScrollable: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
  },
  trendBarColScrollable: {
    width: 38,
    marginHorizontal: 3,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  trendBarValuePeak: {
    color: '#0EA5E9',
    fontWeight: '800',
  },
  trendBarTrack: {
    width: 14,
    height: 85,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    overflow: 'hidden',
  },
  trendBarPill: {
    width: '100%',
    borderRadius: 7,
  },
  trendBarPillStandard: {
    backgroundColor: '#CBD5E1',
  },
  trendBarPillPeak: {
    backgroundColor: '#0EA5E9',
  },
  trendBarDate: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
});
