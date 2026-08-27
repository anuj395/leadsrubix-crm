import { TextStyle, ViewStyle, Platform } from 'react-native';

export const theme = {
  colors: {
    // Executive Navy Scale (#272944 base)
    primary: '#272944',
    brand900: '#0F101E',
    brand800: '#1A1C30',
    brand700: '#272944',
    brand600: '#343759',
    brand500: '#464A73',

    // Accent Highlights
    cyan: '#0284C7',
    cyanSubtle: 'rgba(2, 132, 199, 0.12)',
    emerald: '#059669',
    emeraldSubtle: 'rgba(5, 150, 105, 0.12)',
    amber: '#D97706',
    amberSubtle: 'rgba(217, 119, 6, 0.12)',
    rose: '#E11D48',
    roseSubtle: 'rgba(225, 29, 72, 0.12)',
    purple: '#7C3AED',
    purpleSubtle: 'rgba(124, 58, 237, 0.12)',

    // Surfaces & Canvas
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceElevated: '#FFFFFF',

    // Status Presets Object Hierarchy
    statusDefault: {
      bg: '#F1F5F9',
      border: '#CBD5E1',
      text: '#475569',
    },
    statusFresh: {
      bg: 'rgba(2, 132, 199, 0.12)',
      border: 'rgba(2, 132, 199, 0.25)',
      text: '#0284C7',
    },
    statusContacted: {
      bg: 'rgba(217, 119, 6, 0.12)',
      border: 'rgba(217, 119, 6, 0.25)',
      text: '#D97706',
    },
    statusQualified: {
      bg: 'rgba(124, 58, 237, 0.12)',
      border: 'rgba(124, 58, 237, 0.25)',
      text: '#7C3AED',
    },
    statusWon: {
      bg: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.25)',
      text: '#059669',
    },
    statusLost: {
      bg: 'rgba(225, 29, 72, 0.12)',
      border: 'rgba(225, 29, 72, 0.25)',
      text: '#E11D48',
    },

    // Text Contrast Hierarchy
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textDisabled: '#94A3B8',
    textInverse: '#FFFFFF',

    // Borders & Glass
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    border3DRim: '#CBD5E1',
    glassSurface: 'rgba(255, 255, 255, 0.12)',
    glassBorder: 'rgba(255, 255, 255, 0.22)',
  },

  typography: {
    display: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.75,
      color: '#0F172A',
      lineHeight: 34,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    h1: {
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      color: '#0F172A',
      lineHeight: 28,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    h2: {
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: '#0F172A',
      lineHeight: 24,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    h3: {
      fontSize: 15,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      color: '#0F172A',
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '400' as const,
      letterSpacing: -0.1,
      color: '#334155',
      lineHeight: 22,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    bodyMedium: {
      fontSize: 13.5,
      fontWeight: '400' as const,
      letterSpacing: 0,
      color: '#334155',
      lineHeight: 19,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0.1,
      color: '#64748B',
      lineHeight: 16,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    labelCaps: {
      fontSize: 11.5,
      fontWeight: '700' as const,
      letterSpacing: 0.75,
      color: '#64748B',
      textTransform: 'uppercase' as const,
      lineHeight: 14,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    buttonLarge: {
      fontSize: 15,
      fontWeight: '700' as const,
      letterSpacing: -0.1,
      color: '#FFFFFF',
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    buttonMedium: {
      fontSize: 13.5,
      fontWeight: '600' as const,
      letterSpacing: 0,
      color: '#FFFFFF',
      lineHeight: 18,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      letterSpacing: -0.1,
      color: '#334155',
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    bodyBold: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: -0.1,
      color: '#0F172A',
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    tabularNumbers: {
      fontVariant: ['tabular-nums' as const],
    },
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 44,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 999,
  },

  effects: {
    card3D: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderBottomWidth: 3,
      borderBottomColor: '#CBD5E1',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 4,
    } as ViewStyle,

    button3D: {
      backgroundColor: '#272944',
      borderRadius: 14,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
      borderBottomColor: '#16182B',
      shadowColor: '#272944',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 5,
    } as ViewStyle,

    inputBox3D: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: '#CBD5E1',
      borderBottomWidth: 2.5,
      borderBottomColor: '#CBD5E1',
      height: 52,
    } as ViewStyle,
  },
};
