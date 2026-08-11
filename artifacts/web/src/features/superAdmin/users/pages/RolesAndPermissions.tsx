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
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
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
import { api } from '@/services/api'



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
  fieldKey: string
  label: string
  type: ScreenFieldType
  isRequired: boolean
  isTableVisible: boolean
  isFormVisible: boolean
  order: number
  dropdownSource: DropdownSource
  dropdownApi: string
  options: string
}

const emptyFieldForm: FieldFormState = {
  fieldKey: '',
  label: '',
  type: 'text',
  isRequired: false,
  isTableVisible: true,
  isFormVisible: true,
  order: 0,
  dropdownSource: 'none',
  dropdownApi: '',
  options: '',
}

export default function RolesAndPermissionsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const [activeTabId, setActiveTabId] = useState<string>('roles')
  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: ToastSev }>({
    open: false, msg: '', sev: 'success',
  })
  const showToast = (msg: string, sev: ToastSev = 'success') =>
    setToast({ open: true, msg, sev })

  // Shared Super Admin Scope Context
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const filterIndustry = selectedIndustry
  const setFilterIndustry = setSelectedIndustry

  const [roleKeys, setRoleKeys] = useState<{ _id: string; value: string; label: string }[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('role-keys')
        setRoleKeys(res.data?.items || res.data || [])
      } catch {
        // Fallback
      }
    })()
  }, [])

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
  const [actionSaving, setActionSaving] = useState<string | null>(null) // screenId being saved

  // ── Permission Fields (Field-level config) inside Tab 3 ──────────────────
  const [selectedScreenForPerms, setSelectedScreenForPerms] = useState<Screen | null>(null)
  const [permFields, setPermFields] = useState<ScreenField[]>([])
  const [permFieldsLoading, setPermFieldsLoading] = useState(false)
  const [enabledPermFieldIds, setEnabledPermFieldIds] = useState<Set<string>>(new Set())
  const [permFieldsSaving, setPermFieldsSaving] = useState(false)

  // ── Initial loads ─────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const screens = await getScreens(selectedOrg)
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
  }, [selectedOrg])

  // ── Roles list (drives both tabs) ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedIndustry || !selectedOrg) {
      setRoles([])
      setRolesLoading(false)
      return
    }
    let cancelled = false
    setRolesLoading(true)
    void (async () => {
      try {
        const list = await getRoles(selectedIndustry, selectedOrg)
        if (cancelled) return
        setRoles(list)
        // Default the role selector on the field tab.
        const visibleRoles = list.filter((r) => r.key !== 'admin')
        const currentSelectedRoleExists = visibleRoles.some((r) => r._id === selectedRoleId)
        if (!selectedRoleId || !currentSelectedRoleExists) {
          if (visibleRoles[0]) setSelectedRoleId(visibleRoles[0]._id)
          else setSelectedRoleId('')
        }
        // Default the role selector on the action tab to leadManager.
        const leadManagerRole = list.find((r) => r.key === 'leadManager')
        const currentActionRoleExists = list.some((r) => r._id === actionRoleId)
        if (!actionRoleId || !currentActionRoleExists) {
          if (leadManagerRole) {
            setActionRoleId(leadManagerRole._id)
          } else if (list[0]) {
            setActionRoleId(list[0]._id)
          } else {
            setActionRoleId('')
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
  }, [selectedIndustry, selectedOrg])

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
    if (!usersScreen) {
      setEnabledFieldIds(new Set())
      return
    }
    const activeSet = new Set(
      fields.filter((f) => f.isFormVisible !== false && (f as any).is_form_visible !== false).map((f) => String(f._id))
    )
    setEnabledFieldIds(activeSet)
  }, [usersScreen, fields])



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
          organizationId: selectedOrg || undefined,
          key: roleForm.key,
          name: roleForm.name,
          description: roleForm.description,
          isActive: roleForm.isActive,
        })
      }
      setRoleDialogOpen(false)
      showToast('Saved')
      const list = await getRoles(selectedIndustry, selectedOrg)
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
          const list = await getRoles(selectedIndustry, selectedOrg)
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
    if (!usersScreen) return
    setPermsSaving(true)
    try {
      await Promise.all(
        fields.map((f) =>
          api.put(`screen-fields/${f._id}`, {
            isFormVisible: enabledFieldIds.has(f._id),
            is_form_visible: enabledFieldIds.has(f._id),
          })
        )
      )
      showToast('Field visibility saved successfully')
      await refreshFields()
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
      fieldKey: f.fieldKey || f.field_key || '',
      label: f.label,
      type: f.type,
      isRequired: f.isRequired !== undefined ? f.isRequired : !!f.is_required,
      isTableVisible: f.isTableVisible !== undefined ? f.isTableVisible : !!f.is_table_visible,
      isFormVisible: f.isFormVisible !== undefined ? f.isFormVisible : !!f.is_form_visible,
      order: f.order,
      dropdownSource: f.dropdownSource || f.dropdown_source || 'none',
      dropdownApi: f.dropdownApi || f.dropdown_api || '',
      options: (f.options || []).join(', '),
    })
    setFieldDialogOpen(true)
  }
  const saveField = async () => {
    if (!usersScreen) return
    if (!fieldForm.fieldKey.trim() || !fieldForm.label.trim()) {
      showToast('Key and label are required', 'error'); return
    }
    setFieldSaving(true)
    try {
      const payload = {
        screenId: usersScreen._id,
        fieldKey: fieldForm.fieldKey.trim(),
        field_key: fieldForm.fieldKey.trim(),
        label: fieldForm.label.trim(),
        type: fieldForm.type,
        isRequired: fieldForm.isRequired,
        is_required: fieldForm.isRequired,
        isTableVisible: fieldForm.isTableVisible,
        is_table_visible: fieldForm.isTableVisible,
        isFormVisible: fieldForm.isFormVisible,
        is_form_visible: fieldForm.isFormVisible,
        order: Number(fieldForm.order) || 0,
        dropdownSource: fieldForm.type === 'select' ? fieldForm.dropdownSource : ('none' as DropdownSource),
        dropdown_source: fieldForm.type === 'select' ? fieldForm.dropdownSource : ('none' as DropdownSource),
        dropdownApi: fieldForm.type === 'select' && fieldForm.dropdownSource === 'api'
          ? fieldForm.dropdownApi.trim()
          : '',
        dropdown_api: fieldForm.type === 'select' && fieldForm.dropdownSource === 'api'
          ? fieldForm.dropdownApi.trim()
          : '',
        options: fieldForm.type === 'select' && fieldForm.dropdownSource === 'static'
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
    const key = f.fieldKey || f.field_key
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete field "${f.label}" (${key})? This removes it from every role's user form. This action cannot be undone.`,
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
    if (!actionRoleId || !selectedIndustry) { setActionRows([]); return }
    let cancelled = false
    setActionLoading(true)
    void (async () => {
      try {
        const list = await listRoleActionPermissions({
          roleId: actionRoleId,
          industryId: selectedIndustry,
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
  }, [actionRoleId, selectedIndustry])

  const actionByScreen = useMemo(() => {
    const m = new Map<string, RoleActionPermission>()
    for (const r of actionRows) m.set(String(r.screenId), r)
    return m
  }, [actionRows])

  const selectedRoleObj = useMemo(
    () => roles.find((r) => r._id === actionRoleId) ?? null,
    [roles, actionRoleId],
  )
  const isPrivilegedRole =
    selectedRoleObj?.key === 'superAdmin' || selectedRoleObj?.key === 'admin'

  const toggleAction = async (
    screenId: string,
    action: 'view' | 'add' | 'edit' | 'delete',
  ) => {
    if (!actionRoleId || !selectedIndustry || isPrivilegedRole) return
    const cur = actionByScreen.get(screenId)
    const next = {
      can_view: cur?.can_view ?? false,
      can_add: cur?.can_add ?? false,
      can_edit: cur?.can_edit ?? false,
      can_delete: cur?.can_delete ?? false,
    }
    next[`can_${action}` as const] = !next[`can_${action}` as const]
    setActionSaving(screenId)
    try {
      const saved = await upsertRoleActionPermission({
        roleId: actionRoleId,
        industryId: selectedIndustry,
        screenId,
        ...next,
      })
      setActionRows((prev) => {
        const without = prev.filter((p) => String(p.screenId) !== String(screenId))
        return [...without, saved]
      })
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setActionSaving(null)
    }
  }

  // ── Load permission fields and state for selected module inside Tab 3 ────
  useEffect(() => {
    if (!selectedScreenForPerms || !actionRoleId || !selectedIndustry) {
      setPermFields([])
      setEnabledPermFieldIds(new Set())
      return
    }
    let cancelled = false
    setPermFieldsLoading(true)
    void (async () => {
      try {
        const [fieldsList, existingPerms] = await Promise.all([
          getScreenFields(selectedScreenForPerms._id),
          getScreenPermissions({
            screenId: selectedScreenForPerms._id,
            roleId: actionRoleId,
            industryId: selectedIndustry,
            enabledOnly: true,
          })
        ])
        if (cancelled) return
        setPermFields(fieldsList.sort((a, b) => a.order - b.order))
        setEnabledPermFieldIds(new Set(existingPerms.map((p) => p.fieldId)))
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!cancelled) showToast(err?.response?.data?.message ?? 'Failed to load permissions', 'error')
      } finally {
        if (!cancelled) setPermFieldsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedScreenForPerms, actionRoleId, selectedIndustry])

  const savePermFields = async () => {
    if (!selectedScreenForPerms || !actionRoleId || !selectedIndustry) return
    setPermFieldsSaving(true)
    try {
      await bulkSetScreenPermissions({
        screenId: selectedScreenForPerms._id,
        roleId: actionRoleId,
        industryId: selectedIndustry,
        fieldIds: [...enabledPermFieldIds],
      })
      showToast('Permissions updated')
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Save failed', 'error')
    } finally {
      setPermFieldsSaving(false)
    }
  }

  const togglePermField = (fieldId: string) => {
    setEnabledPermFieldIds((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
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
      { field: 'fieldKey', headerName: 'Key', flex: 1, valueGetter: (_, row) => row.fieldKey || row.field_key, renderCell: (p) => <code>{p.value}</code> },
      { field: 'label', headerName: 'Label', flex: 1.2 },
      { field: 'type', headerName: 'Type', width: 110, renderCell: (p) => <StatusBadge value={p.value} hideDot /> },
      {
        field: 'isRequired',
        headerName: 'Required',
        width: 100,
        valueGetter: (_, row) => (row.isRequired !== undefined ? row.isRequired : row.is_required),
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'isFormVisible',
        headerName: 'Form Visible',
        width: 120,
        valueGetter: (_, row) => (row.isFormVisible !== undefined ? row.isFormVisible : row.is_form_visible),
        renderCell: (p) => (p.value !== false ? 'Yes' : 'No'),
      },
      {
        field: 'isTableVisible',
        headerName: 'Table Visible',
        width: 120,
        valueGetter: (_, row) => (row.isTableVisible !== undefined ? row.isTableVisible : row.is_table_visible),
        renderCell: (p) => (p.value !== false ? 'Yes' : 'No'),
      },
      {
        field: 'dropdownSource',
        headerName: 'Source',
        flex: 1.5,
        valueGetter: (_, row) => {
          if (row.type !== 'select') return '—'
          const src = row.dropdownSource || row.dropdown_source
          const api = row.dropdownApi || row.dropdown_api
          if (src === 'api') return `api (${api})`
          if (src === 'static') return `static (${(row.options || []).length})`
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
            {(isSuperAdmin || user?.role === 'admin') && (
              <IconButton size="small" color="error" onClick={() => removeField(p.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </>
        ),
      },
    ],
    [openFieldEdit, removeField, isSuperAdmin, user],
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
        width: 90,
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
      {
        field: 'permissions',
        headerName: 'Permissions',
        width: 120,
        align: 'center' as const,
        headerAlign: 'center' as const,
        sortable: false,
        filterable: false,
        renderCell: (p: GridRenderCellParams<Screen>) => {
          const s = p.row
          const isSelected = selectedScreenForPerms?._id === s._id
          return (
            <Button
              size="small"
              variant={isSelected ? "contained" : "text"}
              onClick={() => setSelectedScreenForPerms(s)}
              sx={{ py: 0.25, px: 1, minWidth: 0, textTransform: 'none' }}
            >
              Permissions
            </Button>
          )
        },
      },
    ],
    [actionByScreen, actionSaving, isPrivilegedRole, toggleAction, selectedScreenForPerms],
  )

  const permFieldsColumns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      {
        field: 'order',
        headerName: 'Order',
        width: 85,
        type: 'number',
      },
      {
        field: 'fieldKey',
        headerName: 'Field Key',
        flex: 1,
        valueGetter: (_, row) => row.fieldKey || row.field_key,
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
        headerName: 'Access / Visibility',
        width: 150,
        align: 'center' as const,
        headerAlign: 'center' as const,
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const f = p.row
          return (
            <Checkbox
              size="small"
              checked={enabledPermFieldIds.has(f._id)}
              disabled={isPrivilegedRole}
              onChange={() => togglePermField(f._id)}
            />
          )
        },
      },
    ],
    [enabledPermFieldIds, isPrivilegedRole],
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
        field: 'fieldKey',
        headerName: 'Field Key',
        flex: 1,
        valueGetter: (_, row) => row.fieldKey || row.field_key,
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
            <Checkbox
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

  const visibleTabs = useMemo(() => {
    const list = [{ id: 'roles', label: 'Roles' }]
    list.push({ id: 'fields', label: 'Fields Configuration' })
    list.push({ id: 'visibility', label: 'Permission Fields' })
    return list
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs value={activeTabId} onChange={(_, v) => setActiveTabId(v as string)} sx={{ mb: 2, flexShrink: 0 }}>
        {visibleTabs.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>

      {/* Industry + Organization Scope selector */}
      <SuperAdminScopeSelector
        isSuperAdmin={isSuperAdmin}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={(val) => {
          setSelectedIndustry(val)
          setSelectedRoleId('')
          setActionRoleId('')
        }}
        filteredOrgs={filteredOrgs}
        selectedOrg={selectedOrg}
        setSelectedOrg={(val) => {
          setSelectedOrg(val)
          setSelectedRoleId('')
          setActionRoleId('')
        }}
      />

      {/* ── Tab 1: Roles ───────────────────────────────────────────────────── */}
      {activeTabId === 'roles' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppCard
            title="User Roles"
            subtitle="Define security groups and base permissions."
            action={
              isSuperAdmin && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openRoleCreate}
                  disabled={!filterIndustry}
                >
                  New Role
                </Button>
              )
            }
            fullHeight
          >
            {rolesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : roles.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No roles found.
              </Typography>
            ) : (
              <AppDataGrid onReload={refreshFields}
                height="100%"
                rows={roles}
                columns={rolesColumns}
                loading={rolesLoading}
                getRowId={(r) => r._id}
              />
            )}
          </AppCard>
        </Box>
      )}

      {/* ── Tab 2: Fields Configuration ────────────────────────────────────── */}
      {activeTabId === 'fields' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppCard
            title="User Form Fields"
            subtitle="Master catalog of dynamic fields shown on Add/Edit User."
            action={
              (isSuperAdmin || user?.role === 'admin') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openFieldCreate}
                  disabled={!usersScreen}
                >
                  Add Field
                </Button>
              )
            }
            fullHeight
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
              <AppDataGrid onReload={refreshFields}
                height="100%"
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
        </Box>
      )}

      {/* ── Tab 3: Permission Fields ────────────────────────────────────── */}
      {activeTabId === 'visibility' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppCard
            title="Permission Fields"
            subtitle="Configure which fields are visible or hidden in the Add/Edit User form."
            action={
              <Button
                variant="contained"
                onClick={savePerms}
                disabled={permsSaving}
              >
                {permsSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Visibility'}
              </Button>
            }
            fullHeight
          >


            {fields.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No fields to configure yet.
              </Typography>
            ) : (
              <AppDataGrid onReload={refreshFields}
                height="100%"
                rows={fields}
                columns={perRoleColumns}
                loading={fieldsLoading}
                getRowId={(f) => f._id}
              />
            )}

          </AppCard>
        </Box>
      )}

      {/* ── Tab 4: Action Permissions ─────────────────────────────────────── */}
      {activeTabId === 'actions' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppCard
            title="Action Permissions"
            subtitle="Pick a role to grant View / Add / Edit / Delete on each module. SuperAdmin and admin always have full access."
            fullHeight
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5, flexShrink: 0 }}>
              <TextField
                select
                size="small"
                label="Role"
                value={actionRoleId}
                onChange={(e) => {
                  setActionRoleId(e.target.value)
                  setSelectedScreenForPerms(null)
                }}
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
              <AppDataGrid onReload={refreshFields}
                height="100%"
                rows={allScreens}
                columns={actionsColumns}
                loading={actionLoading}
                getRowId={(r) => r._id}
              />
            )}
          </AppCard>
        </Box>
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
              {roleKeys.map((rk) => (
                <MenuItem key={rk.value} value={rk.value}>
                  {rk.label}
                </MenuItem>
              ))}
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
              value={fieldForm.fieldKey}
              onChange={(e) => setFieldForm({ ...fieldForm, fieldKey: e.target.value })}
              disabled={!!fieldForm._id}
              fullWidth
              helperText="camelCase identifier — used as the property key in user records"
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
                  value={fieldForm.dropdownSource}
                  onChange={(e) => setFieldForm({ ...fieldForm, dropdownSource: e.target.value as DropdownSource })}
                  fullWidth
                >
                  {DROPDOWN_SOURCES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                {fieldForm.dropdownSource === 'api' && (
                  <TextField
                    label="Dropdown API URL"
                    value={fieldForm.dropdownApi}
                    onChange={(e) => setFieldForm({ ...fieldForm, dropdownApi: e.target.value })}
                    fullWidth
                    helperText='e.g. /api/options/departments — relative URLs hit your API server'
                  />
                )}
                {fieldForm.dropdownSource === 'static' && (
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
                control={<Switch checked={fieldForm.isRequired} onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })} />}
                label="Required"
              />
              <FormControlLabel
                control={<Switch checked={fieldForm.isFormVisible} onChange={(e) => setFieldForm({ ...fieldForm, isFormVisible: e.target.checked })} />}
                label="Form"
              />
              <FormControlLabel
                control={<Switch checked={fieldForm.isTableVisible} onChange={(e) => setFieldForm({ ...fieldForm, isTableVisible: e.target.checked })} />}
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

      <Dialog
        open={!!selectedScreenForPerms}
        onClose={() => setSelectedScreenForPerms(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          Permission Fields — {selectedScreenForPerms?.name || selectedScreenForPerms?.key}
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Configure field-level visibility permissions for this module.
          </Typography>
          {permFieldsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : permFields.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No dynamic fields are configured for this module.
            </Typography>
          ) : (
            <AppDataGrid onReload={refreshFields}
              height="400px"
              rows={permFields}
              columns={permFieldsColumns}
              loading={permFieldsLoading}
              getRowId={(f) => f._id}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedScreenForPerms(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await savePermFields();
              setSelectedScreenForPerms(null);
            }}
            disabled={permFieldsSaving || isPrivilegedRole}
          >
            {permFieldsSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Fields'}
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
