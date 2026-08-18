import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

interface StatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'Fresh', size = 'md' }) => {
  const normalized = (status || '').toLowerCase();
  
  let preset = theme.colors.statusDefault;
  if (normalized.includes('fresh') || normalized.includes('new')) {
    preset = theme.colors.statusFresh;
  } else if (normalized.includes('contact') || normalized.includes('progress')) {
    preset = theme.colors.statusContacted;
  } else if (normalized.includes('qualif') || normalized.includes('negotiat')) {
    preset = theme.colors.statusQualified;
  } else if (normalized.includes('won') || normalized.includes('close')) {
    preset = theme.colors.statusWon;
  } else if (normalized.includes('lost') || normalized.includes('drop')) {
    preset = theme.colors.statusLost;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: preset.bg,
          borderColor: preset.border,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: preset.text }]} />
      <Text style={[styles.text, { color: preset.text, fontSize: isSmall ? 10 : 11 }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
});
