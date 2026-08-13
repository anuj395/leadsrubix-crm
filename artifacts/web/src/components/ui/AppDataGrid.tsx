import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter,
  type DataGridProps,
  type GridColDef
} from '@mui/x-data-grid'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
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
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Paper from '@mui/material/Paper'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'

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
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>(defaultViewMode)

  const totalCount = rest.rowCount ?? rest.rows?.length ?? 0

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
        const idx = rest.rows?.findIndex((r: any) => {
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
  }, [columns, isMobile, rest.rows, getRowId])

  const CustomToolbar = useMemo(() => {
    return () => {
      const handleReload = () => {
        if (onReload) {
          onReload()
        } else {
          window.location.reload()
        }
      }

      return (
        <GridToolbarContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
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
  }, [onReload, onImport, viewMode, theme])

  const rowsList = rest.rows || []
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

  const currentPage = rest.paginationModel?.page ?? 0
  const currentPageSize = rest.paginationModel?.pageSize ?? 25

  const handlePageChange = (_: any, newPage: number) => {
    if (rest.onPaginationModelChange) {
      (rest.onPaginationModelChange as any)({ page: newPage, pageSize: currentPageSize })
    }
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newSize = parseInt(event.target.value, 10)
    if (rest.onPaginationModelChange) {
      (rest.onPaginationModelChange as any)({ page: 0, pageSize: newSize })
    }
  }

  return (
    <Box sx={{ height, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {viewMode === 'table' ? (
        <DataGrid
          columns={responsiveColumns}
          pagination
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
                  '& .MuiDataGrid-toolbarContainer': {
                    flexWrap: 'nowrap !important',
                    overflowX: 'auto !important',
                    gap: '8px !important',
                    padding: '6px 8px !important',
                    '::-webkit-scrollbar': {
                      display: 'none !important',
                    },
                    msOverflowStyle: 'none !important',
                    scrollbarWidth: 'none !important',
                    '& button': {
                      fontSize: '0 !important',
                      minWidth: '0 !important',
                      padding: '4px 8px !important',
                      '& .MuiButton-startIcon': {
                        margin: '0 !important',
                        fontSize: '1.25rem !important',
                      },
                    },
                  },
                  '& .MuiDataGrid-toolbarContainer .MuiTextField-root': {
                    minWidth: '100px !important',
                    flexShrink: 1,
                    margin: '0 !important',
                    '& .MuiInputBase-input': {
                      padding: '4px 6px !important',
                      fontSize: '0.8rem !important',
                    },
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontSize: '0.8rem !important',
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: '0.8rem !important',
                    padding: '0 10px !important',
                  },
                }
              : {}),
            ...(sx ?? {}),
          }}
          {...rest}
        />
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* View Mode Header Bar */}
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(18, 22, 43, 0.5)' : 'rgba(245, 246, 250, 0.7)' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_, nextMode) => {
                if (nextMode) setViewMode(nextMode)
              }}
              sx={{ height: 32 }}
            >
              <ToggleButton value="table"><TableChartIcon fontSize="small" sx={{ mr: 0.5 }} /> Table</ToggleButton>
              <ToggleButton value="grid"><GridViewIcon fontSize="small" sx={{ mr: 0.5 }} /> Cards</ToggleButton>
              <ToggleButton value="list"><ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> List</ToggleButton>
            </ToggleButtonGroup>

            {onReload && (
              <IconButton onClick={onReload} size="small" color="primary">
                <RefreshIcon />
              </IconButton>
            )}
          </Box>

          {/* Body Content: Grid or List */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {viewMode === 'grid' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
                {rowsList.map((row: any) => {
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
                {rowsList.map((row: any) => {
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
            count={totalCount}
            page={currentPage}
            rowsPerPage={currentPageSize}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Box>
      )}
    </Box>
  )
}
