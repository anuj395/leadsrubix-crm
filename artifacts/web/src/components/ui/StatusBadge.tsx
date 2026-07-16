import React from 'react'
import Box from '@mui/material/Box'

interface StatusBadgeProps {
  value: string | number | boolean | null | undefined
  hideDot?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ value, hideDot = false }) => {
  if (value == null || value === '') {
    return <Box sx={{ color: 'text.secondary' }}>—</Box>
  }

  const rawStr = String(value).trim()
  const lowerVal = rawStr.toLowerCase()
  const statusStr = lowerVal.charAt(0).toUpperCase() + lowerVal.slice(1)

  // Determine styling based on status string
  let color = '#9ca3af' // Default gray
  let bg = 'rgba(107, 114, 128, 0.08)'
  let border = '1px solid rgba(107, 114, 128, 0.15)'

  // Role mappings (cleaner, custom styling)
  if (
    lowerVal === 'get'
  ) {
    color = '#10b981' // Emerald
    bg = 'rgba(16, 185, 129, 0.12)'
    border = '1px solid rgba(16, 185, 129, 0.25)'
  } else if (
    lowerVal === 'post'
  ) {
    color = '#3b82f6' // Blue
    bg = 'rgba(59, 130, 246, 0.12)'
    border = '1px solid rgba(59, 130, 246, 0.25)'
  } else if (
    lowerVal === 'put'
  ) {
    color = '#f59e0b' // Amber
    bg = 'rgba(245, 158, 11, 0.12)'
    border = '1px solid rgba(245, 158, 11, 0.25)'
  } else if (
    lowerVal === 'delete'
  ) {
    color = '#f43f5e' // Rose
    bg = 'rgba(244, 63, 94, 0.12)'
    border = '1px solid rgba(244, 63, 94, 0.25)'
  } else if (
    lowerVal === 'superadmin' ||
    lowerVal === 'super_admin'
  ) {
    color = '#8b5cf6' // Purple
    bg = 'rgba(139, 92, 246, 0.12)'
    border = '1px solid rgba(139, 92, 246, 0.25)'
  } else if (
    lowerVal === 'admin'
  ) {
    color = '#3b82f6' // Blue
    bg = 'rgba(59, 130, 246, 0.12)'
    border = '1px solid rgba(59, 130, 246, 0.25)'
  } else if (
    lowerVal === 'leadmanager' ||
    lowerVal === 'lead_manager'
  ) {
    color = '#eab308' // Amber
    bg = 'rgba(234, 179, 8, 0.12)'
    border = '1px solid rgba(234, 179, 8, 0.25)'
  } else if (
    lowerVal === 'teamlead' ||
    lowerVal === 'team_lead'
  ) {
    color = '#0d9488' // Teal
    bg = 'rgba(13, 148, 136, 0.12)'
    border = '1px solid rgba(13, 148, 136, 0.25)'
  } else if (
    lowerVal === 'sales'
  ) {
    color = '#f97316' // Orange
    bg = 'rgba(249, 115, 22, 0.12)'
    border = '1px solid rgba(249, 115, 22, 0.25)'
  }
  // Property Status color coding
  else if (lowerVal === 'launched') {
    color = '#10b981' // Emerald
    bg = 'rgba(16, 185, 129, 0.12)'
    border = '1px solid rgba(16, 185, 129, 0.25)'
  } else if (lowerVal === 'pre launch' || lowerVal === 'pre_launch') {
    color = '#3b82f6' // Blue
    bg = 'rgba(59, 130, 246, 0.12)'
    border = '1px solid rgba(59, 130, 246, 0.25)'
  } else if (lowerVal === 'intermediate occupation' || lowerVal === 'intermediate_occupation') {
    color = '#f59e0b' // Amber
    bg = 'rgba(245, 158, 11, 0.12)'
    border = '1px solid rgba(245, 158, 11, 0.25)'
  } else if (lowerVal.includes('ready to move') || lowerVal.includes('ready_to_move')) {
    color = '#8b5cf6' // Purple
    bg = 'rgba(139, 92, 246, 0.12)'
    border = '1px solid rgba(139, 92, 246, 0.25)'
  }
  // Green statuses
  else if (
    lowerVal === 'won' ||
    lowerVal === 'answered' ||
    lowerVal === 'active' ||
    lowerVal === 'success' ||
    lowerVal === 'approved' ||
    lowerVal === 'completed' ||
    lowerVal === 'complete' ||
    lowerVal === 'high' ||
    lowerVal === 'high priority' ||
    lowerVal === 'yes' ||
    lowerVal === 'true'
  ) {
    color = '#10b981' // Emerald
    bg = 'rgba(16, 185, 129, 0.12)'
    border = '1px solid rgba(16, 185, 129, 0.25)'
  }
  // Red statuses
  else if (
    lowerVal === 'lost' ||
    lowerVal === 'missed' ||
    lowerVal === 'inactive' ||
    lowerVal === 'error' ||
    lowerVal === 'rejected' ||
    lowerVal === 'cancelled' ||
    lowerVal === 'cancel' ||
    lowerVal === 'low' ||
    lowerVal === 'low priority' ||
    lowerVal === 'no' ||
    lowerVal === 'false' ||
    lowerVal === 'overdue'
  ) {
    color = '#f43f5e' // Rose
    bg = 'rgba(244, 63, 94, 0.12)'
    border = '1px solid rgba(244, 63, 94, 0.25)'
  }
  // Orange / Yellow / Warning statuses
  else if (
    lowerVal === 'pending' ||
    lowerVal === 'busy' ||
    lowerVal === 'no answer' ||
    lowerVal === 'warning' ||
    lowerVal === 'in progress' ||
    lowerVal === 'in_progress' ||
    lowerVal === 'medium' ||
    lowerVal === 'medium priority' ||
    lowerVal === 'callback' ||
    lowerVal === 'hold'
  ) {
    color = '#f59e0b' // Amber
    bg = 'rgba(245, 158, 11, 0.12)'
    border = '1px solid rgba(245, 158, 11, 0.25)'
  }
  // Blue / Info statuses
  else if (
    lowerVal === 'new' ||
    lowerVal === 'lead' ||
    lowerVal === 'contact' ||
    lowerVal === 'open' ||
    lowerVal === 'info' ||
    lowerVal === 'inbound' ||
    lowerVal === 'outbound' ||
    lowerVal === 'standard'
  ) {
    color = '#3b82f6' // Blue
    bg = 'rgba(59, 130, 246, 0.12)'
    border = '1px solid rgba(59, 130, 246, 0.25)'
  }
  // Purple / Premium statuses
  else if (
    lowerVal === 'vip' ||
    lowerVal === 'premium' ||
    lowerVal === 'enterprise' ||
    lowerVal === 'urgent'
  ) {
    color = '#a855f7' // Purple
    bg = 'rgba(168, 85, 247, 0.12)'
    border = '1px solid rgba(168, 85, 247, 0.25)'
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        px: '12px',
        py: '5px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.05em',
        color,
        backgroundColor: bg,
        border,
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease-in-out',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
          filter: 'brightness(1.05)',
        },
      }}
    >
      {!hideDot && (
        <Box
          sx={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: color,
            display: 'inline-block',
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }}
        />
      )}
      {statusStr}
    </Box>
  )
}
