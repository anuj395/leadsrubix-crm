/**
 * Users → Roles & Permissions
 *
 * Tab 1 — Roles: per-industry CRUD over the `roles` collection.
 * Tab 2 — Field Configuration: pick a role, manage which dynamic fields
 *         (on the `users` screen) it exposes on the Add/Edit User form.
 *         SuperAdmin can also create/delete fields entirely from here so
 *         no Configuration trip is needed.
 */
import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'

import { useAuth } from '@/hooks/useAuth'
import { AppCard } from '@/components/ui/AppCard'
import {
  getIndustries,
  getRoles,
  createRoleRecord,
  updateRoleRecord,
  deleteRoleRecord,
  type Industry,
  type AdminRole,
} from '@/services/sidebarAdminService'
import {
  getScreens,
  getScreenFields,
  createScreenField,
  updateScreenField,
  deleteScreenField,
  getScreenPermissions,
  bulkSetScreenPermissions,
  SCREEN_FIELD_TYPES,
  DROPDOWN_SOURCES,
  type Screen,
  type ScreenField,
  type ScreenFieldType,
  type DropdownSource,
} from '@/services/screenAdminService'
import {
  listRoleActionPermissions,
  upsertRoleActionPermission,
  type RoleActionPermission,
} from '@/services/roleActionPermissionsService'
import Checkbox from '@mui/material/Checkbox'
import { useConfirm } from '@/components/common/ConfirmContext'

const ROLE_KEYS = ['admin', 'leadManager', 'teamLead', 'sales']

type ToastSev = 'success' | 'error'

interface RoleFormState {
  _id?: string
  industryId: string
  key: string
  name: string
  description: string
  isActive: boolean
}

const emptyRoleForm: RoleFormState = {
  industryId: '',
  key: '',
  name: '',
  description: '',
  isActive: true,
}

interface FieldFormState {
  _id?: string
  field_key: string
  label: string
  type: ScreenFieldType
  is_required: boolean
  is_table_visible: boolean
  is_form_visible: boolean
  order: number
  dropdown_source: DropdownSource
  dropdown_api: string
  options: string
}

const emptyFieldForm: FieldFormState = {
  field_key: '',
  label: '',
  type: 'text',
  is_required: false,
  is_table_visible: true,
  is_form_visible: true,
  order: 0,
  dropdown_source: 'none',
  dropdown_api: '',
  options: '',
}

