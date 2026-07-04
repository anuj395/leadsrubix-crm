import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { InputField } from '@/components/forms/InputField'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
} from '@/services/usersAdminService'
import {
  getScreens,
  getScreenFields,
  getScreenPermissions,
  bulkSetScreenPermissions,
  type Screen,
  type ScreenField,
} from '@/services/screenAdminService'
import {
  getIndustries,
  getRoles,
  type Industry,
  type AdminRole,
} from '@/services/sidebarAdminService'

interface CoreFormState {
  name: string
  email: string
  password: string
  isActive: boolean
}

const emptyCore: CoreFormState = { name: '', email: '', password: '', isActive: true }

export default function AdminRolesPage() {
  const authedUser = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = authedUser?.role === 'superAdmin'

  const [industries, setIndustries] = useState<Industry[]>([])
  const [filterIndustry, setFilterIndustry] = useState<string>('')

  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [core, setCore] = useState<CoreFormState>(emptyCore)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [screens, setScreens] = useState<Screen[]>([])
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({})
  const [moduleSaving, setModuleSaving] = useState<Record<string, boolean>>({})
  const [permsLoading, setPermsLoading] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })
  const showToast = (msg: string, sev: 'success' | 'error' = 'success') =>
    setToast({ open: true, msg, sev })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [inds, scr] = await Promise.all([getIndustries(), getScreens()])
        if (cancelled) return
        setIndustries(inds)
        setScreens(scr.filter((s) => s.isActive))
        const realEstate = inds.find((i) => i.code === 'temp0001')
        const defaultCode = realEstate ? realEstate.code : (inds[0]?.code ?? '')
        setFilterIndustry((cur) => cur || defaultCode)
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        showToast(err?.response?.data?.message ?? 'Failed to load reference data', 'error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setAdminRole(null)
    void (async () => {
      if (!filterIndustry) return
      const ind = industries.find((i) => i.code === filterIndustry)
      if (!ind) return
      try {
        const roles = await getRoles(ind._id)
        if (cancelled) return
        setAdminRole(roles.find((r) => r.key === 'admin') ?? null)
      } catch {
        if (!cancelled) setAdminRole(null)
      }
    })()
    return () => { cancelled = true }
  }, [filterIndustry, industries])

  const refreshUsers = async () => {
    if (!filterIndustry) { setItems([]); return }
    setLoading(true)
    try {
      const list = await listUsers(filterIndustry)
      setItems(list.filter((u) => u.role === 'admin'))
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to load admins', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void refreshUsers() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterIndustry])

  const refreshModuleAccess = async () => {
    if (!adminRole || !filterIndustry || screens.length === 0) {
      setModuleAccess({}); return
    }
    const ind = industries.find((i) => i.code === filterIndustry)
    if (!ind) return
    setPermsLoading(true)
    try {
      const perms = await getScreenPermissions({
        roleId: adminRole._id, industryId: ind._id, enabledOnly: true,
      })
      const byScreen: Record<string, boolean> = {}
      for (const s of screens) byScreen[s._id] = false
      for (const p of perms) byScreen[p.screen_id] = true
      setModuleAccess(byScreen)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to load module access', 'error')
    } finally {
      setPermsLoading(false)
    }
  }
  useEffect(() => { void refreshModuleAccess() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRole?._id, filterIndustry, screens.length])

  const currentIndustry = useMemo(
    () => industries.find((i) => i.code === filterIndustry),
    [industries, filterIndustry],
  )

  const toggleModule = async (screen: Screen, next: boolean) => {
    if (!adminRole || !currentIndustry) return
    setModuleSaving((m) => ({ ...m, [screen._id]: true }))
    try {
      const fields: ScreenField[] = next ? await getScreenFields(screen._id) : []
      const fieldIds = fields.filter((f) => f.isActive).map((f) => f._id)
      await bulkSetScreenPermissions({
        screen_id: screen._id, roleId: adminRole._id,
        industryId: currentIndustry._id, field_ids: next ? fieldIds : [],
      })
      setModuleAccess((m) => ({ ...m, [screen._id]: next }))
      showToast(`${screen.name}: ${next ? 'enabled' : 'disabled'} for admins`)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to update access', 'error')
    } finally {
      setModuleSaving((m) => ({ ...m, [screen._id]: false }))
    }
  }

  const openCreate = () => {
    setEditing(null); setCore({ ...emptyCore }); setFormError(null); setDialogOpen(true)
  }
  const openEdit = (row: AdminUser) => {
    setEditing(row)
    setCore({ name: row.name ?? '', email: row.email, password: '', isActive: row.isActive })
    setFormError(null); setDialogOpen(true)
  }
  const closeDialog = () => { if (!saving) setDialogOpen(false) }

  const handleSubmit = async () => {
    setFormError(null)
    if (!core.email.trim()) { setFormError('Email is required'); return }
    if (!editing && !core.password) { setFormError('Password is required'); return }
    if (!filterIndustry) { setFormError('Pick an industry first'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateUser(editing._id, {
          name: core.name.trim(), isActive: core.isActive,
          password: core.password || undefined,
        })
        showToast('Admin updated')
      } else {
        await createUser({
          name: core.name.trim(), email: core.email.trim().toLowerCase(),
          password: core.password, role: 'admin',
          industryId: filterIndustry, isActive: core.isActive,
        })
        showToast('Admin created')
      }
      setDialogOpen(false); setEditing(null)
      await refreshUsers()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } ; message?: string }
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: AdminUser) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete admin "${row.email}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteUser(row._id)
          showToast('Admin deleted')
          await refreshUsers()
        } catch (e) {
          const err = e as { response?: { data?: { message?: string } } }
          showToast(err?.response?.data?.message ?? 'Delete failed', 'error')
        }
      }
    })
  }

  // Intentionally NOT memoized: action handlers (`openEdit`/`remove`) close
  // over `filterIndustry` via `refreshUsers`, so the columns must be rebuilt
  // every render to avoid a stale-closure bug after industry changes.
  const adminCols: GridColDef<AdminUser>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160,
      renderCell: (p) => p.value || <Box sx={{ color: 'text.secondary' }}>—</Box> },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 200 },
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
  ]

  const moduleCols = useMemo<GridColDef<Screen>[]>(() => [
    { field: 'name', headerName: 'Module', flex: 1, minWidth: 160,
      renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{String(p.value)}</Box> },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 200,
      valueGetter: (_v, row) => row.description || row.key,
      renderCell: (p) => <Box sx={{ color: 'text.secondary' }}>{String(p.value)}</Box> },
    { field: '__access', headerName: 'Access', sortable: false, filterable: false, disableColumnMenu: true,
      align: 'right', headerAlign: 'right', width: 120,
      renderCell: (p) => moduleSaving[p.row._id] ? (
        <CircularProgress size={18} />
      ) : (
        <Switch checked={!!moduleAccess[p.row._id]}
          onChange={(e) => void toggleModule(p.row, e.target.checked)} />
      ),
    },
  ], [moduleAccess, moduleSaving]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<LockIcon />}>
          Only SuperAdmin users can manage admin roles.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', overflowY: 'auto' }}>
      <AppCard
        title="Admin Roles"
        subtitle="Manage the admins who run each organization, and which modules they can access."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!filterIndustry}>
            Add Admin
          </Button>
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5 }}>
          <TextField select size="small" label="Organization (Industry)"
            value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            {industries.map((i) => (
              <MenuItem key={i._id} value={i.code}>{i.name} ({i.code})</MenuItem>
            ))}
          </TextField>
        </Stack>

        <AppDataGrid
          height="55vh"
          rows={items}
          columns={adminCols}
          loading={loading}
          getRowId={(r) => r._id}
        />
      </AppCard>

      <Box sx={{ mt: 3 }}>
        <AppCard
          title="Module Access for Admins"
          subtitle="Toggle which modules admins of this organization can use. Turning a module on grants admins access to all of its fields; turning it off revokes them."
        >
          {!adminRole ? (
            <Alert severity="info">
              No "admin" role is configured for this organization yet. Create it in
              Users → Roles & Permissions before assigning module access.
            </Alert>
          ) : (
            <AppDataGrid
              height="55vh"
              rows={screens}
              columns={moduleCols}
              loading={permsLoading}
              getRowId={(r) => r._id}
            />
          )}
        </AppCard>
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? `Edit Admin — ${editing.email}` : 'New Admin'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Name" value={core.name}
              onChange={(e) => setCore({ ...core, name: e.target.value })} fullWidth />
            <TextField size="small" label="Email *" type="email" value={core.email}
              onChange={(e) => setCore({ ...core, email: e.target.value })}
              disabled={!!editing} fullWidth />
            <InputField
              label={editing ? 'New Password (leave blank to keep)' : 'Password *'}
              type="password" value={core.password}
              onChange={(e) => setCore({ ...core, password: e.target.value })} />
            <TextField select size="small" label="Status"
              value={core.isActive ? 'active' : 'inactive'}
              onChange={(e) => setCore({ ...core, isActive: e.target.value === 'active' })} fullWidth>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Role is fixed to <strong>admin</strong> for this organization
              ({currentIndustry?.name ?? filterIndustry}).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Create Admin'}
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
