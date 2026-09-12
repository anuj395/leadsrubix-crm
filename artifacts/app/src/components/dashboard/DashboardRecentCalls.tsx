import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallLogItem } from '../../services/callLogService';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { theme } from '../../theme/theme';
import { openWhatsApp } from '../../utils/whatsappHelper';

interface Props {
  calls: CallLogItem[];
  industryId?: string;
  organizationName?: string;
  onViewAll: () => void;
  onRedial: (call: CallLogItem) => void;
  onOpenDialer?: () => void;
}

export const DashboardRecentCalls: React.FC<Props> = ({
  calls,
  industryId,
  organizationName,
  onViewAll,
  onRedial,
  onOpenDialer,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const recentList = calls.slice(0, 3);

  const handleWhatsApp = (phone?: string, name?: string) => {
    const orgSuffix = organizationName ? ` regarding ${organizationName}` : '';
    const text = `Hi ${name || 'Sir/Madam'}, following up on our recent phone conversation${orgSuffix}.`;
    openWhatsApp(phone, text);
  };

  const getOutcomeBadge = (call: CallLogItem) => {
    const outcome = (call.outcome || call.status || 'Answered').toLowerCase();
    if (outcome.includes('answer') || outcome.includes('completed') || outcome.includes('connected')) {
      return { label: call.outcome || 'Answered', bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
    }
    if (outcome.includes('callback') || outcome.includes('call_back') || outcome.includes('follow')) {
      return { label: call.outcome || 'Callback', bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    }
    if (outcome.includes('busy') || outcome.includes('no answer') || outcome.includes('missed')) {
      return { label: call.outcome || 'No Answer', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
    if (outcome.includes('won') || outcome.includes('interested')) {
      return { label: call.outcome || 'Interested', bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
    }
    if (outcome.includes('not') || outcome.includes('lost')) {
      return { label: call.outcome || 'Not Interested', bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
    }
    return {
      label: call.outcome || 'Logged',
      bg: call.bgColor || '#F1F5F9',
      text: call.badgeColor || '#475569',
      border: '#CBD5E1',
    };
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="call-sharp" size={14} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.title}>TODAY'S CALL ACTIVITY</Text>
            <Text style={styles.subtitle}>
              {recentList.length} {recentList.length === 1 ? 'Call' : 'Calls'} Logged
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward-sharp" size={12} color={theme.colors.brand700} />
        </TouchableOpacity>
      </View>

      {recentList.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="call-outline" size={24} color="#0284C7" />
          </View>
          <Text style={styles.emptyTitle}>No Calls Logged Yet Today</Text>
          <Text style={styles.emptyText}>
            Calls placed via the dialer or agenda will automatically appear here with their duration and disposition.
          </Text>
          {onOpenDialer && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onOpenDialer}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad" size={14} color="#0284C7" />
              <Text style={styles.emptyActionBtnText}>Open Dialer</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {recentList.map((call) => {
            const isOut = (call.type || call.direction || '').toLowerCase().includes('out');
            const badge = getOutcomeBadge(call);
            return (
              <View key={call.id || call._id} style={styles.callItem}>
                <View style={styles.callLeft}>
                  <View
                    style={[
                      styles.directionIconCircle,
                      { backgroundColor: isOut ? 'rgba(39, 41, 68, 0.08)' : '#F0FDF4' },
                    ]}
                  >
                    <Ionicons
                      name={isOut ? 'call' : 'call-outline'}
                      size={14}
                      color={isOut ? '#272944' : '#16A34A'}
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.callerName} numberOfLines={1}>
                        {call.buyerName || 'Contact'}
                      </Text>
                      <View
                        style={[
                          styles.outcomeBadge,
                          { backgroundColor: badge.bg, borderColor: badge.border },
                        ]}
                      >
                        <Text style={[styles.outcomeBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.phoneText}>{call.phone || 'No phone'}</Text>
                      {call.duration ? (
                        <>
                          <Text style={styles.dot}>•</Text>
                          <Ionicons name="timer-outline" size={10} color="#64748B" />
                          <Text style={styles.durationText}>{call.duration}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.actionsGroup}>
                  {call.phone ? (
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleWhatsApp(call.phone, call.buyerName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.redialBtn}
                    onPress={() => onRedial(call)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(39, 41, 68, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
  list: {
    gap: 8,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  directionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    maxWidth: 130,
  },
  outcomeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  outcomeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whatsappBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redialBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
});
