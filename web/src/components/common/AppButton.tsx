/**
 * components/common/AppButton.tsx
 *
 * Global reusable button — every button in the app must use this.
 * No inline button styling anywhere else.
 */

import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import type { ReactNode } from 'react'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AppButtonProps {
  /** Button label text */
  label: string
  /** Optional icon node */
  icon?: ReactNode
  /** Where to place the icon relative to text (default: 'start') */
  iconPosition?: 'start' | 'end'
  /** MUI variant (default: 'contained') */
  variant?: 'contained' | 'outlined' | 'text'
  /** MUI color (default: 'primary') */
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info'
  /** Show spinner and disable the button */
  loading?: boolean
  /** Disable the button */
  disabled?: boolean
  /** Stretch to fill parent width */
  fullWidth?: boolean
  /** Click handler */
  onClick?: () => void
  /** MUI size override */
  size?: MuiButtonProps['size']
  /** Optional sx overrides for rare layout needs (not for design overrides) */
  sx?: MuiButtonProps['sx']
  /** Optional type for form buttons */
  type?: 'button' | 'submit' | 'reset'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppButton({
  label,
  icon,
  iconPosition = 'start',
  variant = 'contained',
  color = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  size = 'small',
  sx,
  type = 'button',
}: AppButtonProps) {
  const isDisabled = disabled || loading

  const spinner = (
    <CircularProgress size={14} color="inherit" sx={{ flexShrink: 0 }} />
  )

  const resolvedStartIcon =
    iconPosition === 'start' ? (loading ? spinner : icon) : undefined

  const resolvedEndIcon =
    iconPosition === 'end' ? (loading ? spinner : icon) : undefined

  return (
    <MuiButton
      type={type}
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      disabled={isDisabled}
      onClick={onClick}
      startIcon={resolvedStartIcon}
      endIcon={resolvedEndIcon}
      disableElevation
      sx={{
        height: 36,
        minHeight: 36,
        px: 1.75,
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.01em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: icon || loading ? '6px' : 0,
        whiteSpace: 'nowrap',
        transition: 'background 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease',
        '&.Mui-disabled': {
          opacity: 0.52,
          cursor: 'not-allowed',
          pointerEvents: 'auto',
        },
        '@media (max-width: 899px)': { minHeight: 36 },
        ...sx,
      } as MuiButtonProps['sx']}
    >
      {label}
    </MuiButton>
  )
}
