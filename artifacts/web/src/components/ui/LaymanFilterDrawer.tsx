import React, { useState, useMemo, useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import TuneIcon from '@mui/icons-material/Tune'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CheckIcon from '@mui/icons-material/Check'
import type { GridColDef } from '@mui/x-data-grid'
import { alpha, useTheme } from '@mui/material/styles'

export interface FilterState {
  datePreset?: string
  dateField?: string
  startDate?: string
  endDate?: string
  categoricals?: Record<string, string>
  textSearches?: Record<string, string>
}

export interface LaymanFilterDrawerProps {
  open: boolean
  onClose: () => void
  columns: GridColDef[]
  rows: any[]
  currentFilters: FilterState
  onApply: (newFilters: FilterState) => void
  onReset: () => void
}

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
]

export const LaymanFilterDrawer: React.FC<LaymanFilterDrawerProps> = ({
  open,
  onClose,
  columns,
  rows,
  currentFilters,
  onApply,
  onReset,
}) => {
  const theme = useTheme()

  // Local draft state
  const [datePreset, setDatePreset] = useState<string>(currentFilters.datePreset || 'all')
  const [selectedDateField, setSelectedDateField] = useState<string>(currentFilters.dateField || '')
  const [startDate, setStartDate] = useState<string>(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState<string>(currentFilters.endDate || '')
  const [categoricals, setCategoricals] = useState<Record<string, string>>(currentFilters.categoricals || {})
  const [textSearches, setTextSearches] = useState<Record<string, string>>(currentFilters.textSearches || {})

  // Sync draft state with currentFilters when drawer opens
  useEffect(() => {
    if (open) {
      setDatePreset(currentFilters.datePreset || 'all')
      setSelectedDateField(currentFilters.dateField || '')
      setStartDate(currentFilters.startDate || '')
      setEndDate(currentFilters.endDate || '')
      setCategoricals(currentFilters.categoricals || {})
      setTextSearches(currentFilters.textSearches || {})
    }
  }, [open, currentFilters])

  // Identify eligible date columns
  const dateColumns = useMemo(() => {
    return columns.filter((col) => {
      const f = String(col.field).toLowerCase()
      const h = String(col.headerName || '').toLowerCase()
      // Disqualify user / agent creator columns
      if (
        f.endsWith('by') ||
        f.includes('user') ||
        f.includes('agent') ||
        h.includes('by') ||
        h.includes('agent') ||
        h.includes('doctor') ||
        h.includes('counselor') ||
        h.includes('advisor') ||
        h.includes('owner')
      ) {
        return false
      }
      return (
        f.includes('date') ||
        f.includes('created_at') ||
        f.includes('createdat') ||
        f.includes('updated_at') ||
        f.includes('updatedat') ||
        f.includes('follow') ||
        f.includes('time') ||
        f.includes('timestamp') ||
        h.includes('date') ||
        h.includes('time') ||
        h.includes('follow')
      )
    })
  }, [columns])

  // Default date field selection
  useEffect(() => {
    if (!selectedDateField && dateColumns.length > 0) {
      const preferred = dateColumns.find((c) => {
        const f = String(c.field).toLowerCase()
        const h = String(c.headerName || '').toLowerCase()
        return (
          f.includes('created_at') ||
          f.includes('createdat') ||
          f.includes('date') ||
          h.includes('date') ||
          h.includes('punch')
        )
      })
      setSelectedDateField(preferred ? String(preferred.field) : String(dateColumns[0].field))
    }
  }, [dateColumns, selectedDateField])

  // Identify categorical / dropdown columns & extract unique distinct options from rows
  const categoricalColumns = useMemo(() => {
    return columns
      .filter((col) => {
        const f = String(col.field).toLowerCase()
        if (f === 'sno' || f === 'actions' || f === '_id' || f === 'id') return false
        // Exclude date columns
        if (dateColumns.some((dc) => dc.field === col.field)) return false

        const h = String(col.headerName || '').toLowerCase()
        return (
          f.includes('status') ||
          f.includes('stage') ||
          f.includes('source') ||
          f.includes('type') ||
          f.includes('role') ||
          f.includes('project') ||
          f.includes('category') ||
          f.includes('owner') ||
          f.includes('agent') ||
          f.includes('direction') ||
          h.includes('status') ||
          h.includes('stage') ||
          h.includes('source') ||
          h.includes('type') ||
          h.includes('project')
        )
      })
      .map((col) => {
        const distinctSet = new Set<string>()
        if (Array.isArray(rows)) {
          for (const r of rows) {
            const val = r[col.field] ?? (col.valueGetter ? col.valueGetter(r[col.field], r) : undefined)
            if (val !== null && val !== undefined && String(val).trim() !== '' && String(val) !== '—') {
              distinctSet.add(String(val).trim())
            }
          }
        }
        return {
          field: col.field,
          headerName: col.headerName || col.field,
          options: Array.from(distinctSet).sort(),
        }
      })
      .filter((col) => col.options.length > 0 && col.options.length <= 50)
  }, [columns, rows, dateColumns])

  // Identify text search columns (names, emails, phones, notes)
  const textColumns = useMemo(() => {
    return columns.filter((col) => {
      const f = String(col.field).toLowerCase()
      if (f === 'sno' || f === 'actions' || f === '_id' || f === 'id') return false
      if (dateColumns.some((dc) => dc.field === col.field)) return false
      if (categoricalColumns.some((cc) => cc.field === col.field)) return false

      const h = String(col.headerName || '').toLowerCase()
      return (
        f.includes('name') ||
        f.includes('phone') ||
        f.includes('mobile') ||
        f.includes('email') ||
        f.includes('location') ||
        f.includes('city') ||
        f.includes('number') ||
        f.includes('notes') ||
        f.includes('details') ||
        h.includes('name') ||
        h.includes('phone') ||
        h.includes('email')
      )
    }).slice(0, 4) // Keep it focused for a layman audience
  }, [columns, dateColumns, categoricalColumns])

  // Count active draft filters
  const draftFilterCount = useMemo(() => {
    let count = 0
    if (datePreset !== 'all') count++
    for (const val of Object.values(categoricals)) {
      if (val && val !== 'ALL') count++
    }
    for (const val of Object.values(textSearches)) {
      if (val && val.trim() !== '') count++
    }
    return count
  }, [datePreset, categoricals, textSearches])

  const handleDatePresetClick = (presetId: string) => {
    setDatePreset(presetId)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (presetId === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (presetId === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (presetId === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const yStr = y.toISOString().split('T')[0]
      setStartDate(yStr)
      setEndDate(yStr)
    } else if (presetId === 'last_7_days') {
      const d7 = new Date(now)
      d7.setDate(d7.getDate() - 7)
      setStartDate(d7.toISOString().split('T')[0])
      setEndDate(todayStr)
    } else if (presetId === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(firstDay.toISOString().split('T')[0])
      setEndDate(todayStr)
    } else if (presetId === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(firstDayLastMonth.toISOString().split('T')[0])
      setEndDate(lastDayLastMonth.toISOString().split('T')[0])
    }
  }

  const handleCategoricalChange = (field: string, value: string) => {
    setCategoricals((prev) => {
      const updated = { ...prev }
      if (value === 'ALL' || !value) {
        delete updated[field]
      } else {
        updated[field] = value
      }
      return updated
    })
  }

  const handleTextSearchChange = (field: string, value: string) => {
    setTextSearches((prev) => {
      const updated = { ...prev }
      if (!value || value.trim() === '') {
        delete updated[field]
      } else {
        updated[field] = value
      }
      return updated
    })
  }

  const handleResetDraft = () => {
    setDatePreset('all')
    setStartDate('')
    setEndDate('')
    setCategoricals({})
    setTextSearches({})
    onReset()
    onClose()
  }

  const handleApplyDraft = () => {
    onApply({
      datePreset,
      dateField: selectedDateField,
      startDate,
      endDate,
      categoricals,
      textSearches,
    })
    onClose()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 24,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TuneIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Filter Records
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Select criteria to narrow down records
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Close filters">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Drawer Body */}
      <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Date Presets Section */}
        {dateColumns.length > 0 && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Date Range
              </Typography>
            </Stack>

            {dateColumns.length > 1 && (
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Date Field</InputLabel>
                <Select
                  value={selectedDateField}
                  label="Date Field"
                  onChange={(e) => setSelectedDateField(e.target.value)}
                >
                  {dateColumns.map((col) => (
                    <MenuItem key={col.field} value={col.field}>
                      {col.headerName || col.field}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
              {DATE_PRESETS.map((preset) => {
                const isSelected = datePreset === preset.id
                return (
                  <Chip
                    key={preset.id}
                    label={preset.label}
                    clickable
                    size="small"
                    onClick={() => handleDatePresetClick(preset.id)}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.75rem',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                    }}
                  />
                )
              })}
            </Box>

            {(datePreset === 'custom' || startDate || endDate) && (
              <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="From Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setDatePreset('custom')
                  }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="To Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setDatePreset('custom')
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            )}
          </Box>
        )}

        {/* Categorical Dropdowns Section */}
        {categoricalColumns.length > 0 && (
          <Box>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Categories & Statuses
            </Typography>

            <Stack spacing={2}>
              {categoricalColumns.map((col) => (
                <FormControl key={col.field} fullWidth size="small">
                  <InputLabel>{col.headerName}</InputLabel>
                  <Select
                    value={categoricals[col.field] || 'ALL'}
                    label={col.headerName}
                    onChange={(e) => handleCategoricalChange(col.field, e.target.value)}
                  >
                    <MenuItem value="ALL">
                      <em>
                        All {col.headerName}
                        {String(col.headerName || '').toLowerCase().endsWith('s') ? 'es' : 's'}
                      </em>
                    </MenuItem>
                    {col.options.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Stack>
          </Box>
        )}

        {/* Text Keyword Search Section */}
        {textColumns.length > 0 && (
          <Box>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Specific Search
            </Typography>

            <Stack spacing={2}>
              {textColumns.map((col) => (
                <TextField
                  key={col.field}
                  fullWidth
                  size="small"
                  label={col.headerName || col.field}
                  placeholder={`Search by ${String(col.headerName || col.field).toLowerCase()}...`}
                  value={textSearches[col.field] || ''}
                  onChange={(e) => handleTextSearchChange(col.field, e.target.value)}
                />
              ))}
            </Stack>
          </Box>
        )}

      </Box>

      {/* Footer Sticky Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 1.5,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={handleResetDraft}
          sx={{ fontWeight: 600 }}
        >
          Reset All
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<CheckIcon />}
          onClick={handleApplyDraft}
          sx={{ fontWeight: 700 }}
        >
          Apply {draftFilterCount > 0 ? `(${draftFilterCount})` : ''}
        </Button>
      </Box>
    </Drawer>
  )
}

export default LaymanFilterDrawer
