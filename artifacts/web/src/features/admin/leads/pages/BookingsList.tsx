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
import { api } from '@/services/api'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { selectAuth } from '@/features/auth'
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
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId

  const [items, setItems] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load screen config using useTableConfig
  const { columns: dbColumns, loading: configLoading } =
    useTableConfig('bookings', industryId)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.get('bookings')
      setItems(res.data?.items ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({
        open: true,
        msg: err?.response?.data?.message ?? 'Failed to load bookings',
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Booking) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this booking record? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`bookings/${row._id || row.id}`)
          setToast({ open: true, msg: 'Booking deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } }
          setToast({
            open: true,
            msg: err?.response?.data?.message ?? 'Failed to delete booking',
            sev: 'error',
          })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Booking>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<Booking> => {
      const base: GridColDef<Booking> = {
        field: col.key,
        headerName: col.label,
        flex: col.key === 'customer_name' || col.key === 'project' ? 1.2 : 1,
        minWidth: col.key === 'customer_name' || col.key === 'project' ? 150 : 120,
        sortable: col.sortable !== false,
        valueGetter: (_v, row) => (row as Record<string, unknown>)[col.key],
        renderCell: (p) => {
          const v = p.value
          if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
          if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date')) {
            return new Date(v as string).toLocaleString()
          }
          if (col.key === 'customer_name') {
            return <Box sx={{ fontWeight: 600 }}>{String(v)}</Box>
          }
          if (
            col.type === 'badge' ||
            col.key.toLowerCase().includes('status') ||
            col.key.toLowerCase().includes('priority') ||
            col.key.toLowerCase() === 'lead_type'
          ) {
            return <StatusBadge value={v} />
          }
          return String(v)
        },
      }
      return base
    })

    const actionsCol: GridColDef<Booking> = {
      field: '__actions__',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 120,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditingBooking(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }

    return [...dataCols, actionsCol]
  }, [dbColumns])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        <AppDataGrid
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading || configLoading}
          getRowId={(r) => r._id}
          onReload={refresh}
        />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Booking Record</DialogTitle>
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
                setToast({
                  open: true,
                  msg: err?.response?.data?.message ?? 'Failed to create booking',
                  sev: 'error',
                })
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingBooking)} onClose={() => setEditingBooking(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Booking Record</DialogTitle>
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
                  setToast({
                    open: true,
                    msg: err?.response?.data?.message ?? 'Failed to update booking',
                    sev: 'error',
                  })
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
