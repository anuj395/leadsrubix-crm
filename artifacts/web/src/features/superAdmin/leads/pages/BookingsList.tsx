import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { api } from '@/services/api'
import { resolveScreen, type ResolvedTableHeader } from '@/services/screenAdminService'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface Booking {
  _id: string
  createdAt?: string
  updatedAt?: string
  [k: string]: unknown
}

function toFormValues(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy' || k === 'industryId' || k === 'roleId') continue
    if (v === null || v === undefined) continue
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v
  }
  return out
}

export default function BookingsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Booking[]>([])
  const [columns, setColumns] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const [listRes, resolved] = await Promise.all([
        api.get('bookings'),
        resolveScreen({
          screen_key: 'bookings',
          industry_code: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          role_key: user?.role === 'superAdmin' ? 'admin' : undefined,
        }),
      ])
      setItems(listRes.data?.items ?? [])
      setColumns(resolved.table_headers)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load bookings', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gridColumns = useMemo<GridColDef<Booking>[]>(() => {
    const sorted = [...columns].sort((a, b) => a.order - b.order)
    const dataCols = sorted.map((c): GridColDef<Booking> => ({
      field: c.key,
      headerName: c.label,
      flex: 1,
      minWidth: 140,
      sortable: c.sortable !== false,
      valueGetter: (_v: unknown, row: Booking) => (row as Record<string, unknown>)[c.key],
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (c.type === 'date' || c.key === 'createdAt' || c.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          c.type === 'badge' ||
          c.key.toLowerCase().includes('status') ||
          c.key.toLowerCase().includes('priority') ||
          c.key.toLowerCase() === 'lead_type'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const actionsCol: GridColDef<Booking> = {
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditingBooking(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                confirmDelete({
                  title: 'Confirm Deletion',
                  message: 'Are you sure you want to delete this booking? This action cannot be undone.',
                  onConfirm: async () => {
                    try {
                      await api.delete(`bookings/${params.row._id || params.row.id}`)
                      setToast({ open: true, msg: 'Booking deleted successfully', sev: 'success' })
                      await refresh()
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { message?: string } } }
                      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete booking', sev: 'error' })
                    }
                  }
                })
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }

    return [...dataCols, actionsCol]
  }, [columns])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Bookings List"
        subtitle="List of active customer bookings and sales commitments."
        action={
          <Tooltip title="Log a new customer booking/sale record">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Add Booking
            </Button>
          </Tooltip>
        }
        fullHeight
      >
        <AppDataGrid onReload={refresh}
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading}
          getRowId={(r) => r._id}
        />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Booking</DialogTitle>
        <DialogContent dividers>
          <DynamicForm
            screen="bookings"
            onCancel={() => setDialogOpen(false)}
            submitLabel="Create"
            onSubmit={async (values) => {
              try {
                await api.post('bookings', values)
                setDialogOpen(false)
                setToast({ open: true, msg: 'Booking created successfully', sev: 'success' })
                await refresh()
              } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } }
                setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to create booking', sev: 'error' })
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingBooking)} onClose={() => setEditingBooking(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Booking</DialogTitle>
        <DialogContent dividers>
          {editingBooking && (
            <DynamicForm
              screen="bookings"
              initialValues={toFormValues(editingBooking)}
              onCancel={() => setEditingBooking(null)}
              submitLabel="Save Changes"
              onSubmit={async (values) => {
                try {
                  await api.put(`bookings/${editingBooking._id || editingBooking.id}`, values)
                  setEditingBooking(null)
                  setToast({ open: true, msg: 'Booking updated successfully', sev: 'success' })
                  await refresh()
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } }
                  setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to update booking', sev: 'error' })
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
