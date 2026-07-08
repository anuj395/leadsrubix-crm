import { useMemo } from 'react'
import Box from '@mui/material/Box'
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter,
  type DataGridProps
} from '@mui/x-data-grid'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import RefreshIcon from '@mui/icons-material/Refresh'

export type AppDataGridProps = DataGridProps & {
  onReload?: () => void
  /**
   * Height of the scroll container. Defaults to `80vh` so the column header
   * stays sticky and the body scrolls underneath, matching the MUI docs
   * pattern. Pass any CSS height override if a page wants something taller
   * or shorter.
   */
  height?: string | number
  /**
   * When true, hides the floating toolbar (Columns / Filter / Density /
   * Export / Quick filter). Default false. The per-column "three-dots" menu
   * (Sort, Filter, Hide column, Manage columns) is part of DataGrid itself
   * and is always available regardless.
   */
  hideToolbar?: boolean
}

/**
 * Project-wide table built on `<DataGrid />`. Centralises the conventions we
 * want everywhere:
 *
 *   • sticky column header (`80vh` container + DataGrid's built-in sticky)
 *   • column header three-dots menu: Sort ASC/DESC, Filter, Hide, Manage cols
 *   • toolbar with quick filter, column visibility, density and CSV export
 *   • sensible default page-size options
 *   • optional server-side pagination (`paginationMode="server"`) — caller
 *     supplies `rowCount`, `paginationModel`, `onPaginationModelChange`
 *
 * Use this component for every list/table in the app so all tables look,
 * behave and scale the same way.
 */
export function AppDataGrid({
  height = '80vh',
  hideToolbar = false,
  onReload,
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
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <GridToolbarQuickFilter />
            <Tooltip title="Reload Table">
              <IconButton onClick={handleReload} size="small" color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </GridToolbarContainer>
      )
    }
  }, [onReload])

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

  // On mobile, convert flex columns to fixed widths to force horizontal scrolling
  // and prevent text columns from shrinking to unreadable vertical strips.
  // Enforces safe minWidth thresholds for common data fields on all viewports
  // to prevent column cramping and word/badge cutoff.
  const responsiveColumns = useMemo(() => {
    if (!columns) return []

    return columns.map((col) => {
      const updated = { ...col }
      const fieldLower = String(updated.field).toLowerCase()

      // Define safe responsive minimum widths based on field keys/types
      let defaultMinWidth = 120
      if (fieldLower.includes('email')) {
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

      // Respect explicit minWidth if it is larger than our safe default
      if (updated.minWidth === undefined) {
        updated.minWidth = defaultMinWidth
      } else {
        updated.minWidth = Math.max(updated.minWidth, defaultMinWidth)
      }

      // For columns that contain fixed-size elements (badges, statuses, dates, phones, urls, industries, methods, codes/keys),
      // we disable flex and use a fixed width matching their minWidth on all viewports.
      // This prevents them from shrinking and cropping their contents when screen space is tight.
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
  }, [columns, isMobile])

  return (
    <Box sx={{ height, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <DataGrid
        columns={responsiveColumns}
        pagination
        // The per-column three-dots menu is the DataGrid default; nothing to
        // wire here. Adding the toolbar gives Columns / Filter / Density /
        // Export and a quick search box.
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
        // If the row objects use Mongo-style `_id`, surface it as the row id
        // by default so callers don't have to repeat this on every page.
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
          // Responsive styling overrides for mobile screens
          ...(isMobile
            ? {
                // Keep toolbar in a single non-wrapping horizontally-scrollable row
                '& .MuiDataGrid-toolbarContainer': {
                  flexWrap: 'nowrap !important',
                  overflowX: 'auto !important',
                  gap: '8px !important',
                  padding: '6px 8px !important',
                  // Hide scrollbar track for clean presentation
                  '::-webkit-scrollbar': {
                    display: 'none !important',
                  },
                  msOverflowStyle: 'none !important',
                  scrollbarWidth: 'none !important',
                  // Compress button text to show only icon badges
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
                // Compress search quick filter input to sit neatly beside icon buttons
                '& .MuiDataGrid-toolbarContainer .MuiTextField-root': {
                  minWidth: '100px !important',
                  flexShrink: 1,
                  margin: '0 !important',
                  '& .MuiInputBase-input': {
                    padding: '4px 6px !important',
                    fontSize: '0.8rem !important',
                  },
                },
                // Tighten fonts in grid cells & headers to maximize screen space
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
    </Box>
  )
}
