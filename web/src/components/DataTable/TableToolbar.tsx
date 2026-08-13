/**
 * components/DataTable/TableToolbar.tsx
 *
 * Reusable top bar for any table page.
 *
 * DESKTOP (≥ sm): single row — Search | divider | Add | Import | Export | Refresh
 *                 On bulk-selection: "N selected" | Delete selected | Cancel
 * MOBILE  (< sm): two-row stacked layout — Search full-width, buttons wrap naturally
 *
 * Desktop UI is PIXEL-IDENTICAL to the inline toolbar in ContactsList.tsx.
 * Zero hardcoded "contacts" copy — fully generic via props.
 */

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TableToolbarProps {
  /** Current search string */
  search: string
  /** Called on every keystroke */
  onSearchChange: (value: string) => void
  /** Placeholder text for the search input */
  searchPlaceholder?: string

  /** Number of currently-selected rows (0 = normal mode, >0 = selection mode) */
  selectedCount: number
  /** Called when "Delete selected" is clicked */
  onDeleteSelected: () => void
  /** Called when "Cancel" is clicked (clears selection) */
  onCancelSelection: () => void

  /** Action handlers — omit a prop to hide the button */
  onAdd?: () => void
  onImport?: () => void
  onExport?: () => void
  onRefresh?: () => void

  /** Disable the refresh button while data is loading */
  loading?: boolean
}

// ─── Shared button style — matches exact values from ContactsList ─────────────

const BTN_SX = {
  height: 36,
  minHeight: 36,
  borderRadius: '8px',
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'none',
  px: 1.75,
  flexShrink: 0,
  whiteSpace: 'nowrap',
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  selectedCount,
  onDeleteSelected,
  onCancelSelection,
  onAdd,
  onImport,
  onExport,
  onRefresh,
  loading = false,
}: TableToolbarProps) {
  const hasSelection = selectedCount > 0

  return (
    <Box
      sx={{
        // Desktop: single row, fixed height
        // Mobile: column stack, auto height
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1,
        flexWrap: { sm: 'wrap' },
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        minHeight: { sm: 48 },
        bgcolor: 'background.paper',
      }}
    >
      {hasSelection ? (
        /* ── Bulk-selection mode ─────────────────────────────────────────── */
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" fontWeight={600} color="secondary.main">
            {selectedCount} selected
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
            onClick={onDeleteSelected}
            sx={BTN_SX}
          >
            Delete selected
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onCancelSelection}
            sx={BTN_SX}
          >
            Cancel
          </Button>
        </Box>
      ) : (
        /* ── Normal mode ─────────────────────────────────────────────────── */
        <>
          {/*
           * On desktop: entire content is right-aligned (ml: 'auto' on the inner Box).
           * On mobile: each item is full width stacked.
           * This exactly mirrors the ContactsList desktop layout.
           */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1, sm: 0.5 },
              ml: { sm: 'auto' },
              alignItems: 'center',
              flexWrap: 'wrap',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {/* Search input — left of divider on desktop, full-width first on mobile */}
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                sx: { height: 36, borderRadius: '8px', fontSize: 13 },
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />

            {/* Divider — only visible on desktop */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: { xs: 0.5, sm: 0.25 },
                height: 28,
                display: { xs: 'none', sm: 'block' },
                alignSelf: 'center',
              }}
            />

            {/* Action buttons */}
            {onAdd && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={onAdd}
                  sx={{ ...BTN_SX, flexGrow: { xs: 1, sm: 0 }, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Add
                </Button>
                <Tooltip title="Add">
                  <span>
                    <IconButton
                      onClick={onAdd}
                      size="small"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' }, width: 44, height: 44, border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}
                    >
                      <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            {onImport && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileUploadIcon sx={{ fontSize: 16 }} />}
                  onClick={onImport}
                  sx={{ ...BTN_SX, flexGrow: { xs: 1, sm: 0 }, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Import
                </Button>
                <Tooltip title="Import">
                  <span>
                    <IconButton
                      onClick={onImport}
                      size="small"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' }, width: 44, height: 44, border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}
                    >
                      <FileUploadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            {onExport && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                  onClick={onExport}
                  sx={{ ...BTN_SX, flexGrow: { xs: 1, sm: 0 }, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Export
                </Button>
                <Tooltip title="Export">
                  <span>
                    <IconButton
                      onClick={onExport}
                      size="small"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' }, width: 44, height: 44, border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}
                    >
                      <FileDownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            {onRefresh && (
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    onClick={onRefresh}
                    disabled={loading}
                    size="small"
                    sx={{
                      display: { xs: 'inline-flex', sm: 'inline-flex' },
                      width: { xs: 44, sm: 36 },
                      height: { xs: 44, sm: 36 },
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: { xs: '12px', sm: '8px' },
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: { xs: 18, sm: 18 } }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
