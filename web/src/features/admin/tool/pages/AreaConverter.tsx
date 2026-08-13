import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { AppCard } from '@/components/ui/AppCard'

interface Unit {
  key: string
  label: string
  factor: number // multiplier to convert to square feet
  desc: string
}

const UNITS: Unit[] = [
  { key: 'sqft', label: 'Square Feet (Sq.Ft)', factor: 1.0, desc: 'International standard for residential layout' },
  { key: 'sqyd', label: 'Square Yards (Gaj)', factor: 9.0, desc: 'Commonly used in North India plots' },
  { key: 'sqmt', label: 'Square Meters (Sq.M)', factor: 10.7639, desc: 'Standard metric unit globally' },
  { key: 'acre', label: 'Acre', factor: 43560.0, desc: 'Large scale agricultural / commercial plots' },
  { key: 'hectare', label: 'Hectare', factor: 107639.0, desc: 'Metric system large-area unit' },
  { key: 'bigha', label: 'Bigha', factor: 27000.0, desc: 'Traditional unit (varies by region: ~27k sq.ft)' },
  { key: 'guntha', label: 'Guntha', factor: 1089.0, desc: 'Commonly used in West and South India' },
  { key: 'marla', label: 'Marla', factor: 272.25, desc: 'Traditional unit in Punjab & Haryana' },
  { key: 'kanal', label: 'Kanal', factor: 5445.0, desc: 'Equivalent to 20 Marlas' },
]

export default function AreaConverterPage() {
  const [inputValue, setInputValue] = useState<number>(1000)
  const [inputUnit, setInputUnit] = useState<string>('sqft')

  // Convert current input to SqFt first, then to all other units
  const conversions = useMemo(() => {
    const activeUnit = UNITS.find((u) => u.key === inputUnit)
    if (!activeUnit || isNaN(inputValue)) return []

    // Value in square feet
    const valueInSqft = inputValue * activeUnit.factor

    return UNITS.map((unit) => {
      const convertedValue = valueInSqft / unit.factor
      return {
        ...unit,
        value: convertedValue,
      }
    })
  }, [inputValue, inputUnit])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
          Area Unit Converter
        </Typography>
        <Typography color="text.secondary">
          Convert plots and layout dimensions across standard Indian and international units.
        </Typography>
      </Box>

      {/* Main Converter Card */}
      <AppCard title="Unit Conversion Calculator" subtitle="Input value and select base unit">
        <Grid container spacing={3} alignItems="center" sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              label="Enter Area Value"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(Number(e.target.value))}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontWeight: 600 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: 'secondary.main',
              }}
            >
              <SwapHorizIcon />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              select
              label="Select Base Unit"
              value={inputUnit}
              onChange={(e) => setInputUnit(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontWeight: 600 } }}
            >
              {UNITS.map((unit) => (
                <MenuItem key={unit.key} value={unit.key}>
                  {unit.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </AppCard>

      {/* Conversions Output Matrix */}
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
        Conversion Matrix
      </Typography>
      <Grid container spacing={2}>
        {conversions.map((unit) => {
          const isActive = unit.key === inputUnit
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={unit.key}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isActive
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? '0 8px 20px -6px rgba(99,102,241,0.2)' : 'none',
                  transition: 'all 0.2s ease-in-out',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                  },
                }}
              >
                <Box>
                  <Typography variant="caption" color={isActive ? 'secondary.main' : 'text.secondary'} sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                    {unit.label.toUpperCase()}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      mt: 0.5,
                      color: isActive ? 'secondary.main' : 'text.primary',
                      fontFamily: 'monospace',
                    }}
                  >
                    {unit.value.toLocaleString('en-IN', {
                      maximumFractionDigits: unit.key === 'acre' || unit.key === 'hectare' ? 5 : 2,
                    })}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontSize: '0.75rem' }}>
                  {unit.desc}
                </Typography>
              </Box>
            </Grid>
          )
        })}
      </Grid>

      {/* Helper Context/Cheat sheet */}
      <AppCard title="Unit Conversion Guide" subtitle="Reference factors relative to 1 Square Foot">
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <HelpOutlineIcon sx={{ color: 'secondary.main', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Regional Note on Land Units:
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            Traditional land units such as <strong>Bigha</strong>, <strong>Marla</strong>, and <strong>Kanal</strong> can vary slightly by region. In this tool, they are configured based on standard standardized conversions: 1 Gaj (Sq. Yard) = 9 Sq. Ft, 1 Acre = 43,560 Sq. Ft, and 1 Bigha = 27,000 Sq. Ft (typical standard unit).
          </Typography>
          <Divider />
          <Grid container spacing={2} sx={{ pl: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">1 SQ. YARD (GAJ)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>9 Square Feet</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">1 MARLA</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>272.25 Square Feet</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">1 KANAL</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>5,445 Square Feet (20 Marla)</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">1 GUNTHA</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>1,089 Square Feet (121 Sq. Yards)</Typography>
            </Grid>
          </Grid>
        </Stack>
      </AppCard>
    </Box>
  )
}
