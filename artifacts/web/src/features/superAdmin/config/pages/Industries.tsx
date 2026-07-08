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
  getIndustries,
  createIndustryRecord,
  updateIndustryRecord,
  deleteIndustryRecord,
  type Industry,
} from '@/services/sidebarAdminService'

interface FormState {
  _id?: string
  code: string
  name: string
  description: string
  isActive: boolean
  status: string
}

const emptyForm: FormState = { code: '', name: '', description: '', isActive: true, status: 'Launched' }

export default function IndustriesPage() {
  const [items, setItems] = useState<Industry[]>([])
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
      setItems(await getIndustries(false))
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (row: Industry) => {
    setForm({ _id: row._id, code: row.code, name: row.name, description: row.description ?? '', isActive: row.isActive, status: row.status ?? 'Launched' })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setToast({ open: true, msg: 'Code and name are required', sev: 'error' }); return
    }
    setSaving(true)
    try {
      if (form._id) {
        await updateIndustryRecord(form._id, { code: form.code, name: form.name, description: form.description, isActive: form.isActive, status: form.status })
      } else {
        await createIndustryRecord({ code: form.code, name: form.name, description: form.description, isActive: form.isActive, status: form.status })
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Saved', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally { setSaving(false) }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: Industry) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete industry "${row.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteIndustryRecord(row._id)
          setToast({ open: true, msg: 'Deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Industry>[]>(() => [
    { field: 'code', headerName: 'Code', minWidth: 140,
      renderCell: (p) => <Box component="code">{String(p.value)}</Box> },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 200,
      renderCell: (p) => p.value ? String(p.value) : <Box sx={{ color: 'text.secondary' }}>—</Box> },
    { field: 'isActive', headerName: 'Active', minWidth: 110,
      renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
    },
    { field: 'status', headerName: 'Status', minWidth: 140,
      renderCell: (p) => p.value ? String(p.value) : 'Launched',
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
        title="Industries"
        subtitle="Tenants/verticals that the platform serves."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Industry</Button>}
        fullHeight
      >
        <AppDataGrid rows={items} columns={gridColumns} loading={loading} getRowId={(r) => r._id} height="100%" onReload={refresh} />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Industry' : 'New Industry'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              helperText="Stable identifier (e.g. temp0001, real-estate)" disabled={!!form._id} fullWidth />
            <TextField label="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="Launched">Launched</option>
              <option value="Pre-Launched">Pre-Launched</option>
              <option value="Pending">Pending</option>
            </TextField>
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
