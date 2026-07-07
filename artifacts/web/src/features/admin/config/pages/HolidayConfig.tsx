import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/common/ConfirmContext'
import { api } from '@/services/api'


export interface Holiday {
  id: string
  name: string
  date: string
  dayOfWeek: string
  type: 'National' | 'State' | 'Company Holiday'
  description: string
}



export default function HolidayConfigPage() {
  const [items, setItems] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    name: '',
    date: '',
    dayOfWeek: 'Monday',
    type: 'National' as Holiday['type'],
    description: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/holidays')
      setItems(res.data?.items || [])
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load holidays', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      name: '',
      date: '',
      dayOfWeek: 'Monday',
      type: 'National',
      description: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (hol: Holiday) => {
    setEditing(hol)
    setForm({
      name: hol.name,
      date: hol.date,
      dayOfWeek: hol.dayOfWeek,
      type: hol.type,
      description: hol.description,
    })
    setDialogOpen(true)
  }

  const { confirmDelete } = useConfirm()

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this holiday? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoading(true)
          await api.delete(`/holidays/${id}`)
          setToast({ open: true, msg: 'Holiday deleted successfully', sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message || 'Failed to delete holiday', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleSave = async () => {
    if (!form.name || !form.date) {
      setToast({ open: true, msg: 'Name and Date are required', sev: 'error' })
      return
    }

    try {
      setLoading(true)
      if (editing) {
        await api.put(`/holidays/${editing.id}`, form)
        setToast({ open: true, msg: 'Holiday updated successfully', sev: 'success' })
      } else {
        await api.post('/holidays', form)
        setToast({ open: true, msg: 'Holiday added successfully', sev: 'success' })
      }
      setDialogOpen(false)
      void loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save holiday', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo<GridColDef<Holiday>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Holiday Name',
        flex: 1.2,
        minWidth: 160,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 130,
        renderCell: (p) => new Date(p.value as string).toLocaleDateString(),
      },
      { field: 'dayOfWeek', headerName: 'Day', width: 120 },
      {
        field: 'type',
        headerName: 'Type',
        width: 150,
        renderCell: (p) => <StatusBadge value={p.value} hideDot />,
      },
      { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 200 },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
                <DeleteIcon fontSize="small" />
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
        title="Holiday Configuration"
        subtitle="Manage official calendar holidays for lead scoring SLAs and working-day rules."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add Holiday
          </Button>
        }
        fullHeight
      >
        <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                label="Holiday Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                select
                fullWidth
                label="Holiday Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Holiday['type'] })}
              >
                <MenuItem value="National">National</MenuItem>
                <MenuItem value="State">State</MenuItem>
                <MenuItem value="Company Holiday">Company Holiday</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Box>
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
