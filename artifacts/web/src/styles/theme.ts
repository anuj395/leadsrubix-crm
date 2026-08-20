import { createTheme, lighten, darken, alpha } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const fontFamily = [
  'Inter',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(', ')

const headingFontFamily = [
  'Outfit',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(', ')
const baseBorderRadius = 12

const sharedTokens = {
  fontFamily,
  fontWeightBold: 700,
  fontWeightSemiBold: 600,
  fontWeightMedium: 500,
  fontWeightRegular: 400,
  // New primary color requested by user
  primary: '#272944',
  // keep existing indigo accent as secondary
  secondary: '#4F6AF5',
  textPrimary: '#0F1117',
  textSecondary: '#6B7280',
}


// ─── Palette factory ──────────────────────────────────────────────────────────
function getPalette(mode: ThemeMode) {
  if (mode === 'dark') {
    return {
      mode,
      primary: {
        main: sharedTokens.primary,
        light: lighten(sharedTokens.primary, 0.12),
        dark: darken(sharedTokens.primary, 0.12),
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: sharedTokens.secondary,
        light: lighten(sharedTokens.secondary, 0.12),
        dark: darken(sharedTokens.secondary, 0.12),
        contrastText: '#FFFFFF',
      },
      text: {
        primary: '#F1F3F9',
        secondary: '#9CA3AF',
      },
      background: {
        default: '#060713',
        paper: '#0B0E20',
      },
      divider: 'rgba(255,255,255,0.07)',
      action: {
        hover: 'rgba(79,106,245,0.10)',
        selected: 'rgba(79,106,245,0.16)',
      },
    } as const
  }

  return {
    mode,
    primary: {
      main: sharedTokens.primary,
      light: lighten(sharedTokens.primary, 0.10),
      dark: darken(sharedTokens.primary, 0.14),
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: sharedTokens.secondary,
      light: lighten(sharedTokens.secondary, 0.12),
      dark: darken(sharedTokens.secondary, 0.12),
      contrastText: '#FFFFFF',
    },
    text: {
      primary: sharedTokens.textPrimary,
      secondary: sharedTokens.textSecondary,
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    divider: 'rgba(15,17,23,0.08)',
    action: {
      hover: 'rgba(79,106,245,0.06)',
      selected: 'rgba(79,106,245,0.10)',
    },
  } as const
}

// ─── Theme factory ────────────────────────────────────────────────────────────
export function createAppTheme(mode: ThemeMode = DEFAULT_THEME_MODE) {
  const isDark = mode === 'dark'

  return createTheme({
    palette: getPalette(mode),
    shape: { borderRadius: baseBorderRadius },

    typography: {
      fontFamily,
      fontWeightRegular: sharedTokens.fontWeightRegular,
      fontWeightMedium: sharedTokens.fontWeightMedium,
      fontWeightBold: sharedTokens.fontWeightBold,

      h1: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(1.375rem, 4vw, 2rem)',
        fontWeight: sharedTokens.fontWeightBold,
        lineHeight: 1.18,
        letterSpacing: '-0.03em',
      },
      h2: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(1.125rem, 3vw, 1.625rem)',
        fontWeight: sharedTokens.fontWeightBold,
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(1rem, 2.5vw, 1.375rem)',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        lineHeight: 1.3,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        lineHeight: 1.35,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(0.875rem, 1.8vw, 0.9375rem)',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontFamily: headingFontFamily,
        fontSize: 'clamp(0.75rem, 1.6vw, 0.8125rem)',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        lineHeight: 1.45,
        letterSpacing: '-0.005em',
      },
      body1: {
        fontFamily,
        fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
        fontWeight: sharedTokens.fontWeightRegular,
        lineHeight: 1.6,
      },
      body2: {
        fontFamily,
        fontSize: 'clamp(0.75rem, 1.8vw, 0.8125rem)',
        fontWeight: sharedTokens.fontWeightRegular,
        lineHeight: 1.55,
        letterSpacing: '0.005em',
      },
      button: {
        fontFamily,
        fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
      overline: {
        fontFamily,
        fontSize: '0.6875rem',
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
      },
      caption: {
        fontFamily,
        fontSize: '0.75rem',
        fontWeight: sharedTokens.fontWeightRegular,
        lineHeight: 1.45,
        letterSpacing: '0.01em',
      },
      subtitle1: {
        fontFamily,
        fontWeight: sharedTokens.fontWeightSemiBold as number,
        fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
        lineHeight: 1.45,
        letterSpacing: '-0.01em',
      },
      subtitle2: {
        fontFamily,
        fontWeight: sharedTokens.fontWeightMedium,
        fontSize: 'clamp(0.75rem, 1.8vw, 0.8125rem)',
        lineHeight: 1.4,
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          ':root': {
            fontFamily: themeParam.typography.fontFamily,
            fontSynthesis: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          'html, body, #root': { minHeight: '100%', height: '100%' },
          html: { scrollBehavior: 'smooth' },
          body: {
            margin: 0,
            minWidth: 320,
            overflow: 'hidden',
            overflowX: 'hidden',
            backgroundColor: themeParam.palette.background.default,
            color: themeParam.palette.text.primary,
            fontFamily: themeParam.typography.fontFamily,
          },
          a: { color: 'inherit', textDecoration: 'none' },
          '*': { boxSizing: 'border-box' },
          '*::-webkit-scrollbar': { width: 5, height: 5 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderRadius: 999,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
          },
          // iOS font-size fix to prevent zoom
          '@media (max-width: 599px)': {
            'input, textarea, select': {
              fontSize: '16px !important',
            },
          },
        }),
      },

      MuiAppBar: { styleOverrides: { root: { boxShadow: 'none' } } },

      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: sharedTokens.fontWeightBold, fontFamily },
        },
      },

      // ─── BUTTON — Modern, high-contrast, mobile-first ─────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: () => ({
            borderRadius: 12,
            // Responsive padding — comfortable on mobile, refined on desktop
            paddingInline: 'clamp(1rem, 3vw, 1.375rem)',
            paddingBlock: 'clamp(0.625rem, 2vw, 0.6875rem)',
            fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
            fontWeight: sharedTokens.fontWeightSemiBold,
            letterSpacing: '0.015em',
            // Minimum touch target (WCAG 2.5.5)
            minHeight: 44,
            minWidth: 44,
            transition: [
              'background 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              'color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            ].join(', '),
            '&:hover': {
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.98)',
            },
            // No hover lift on touch devices
            '@media (hover: none)': {
              '&:hover': {
                transform: 'none',
              },
              '&:active': {
                transform: 'scale(0.97)',
              },
            },
          }),

          // ── Contained Primary: use app primary with subtle depth ──────
          containedPrimary: ({ theme: t }) => ({
            background: isDark
              ? `linear-gradient(135deg, #37395C 0%, #272944 100%)`
              : `linear-gradient(135deg, #272944 0%, #16182D 100%)`,
            color: '#FFFFFF',
            border: isDark ? '1px solid rgba(79, 106, 245, 0.35)' : 'none',
            boxShadow: isDark
              ? `0 4px 12px rgba(39, 41, 68, 0.4), 0 1px 3px rgba(0,0,0,0.18)`
              : `0 4px 14px rgba(39, 41, 68, 0.2), 0 1px 3px rgba(0,0,0,0.08)`,
            '&:hover': {
              background: isDark
                ? `linear-gradient(135deg, #4A4D78 0%, #272944 100%)`
                : `linear-gradient(135deg, #3A3D66 0%, #1B1D33 100%)`,
              border: isDark ? '1px solid rgba(79, 106, 245, 0.55)' : 'none',
              boxShadow: isDark
                ? `0 8px 24px rgba(79, 106, 245, 0.45)`
                : `0 8px 24px rgba(39, 41, 68, 0.3)`,
            },
            '&:active': {
              background: isDark
                ? `linear-gradient(135deg, #272944 0%, #1B1D33 100%)`
                : `linear-gradient(135deg, #16182D 0%, #272944 100%)`,
              boxShadow: isDark
                ? `0 2px 8px rgba(39, 41, 68, 0.3)`
                : `0 2px 8px rgba(39, 41, 68, 0.16)`,
            },
            '&.Mui-disabled': {
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
              boxShadow: 'none',
              transform: 'none',
            },
          }),

          // ── Contained Secondary: accent (kept as indigo)
          containedSecondary: ({ theme: t }) => ({
            background: `linear-gradient(135deg, ${t.palette.secondary.main} 0%, ${t.palette.secondary.light} 100%)`,
            color: t.palette.secondary.contrastText,
            boxShadow: `0 4px 14px ${alpha(t.palette.secondary.main, 0.36)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${lighten(t.palette.secondary.main, 0.06)} 0%, ${t.palette.secondary.light} 100%)`,
              boxShadow: `0 8px 24px ${alpha(t.palette.secondary.main, 0.46)}`,
            },
          }),

          // ── Outlined: Clean border with accent on hover ───────────────
          outlinedPrimary: ({ theme: t }) => ({
            borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(30,33,64,0.20)',
            borderWidth: '1.5px',
            color: isDark ? t.palette.text.primary : t.palette.primary.main,
            '&:hover': {
              borderColor: t.palette.secondary.main,
              borderWidth: '1.5px',
              backgroundColor: isDark ? 'rgba(79,106,245,0.10)' : 'rgba(79,106,245,0.06)',
              color: t.palette.secondary.main,
            },
            '&:active': {
              backgroundColor: isDark ? 'rgba(79,106,245,0.16)' : 'rgba(79,106,245,0.10)',
            },
          }),

          // ── Text button: subtle ───────────────────────────────────────
          textPrimary: ({ theme: t }) => ({
            color: t.palette.secondary.main,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(79,106,245,0.12)' : 'rgba(79,106,245,0.07)',
            },
          }),

          // ── Size variants ─────────────────────────────────────────────
          sizeLarge: {
            paddingInline: 'clamp(1.25rem, 4vw, 1.625rem)',
            paddingBlock: 'clamp(0.75rem, 2vw, 0.875rem)',
            fontSize: 'clamp(0.875rem, 2.2vw, 1rem)',
            borderRadius: 14,
            minHeight: 50,
          },
          sizeSmall: {
            paddingInline: 'clamp(0.625rem, 2vw, 0.875rem)',
            paddingBlock: 'clamp(0.3125rem, 1vw, 0.4375rem)',
            fontSize: 'clamp(0.75rem, 1.8vw, 0.8125rem)',
            borderRadius: 8,
            minHeight: 36,
          },

          // ── Icon label alignment ──────────────────────────────────────
          startIcon: {
            marginRight: '0.375rem',
          },
          endIcon: {
            marginLeft: '0.375rem',
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: baseBorderRadius * 1.4,
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,17,23,0.06)',
            backgroundColor: isDark ? 'rgba(17, 22, 41, 0.75)' : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.40), 0 8px 24px rgba(0,0,0,0.24)'
              : '0 1px 3px rgba(15,17,23,0.04), 0 8px 24px rgba(15,17,23,0.06)',
            transition: 'box-shadow 200ms ease, transform 200ms ease',
            overflow: 'hidden',
            width: '100%',
          }),
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 1.5rem)',
            '&:last-child': { paddingBottom: 'clamp(1rem, 3vw, 1.5rem)' },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)',
            fontWeight: sharedTokens.fontWeightSemiBold,
            letterSpacing: '0.01em',
            height: 24,
            fontFamily,
          },
          outlinedPrimary: ({ theme: t }) => {
            const dark = t.palette.mode === 'dark'
            return {
              borderColor: dark ? alpha(t.palette.secondary.main, 0.4) : alpha(t.palette.secondary.main, 0.3),
              color: dark ? t.palette.secondary.light : t.palette.secondary.main,
              backgroundColor: dark ? alpha(t.palette.secondary.main, 0.08) : alpha(t.palette.secondary.main, 0.07),
            }
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            borderRadius: baseBorderRadius * 1.6,
            border: `1px solid ${t.palette.divider}`,
            boxShadow: isDark
              ? '0 32px 64px rgba(0,0,0,0.50)'
              : '0 24px 56px rgba(15,17,23,0.18)',
            backgroundImage: 'none',
            margin: '1rem',
            width: 'calc(100% - 2rem)',
            maxWidth: '100%',
            '@media (min-width: 600px)': {
              margin: '1.5rem',
              width: 'auto',
            },
          }),
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: 'clamp(0.9375rem, 2.5vw, 1.0625rem)',
            fontWeight: sharedTokens.fontWeightSemiBold,
            letterSpacing: '-0.01em',
            fontFamily,
            padding: 'clamp(1rem, 3vw, 1.25rem) clamp(1rem, 4vw, 1.5rem) 0.75rem',
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: 'clamp(0.75rem, 3vw, 1rem) clamp(1rem, 4vw, 1.5rem)',
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem) clamp(1rem, 3vw, 1.25rem)',
            gap: '0.5rem',
            flexWrap: 'wrap',
            // Stack actions on very small screens
            '@media (max-width: 400px)': {
              flexDirection: 'column',
              '& .MuiButton-root': {
                width: '100%',
              },
            },
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: ({ theme: t }) => ({ borderColor: t.palette.divider }),
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: baseBorderRadius * 0.8,
            transition: 'all 160ms ease',
            // Minimum 44x44 touch target on mobile
            '@media (max-width: 899px)': {
              minWidth: 44,
              minHeight: 44,
            },
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
            fontWeight: sharedTokens.fontWeightRegular,
            fontFamily,
          },
          input: {
            fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
            fontFamily,
            '&::placeholder': { opacity: 0.55 },
            // iOS specific
            '&[type="email"], &[type="password"], &[type="text"]': {
              fontSize: '16px', // Prevent iOS zoom
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: baseBorderRadius,
            minHeight: '45px',
            height: '45px',
            boxSizing: 'border-box',
            backgroundColor: isDark ? 'rgba(8, 10, 24, 0.45)' : '#FFFFFF',
            transition: 'box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease',
            '&.MuiInputBase-multiline': {
              height: 'auto',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.30)',
            },
            '&.Mui-focused': {
              backgroundColor: isDark ? 'rgba(8, 10, 24, 0.7)' : '#FFFFFF',
              boxShadow: `0 0 0 3px ${isDark ? 'rgba(79,106,245,0.22)' : 'rgba(79,106,245,0.14)'}`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: t.palette.secondary.main,
              borderWidth: '1.5px',
            },
          }),
          notchedOutline: ({ theme: t }) => ({
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.14)',
            transition: 'border-color 160ms ease',
          }),
          input: {
            paddingBlock: '11px',
            boxSizing: 'border-box',
          },
          inputSizeSmall: {
            paddingBlock: '11px',
          },
        },
      },

      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              minHeight: '40px !important',
              paddingTop: '2px !important',
              paddingBottom: '2px !important',
              boxSizing: 'border-box !important',
            },
            '& .MuiOutlinedInput-input': {
              paddingTop: '2.5px !important',
              paddingBottom: '2.5px !important',
            },
          },
        },
      },

      MuiInput: {
        styleOverrides: {
          input: {
            paddingBlock: '8.5px',
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme: t }) => ({
            backgroundImage: 'none',
            backgroundColor: t.palette.background.paper,
          }),
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            borderRadius: baseBorderRadius * 1.2,
            border: `1px solid ${t.palette.divider}`,
            boxShadow: isDark
              ? '0 24px 48px rgba(0,0,0,0.42)'
              : '0 16px 40px rgba(15,17,23,0.14)',
            backgroundImage: 'none',
            maxWidth: 'calc(100vw - 2rem)',
            overflowX: 'hidden',
          }),
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root: { borderRadius: 999 },
          track: {
            borderRadius: 999,
            opacity: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
          },
          switchBase: ({ theme: t }) => ({
            '&.Mui-checked': {
              '& + .MuiSwitch-track': { backgroundColor: t.palette.secondary.main, opacity: 1 },
            },
          }),
        },
      },

      MuiTableContainer: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: baseBorderRadius * 1.4,
            border: `1px solid ${t.palette.divider}`,
            overflowX: 'auto',
            width: '100%',
            WebkitOverflowScrolling: 'touch',
          }),
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(245,246,250,0.8)',
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          head: ({ theme: t }) => ({
            fontSize: 'clamp(0.6875rem, 1.5vw, 0.72rem)',
            fontWeight: sharedTokens.fontWeightSemiBold,
            fontFamily,
            color: t.palette.text.secondary,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            paddingBlock: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            paddingInline: 'clamp(0.75rem, 2vw, 1rem)',
            borderBottom: `1px solid ${t.palette.divider}`,
            whiteSpace: 'nowrap',
          }),
          body: ({ theme: t }) => ({
            fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
            fontWeight: sharedTokens.fontWeightRegular,
            fontFamily,
            color: t.palette.text.primary,
            paddingBlock: 'clamp(0.625rem, 2vw, 0.875rem)',
            paddingInline: 'clamp(0.75rem, 2vw, 1rem)',
            borderBottom: `1px solid ${t.palette.divider}`,
          }),
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 140ms ease',
            '&.MuiTableRow-hover:hover': {
              backgroundColor: isDark ? 'rgba(79,106,245,0.07)' : 'rgba(79,106,245,0.04)',
            },
            '&:last-child td': { borderBottom: 'none' },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
            fontWeight: sharedTokens.fontWeightMedium,
            fontFamily,
          },
        },
      },

      MuiTypography: { defaultProps: { color: 'textPrimary' } },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: baseBorderRadius,
            fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)',
            fontFamily,
            border: '1px solid',
          },
          standardError: {
            borderColor: 'rgba(239,68,68,0.25)',
            backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : 'rgb(254,242,242)',
          },
          standardSuccess: {
            borderColor: 'rgba(34,197,94,0.25)',
            backgroundColor: isDark ? 'rgba(34,197,94,0.10)' : 'rgb(240,253,244)',
          },
          standardWarning: {
            borderColor: 'rgba(245,158,11,0.25)',
            backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgb(255,251,235)',
          },
          standardInfo: {
            borderColor: 'rgba(79,106,245,0.25)',
            backgroundColor: isDark ? 'rgba(79,106,245,0.10)' : 'rgb(239,246,255)',
          },
        },
      },

      MuiBadge: {
        styleOverrides: {
          badge: {
            fontFamily,
            fontSize: '0.625rem',
            fontWeight: sharedTokens.fontWeightBold,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily,
            fontSize: '0.78rem',
            lineHeight: 1.45,
            fontWeight: sharedTokens.fontWeightMedium,
            borderRadius: 8,
            padding: '7px 11px',
            backgroundColor: isDark ? '#1e293b' : '#0f172a',
            color: '#f8fafc',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
            maxWidth: 240,
          },
          arrow: { color: isDark ? '#1e293b' : '#0f172a' },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: () => ({
            fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
            fontFamily,
            borderRadius: 6,
            margin: '1px 4px',
            paddingBlock: 'clamp(0.5rem, 1.5vw, 0.5625rem)',
            // Larger tap targets on mobile
            minHeight: 42,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(79,106,245,0.10)' : 'rgba(79,106,245,0.07)',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(79,106,245,0.18)' : 'rgba(79,106,245,0.10)',
              fontWeight: sharedTokens.fontWeightMedium,
            },
          }),
        },
      },

      MuiSelect: {
        styleOverrides: {
          select: {
            paddingBlock: 'clamp(0.5rem, 1.5vw, 0.6875rem)',
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: { fontFamily, fontSize: '0.75rem', marginTop: '0.25rem' },
        },
      },

      // ── Grid responsive behavior ──────────────────────────────────────
      MuiGrid: {
        styleOverrides: {
          root: {
            maxWidth: '100%',
            '& .MuiGrid-item': {
              minWidth: 0,
            },
          },
        },
      },

      // ── Container: no overflow ────────────────────────────────────────
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 'clamp(0.875rem, 3vw, 1.5rem)',
            paddingRight: 'clamp(0.875rem, 3vw, 1.5rem)',
            maxWidth: '100%',
            overflowX: 'hidden',
          },
        },
      },

      // ── Stack: prevent overflow ───────────────────────────────────────
      MuiStack: {
        styleOverrides: {
          root: {
            minWidth: 0,
            maxWidth: '100%',
          },
        },
      },
    },
  })
}

export const theme = createAppTheme()
