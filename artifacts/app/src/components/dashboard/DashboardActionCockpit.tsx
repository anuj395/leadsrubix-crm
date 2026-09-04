import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardMetrics } from '../../services/analyticsService';
import { getIndustrySemantics } from '../../utils/industryLabels';

interface Props {
  metrics: CardMetrics;
  industryId?: string;
  onNavigateAction: (screen: 'Leads' | 'Tasks', params?: any) => void;
}

export const DashboardActionCockpit: React.FC<Props> = ({
  metrics,
  industryId,
  onNavigateAction,
}) => {
  const semantics = getIndustrySemantics(industryId);

  // Dynamic short visit title based on industry
  const getShortVisitTitle = () => {
    if (semantics.siteVisit === 'Delivery') return 'Deliveries';
    if (semantics.siteVisit === 'Consultation') return 'Consults';
    if (semantics.siteVisit === 'Campus Tour') return 'Interviews';
    if (semantics.siteVisit === 'Client Meetup') return 'Demos';
    if (semantics.siteVisit === 'Plant Visit') return 'Shipments';
    return 'Site Visits';
  };

  const actions = [
    {
      id: 'fresh',
      title: semantics.freshLabel,
      count: metrics.fresh,
      subtitle: '< 5m SLA',
      icon: 'flash-sharp' as const,
      color: '#0284C7',
      bgGradient: '#E0F2FE',
      badgeColor: '#0284C7',
      onPress: () =>
        onNavigateAction('Leads', { filter: 'fresh', title: semantics.freshLabel }),
    },
    {
      id: 'scheduled',
      title: getShortVisitTitle(),
      count: metrics.scheduledVisits,
      subtitle: 'Scheduled',
      icon: 'calendar-sharp' as const,
      color: '#D97706',
      bgGradient: '#FEF3C7',
      badgeColor: '#D97706',
      onPress: () =>
        onNavigateAction('Tasks', {
          filter: 'scheduledVisits',
          title: semantics.scheduledVisits,
        }),
    },
    {
      id: 'callback',
      title: 'Follow-ups',
      count: metrics.callBack,
      subtitle: 'Queued',
      icon: 'call-sharp' as const,
      color: '#7C3AED',
      bgGradient: '#EDE9FE',
      badgeColor: '#7C3AED',
      onPress: () =>
        onNavigateAction('Leads', { filter: 'callBack', title: 'Follow-ups Due' }),
    },
  ];

  const hasActiveActions = actions.some((a) => a.count > 0);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeftGroup}>
          <View
            style={[
              styles.urgentDot,
              { backgroundColor: hasActiveActions ? '#F43F5E' : '#94A3B8' },
            ]}
          />
          <Text style={styles.sectionTitle}>TODAY'S ACTION COCKPIT</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          {hasActiveActions ? 'Requires action today' : 'Up to date'}
        </Text>
      </View>

      <View style={styles.cardsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            {/* Top Accent Line */}
            <View style={[styles.topAccentBar, { backgroundColor: action.color }]} />

            <View style={styles.cardInnerPadding}>
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: action.bgGradient },
                  ]}
                >
                  <Ionicons name={action.icon} size={15} color={action.color} />
                </View>
                <Text style={[styles.countText, { color: action.badgeColor }]}>
                  {action.count}
                </Text>
              </View>

              <Text style={styles.actionTitle} numberOfLines={1}>
                {action.title}
              </Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {action.subtitle}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 3,
    width: '100%',
  },
  cardInnerPadding: {
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitleRow: {
    marginTop: 2,
  },
  actionSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
