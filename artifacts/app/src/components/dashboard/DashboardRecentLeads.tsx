import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeadItem } from '../../services/leadService';
import { getIndustrySemantics } from '../../utils/industryLabels';
import { theme } from '../../theme/theme';

interface Props {
  leads: LeadItem[];
  industryId?: string;
  onViewAll: () => void;
  onLeadPress: (lead: LeadItem) => void;
}

export const DashboardRecentLeads: React.FC<Props> = ({
  leads,
  industryId,
  onViewAll,
  onLeadPress,
}) => {
  const semantics = getIndustrySemantics(industryId);
  const recentList = leads.slice(0, 3);

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash-sharp" size={14} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.title}>{semantics.recentLeadsHeader}</Text>
            <Text style={styles.subtitle}>{semantics.recentLeadsSub}</Text>
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
            <Ionicons name="sparkles-sharp" size={24} color="#0284C7" />
          </View>
          <Text style={styles.emptyTitle}>Inquiry Queue Clear</Text>
          <Text style={styles.emptyText}>
            Fresh {semantics.leadEntityPlural.toLowerCase()} assigned to your sales queue will appear here in real time.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={15} color="#272944" />
            <Text style={styles.emptyActionBtnText}>Explore {semantics.leadEntityPlural}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {recentList.map((lead) => (
            <TouchableOpacity
              key={lead.id}
              style={styles.leadItem}
              onPress={() => onLeadPress(lead)}
              activeOpacity={0.85}
            >
              <View style={styles.leadLeft}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(lead.name || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.leadName} numberOfLines={1}>
                    {lead.name}
                  </Text>
                  <Text style={styles.leadProject} numberOfLines={1}>
                    {lead.project || lead.propertyType || semantics.leadEntitySingular} • {lead.source || 'Direct'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsGroup}>
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => handleWhatsApp(lead.phone)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(lead.phone)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
  leadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leadName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  leadProject: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
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
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272944',
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
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272944',
  },
});
