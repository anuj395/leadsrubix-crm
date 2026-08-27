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
      bgGradient: 'rgba(2, 132, 199, 0.08)',
      borderColor: 'rgba(2, 132, 199, 0.22)',
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
      bgGradient: 'rgba(217, 119, 6, 0.08)',
      borderColor: 'rgba(217, 119, 6, 0.22)',
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
      bgGradient: 'rgba(124, 58, 237, 0.08)',
      borderColor: 'rgba(124, 58, 237, 0.22)',
      badgeColor: '#7C3AED',
      onPress: () =>
        onNavigateAction('Leads', { filter: 'callBack', title: 'Follow-ups Due' }),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeftGroup}>
          <View style={styles.urgentDot} />
          <Text style={styles.sectionTitle}>TODAY'S ACTION COCKPIT</Text>
        </View>
        <Text style={styles.sectionSubtitle}>High-priority items</Text>
      </View>

      <View style={styles.cardsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionCard,
              { backgroundColor: '#FFFFFF', borderColor: action.borderColor },
            ]}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
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
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E11D48',
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderBottomWidth: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
