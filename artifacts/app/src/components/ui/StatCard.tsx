import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: string;
  subtitle?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = theme.colors.primary,
  trend,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={!onPress}
      onPress={onPress}
      style={styles.cardContainer}
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          {trend ? (
            <View style={styles.trendBadge}>
              <Ionicons name="trending-up" size={12} color={theme.colors.emerald} />
              <Text style={styles.trendText}>{trend}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.valueText}>{value}</Text>
        <Text style={styles.titleText}>{title}</Text>
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardInner: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.round,
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.emerald,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
