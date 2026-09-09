import React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import { alpha, useTheme } from '@mui/material/styles'

export interface ActiveFilterItem {
  id: string
  field: string
  fieldLabel: string
  valueLabel: string
  onRemove: () => void
}

export interface ActiveFilterChipsProps {
  filters: ActiveFilterItem[]
  onClearAll: () => void
  sx?: object
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onClearAll,
  sx,
}) => {
  const theme = useTheme()

  if (!filters || filters.length === 0) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
        py: 1,
        px: 1.5,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        borderBottom: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 0.5 }}>
        <FilterAltOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Active Filters:
        </Typography>
      </Stack>

      {filters.map((filter) => (
        <Chip
          key={filter.id}
          size="small"
          label={
            <Box component="span" sx={{ fontSize: '0.75rem' }}>
              <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
                {filter.fieldLabel}:
              </Box>
              <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {filter.valueLabel}
              </Box>
            </Box>
          }
          onDelete={filter.onRemove}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderColor: alpha(theme.palette.primary.main, 0.2),
            height: 24,
            '& .MuiChip-deleteIcon': {
              fontSize: 14,
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
              },
            },
          }}
        />
      ))}

      <Button
        size="small"
        variant="text"
        color="inherit"
        startIcon={<ClearAllIcon sx={{ fontSize: '14px !important' }} />}
        onClick={onClearAll}
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          py: 0.2,
          px: 0.8,
          minWidth: 0,
          color: 'text.secondary',
          '&:hover': {
            color: 'error.main',
            bgcolor: alpha(theme.palette.error.main, 0.08),
          },
        }}
      >
        Clear All
      </Button>
    </Box>
  )
}

export default ActiveFilterChips
