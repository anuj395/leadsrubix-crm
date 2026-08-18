import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InfoGuideBadge } from './InfoGuideBadge';
import {
  ALL_PERMISSIONS,
  DEFAULT_PRESET_ROLES,
  UserRoleDefinition,
  PermissionDefinition,
} from '../../services/permissionService';
import { theme } from '../../theme/theme';

export const RolePermissionManager: React.FC = () => {
  const [roles, setRoles] = useState<UserRoleDefinition[]>(DEFAULT_PRESET_ROLES);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('sales_agent');

  const currentRole = roles.find((r) => r.roleKey === selectedRoleKey) || roles[0];

  const handleTogglePermission = (permKey: string) => {
    const isGranted = currentRole.grantedPermissions.includes(permKey);
    const updatedPermissions = isGranted
      ? currentRole.grantedPermissions.filter((p) => p !== permKey)
      : [...currentRole.grantedPermissions, permKey];

    setRoles((prev) =>
      prev.map((r) =>
        r.roleKey === selectedRoleKey ? { ...r, grantedPermissions: updatedPermissions } : r
      )
    );
  };

  const handleApplyPreset = (presetKey: 'agent' | 'manager' | 'admin') => {
    let permList: string[] = [];
    if (presetKey === 'admin') permList = ALL_PERMISSIONS.map((p) => p.key);
    if (presetKey === 'manager')
      permList = [
        'leads.view_all',
        'leads.create',
        'leads.edit',
        'leads.rollback_stage',
        'quotes.generate_cpq',
        'quotes.approve_discount',
        'call_logs.view_all',
        'analytics.view_revenue',
      ];
    if (presetKey === 'agent')
      permList = ['leads.view_own', 'leads.create', 'leads.edit', 'quotes.generate_cpq'];

    setRoles((prev) =>
      prev.map((r) => (r.roleKey === selectedRoleKey ? { ...r, grantedPermissions: permList } : r))
    );

    Alert.alert('Preset Applied', `Applied ${presetKey.toUpperCase()} permission template.`);
  };

  // Group permissions by Category
  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeaderTitle}>GRANULAR RBAC PERMISSION MATRIX</Text>
        <InfoGuideBadge
          title="Role Based Access Control"
          description="Configure fine-grained permissions for each user role in your workspace. Use 1-click presets for quick setup."
        />
      </View>

      {/* Role Selector Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
        {roles.map((r) => {
          const isSelected = selectedRoleKey === r.roleKey;
          return (
            <TouchableOpacity
              key={r.roleKey}
              style={[styles.roleChip, isSelected && styles.roleChipSelected]}
              onPress={() => setSelectedRoleKey(r.roleKey)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                {r.roleName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 1-Click Quick Preset Template Bar */}
      <View style={styles.presetCard3D}>
        <Text style={styles.presetTitle}>1-CLICK QUICK PRESETS ({currentRole.roleName})</Text>

        <View style={styles.presetBtnRow}>
          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => handleApplyPreset('agent')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-sharp" size={14} color={theme.colors.brand700} />
            <Text style={styles.presetBtnText}>Agent Preset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => handleApplyPreset('manager')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-sharp" size={14} color="#D97706" />
            <Text style={[styles.presetBtnText, { color: '#D97706' }]}>Manager Preset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => handleApplyPreset('admin')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-sharp" size={14} color="#059669" />
            <Text style={[styles.presetBtnText, { color: '#059669' }]}>Full Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Granular Category Permission Matrix */}
      {categories.map((cat) => {
        const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat);
        return (
          <View key={cat} style={styles.categoryCard3D}>
            <Text style={styles.categoryTitle}>{cat.toUpperCase()} PERMISSIONS</Text>

            {catPerms.map((perm) => {
              const isGranted = currentRole.grantedPermissions.includes(perm.key);
              return (
                <View key={perm.key} style={styles.permRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.permLabelRow}>
                      <Text style={styles.permLabel}>{perm.label}</Text>
                      <InfoGuideBadge title={perm.label} description={perm.description} />
                    </View>
                    <Text style={styles.permDesc}>{perm.description}</Text>
                  </View>

                  <Switch
                    value={isGranted}
                    onValueChange={() => handleTogglePermission(perm.key)}
                    trackColor={{ false: '#CBD5E1', true: theme.colors.brand700 }}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  roleScroll: {
    marginBottom: 14,
    marginHorizontal: -4,
  },
  roleChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  roleChipSelected: {
    backgroundColor: theme.colors.brand700,
    borderColor: theme.colors.brand700,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  presetCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  presetTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  presetBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.brand700,
  },
  categoryCard3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  permDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    paddingRight: 8,
  },
});
