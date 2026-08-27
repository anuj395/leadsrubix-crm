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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  pillBtnActive: {
    backgroundColor: theme.colors.brand700,
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
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
