import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { theme } from '../../theme/theme';

export type TimeRangeFilter = 'today' | '7d' | '30d' | 'all';

interface Props {
  activeFilter: TimeRangeFilter;
  onChange: (filter: TimeRangeFilter) => void;
}

const FILTER_OPTIONS: { key: TimeRangeFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

export const DashboardTimeFilter: React.FC<Props> = ({ activeFilter, onChange }) => {
  return (
    <View style={styles.container}>
      {FILTER_OPTIONS.map((item) => {
        const isActive = activeFilter === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.pillBtn, isActive && styles.pillBtnActive]}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  pillBtnActive: {
    backgroundColor: '#1E2238',
    shadowColor: '#1E2238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
