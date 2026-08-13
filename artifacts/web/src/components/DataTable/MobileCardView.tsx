/**
 * components/common/MobileCardsView.tsx
 *
 * Generic mobile-only card list renderer.
 * Uses the SAME rows / pagination / selectedIds state as the desktop DataGrid —
 * single source of truth, zero data duplication.
 *
 * Reusable for any table page (Tasks, Bookings, etc.) via configurable props.
 */

import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import TablePagination from '@mui/material/TablePagination'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InboxIcon from '@mui/icons-material/Inbox'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'

import type { PaginationState } from '../DataTable/types'

// ─── Generic row type ─────────────────────────────────────────────────────────

export type MobileRow = Record<string, unknown> & { id: string | number }

// ─── Extra field pill definition ──────────────────────────────────────────────

export interface ExtraField {
  key: string
  label: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MobileCardsViewProps<T extends MobileRow> {
  /** Same rows array passed to the desktop DataGrid */
  rows: T[]
  /** True while rows are being fetched */
  loading: boolean
  /** Shared pagination state */
  pagination: PaginationState
  onPaginationChange: (next: Partial<PaginationState>) => void
  /** Shared selection state (same array as desktop DataGrid) */
  selectedIds: (string | number)[]
  onToggleSelect: (id: string | number) => void
  /** Row action handlers */
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  /** Which row field to use as primary display name */
  nameKey?: string
  /** Which row field to use as secondary/sub line */
  emailKey?: string
  /** Which row field to use for the status badge */
  statusKey?: string
  /** Array of {key, label} for the pill row below name */
  extraFields?: ExtraField[]
  /** Empty state copy */
  emptyMessage?: string
  emptySubMessage?: string
}

// ─── Colour helpers (identical to desktop AvatarCell helpers) ─────────────────

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  const palette = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return palette[Math.abs(h) % palette.length]
}

// ─── Status badge (mirrors desktop StatusCell exactly) ───────────────────────

type KnownStatus = 'Active' | 'Inactive' | 'Pending'

const STATUS_CFG: Record<KnownStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  Active:   { color: '#059669', bg: '#ECFDF5', icon: <CheckCircleIcon sx={{ fontSize: 12 }} /> },
  Inactive: { color: '#DC2626', bg: '#FEF2F2', icon: <CancelIcon      sx={{ fontSize: 12 }} /> },
  Pending:  { color: '#D97706', bg: '#FFFBEB', icon: <PauseCircleIcon  sx={{ fontSize: 12 }} /> },
}

function StatusBadge({ value }: { value: string }) {
  if (!value) return null
  const cfg = STATUS_CFG[value as KnownStatus]
  if (!cfg) {
    return (
      <Chip label={value} size="small"
        sx={{ fontWeight: 600, fontSize: 11, height: 22, borderRadius: '6px', flexShrink: 0 }} />
    )
  }
  const { color, bg, icon } = cfg
  return (
    <Chip
      icon={<span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      label={value} size="small"
      sx={{
        bgcolor: bg, color, fontWeight: 600, fontSize: 11,
        height: 22, borderRadius: '6px', flexShrink: 0,
        '& .MuiChip-icon': { ml: '5px', mr: '-4px' },
      }}
    />
  )
}

// ─── Single card ──────────────────────────────────────────────────────────────

function MobileCard<T extends MobileRow>({
  row, isSelected, onToggle, onEdit, onDelete,
  nameKey, emailKey, statusKey, extraFields,
}: {
  row: T
  isSelected: boolean
  onToggle: () => void
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  nameKey: string
  emailKey: string
  statusKey: string
  extraFields: ExtraField[]
}) {
  // Resolve values with sensible fallbacks
  const name   = String(row[nameKey] ?? row['customer_name'] ?? row['name'] ?? '—')
  const email  = String(row[emailKey] ?? '')
  const status = String(row[statusKey] ?? '')

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.25,
        borderRadius: 2.5,
        bgcolor: isSelected ? 'action.selected' : 'background.paper',
        transition: 'background-color 150ms ease',
      }}
    >
      <CardContent sx={{ p: '12px 14px !important' }}>

        {/* Row 1: checkbox | avatar | name + email | status badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
          <Checkbox
            size="small" checked={isSelected} onChange={onToggle}
            sx={{ p: 0, flexShrink: 0 }}
          />
          <Avatar
            sx={{
              width: 32, height: 32, flexShrink: 0,
              bgcolor: getAvatarColor(name), fontSize: 11, fontWeight: 700,
            }}
          >
            {getInitials(name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={14} noWrap>{name}</Typography>
            {email && (
              <Typography fontSize={12} color="text.secondary" noWrap>{email}</Typography>
            )}
          </Box>
          <StatusBadge value={status} />
        </Box>

        {/* Row 2: extra field pills */}
        {extraFields.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {extraFields.map(({ key, label }) => {
              const val = String(row[key] ?? '')
              if (!val) return null
              return (
                <Box key={key} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Typography fontSize={11} color="text.disabled" fontWeight={600}>
                    {label}:
                  </Typography>
                  <Typography fontSize={11.5} color="text.secondary">{val}</Typography>
                </Box>
              )
            })}
          </Box>
        )}

        {/* Row 3: action icon buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => onEdit(row)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'secondary.main', bgcolor: 'action.hover' } }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => onDelete(row)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

      </CardContent>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MobileCardsView<T extends MobileRow>({
  rows,
  loading,
  pagination,
  onPaginationChange,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  nameKey    = 'customer_name',
  emailKey   = 'email',
  statusKey  = 'status',
  extraFields = [
    { key: 'contact_no',  label: 'Phone'   },
    { key: 'lead_source', label: 'Source'  },
    { key: 'lead_type',   label: 'Type'    },
    { key: 'project',     label: 'Project' },
  ],
  emptyMessage    = 'No records found',
  emptySubMessage = 'Try adjusting your search or filters.',
}: MobileCardsViewProps<T>) {

  // Loading skeleton cards
  if (loading) {
    return (
      <Box sx={{ p: 1.5, overflowY: 'auto', flex: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} variant="outlined" sx={{ mb: 1.25, borderRadius: 2.5 }}>
            <CardContent sx={{ p: '12px 14px !important' }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="55%" height={18} />
                  <Skeleton width="75%" height={13} sx={{ mt: 0.5 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    )
  }

  // Empty state
  if (!rows.length) {
    return (
      <Box sx={{ flex: 1, py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
        <InboxIcon sx={{ fontSize: 48, opacity: 0.3 }} />
        <Typography fontWeight={600} color="text.primary">{emptyMessage}</Typography>
        <Typography variant="body2">{emptySubMessage}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Scrollable card area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, WebkitOverflowScrolling: 'touch' }}>
        {rows.map((row) => (
          <MobileCard
            key={String(row.id)}
            row={row}
            isSelected={selectedIds.includes(row.id)}
            onToggle={() => onToggleSelect(row.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            nameKey={nameKey}
            emailKey={emailKey}
            statusKey={statusKey}
            extraFields={extraFields}
          />
        ))}
      </Box>

      {/* Pagination — always pinned at bottom */}
      <TablePagination
        component="div"
        count={pagination.total}
        page={pagination.page}
        rowsPerPage={pagination.rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        onPageChange={(_, page) => onPaginationChange({ page })}
        onRowsPerPageChange={(e) =>
          onPaginationChange({ rowsPerPage: parseInt(e.target.value, 10), page: 0 })
        }
        sx={{
          flexShrink: 0,
          borderTop: '1px solid', borderColor: 'divider',
          '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', minHeight: 48 },
        }}
      />
    </Box>
  )
}
