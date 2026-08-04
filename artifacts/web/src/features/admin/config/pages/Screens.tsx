import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
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
import { useAuth } from '@/hooks/useAuth'
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

export default function AdminScreensPage() {
  const { user } = useAuth()
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
      setItems(await getScreens())
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screens', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (row: Screen) => {
    setForm({
      _id: row._id,
      key: row.key,
      name: row.name,
      description: row.description ?? '',
      order: row.order ?? 0,
      isActive: row.isActive,
    })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      setToast({ open: true, msg: 'Key and name are required', sev: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        key: form.key,
        name: form.name,
        description: form.description || undefined,
        order: form.order,
        isActive: form.isActive,
        organizationId: (user as any)?.organizationId || (user as any)?.organization_id,
        industryId: (user as any)?.industryId || (user as any)?.industry_id,
      }
      if (form._id) {
        await updateScreen(form._id, payload)
      } else {
        await createScreen(payload)
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Screen configuration saved successfully', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const { confirmDelete } = useConfirm()
  const remove = (row: Screen) => {
    confirmDelete({
      title: 'Confirm Screen Deletion',
      message: `Delete screen "${row.name}"? This action applies strictly to your organization.`,
      onConfirm: async () => {
        try {
          await deleteScreen(row._id)
          setToast({ open: true, msg: 'Screen deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      },
    })
  }

  const columns = useMemo<GridColDef<Screen>[]>(
    () => [
      { field: 'key', headerName: 'Key', flex: 1, renderCell: (p) => <code>{p.value}</code> },
      { field: 'name', headerName: 'Name', flex: 1 },
      { field: 'description', headerName: 'Description', flex: 1.5, renderCell: (p) => p.value || '—' },
      { field: 'order', headerName: 'Order', width: 90, type: 'number' },
      {
        field: 'isActive', headerName: 'Status', width: 100,
        renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
      },
      {
        field: '__actions', headerName: 'Actions', sortable: false, filterable: false,
        align: 'right', headerAlign: 'right', width: 110,
        renderCell: (p) => (
          <>
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => remove(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        ),
      },
    ],
    [openEdit, remove],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Organization Screens"
        subtitle="Manage logical UI screens and view contexts for your organization."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Custom Screen
          </Button>
        }
        fullHeight
      >
        <AppDataGrid
          height="100%"
          rows={items}
          columns={columns}
          loading={loading}
          getRowId={(r) => r._id}
          onReload={refresh}
        />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Screen' : 'New Custom Screen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
              helperText="Unique key (e.g. leads, contacts)" disabled={!!form._id} fullWidth
            />
            <TextField
              label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth
            />
            <TextField
              label="Order" type="number" value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} sx={{ width: 120 }}
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save Screen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
