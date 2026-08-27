import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackRow } from '../../services/analyticsService';
import { InfoGuideBadge } from '../ui/InfoGuideBadge';
import { theme } from '../../theme/theme';

export type GroupByMode = 'team' | 'source' | 'teamWise';

interface Props {
  feedbackList: FeedbackRow[];
  groupBy: GroupByMode;
  onGroupByChange: (mode: GroupByMode) => void;
  onItemPress?: (item: FeedbackRow) => void;
}

const GROUP_OPTIONS: { key: GroupByMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'team', label: 'Associate', icon: 'person-outline' },
  { key: 'source', label: 'Lead Source', icon: 'globe-outline' },
  { key: 'teamWise', label: 'Team Wise', icon: 'people-outline' },
];

export const DashboardFeedbackSummary: React.FC<Props> = ({
  feedbackList,
  groupBy,
  onGroupByChange,
  onItemPress,
}) => {
  const getGroupTitle = () => {
    switch (groupBy) {
      case 'source':
        return 'LEAD SOURCE ATTRIBUTION';
      case 'teamWise':
        return 'TEAM-WISE PERFORMANCE';
      default:
        return 'ASSOCIATE PERFORMANCE';
    }
  };

  const getIconForGroup = (name: string) => {
    if (groupBy === 'source') {
      const lower = name.toLowerCase();
      if (lower.includes('google')) return 'logo-google';
      if (lower.includes('facebook') || lower.includes('meta')) return 'logo-facebook';
      if (lower.includes('whatsapp')) return 'logo-whatsapp';
      if (lower.includes('instagram')) return 'logo-instagram';
      if (lower.includes('website') || lower.includes('organic')) return 'globe-outline';
      return 'magnet-outline';
    }
    if (groupBy === 'teamWise') {
      return 'people-sharp';
    }
    return 'person-circle-outline';
  };

  return (
    <View style={styles.card}>
      {/* Header with Title & Info */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{getGroupTitle()}</Text>
          <Text style={styles.subtitle}>
            Stage outcomes grouped by {groupBy === 'source' ? 'channel attribution' : 'sales assignee'}
          </Text>
        </View>
        <InfoGuideBadge
          title="Performance Grouping"
          description="Analyzes deal progression, conversions, and site visits grouped dynamically by Associate, Lead Source, or Team."
        />
      </View>

      {/* GroupBy Switcher Pills */}
      <View style={styles.groupSwitcher}>
        {GROUP_OPTIONS.map((opt) => {
          const isActive = groupBy === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.switcherBtn, isActive && styles.switcherBtnActive]}
              onPress={() => onGroupByChange(opt.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={opt.icon}
                size={13}
                color={isActive ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.switcherText, isActive && styles.switcherTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Breakdown List */}
      {feedbackList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="folder-open-outline" size={26} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Activity Records Found</Text>
          <Text style={styles.emptyText}>
            No lead inquiries recorded for this {groupBy === 'source' ? 'source' : 'associate'} in the selected time range.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {feedbackList.map((row) => {
            const winRate = row.total > 0 ? Math.round((row.won / row.total) * 100) : 0;

            return (
              <TouchableOpacity
                key={`${row.sNo}-${row.associate}`}
                style={styles.itemCard}
                onPress={() => onItemPress?.(row)}
                activeOpacity={0.85}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.nameGroup}>
                    <View style={styles.avatarCircle}>
                      <Ionicons
                        name={getIconForGroup(row.associate) as any}
                        size={16}
                        color={theme.colors.brand700}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.associateName} numberOfLines={1}>
                        {row.associate}
                      </Text>
                      <Text style={styles.winRateText}>
                        {winRate}% Win Conversion Rate
                      </Text>
                    </View>
                  </View>

                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{row.total} Leads</Text>
                  </View>
                </View>

                {/* Metrics Pill Grid */}
                <View style={styles.metricsPillRow}>
                  <View style={[styles.miniPill, { backgroundColor: 'rgba(2, 132, 199, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#0284C7' }]}>
                      Fresh <Text style={styles.miniPillVal}>{row.fresh}</Text>
                    </Text>
                  </View>

                  <View style={[styles.miniPill, { backgroundColor: 'rgba(217, 119, 6, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#D97706' }]}>
                      Callback <Text style={styles.miniPillVal}>{row.callBack}</Text>
                    </Text>
                  </View>

                  <View style={[styles.miniPill, { backgroundColor: 'rgba(124, 58, 237, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#7C3AED' }]}>
                      Interested <Text style={styles.miniPillVal}>{row.interested}</Text>
                    </Text>
                  </View>

                  <View style={[styles.miniPill, { backgroundColor: 'rgba(5, 150, 105, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#059669' }]}>
                      Won <Text style={styles.miniPillVal}>{row.won}</Text>
                    </Text>
                  </View>

                  <View style={[styles.miniPill, { backgroundColor: 'rgba(225, 29, 72, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#E11D48' }]}>
                      Lost <Text style={styles.miniPillVal}>{row.lost}</Text>
                    </Text>
                  </View>

                  <View style={[styles.miniPill, { backgroundColor: 'rgba(13, 148, 136, 0.08)' }]}>
                    <Text style={[styles.miniPillLabel, { color: '#0D9488' }]}>
                      Visits <Text style={styles.miniPillVal}>{row.completedVisits + row.scheduledVisits}</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  groupSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  switcherBtnActive: {
    backgroundColor: theme.colors.brand700,
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  switcherTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(39, 41, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  associateName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  winRateText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  totalBadge: {
    backgroundColor: theme.colors.brand700,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniPillLabel: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  miniPillVal: {
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
