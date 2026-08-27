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
          <Ionicons name="folder-open-outline" size={24} color="#94A3B8" />
          <Text style={styles.emptyText}>
            No fresh {semantics.leadEntityPlural.toLowerCase()} in queue. Add new {semantics.leadEntityPlural.toLowerCase()} to start closing!
          </Text>
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leadName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  leadProject: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whatsappBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
