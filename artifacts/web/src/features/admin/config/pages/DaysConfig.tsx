import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import { Edit as EditIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/services/api'

export interface WorkingDay {
  id: string
  day: string
  closed: boolean
  opensAt: string
  closesAt: string
  notes: string
}

export default function DaysConfigPage() {
  const [items, setItems] = useState<WorkingDay[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WorkingDay | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    closed: false,
    opensAt: '09:00',
    closesAt: '18:00',
    notes: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/working-days')
      setItems(res.data?.items || [])
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load working days', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const openEditDialog = (day: WorkingDay) => {
    setEditing(day)
    setForm({
      closed: day.closed,
      opensAt: day.closed ? '09:00' : day.opensAt,
      closesAt: day.closed ? '18:00' : day.closesAt,
      notes: day.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return

    try {
      setLoading(true)
      await api.put(`/working-days/${editing.id}`, form)
      setToast({ open: true, msg: `${editing.day} configuration updated`, sev: 'success' })
      setDialogOpen(false)
      void loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to update working day', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo<GridColDef<WorkingDay>[]>(
    () => [
      {
        field: 'day',
        headerName: 'Day of Week',
        flex: 1,
        minWidth: 140,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'closed',
        headerName: 'Status',
        width: 150,
        renderCell: (p) => (
          <StatusBadge value={p.value ? 'Closed' : 'Open'} />
        ),
      },
      {
        field: 'hours',
        headerName: 'Business Hours',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => {
          if (row.closed) return 'Closed'
          return `${row.opensAt} - ${row.closesAt}`
        },
      },
      { field: 'notes', headerName: 'Notes / Remarks', flex: 1.5, minWidth: 200 },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Configure Day">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  )

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
        title="Weekly Working Days"
        subtitle="Configure standard business working days and operating hours for lead assignment SLAs."
        fullHeight
      >
        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} />
        </Box>
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Configure {editing?.day}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              select
              fullWidth
              label="Working Status"
              value={form.closed ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, closed: e.target.value === 'true' })}
            >
              <MenuItem value="false">Open</MenuItem>
              <MenuItem value="true">Closed</MenuItem>
            </TextField>

            {!form.closed && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  type="time"
                  label="Start Hour"
                  value={form.opensAt}
                  onChange={(e) => setForm({ ...form, opensAt: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  type="time"
                  label="End Hour"
                  value={form.closesAt}
                  onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
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