export default function RolesAndPermissionsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const [tab, setTab] = useState<0 | 1 | 2>(0)
  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: ToastSev }>({
    open: false, msg: '', sev: 'success',
  })
  const showToast = (msg: string, sev: ToastSev = 'success') =>
    setToast({ open: true, msg, sev })

  // ── Shared state ──────────────────────────────────────────────────────────
  const [industries, setIndustries] = useState<Industry[]>([])
  const [filterIndustry, setFilterIndustry] = useState<string>('') // industry _id
  const [roles, setRoles] = useState<AdminRole[]>([])

  // ── Roles tab state ───────────────────────────────────────────────────────
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm)
  const [roleSaving, setRoleSaving] = useState(false)

  // ── Field config tab state ────────────────────────────────────────────────
  const [usersScreen, setUsersScreen] = useState<Screen | null>(null)
  const [fields, setFields] = useState<ScreenField[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [enabledFieldIds, setEnabledFieldIds] = useState<Set<string>>(new Set())
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [permsLoading, setPermsLoading] = useState(false)
  const [permsSaving, setPermsSaving] = useState(false)
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm)
  const [fieldSaving, setFieldSaving] = useState(false)

  // ── Action permissions tab state ──────────────────────────────────────────
  const [actionRoleId, setActionRoleId] = useState<string>('')
  const [allScreens, setAllScreens] = useState<Screen[]>([])
  const [actionRows, setActionRows] = useState<RoleActionPermission[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSaving, setActionSaving] = useState<string | null>(null) // screen_id being saved

  // ── Initial loads ─────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const [inds, screens] = await Promise.all([getIndustries(), getScreens()])
        setIndustries(inds)
        if (!filterIndustry) {
          const realEstate = inds.find((i) => i.code === 'temp0001')
          if (realEstate) setFilterIndustry(realEstate._id)
          else if (inds[0]) setFilterIndustry(inds[0]._id)
        }
        setAllScreens(screens.filter((s) => s.isActive))
        const u = screens.find((s) => s.key === 'users')
        if (!u) {
          showToast('The "users" screen has not been seeded yet', 'error')
        } else {
          setUsersScreen(u)
        }
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        showToast(err?.response?.data?.message ?? 'Failed to bootstrap', 'error')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Roles list (drives both tabs) ─────────────────────────────────────────
  useEffect(() => {
    if (!filterIndustry) { setRoles([]); return }
    let cancelled = false
    setRolesLoading(true)
    void (async () => {
      try {
        const list = await getRoles(filterIndustry)
        if (cancelled) return
        setRoles(list)
        // Default the role selector on the field tab.
        if (!selectedRoleId && list[0]) setSelectedRoleId(list[0]._id)
        // Default the role selector on the action tab to leadManager.
        const leadManagerRole = list.find((r) => r.key === 'leadManager')
        const currentSelectedRoleStillExists = list.some((r) => r._id === actionRoleId)
        if (!actionRoleId || !currentSelectedRoleStillExists) {
          if (leadManagerRole) {
            setActionRoleId(leadManagerRole._id)
          } else if (list[0]) {
            setActionRoleId(list[0]._id)
          }
        }
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!cancelled) showToast(err?.response?.data?.message ?? 'Failed to load roles', 'error')
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterIndustry])

  // ── Fields list (from the 'users' screen) ────────────────────────────────
  const refreshFields = async () => {
    if (!usersScreen) return
    setFieldsLoading(true)
    try {
      const list = await getScreenFields(usersScreen._id)
      setFields(list.sort((a, b) => a.order - b.order))
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to load fields', 'error')
    } finally {
      setFieldsLoading(false)
    }
  }
  useEffect(() => { void refreshFields() }, [usersScreen])

  // ── Per-role enabled field set ────────────────────────────────────────────
  useEffect(() => {
    if (!usersScreen || !selectedRoleId || !filterIndustry) {
      setEnabledFieldIds(new Set())
      return
    }
    let cancelled = false
    setPermsLoading(true)
    void (async () => {
      try {
        const perms = await getScreenPermissions({
          screen_id: usersScreen._id,
          roleId: selectedRoleId,
          industryId: filterIndustry,
          enabledOnly: true,
        })
        if (cancelled) return
        setEnabledFieldIds(new Set(perms.map((p) => String(p.field_id))))
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!cancelled) showToast(err?.response?.data?.message ?? 'Failed to load permissions', 'error')
      } finally {
        if (!cancelled) setPermsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [usersScreen, selectedRoleId, filterIndustry])

  // ── Roles CRUD handlers ───────────────────────────────────────────────────
  const openRoleCreate = () => {
    setRoleForm({ ...emptyRoleForm, industryId: filterIndustry })
    setRoleDialogOpen(true)
  }
  const openRoleEdit = (r: AdminRole) => {
    setRoleForm({
      _id: r._id,
      industryId: r.industryId,
      key: r.key,
      name: r.name,
      description: r.description ?? '',
      isActive: r.isActive,
    })
    setRoleDialogOpen(true)
  }
  const saveRole = async () => {
    if (!roleForm.industryId || !roleForm.key || !roleForm.name.trim()) {
      showToast('Industry, key and name are required', 'error'); return
    }
    setRoleSaving(true)
    try {
      if (roleForm._id) {
        await updateRoleRecord(roleForm._id, {
          key: roleForm.key,
          name: roleForm.name,
          description: roleForm.description,
          isActive: roleForm.isActive,
        })
      } else {
        await createRoleRecord({
          industryId: roleForm.industryId,
          key: roleForm.key,
          name: roleForm.name,
          description: roleForm.description,
          isActive: roleForm.isActive,
        })
      }
      setRoleDialogOpen(false)
      showToast('Saved')
      const list = await getRoles(filterIndustry)
      setRoles(list)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setRoleSaving(false)
    }
  }
  const removeRole = async (r: AdminRole) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete role "${r.name}" (${r.key})? This cascades to its sidebar and screen permissions. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteRoleRecord(r._id)
          showToast('Deleted')
          const list = await getRoles(filterIndustry)
          setRoles(list)
          if (selectedRoleId === r._id) setSelectedRoleId(list[0]?._id ?? '')
        } catch (e) {
          const err = e as { response?: { data?: { message?: string } } }
          showToast(err?.response?.data?.message ?? 'Delete failed', 'error')
        }
      }
    })
  }

  // ── Field permission handlers ─────────────────────────────────────────────
  const togglePerm = (fieldId: string) => {
    setEnabledFieldIds((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId); else next.add(fieldId)
      return next
    })
  }
  const savePerms = async () => {
    if (!usersScreen || !selectedRoleId || !filterIndustry) return
    setPermsSaving(true)
    try {
      await bulkSetScreenPermissions({
        screen_id: usersScreen._id,
        roleId: selectedRoleId,
        industryId: filterIndustry,
        field_ids: Array.from(enabledFieldIds),
      })
      showToast('Permissions saved')
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setPermsSaving(false)
    }
  }

  // ── Field CRUD ────────────────────────────────────────────────────────────
  const openFieldCreate = () => {
    setFieldForm({ ...emptyFieldForm, order: fields.length + 1 })
    setFieldDialogOpen(true)
  }
  const openFieldEdit = (f: ScreenField) => {
    setFieldForm({
      _id: f._id,
      field_key: f.field_key,
      label: f.label,
      type: f.type,
      is_required: f.is_required,
      is_table_visible: f.is_table_visible,
      is_form_visible: f.is_form_visible,
      order: f.order,
      dropdown_source: f.dropdown_source,
      dropdown_api: f.dropdown_api,
      options: (f.options || []).join(', '),
    })
    setFieldDialogOpen(true)
  }
  const saveField = async () => {
    if (!usersScreen) return
    if (!fieldForm.field_key.trim() || !fieldForm.label.trim()) {
      showToast('Key and label are required', 'error'); return
    }
    setFieldSaving(true)
    try {
      const payload = {
        screen_id: usersScreen._id,
        field_key: fieldForm.field_key.trim(),
        label: fieldForm.label.trim(),
        type: fieldForm.type,
        is_required: fieldForm.is_required,
        is_table_visible: fieldForm.is_table_visible,
        is_form_visible: fieldForm.is_form_visible,
        order: Number(fieldForm.order) || 0,
        dropdown_source: fieldForm.type === 'select' ? fieldForm.dropdown_source : 'none' as DropdownSource,
        dropdown_api: fieldForm.type === 'select' && fieldForm.dropdown_source === 'api'
          ? fieldForm.dropdown_api.trim()
          : '',
        options: fieldForm.type === 'select' && fieldForm.dropdown_source === 'static'
          ? fieldForm.options.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }
      if (fieldForm._id) {
        await updateScreenField(fieldForm._id, payload)
      } else {
        await createScreenField(payload)
      }
      setFieldDialogOpen(false)
      showToast('Saved')
      await refreshFields()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setFieldSaving(false)
    }
  }
  const removeField = async (f: ScreenField) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete field "${f.label}" (${f.field_key})? This removes it from every role's user form. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteScreenField(f._id)
          showToast('Deleted')
          await refreshFields()
        } catch (e) {
          const err = e as { response?: { data?: { message?: string } } }
          showToast(err?.response?.data?.message ?? 'Delete failed', 'error')
        }
      }
    })
  }

  // ── Action permissions: load rows whenever role/industry change ──────────
  useEffect(() => {
    if (!actionRoleId || !filterIndustry) { setActionRows([]); return }
    let cancelled = false
    setActionLoading(true)
    void (async () => {
      try {
        const list = await listRoleActionPermissions({
          roleId: actionRoleId,
          industryId: filterIndustry,
        })
        if (!cancelled) setActionRows(list)
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!cancelled) showToast(err?.response?.data?.message ?? 'Failed to load action permissions', 'error')
      } finally {
        if (!cancelled) setActionLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [actionRoleId, filterIndustry])

  const actionByScreen = useMemo(() => {
    const m = new Map<string, RoleActionPermission>()
    for (const r of actionRows) m.set(String(r.screen_id), r)
    return m
  }, [actionRows])

  const selectedRoleObj = useMemo(
    () => roles.find((r) => r._id === actionRoleId) ?? null,
    [roles, actionRoleId],
  )
  const isPrivilegedRole =
    selectedRoleObj?.key === 'superAdmin' || selectedRoleObj?.key === 'admin'

  const toggleAction = async (
    screen_id: string,
    action: 'view' | 'add' | 'edit' | 'delete',
  ) => {
    if (!actionRoleId || !filterIndustry || isPrivilegedRole) return
    const cur = actionByScreen.get(screen_id)
    const next = {
      can_view:   cur?.can_view   ?? false,
      can_add:    cur?.can_add    ?? false,
      can_edit:   cur?.can_edit   ?? false,
      can_delete: cur?.can_delete ?? false,
    }
    next[`can_${action}` as const] = !next[`can_${action}` as const]
    setActionSaving(screen_id)
    try {
      const saved = await upsertRoleActionPermission({
        roleId: actionRoleId,
        industryId: filterIndustry,
        screen_id,
        ...next,
      })
      setActionRows((prev) => {
        const without = prev.filter((p) => String(p.screen_id) !== String(screen_id))
        return [...without, saved]
      })
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setActionSaving(null)
    }
  }

  const industryById = useMemo(
    () => new Map(industries.map((i) => [i._id, i])),
    [industries],
  )

  const rolesColumns = useMemo<GridColDef<AdminRole>[]>(
    () => [
      { field: 'key', headerName: 'Key', flex: 1, renderCell: (p) => <code>{p.value}</code> },
      { field: 'name', headerName: 'Display Name', flex: 1.2 },
      { field: 'description', headerName: 'Description', flex: 1.5, renderCell: (p) => p.value || '—' },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: (p) => (
          <StatusBadge value={p.value ? 'Active' : 'Inactive'} />
        ),
      },
      {
        field: '__actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        width: 110,
        renderCell: (p) => {
          const isSuperAdminRole = p.row.key === 'superAdmin'
          return (
            <>
              <IconButton size="small" onClick={() => openRoleEdit(p.row)} disabled={isSuperAdminRole}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => void removeRole(p.row)} disabled={isSuperAdminRole}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )
        },
      },
    ],
    [openRoleEdit, removeRole],
  )

  const fieldsColumns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      { field: 'order', headerName: 'Order', width: 90, type: 'number' },
      { field: 'field_key', headerName: 'Key', flex: 1, renderCell: (p) => <code>{p.value}</code> },
      { field: 'label', headerName: 'Label', flex: 1.2 },
      { field: 'type', headerName: 'Type', width: 110, renderCell: (p) => <StatusBadge value={p.value} hideDot /> },
      {
        field: 'is_required',
        headerName: 'Required',
        width: 100,
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'dropdown_source',
        headerName: 'Source',
        flex: 1.5,
        valueGetter: (_, row) => {
          if (row.type !== 'select') return '—'
          if (row.dropdown_source === 'api') return `api (${row.dropdown_api})`
          if (row.dropdown_source === 'static') return `static (${(row.options || []).length})`
          return 'none'
        },
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
            <IconButton size="small" onClick={() => openFieldEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => removeField(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        ),
      },
    ],
    [openFieldEdit, removeField],
  )

  const actionsColumns = useMemo<GridColDef<Screen>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Module',
        flex: 1.5,
        renderCell: (p) => {
          const s = p.row
          const busy = actionSaving === s._id
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{s.name || s.key}</span>
              <Box component="code" sx={{ color: 'text.secondary', fontSize: '0.85em' }}>
                ({s.key})
              </Box>
              {busy && <CircularProgress size={14} />}
            </Stack>
          )
        },
      },
      ...(['view', 'add', 'edit', 'delete'] as const).map((a) => ({
        field: `can_${a}`,
        headerName: a.charAt(0).toUpperCase() + a.slice(1),
        width: 100,
        align: 'center' as const,
        headerAlign: 'center' as const,
        sortable: false,
        filterable: false,
        renderCell: (p: GridRenderCellParams<Screen>) => {
          const s = p.row
          const row = actionByScreen.get(s._id)
          const busy = actionSaving === s._id
          return (
            <Checkbox
              size="small"
              checked={!!row?.[`can_${a}` as const]}
              disabled={busy || isPrivilegedRole}
              onChange={() => toggleAction(s._id, a)}
            />
          )
        },
      })),
    ],
    [actionByScreen, actionSaving, isPrivilegedRole, toggleAction],
  )

  const perRoleColumns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      {
        field: 'order',
        headerName: 'Order',
        width: 80,
        type: 'number',
      },
      {
        field: 'field_key',
        headerName: 'Field Key',
        flex: 1,
        renderCell: (p) => <code>{p.value}</code>,
      },
      {
        field: 'label',
        headerName: 'Display Label',
        flex: 1.2,
      },
      {
        field: 'type',
        headerName: 'Field Type',
        width: 120,
        renderCell: (p) => <StatusBadge value={p.value} hideDot />,
      },
      {
        field: 'enabled',
        headerName: 'Form Visibility',
        flex: 1,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const f = p.row
          return (
            <Switch
              size="small"
              checked={enabledFieldIds.has(f._id)}
              onChange={() => togglePerm(f._id)}
            />
          )
        },
      },
    ],
    [enabledFieldIds],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', overflowY: 'auto' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Roles" />
        <Tab label="Field Configuration" />
        <Tab label="Action Permissions" />
      </Tabs>

      {/* Industry selector — shared by both tabs */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5 }}>
        <TextField
          select
          size="small"
          label="Industry"
          value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); setSelectedRoleId('') }}
          sx={{ minWidth: 260 }}
        >
          {industries.map((i) => (
            <MenuItem key={i._id} value={i._id}>
              {i.name} ({i.code})
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* ── Tab 1: Roles ───────────────────────────────────────────────────── */}
      {tab === 0 && (
        <AppCard
          title="Roles"
          subtitle="Each user inherits sidebar + dynamic-form permissions from their (industry, role) pair."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openRoleCreate}
              disabled={!filterIndustry}
            >
              Add Role
            </Button>
          }
        >
          {rolesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : roles.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No roles for this industry yet.
            </Typography>
          ) : (
            <AppDataGrid
              height="60vh"
              rows={roles}
              columns={rolesColumns}
              loading={rolesLoading}
              getRowId={(r) => r._id}
            />
          )}
        </AppCard>
      )}

      {/* ── Tab 2: Field Configuration ────────────────────────────────────── */}
      {tab === 1 && (
        <Stack spacing={2}>
          <AppCard
            title="User Form Fields"
            subtitle="Master catalog of dynamic fields shown on Add/Edit User. Per-role visibility is configured below."
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openFieldCreate}
                disabled={!usersScreen}
              >
                Add Field
              </Button>
            }
          >
            {fieldsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : fields.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No dynamic fields yet — click "Add Field" to define one.
              </Typography>
            ) : (
              <AppDataGrid
                height="60vh"
                rows={fields}
                columns={fieldsColumns}
                loading={fieldsLoading}
                getRowId={(r) => r._id}
                initialState={{
                  sorting: {
                    sortModel: [{ field: 'order', sort: 'asc' }],
                  },
                }}
              />
            )}
          </AppCard>

          <AppCard
            title="Per-Role Visibility"
            subtitle="Pick a role to control which fields appear on that role's Add/Edit User form."
            action={
              <Button
                variant="contained"
                onClick={savePerms}
                disabled={!selectedRoleId || permsSaving}
              >
                {permsSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Permissions'}
              </Button>
            }
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5 }}>
              <TextField
                select
                size="small"
                label="Role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                sx={{ minWidth: 260 }}
                disabled={roles.length === 0}
              >
                {roles.map((r) => (
                  <MenuItem key={r._id} value={r._id}>{r.name} ({r.key})</MenuItem>
                ))}
              </TextField>
            </Stack>

            {permsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !selectedRoleId ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Select a role to configure its visible fields.
              </Typography>
            ) : fields.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No fields to assign yet.
              </Typography>
            ) : (
              <AppDataGrid
                height="45vh"
                rows={fields}
                columns={perRoleColumns}
                loading={permsLoading}
                getRowId={(f) => f._id}
              />
            )}
          </AppCard>
        </Stack>
      )}

      {/* ── Tab 3: Action Permissions ─────────────────────────────────────── */}
      {tab === 2 && (
        <AppCard
          title="Action Permissions"
          subtitle="Pick a role to grant View / Add / Edit / Delete on each module. SuperAdmin and admin always have full access."
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5 }}>
            <TextField
              select
              size="small"
              label="Role"
              value={actionRoleId}
              onChange={(e) => setActionRoleId(e.target.value)}
              sx={{ minWidth: 260 }}
              disabled={roles.length === 0}
            >
              {roles.filter((r) => isSuperAdmin || r.key !== 'admin').map((r) => (
                <MenuItem key={r._id} value={r._id}>{r.name} ({r.key})</MenuItem>
              ))}
            </TextField>
          </Stack>

          {!actionRoleId ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Select a role to configure its action permissions.
            </Typography>
          ) : isPrivilegedRole ? (
            <Alert severity="info">
              The "{selectedRoleObj?.key}" role has implicit full access on every module — no per-screen configuration is needed or applied.
            </Alert>
          ) : actionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : allScreens.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No active modules.
            </Typography>
          ) : (
            <AppDataGrid
              height="60vh"
              rows={allScreens}
              columns={actionsColumns}
              loading={actionLoading}
              getRowId={(r) => r._id}
            />
          )}
        </AppCard>
      )}

      {/* ── Role create/edit dialog ──────────────────────────────────────── */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{roleForm._id ? 'Edit Role' : 'New Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Industry"
              value={roleForm.industryId}
              onChange={(e) => setRoleForm({ ...roleForm, industryId: e.target.value })}
              disabled={!!roleForm._id}
              fullWidth
            >
              {industries.map((i) => (
                <MenuItem key={i._id} value={i._id}>
                  {i.name} ({i.code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Role Key"
              value={roleForm.key}
              onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
              disabled={!!roleForm._id}
              fullWidth
              helperText="Must match user.role values used in the app"
            >
              {ROLE_KEYS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </TextField>
            <TextField
              label="Display Name"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={roleForm.isActive}
                  onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRole} disabled={roleSaving}>
            {roleSaving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Field create/edit dialog ─────────────────────────────────────── */}
      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{fieldForm._id ? 'Edit Field' : 'New Field'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Field Key"
              value={fieldForm.field_key}
              onChange={(e) => setFieldForm({ ...fieldForm, field_key: e.target.value })}
              disabled={!!fieldForm._id}
              fullWidth
              helperText="Snake_case identifier — used as the JSON key in user records"
            />
            <TextField
              label="Label"
              value={fieldForm.label}
              onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Type"
              value={fieldForm.type}
              onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value as ScreenFieldType })}
              fullWidth
            >
              {SCREEN_FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            {fieldForm.type === 'select' && (
              <>
                <TextField
                  select
                  label="Dropdown Source"
                  value={fieldForm.dropdown_source}
                  onChange={(e) => setFieldForm({ ...fieldForm, dropdown_source: e.target.value as DropdownSource })}
                  fullWidth
                >
                  {DROPDOWN_SOURCES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                {fieldForm.dropdown_source === 'api' && (
                  <TextField
                    label="Dropdown API URL"
                    value={fieldForm.dropdown_api}
                    onChange={(e) => setFieldForm({ ...fieldForm, dropdown_api: e.target.value })}
                    fullWidth
                    helperText='e.g. /api/options/departments — relative URLs hit your API server'
                  />
                )}
                {fieldForm.dropdown_source === 'static' && (
                  <TextField
                    label="Static Options"
                    value={fieldForm.options}
                    onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                    fullWidth
                    helperText="Comma-separated values"
                  />
                )}
              </>
            )}
            <TextField
              label="Order"
              type="number"
              value={fieldForm.order}
              onChange={(e) => setFieldForm({ ...fieldForm, order: Number(e.target.value) })}
              fullWidth
            />
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={fieldForm.is_required} onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })} />}
                label="Required"
              />
              <FormControlLabel
                control={<Switch checked={fieldForm.is_form_visible} onChange={(e) => setFieldForm({ ...fieldForm, is_form_visible: e.target.checked })} />}
                label="Form"
              />
              <FormControlLabel
                control={<Switch checked={fieldForm.is_table_visible} onChange={(e) => setFieldForm({ ...fieldForm, is_table_visible: e.target.checked })} />}
                label="Table"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveField} disabled={fieldSaving}>
            {fieldSaving ? <CircularProgress size={18} /> : 'Save'}
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
