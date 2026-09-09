import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter,
  type DataGridProps,
  type GridColDef
} from '@mui/x-data-grid'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import RefreshIcon from '@mui/icons-material/Refresh'
import Button from '@mui/material/Button'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TableChartIcon from '@mui/icons-material/TableChart'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import TuneIcon from '@mui/icons-material/Tune'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Paper from '@mui/material/Paper'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import { LaymanFilterDrawer, type FilterState } from './LaymanFilterDrawer'
import { ActiveFilterChips, type ActiveFilterItem } from './ActiveFilterChips'

export type AppDataGridProps = DataGridProps & {
  onReload?: () => void
  onImport?: () => void
  height?: string | number
  hideToolbar?: boolean
  defaultViewMode?: 'table' | 'grid' | 'list'
}

export function AppDataGrid({
  height = '80vh',
  hideToolbar = false,
  defaultViewMode = 'table',
  onReload,
  onImport,
  sx,
  slots,
  slotProps,
  pageSizeOptions,
  initialState,
  getRowId,
  columns,
  ...rest
}: AppDataGridProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>(() => {
    if (defaultViewMode !== 'table') return defaultViewMode
    if (typeof window !== 'undefined' && window.innerWidth < 600) return 'grid'
    return 'table'
  })
  const [quickSearchText, setQuickSearchText] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [filterState, setFilterState] = useState<FilterState>({ datePreset: 'all' })

  const rawRows = (rest.rows || []) as any[]

  const filteredRows = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return []

    const hasDateFilter = Boolean(
      filterState.datePreset &&
      filterState.datePreset !== 'all' &&
      (filterState.startDate || filterState.endDate)
    )
    const hasCategoricalFilter = Boolean(
      filterState.categoricals && Object.keys(filterState.categoricals).length > 0
    )
    const hasTextFilter = Boolean(
      filterState.textSearches && Object.keys(filterState.textSearches).length > 0
    )

    if (!hasDateFilter && !hasCategoricalFilter && !hasTextFilter) {
      return rawRows
    }

    return rawRows.filter((row: any) => {
      // 1. Date Filter
      if (hasDateFilter && filterState.dateField) {
        const rawDateVal = row[filterState.dateField]
        if (!rawDateVal) return false
        const rowTime = new Date(rawDateVal).getTime()
        if (isNaN(rowTime)) return false

        if (filterState.startDate) {
          const startObj = new Date(filterState.startDate)
          startObj.setHours(0, 0, 0, 0)
          if (rowTime < startObj.getTime()) return false
        }
        if (filterState.endDate) {
          const endObj = new Date(filterState.endDate)
          endObj.setHours(23, 59, 59, 999)
          if (rowTime > endObj.getTime()) return false
        }
      }

      // 2. Categoricals
      if (hasCategoricalFilter && filterState.categoricals) {
        for (const [field, filterVal] of Object.entries(filterState.categoricals)) {
          if (!filterVal || filterVal === 'ALL') continue
          const col = columns?.find((c) => c.field === field)
          const cellVal =
            col?.valueGetter && typeof col.valueGetter === 'function'
              ? (() => {
                  try {
                    return (col.valueGetter as any)(row[field], row)
                  } catch {
                    return row[field]
                  }
                })()
              : row[field]

          if (cellVal === null || cellVal === undefined) return false
          if (String(cellVal).trim().toLowerCase() !== String(filterVal).trim().toLowerCase()) {
            return false
          }
        }
      }

      // 3. Text Searches
      if (hasTextFilter && filterState.textSearches) {
        for (const [field, searchVal] of Object.entries(filterState.textSearches)) {
          if (!searchVal || !searchVal.trim()) continue
          const col = columns?.find((c) => c.field === field)
          const cellVal =
            col?.valueGetter && typeof col.valueGetter === 'function'
              ? (() => {
                  try {
                    return (col.valueGetter as any)(row[field], row)
                  } catch {
                    return row[field]
                  }
                })()
              : row[field]

          if (cellVal === null || cellVal === undefined) return false
          if (!String(cellVal).toLowerCase().includes(searchVal.trim().toLowerCase())) {
            return false
          }
        }
      }

      return true
    })
  }, [rawRows, filterState, columns])

  const activeFilterItems = useMemo<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = []

    // Date Preset
    if (filterState.datePreset && filterState.datePreset !== 'all') {
      const presetLabels: Record<string, string> = {
        today: 'Today',
        yesterday: 'Yesterday',
        last_7_days: 'Last 7 Days',
        this_month: 'This Month',
        last_month: 'Last Month',
        custom: `${filterState.startDate || ''} to ${filterState.endDate || ''}`
      }
      const dateCol = (columns || []).find((c) => c.field === filterState.dateField)
      const label = dateCol?.headerName || filterState.dateField || 'Date'
      items.push({
        id: 'date-preset',
        field: filterState.dateField || 'date',
        fieldLabel: label,
        valueLabel: presetLabels[filterState.datePreset] || filterState.datePreset,
        onRemove: () => {
          setFilterState((prev) => ({
            ...prev,
            datePreset: 'all',
            startDate: '',
            endDate: ''
          }))
        }
      })
    }

    // Categoricals
    if (filterState.categoricals) {
      for (const [field, val] of Object.entries(filterState.categoricals)) {
        if (!val || val === 'ALL') continue
        const col = (columns || []).find((c) => c.field === field)
        items.push({
          id: `cat-${field}`,
          field,
          fieldLabel: col?.headerName || field,
          valueLabel: val,
          onRemove: () => {
            setFilterState((prev) => {
              const nextCat = { ...(prev.categoricals || {}) }
              delete nextCat[field]
              return { ...prev, categoricals: nextCat }
            })
          }
        })
      }
    }

    // Text Searches
    if (filterState.textSearches) {
      for (const [field, val] of Object.entries(filterState.textSearches)) {
        if (!val || !val.trim()) continue
        const col = (columns || []).find((c) => c.field === field)
        items.push({
          id: `text-${field}`,
          field,
          fieldLabel: col?.headerName || field,
          valueLabel: `"${val.trim()}"`,
          onRemove: () => {
            setFilterState((prev) => {
              const nextText = { ...(prev.textSearches || {}) }
              delete nextText[field]
              return { ...prev, textSearches: nextText }
            })
          }
        })
      }
    }

    return items
  }, [filterState, columns])

  const activeFilterCount = activeFilterItems.length

  const handleResetFilters = () => {
    setFilterState({ datePreset: 'all' })
  }

  const isFiltered = activeFilterCount > 0
  const totalCount = isFiltered ? filteredRows.length : (rest.rowCount ?? rawRows.length)

  const computedPageSizeOptions = useMemo(() => {
    if (pageSizeOptions) return pageSizeOptions
    const base = [25, 50, 100]
    if (totalCount > 0 && !base.includes(totalCount)) {
      base.push(totalCount)
    }
    const uniqueSorted = Array.from(new Set(base)).sort((a, b) => a - b)
    return uniqueSorted.map((val) => {
      if (val === totalCount) {
        return { value: val, label: `All (${val})` }
      }
      return val
    })
  }, [pageSizeOptions, totalCount])

  const responsiveColumns = useMemo(() => {
    if (!columns) return []

    const hasSNo = columns.some((col) => col.field === 'sNo')
    const snColumn: GridColDef = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 60,
      minWidth: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        if (params.api && typeof params.api.getRowIndexRelativeToVisibleRows === 'function') {
          const index = params.api.getRowIndexRelativeToVisibleRows(params.id)
          return index !== undefined && index !== -1 ? index + 1 : ''
        }
        const id = getRowId
          ? getRowId(params.row)
          : ((params.row as any)._id ?? (params.row as any).id ?? JSON.stringify(params.row))
        const idx = filteredRows?.findIndex((r: any) => {
          const rId = getRowId
            ? getRowId(r)
            : ((r as any)._id ?? (r as any).id ?? JSON.stringify(r))
          return rId === id
        })
        return idx !== undefined && idx !== -1 ? idx + 1 : ''
      }
    }

    const baseColumns = hasSNo ? columns : [snColumn, ...columns]

    return baseColumns.map((col) => {
      const updated = { ...col }
      const fieldLower = String(updated.field).toLowerCase()

      let defaultMinWidth = 120
      if (fieldLower === 'sno') {
        defaultMinWidth = 60
        updated.width = 60
        updated.minWidth = 60
        delete updated.flex
      } else if (fieldLower.includes('email')) {
        defaultMinWidth = 180
      } else if (fieldLower.includes('role')) {
        defaultMinWidth = 160
      } else if (fieldLower.includes('phone') || fieldLower.includes('recipient') || fieldLower.includes('mobile')) {
        defaultMinWidth = 150
      } else if (fieldLower.includes('name') || fieldLower.includes('title')) {
        defaultMinWidth = 150
      } else if (fieldLower.includes('created') || fieldLower.includes('updated') || fieldLower.includes('time') || fieldLower.includes('date') || fieldLower.includes('timestamp')) {
        defaultMinWidth = 180
      } else if (fieldLower.includes('url') || fieldLower.includes('endpoint') || fieldLower.includes('path')) {
        defaultMinWidth = 250
      } else if (fieldLower.includes('message') || fieldLower.includes('description') || fieldLower.includes('content')) {
        defaultMinWidth = 250
      } else if (fieldLower.includes('status')) {
        defaultMinWidth = 210
      } else if (fieldLower.includes('active')) {
        defaultMinWidth = 130
      } else if (fieldLower.includes('industry')) {
        defaultMinWidth = 140
      } else if (fieldLower.includes('method')) {
        defaultMinWidth = 100
      }

      if (updated.minWidth === undefined) {
        updated.minWidth = defaultMinWidth
      } else {
        updated.minWidth = Math.max(updated.minWidth, defaultMinWidth)
      }

      const isFixedColumn =
        fieldLower.includes('role') ||
        fieldLower.includes('status') ||
        fieldLower.includes('active') ||
        fieldLower.includes('phone') ||
        fieldLower.includes('recipient') ||
        fieldLower.includes('mobile') ||
        fieldLower.includes('created') ||
        fieldLower.includes('updated') ||
        fieldLower.includes('time') ||
        fieldLower.includes('date') ||
        fieldLower.includes('timestamp') ||
        fieldLower.includes('url') ||
        fieldLower.includes('endpoint') ||
        fieldLower.includes('path') ||
        fieldLower.includes('industry') ||
        fieldLower.includes('method') ||
        fieldLower === 'code' ||
        fieldLower.endsWith('_code') ||
        fieldLower === 'key' ||
        fieldLower.endsWith('_key')

      if (isFixedColumn) {
        if (updated.width === undefined) {
          updated.width = updated.minWidth
          delete updated.flex
        } else {
          updated.width = Math.max(updated.width, updated.minWidth)
        }
      }

      if (isMobile) {
        if (updated.flex) {
          const flexVal = typeof updated.flex === 'number' ? updated.flex : 1
          updated.width = flexVal * 150
          delete updated.flex
        }
        if (!updated.width) {
          updated.width = updated.minWidth
        }
      }

      return updated
    })
  }, [columns, isMobile, filteredRows, getRowId])

  const CustomToolbar = useMemo(() => {
    return () => {
      const handleReload = () => {
        if (onReload) {
          onReload()
        } else {
          window.location.reload()
        }
      }

      if (isMobile) {
        return (
          <GridToolbarContainer
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1,
              width: '100%',
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(18, 22, 43, 0.4)' : 'rgba(245, 246, 250, 0.5)',
            }}
          >
            {/* Row 1: Search + Reload */}
            <Box sx={{ display: 'flex', width: '100%', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0, '& .MuiTextField-root': { width: '100%' } }}>
                <GridToolbarQuickFilter
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      fontSize: '0.85rem',
                      height: 36,
                      borderRadius: '8px',
                    },
                  }}
                />
              </Box>
              <Tooltip title="Reload Data">
                <IconButton onClick={handleReload} size="small" color="primary" sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '8px', height: 36, width: 36, flexShrink: 0 }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Row 2: Action Controls & View Switcher */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 0.5,
                overflowX: 'auto',
                pb: 0.5,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <GridToolbarColumnsButton
                  slotProps={{
                    button: {
                      size: 'small',
                      sx: { minWidth: 0, px: 0.75, py: 0.4, fontSize: '0.72rem', textTransform: 'none' }
                    }
                  }}
                />
                <Button
                  size="small"
                  variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                  color={activeFilterCount > 0 ? 'primary' : 'inherit'}
                  startIcon={<TuneIcon sx={{ fontSize: '1rem !important' }} />}
                  onClick={() => setFilterDrawerOpen(true)}
                  sx={{
                    fontSize: '0.72rem',
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 0,
                    px: 0.75,
                    py: 0.4,
                    borderRadius: '6px',
                  }}
                >
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Button>
                <GridToolbarExport
                  slotProps={{
                    button: {
                      size: 'small',
                      sx: { minWidth: 0, px: 0.75, py: 0.4, fontSize: '0.72rem', textTransform: 'none' }
                    }
                  }}
                />
                {onImport && (
                  <Button
                    size="small"
                    startIcon={<FileUploadIcon sx={{ fontSize: '1rem !important' }} />}
                    onClick={onImport}
                    sx={{ fontSize: '0.72rem', textTransform: 'none', fontWeight: 500, minWidth: 0, px: 0.75, py: 0.4 }}
                  >
                    Import
                  </Button>
                )}
              </Box>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                size="small"
                onChange={(_, nextMode) => {
                  if (nextMode) setViewMode(nextMode)
                }}
                sx={{
                  height: 28,
                  flexShrink: 0,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  '& .MuiToggleButton-root': {
                    px: 0.75,
                    py: 0.2,
                    border: 'none',
                    '&.Mui-selected': {
                      bgcolor: theme.palette.primary.main,
                      color: '#fff',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                    },
                  },
                }}
              >
                <Tooltip title="Table View">
                  <ToggleButton value="table" aria-label="table view">
                    <TableChartIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Cards View">
                  <ToggleButton value="grid" aria-label="grid view">
                    <GridViewIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="List View">
                  <ToggleButton value="list" aria-label="list view">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Box>
          </GridToolbarContainer>
        )
      }

      return (
        <GridToolbarContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <GridToolbarColumnsButton />
            <Button
              size="small"
              variant={activeFilterCount > 0 ? 'contained' : 'text'}
              color={activeFilterCount > 0 ? 'primary' : 'inherit'}
              startIcon={<TuneIcon />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{
                fontSize: '0.8125rem',
                textTransform: 'none',
                fontWeight: 600,
                p: '4px 10px',
                borderRadius: '8px',
                ...(activeFilterCount > 0
                  ? {
                      boxShadow: 'none',
                      bgcolor: 'primary.main',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                        boxShadow: 'none',
                      },
                    }
                  : {
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                      },
                    }),
              }}
            >
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            {onImport && (
              <Button
                size="small"
                startIcon={<FileUploadIcon />}
                onClick={onImport}
                sx={{ fontSize: '0.8125rem', textTransform: 'none', fontWeight: 500, p: '4px 5px' }}
              >
                Import
              </Button>
            )}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_, nextMode) => {
                if (nextMode) setViewMode(nextMode)
              }}
              sx={{
                height: 30,
                ml: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                '& .MuiToggleButton-root': {
                  px: 1,
                  py: 0.2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    bgcolor: theme.palette.primary.main,
                    color: '#fff',
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                    },
                  },
                },
              }}
            >
              <Tooltip title="Table View">
                <ToggleButton value="table" aria-label="table view">
                  <TableChartIcon fontSize="small" sx={{ mr: 0.5 }} /> Table
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Card / Grid View">
                <ToggleButton value="grid" aria-label="grid view">
                  <GridViewIcon fontSize="small" sx={{ mr: 0.5 }} /> Cards
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Compact List View">
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> List
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <GridToolbarQuickFilter />
            <Tooltip title="Reload Data">
              <IconButton onClick={handleReload} size="small" color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </GridToolbarContainer>
      )
    }
  }, [onReload, onImport, viewMode, theme, activeFilterCount, isMobile])

  const rowsList = useMemo(() => {
    if (!quickSearchText.trim()) return filteredRows
    const q = quickSearchText.toLowerCase()
    return filteredRows.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      })
    })
  }, [filteredRows, quickSearchText])
  const dataColumns = (columns || []).filter((c) => c.field !== 'sNo')
  const actionColumn = dataColumns.find((c) => c.field === '__actions' || c.field === 'actions')
  const contentColumns = dataColumns.filter((c) => c.field !== '__actions' && c.field !== 'actions')

  const titleCol = contentColumns.find((c) => {
    const f = c.field.toLowerCase()
    return f.includes('name') || f.includes('title') || f.includes('label')
  }) || contentColumns[0]

  const getRowValue = (row: any, col: GridColDef) => {
    if (col.valueGetter && typeof col.valueGetter === 'function') {
      try {
        return (col.valueGetter as any)(row[col.field], row)
      } catch {
        return row[col.field]
      }
    }
    return row[col.field]
  }

  const renderCellContent = (row: any, col: GridColDef) => {
    const val = getRowValue(row, col)
    if (col.renderCell) {
      try {
        const rendered = col.renderCell({
          id: getRowId ? getRowId(row) : (row._id || row.id),
          field: col.field,
          value: val,
          row,
          colDef: col,
          cellMode: 'view',
          hasFocus: false,
          tabIndex: 0,
          api: {} as any,
        } as any)
        if (rendered) return rendered
      } catch {
        // fallback
      }
    }
    if (val === null || val === undefined || val === '') return '—'
    return String(val)
  }

  // Synchronized Pagination State (Controlled or Uncontrolled)
  const [internalPaginationModel, setInternalPaginationModel] = useState({ page: 0, pageSize: 25 })
  const paginationModel = rest.paginationModel ?? internalPaginationModel

  const handlePaginationModelChange = (newModel: { page: number; pageSize: number }) => {
    if (rest.onPaginationModelChange) {
      (rest.onPaginationModelChange as any)(newModel)
    } else {
      setInternalPaginationModel(newModel)
    }
  }

  const currentPage = paginationModel.page
  const currentPageSize = paginationModel.pageSize

  const handlePageChange = (_: any, newPage: number) => {
    handlePaginationModelChange({ page: newPage, pageSize: currentPageSize })
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newSize = parseInt(event.target.value, 10)
    handlePaginationModelChange({ page: 0, pageSize: newSize })
  }

  const effectiveTotalCount = quickSearchText.trim() ? rowsList.length : totalCount

  // Paginated subset for Card & List views to prevent rendering all rows simultaneously
  const paginatedRows = useMemo(() => {
    const start = currentPage * currentPageSize
    return rowsList.slice(start, start + currentPageSize)
  }, [rowsList, currentPage, currentPageSize])

  return (
    <Box sx={{ height, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ActiveFilterChips
        filters={activeFilterItems}
        onClearAll={handleResetFilters}
      />
      {viewMode === 'table' ? (
        <DataGrid
          columns={responsiveColumns}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          disableVirtualization={true}
          slots={hideToolbar ? slots : { toolbar: CustomToolbar, ...(slots ?? {}) }}
          slotProps={
            hideToolbar
              ? slotProps
              : {
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 300 },
                  },
                  ...(slotProps ?? {}),
                }
          }
          pageSizeOptions={computedPageSizeOptions}
          initialState={{
            density: 'compact',
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            ...(initialState ?? {}),
          }}
          getRowId={
            getRowId ??
            ((row: Record<string, unknown>) =>
              (row._id as string | number | undefined) ??
              (row.id as string | number | undefined) ??
              JSON.stringify(row))
          }
          disableRowSelectionOnClick
          sx={{
            flex: 1,
            minHeight: 0,
            border: 'none',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(11, 14, 32, 0.45)' : 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            overflow: 'hidden',
            '& .MuiDataGrid-columnHeader[data-field="sNo"]': {
              position: 'sticky !important',
              left: '0 !important',
              zIndex: '4 !important',
              bgcolor: `${theme.palette.mode === 'dark' ? '#12162b' : '#f5f6fa'} !important`,
              boxShadow: '2px 0 5px -2px rgba(0,0,0,0.2)',
            },
            '& .MuiDataGrid-cell[data-field="sNo"]': {
              position: 'sticky !important',
              left: '0 !important',
              zIndex: '3 !important',
              bgcolor: `${theme.palette.mode === 'dark' ? '#12162b' : '#ffffff'} !important`,
              boxShadow: '2px 0 5px -2px rgba(0,0,0,0.2)',
            },
            '& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field="sNo"]': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(79, 106, 245, 0.2)' : 'rgba(79, 106, 245, 0.08) !important',
            },
            '& .MuiDataGrid-columnHeaders': {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(18, 22, 43, 0.75)' : 'rgba(245, 246, 250, 0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: `2px solid ${theme.palette.divider}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              fontSize: '0.75rem',
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.divider}`,
              fontSize: '0.8125rem',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(79, 106, 245, 0.12)' : 'rgba(79, 106, 245, 0.06)',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
              outline: 'none',
            },
            ...(isMobile
              ? {
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontSize: '0.75rem !important',
                    fontWeight: 700,
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: '0.8rem !important',
                    padding: '0 8px !important',
                  },
                }
              : {}),
            ...(sx ?? {}),
          }}
          {...rest}
          rows={filteredRows}
          {...(isFiltered ? { rowCount: filteredRows.length } : {})}
        />
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* View Mode Header Bar with Quick Search */}
          <Box
            sx={{
              p: 1.25,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(18, 22, 43, 0.5)' : 'rgba(245, 246, 250, 0.7)',
            }}
          >
            {/* Search + Mobile Reload */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: { sm: 1 }, maxWidth: { sm: 340 } }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search records..."
                value={quickSearchText}
                onChange={(e) => setQuickSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: 32,
                    fontSize: '0.8125rem',
                    borderRadius: '8px',
                  },
                }}
              />
              {isMobile && onReload && (
                <Tooltip title="Reload Data">
                  <IconButton
                    onClick={onReload}
                    size="small"
                    color="primary"
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '8px',
                      height: 32,
                      width: 32,
                      flexShrink: 0,
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Actions: Filters + View Toggle + Desktop Reload */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                color={activeFilterCount > 0 ? 'primary' : 'inherit'}
                startIcon={<TuneIcon sx={{ fontSize: '1.1rem' }} />}
                onClick={() => setFilterDrawerOpen(true)}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  height: 32,
                  borderRadius: '8px',
                  px: 1.25,
                }}
              >
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Button>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                size="small"
                onChange={(_, nextMode) => {
                  if (nextMode) setViewMode(nextMode)
                }}
                sx={{
                  height: 32,
                  '& .MuiToggleButton-root': {
                    px: { xs: 1, sm: 1.5 },
                    py: 0.2,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.primary.main,
                      color: '#fff',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                    },
                  },
                }}
              >
                <Tooltip title="Table View">
                  <ToggleButton value="table" aria-label="table view">
                    <TableChartIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Table</Box>
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Card / Grid View">
                  <ToggleButton value="grid" aria-label="grid view">
                    <GridViewIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Cards</Box>
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Compact List View">
                  <ToggleButton value="list" aria-label="list view">
                    <ViewListIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>List</Box>
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>

              {!isMobile && onReload && (
                <Tooltip title="Reload Data">
                  <IconButton onClick={onReload} size="small" color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Body Content: Grid or List */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {paginatedRows.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, height: '100%', color: 'text.secondary' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                  No records found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search query or clearing active filters.
                </Typography>
              </Box>
            ) : viewMode === 'grid' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
                {paginatedRows.map((row: any) => {
                  const id = getRowId ? getRowId(row) : (row._id || row.id)
                  const titleVal = titleCol ? renderCellContent(row, titleCol) : 'Record'
                  const displayCols = contentColumns.filter((c) => c.field !== titleCol?.field).slice(0, 6)

                  return (
                    <Box key={String(id)} sx={{ display: 'flex' }}>
                      <Card
                        variant="outlined"
                        sx={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '12px',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: theme.shadows[4],
                            borderColor: theme.palette.primary.main,
                          },
                        }}
                      >
                        <CardContent sx={{ flex: 1, p: 2 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflow: 'hidden' }}>
                              <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700 }}>
                                {String(titleVal).charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="subtitle2" fontWeight={700} noWrap title={String(titleVal)}>
                                {titleVal}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Stack spacing={1} sx={{ mt: 1 }}>
                            {displayCols.map((col) => (
                              <Box key={col.field} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap sx={{ maxWidth: '40%' }}>
                                  {col.headerName}:
                                </Typography>
                                <Box sx={{ maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {renderCellContent(row, col)}
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>

                        {actionColumn && (
                          <Box sx={{ p: 1, px: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'flex-end' }}>
                            {renderCellContent(row, actionColumn)}
                          </Box>
                        )}
                      </Card>
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {paginatedRows.map((row: any) => {
                  const id = getRowId ? getRowId(row) : (row._id || row.id)
                  const titleVal = titleCol ? renderCellContent(row, titleCol) : 'Record'
                  const displayCols = contentColumns.filter((c) => c.field !== titleCol?.field).slice(0, 4)

                  return (
                    <Paper
                      key={String(id)}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(79, 106, 245, 0.08)' : 'rgba(79, 106, 245, 0.04)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700 }}>
                          {String(titleVal).charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 150 }}>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>
                            {titleVal}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, overflow: 'hidden' }}>
                          {displayCols.map((col) => (
                            <Box key={col.field} sx={{ minWidth: 100, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                                {col.headerName}
                              </Typography>
                              <Box sx={{ fontSize: '0.8rem' }}>
                                {renderCellContent(row, col)}
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Stack>

                      {actionColumn && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderCellContent(row, actionColumn)}
                        </Box>
                      )}
                    </Paper>
                  )
                })}
              </Stack>
            )}
          </Box>

          {/* Footer Pagination Bar */}
          <TablePagination
            component="div"
            count={effectiveTotalCount}
            page={currentPage}
            rowsPerPage={currentPageSize}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Box>
      )}
      <LaymanFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        columns={columns || []}
        rows={rest.rows || []}
        currentFilters={filterState}
        onApply={(newFilters) => setFilterState(newFilters)}
        onReset={handleResetFilters}
      />
    </Box>
  )
}
