import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../theme/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const LeadsRubixLogo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const iconSize = isLarge ? 64 : isSmall ? 36 : 48;

  return (
    <View style={styles.container}>
      <View style={[styles.logoBadge, { width: iconSize, height: iconSize, borderRadius: iconSize / 4 }]}>
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: iconSize * 0.75, height: iconSize * 0.75, borderRadius: (iconSize * 0.75) / 4 }}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.brandTitle, { fontSize: isLarge ? 26 : isSmall ? 18 : 22 }]}>
        Leads Rubix
      </Text>
      {showSubtitle ? (
        <Text style={styles.brandSubtitle}>CRM SALES PORTAL</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
