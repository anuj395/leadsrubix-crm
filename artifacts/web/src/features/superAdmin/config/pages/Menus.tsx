import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { AppCard } from '@/components/ui/AppCard'
import { useConfirm } from '@/components/common/ConfirmContext'
import {
  getMenus,
  createMenuRecord,
  updateMenuRecord,
  deleteMenuRecord,
  type SidebarMenuRecord,
} from '@/services/sidebarAdminService'

interface FormState {
  _id?: string
  key: string
  name: string
  icon: string
  route: string
  parent_id: string
  order: number
  module: string
  isActive: boolean
}

const emptyForm: FormState = {
  key: '',
  name: '',
  icon: '',
  route: '',
  parent_id: '',
  order: 0,
  module: '',
  isActive: true,
}

export default function MenusPage() {
  const [items, setItems] = useState<SidebarMenuRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await getMenus())
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const menuById = useMemo(() => new Map(items.map((m) => [m._id, m])), [items])

  // Sort: parents first, then children grouped under each parent.
  const sorted = useMemo(() => {
    const roots = items.filter((m) => !m.parent_id).sort((a, b) => a.order - b.order)
    const childrenOf = (id: string) =>
      items.filter((m) => m.parent_id === id).sort((a, b) => a.order - b.order)
    const result: SidebarMenuRecord[] = []
    roots.forEach((r) => {
      result.push(r)
      result.push(...childrenOf(r._id))
    })
    // Append orphans (parent_id pointing to nothing) at the end.
    items
      .filter((m) => m.parent_id && !menuById.has(m.parent_id))
      .forEach((m) => result.push(m))
    return result
  }, [items, menuById])

  const parentOptions = useMemo(() => items.filter((m) => !m.parent_id), [items])

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (row: SidebarMenuRecord) => {
    setForm({
      _id: row._id,
      key: row.key,
      name: row.name,
      icon: row.icon ?? '',
      route: row.route ?? '',
      parent_id: row.parent_id ?? '',
      order: row.order ?? 0,
      module: row.module ?? '',
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
        icon: form.icon || undefined,
        route: form.route || undefined,
        parent_id: form.parent_id || null,
        order: form.order,
        module: form.module || undefined,
        isActive: form.isActive,
      }
      if (form._id) {
        await updateMenuRecord(form._id, payload)
      } else {
        await createMenuRecord(payload)
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Saved', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: SidebarMenuRecord) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete menu "${row.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteMenuRecord(row._id)
          setToast({ open: true, msg: 'Deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<SidebarMenuRecord>[]>(
    () => [
      {
        field: 'key',
        headerName: 'Key',
        flex: 1.2,
        renderCell: (p) => {
          const row = p.row
          const parent = row.parent_id ? menuById.get(row.parent_id) : null
          return (
            <Box sx={{ pl: parent ? 3 : 0 }}>
              <code>{row.key}</code>
            </Box>
          )
        },
      },
      { field: 'name', headerName: 'Name', flex: 1 },
      { field: 'route', headerName: 'Route', flex: 1.2, renderCell: (p) => p.value || '—' },
      { field: 'icon', headerName: 'Icon', width: 100, renderCell: (p) => p.value || '—' },
      {
        field: 'parent_id',
        headerName: 'Parent',
        flex: 1,
        valueGetter: (_, row) => {
          const parent = row.parent_id ? menuById.get(row.parent_id) : null
          return parent ? parent.name : '—'
        },
      },
      { field: 'order', headerName: 'Order', width: 90, type: 'number' },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        width: 110,
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
    [menuById, openEdit, remove],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Sidebar Menus"
        subtitle="Master catalog of every navigation entry. Use parent_id to nest children."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Menu
          </Button>
        }
        fullHeight
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No menus yet.
          </Typography>
        ) : (
          <AppDataGrid
            height="100%"
            rows={sorted}
            columns={gridColumns}
            loading={loading}
            getRowId={(r) => r._id}
          />
        )}
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Menu' : 'New Menu'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              helperText="Stable identifier (e.g. leads.contacts)"
              disabled={!!form._id}
              fullWidth
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Route"
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                fullWidth
                placeholder="/leads/contacts"
              />
              <TextField
                label="Icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                fullWidth
                placeholder="contact"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Parent"
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                fullWidth
              >
                <MenuItem value="">— None (top-level) —</MenuItem>
                {parentOptions
                  .filter((p) => p._id !== form._id)
                  .map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                label="Order"
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                sx={{ width: 120 }}
              />
            </Stack>
            <TextField
              label="Module"
              value={form.module}
              onChange={(e) => setForm({ ...form, module: e.target.value })}
              fullWidth
              helperText="Grouping key, used by the legacy frontend (e.g. leads, configuration)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              }
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
