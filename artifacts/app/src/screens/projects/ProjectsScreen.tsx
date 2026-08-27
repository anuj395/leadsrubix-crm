import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { AIAdvisorMascot } from '../../components/ui/AIAdvisorMascot';
import { quoteService } from '../../services/quoteService';
import { theme } from '../../theme/theme';

export const ProjectsScreen = () => {
  const [projects] = useState([
    {
      id: '1',
      name: 'Grand Horizon Towers',
      location: 'Golf Course Extension, Sector 65',
      type: 'Luxury 3 & 4 BHK Apartments',
      priceRange: '₹1.8 Cr - ₹3.5 Cr',
      basePrice: 18000000,
      plc: 500000,
      parking: 300000,
      availableUnits: 14,
      totalUnits: 120,
      status: 'Ready to Move',
      badgeColor: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
    },
    {
      id: '2',
      name: 'Rubix Empire Estates',
      location: 'Southern Peripheral Road, Sector 70',
      type: 'Premium Residential Villas',
      priceRange: '₹3.2 Cr - ₹6.5 Cr',
      basePrice: 32000000,
      plc: 1000000,
      parking: 500000,
      availableUnits: 6,
      totalUnits: 45,
      status: 'Under Construction',
      badgeColor: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
    },
    {
      id: '3',
      name: 'Skyline Business Park',
      location: 'Cyber City Phase II',
      type: 'Grade-A Commercial Offices',
      priceRange: '₹95 L - ₹2.8 Cr',
      basePrice: 9500000,
      plc: 250000,
      parking: 200000,
      availableUnits: 22,
      totalUnits: 90,
      status: 'New Launch',
      badgeColor: '#0284C7',
      bgColor: 'rgba(2, 132, 199, 0.12)',
    },
  ]);

  const handleGenerateQuote = (project: any) => {
    const q = quoteService.calculateQuote({
      unitType: project.type,
      basePrice: project.basePrice,
      floorRise: 200000,
      plcCharges: project.plc,
      parkingCharges: project.parking,
      gstRate: 0.05,
    });

    Alert.alert(
      `CPQ Quotation Breakdown`,
      `Project: ${project.name}\nBase Price: ₹${(project.basePrice / 100000).toFixed(1)} L\nPLC & Parking: ₹${((project.plc + project.parking) / 100000).toFixed(1)} L\nGST (5%): ₹${(q.gstAmount / 100000).toFixed(2)} L\n\nTotal Estimated Booking Value: ${q.formattedTotal}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share PDF via WhatsApp',
          onPress: () =>
            Alert.alert(
              'CPQ Quotation Sent',
              `PDF Quotation for ${project.name} shared via WhatsApp!`
            ),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />

      {/* Clean Executive #272944 Hero Header Banner */}
      <View style={styles.hero3DHeader}>
        <View style={styles.headerLogoRow}>
          <CompanyLogo variant="white" height={34} />
        </View>

        <View style={styles.headerTagPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.headerTagText}>REAL ESTATE PORTFOLIO & INVENTORY</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated AI Mascot Advisor Companion */}
        <AIAdvisorMascot screenName="Projects" />

        <Text style={styles.sectionHeaderTitle}>ACTIVE DEVELOPMENT PROJECTS</Text>

        {projects.map((project) => (
          <View key={project.id} style={styles.projectCard3D}>
            <View style={styles.cardTopRow}>
              <View style={[styles.projectIconBadge, { backgroundColor: project.bgColor }]}>
                <Ionicons name="business" size={22} color={project.badgeColor} />
              </View>

              <View style={styles.projectTitleGroup}>
                <Text style={styles.projectNameText}>{project.name}</Text>
                <Text style={styles.projectLocationText} numberOfLines={1}>{project.location}</Text>
              </View>

              <View style={[styles.statusPill, { backgroundColor: project.bgColor }]}>
                <Text style={[styles.statusPillText, { color: project.badgeColor }]}>{project.status}</Text>
              </View>
            </View>

            {/* Inventory Grid */}
            <View style={styles.inventoryGrid}>
              <View style={styles.invCol}>
                <Text style={styles.invLabel}>CONFIGURATIONS</Text>
                <Text style={styles.invValue} numberOfLines={1}>{project.type}</Text>
              </View>

              <View style={styles.invCol}>
                <Text style={styles.invLabel}>PRICE MATRIX</Text>
                <Text style={[styles.invValue, theme.typography.tabularNumbers]}>{project.priceRange}</Text>
              </View>

              <View style={styles.invCol}>
                <Text style={styles.invLabel}>AVAILABILITY</Text>
                <Text style={[styles.invValueHighlight, theme.typography.tabularNumbers]}>
                  {project.availableUnits} / {project.totalUnits} Units
                </Text>
              </View>
            </View>

            {/* Quick Action Footer */}
            <View style={styles.cardFooterActions}>
              <TouchableOpacity
                style={styles.quoteBtn}
                onPress={() => handleGenerateQuote(project)}
                activeOpacity={0.8}
              >
                <Ionicons name="calculator-outline" size={14} color="#FFFFFF" />
                <Text style={styles.quoteBtnText}>Generate CPQ Quote</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inventoryBtn}
                onPress={() => Alert.alert('Unit Availability', `14 luxury units available in ${project.name}. Floor plan matrix loaded.`)}
                activeOpacity={0.8}
              >
                <Ionicons name="grid-outline" size={14} color={theme.colors.brand700} />
                <Text style={styles.inventoryBtnText}>View Units</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hero3DHeader: {
    width: '100%',
    backgroundColor: '#272944',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F101E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  headerLogoRow: {
    marginBottom: 8,
  },
  headerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  headerTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  projectCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  projectIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectTitleGroup: {
    flex: 1,
  },
  projectNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  projectLocationText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inventoryGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  invCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  invValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  invValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quoteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inventoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  inventoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand700,
  },
});
