import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  getScreens,
  createScreen,
  updateScreen,
  deleteScreen,
  type Screen,
} from '@/services/screenAdminService'

interface FormState {
  _id?: string
  key: string
  name: string
  description: string
  order: number
  isActive: boolean
}

const emptyForm: FormState = { key: '', name: '', description: '', order: 0, isActive: true }

export default function ScreensPage() {
  const [items, setItems] = useState<Screen[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      setItems((await getScreens()).filter((s) => s.key !== 'users'))
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (row: Screen) => {
    setForm({ _id: row._id, key: row.key, name: row.name, description: row.description ?? '', order: row.order ?? 0, isActive: row.isActive })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      setToast({ open: true, msg: 'Key and name are required', sev: 'error' }); return
    }
    setSaving(true)
    try {
      if (form._id) {
        await updateScreen(form._id, { key: form.key, name: form.name, description: form.description, order: form.order, isActive: form.isActive })
      } else {
        await createScreen({ key: form.key, name: form.name, description: form.description, order: form.order, isActive: form.isActive })
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Saved', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally { setSaving(false) }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: Screen) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete screen "${row.name}"?\n\nThis also removes all of its fields and permissions. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteScreen(row._id)
          setToast({ open: true, msg: 'Deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Screen>[]>(() => [
    { field: 'key', headerName: 'Key', minWidth: 140,
      renderCell: (p) => <Box component="code">{String(p.value)}</Box> },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 200,
      renderCell: (p) => p.value ? String(p.value) : <Box sx={{ color: 'text.secondary' }}>—</Box> },
    { field: 'order', headerName: 'Order', width: 90, type: 'number' },
    { field: 'isActive', headerName: 'Status', minWidth: 110,
      renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
    },
    { field: '__actions', headerName: 'Actions', sortable: false, filterable: false, disableColumnMenu: true,
      align: 'right', headerAlign: 'right', width: 120,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => void remove(p.row)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ], [])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Screens"
        subtitle="Manage dynamic form sections and screen modules configuration."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Screen</Button>}
        fullHeight
      >
        <AppDataGrid rows={items} columns={gridColumns} loading={loading} getRowId={(r) => r._id} height="100%" onReload={refresh} />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Screen' : 'New Screen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
              helperText="Stable identifier used by client code (e.g. contacts, tasks)" disabled={!!form._id} fullWidth />
            <TextField label="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
            <TextField label="Sort Order" type="number" value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} fullWidth />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
