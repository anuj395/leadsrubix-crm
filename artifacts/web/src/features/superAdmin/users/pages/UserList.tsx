import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import type {
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
  GridRenderCellParams,
} from '@mui/x-data-grid'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { InputField } from '@/components/forms/InputField'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  listUsersPaged,
  createUser,
  updateUser,
  deleteUser,
  listManagerCandidates,
  type AdminUser,
  type ManagerCandidate,
} from '@/services/usersAdminService'
import {
  resolveScreen,
  type ResolvedTableHeader,
} from '@/services/screenAdminService'
import {
  getIndustries,
  getRoles,
  type Industry,
  type AdminRole,
} from '@/services/sidebarAdminService'
import {
  getMyActionPerms,
  type MyActionPerms,
} from '@/services/roleActionPermissionsService'

// Core columns we always want visible regardless of dynamic field config.
const CORE_COLUMNS: ResolvedTableHeader[] = [
  { key: 'organizationName', label: 'Organization Name', type: 'text', sortable: false, order: -110, options: [], visible: true },
  { key: 'name',        label: 'Name',     type: 'text',   sortable: true,  order: -100, options: [], visible: true },
  { key: 'email',       label: 'Email',    type: 'email',  sortable: true,  order: -90,  options: [], visible: true },
  { key: 'role',        label: 'Role',     type: 'badge',  sortable: true,  order: -80,  options: [], visible: true },
  { key: 'isActive',   label: 'Status',   type: 'badge',  sortable: true,  order: -60,  options: [], visible: true },
]

// Sortable columns the API will accept; everything else sorts client-side.
const SERVER_SORTABLE = new Set(['name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'])

interface CoreFormState {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
  industryId: string
  isActive: boolean
  reporting_to: string
}

const emptyCore: CoreFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'sales',
  industryId: '',
  isActive: true,
  reporting_to: '',
}

// Roles that report to someone (so we should show the "Reports To" dropdown).
// superAdmin reports to no one. Mirrors MANAGER_OF on the backend.
const ROLES_WITH_MANAGER = new Set(['sales', 'teamLead', 'leadManager', 'admin'])

export default function UserListPage() {
  const authedUser = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = authedUser?.role === 'superAdmin'

  const [industries, setIndustries] = useState<Industry[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [filterIndustry, setFilterIndustry] = useState<string>('') // industry CODE
  const [items, setItems] = useState<AdminUser[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [dynamicCols, setDynamicCols] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)

  // ── Server-side grid state ─────────────────────────────────────────────
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [core, setCore] = useState<CoreFormState>(emptyCore)
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Manager candidates for the "Reports To" dropdown. Refetched whenever the
  // selected role / industry change while the dialog is open.
  const [managers, setManagers] = useState<ManagerCandidate[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  // Effective per-action permissions for the *current* user on the users module.
  const [perms, setPerms] = useState<MyActionPerms>({
    screen_key: 'users',
    can_view: true, can_add: true, can_edit: true, can_delete: true,
  })
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const p = await getMyActionPerms('users')
        if (!cancelled) setPerms(p)
      } catch {
        // Permissive fallback; server still enforces.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const showToast = (msg: string, sev: 'success' | 'error' = 'success') =>
    setToast({ open: true, msg, sev })

  // ── Load industries (superAdmin can pick); pin filter to user's industry otherwise.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (isSuperAdmin) {
          const list = await getIndustries()
          if (cancelled) return
          setIndustries(list)
          const realEstate = list.find((i) => i.code === 'temp0001')
          const defaultCode = realEstate ? realEstate.code : (list[0]?.code ?? '')
          setFilterIndustry((cur) => cur || defaultCode)
        } else if (authedUser?.industryId) {
          setFilterIndustry(authedUser.industryId)
        }
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        showToast(err?.response?.data?.message ?? 'Failed to load industries', 'error')
      }
    })()
    return () => { cancelled = true }
  }, [isSuperAdmin, authedUser?.industryId])

  // ── Load roles for the selected industry (drives Add User Role dropdown).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!filterIndustry) { setRoles([]); return }
      try {
        const allIndustries = isSuperAdmin
          ? industries
          : await getIndustries().catch(() => [] as Industry[])
        const ind = allIndustries.find((i) => i.code === filterIndustry || i._id === filterIndustry)
        if (!ind) { if (!cancelled) setRoles([]); return }
        const list = await getRoles(ind._id)
        if (cancelled) return
        setRoles(list)
      } catch {
        if (!cancelled) setRoles([])
      }
    })()
    return () => { cancelled = true }
  }, [filterIndustry, industries, isSuperAdmin])

  // ── Load dynamic table columns whenever the industry filter changes ────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const resolved = await resolveScreen({
          screen_key: 'users',
          industry_code: isSuperAdmin ? filterIndustry || undefined : undefined,
          role_key: undefined,
        }).catch(() => null)
        if (cancelled) return
        const coreKeys = new Set(CORE_COLUMNS.map((c) => c.key))
        const dyn = (resolved?.table_headers ?? []).filter((c) => !coreKeys.has(c.key))
        setDynamicCols(dyn)
      } catch {
        if (!cancelled) setDynamicCols([])
      }
    })()
    return () => { cancelled = true }
  }, [filterIndustry, isSuperAdmin])

  // ── Server-paginated user fetch ────────────────────────────────────────
  const refresh = async () => {
    setLoading(true)
    try {
      const sort = sortModel[0]
      const sortField = sort?.field && SERVER_SORTABLE.has(sort.field) ? sort.field : undefined
      const { items: list, total } = await listUsersPaged({
        industryId: undefined,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        q: searchQuery || undefined,
        sortField,
        sortDir: sort?.sort === 'asc' ? 'asc' : sort?.sort === 'desc' ? 'desc' : undefined,
      })
      setItems(list)
      setRowCount(total)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterIndustry, paginationModel.page, paginationModel.pageSize, sortModel, searchQuery])

  // ── Build DataGrid columns from core + dynamic field defs ──────────────
  const allColumns = useMemo(() => {
    const cols = isSuperAdmin
      ? CORE_COLUMNS
      : CORE_COLUMNS.filter((c) => c.key !== 'organizationName')
    return [...cols, ...dynamicCols].sort((a, b) => a.order - b.order)
  }, [dynamicCols, isSuperAdmin])

  const gridColumns = useMemo<GridColDef<AdminUser>[]>(() => {
    const cols: GridColDef<AdminUser>[] = allColumns.map((c) => {
      const isFixed = ['role', 'isActive', 'phone', 'employee_id', 'department', 'designation'].includes(c.key)
      const columnWidthProps = isFixed
        ? { width: c.key === 'role' ? 160 : c.key === 'isActive' ? 130 : 150 }
        : { flex: 1, minWidth: 140 }

      return {
        field: c.key,
        headerName: c.label,
        ...columnWidthProps,
        // We run `sortingMode="server"`, but the API only sorts a fixed set of
        // columns (see SERVER_SORTABLE). Disable sorting for everything else so
        // the header doesn't pretend to sort when it can't.
        sortable: c.sortable !== false && SERVER_SORTABLE.has(c.key),
        // Pull dynamic field values out of `row.fields` since they aren't on the
        // top-level row object.
        valueGetter: (_value, row) => {
          if (c.key in row) return (row as unknown as Record<string, unknown>)[c.key]
          return (row.fields as Record<string, unknown>)?.[c.key]
        },
        renderCell: (params: GridRenderCellParams<AdminUser>) => {
          if (c.key === 'isActive') {
            return <StatusBadge value={params.row.isActive ? 'Active' : 'Inactive'} />
          }
          if (c.key === 'role') return <StatusBadge value={params.row.role} hideDot />
          const v = params.value
          if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
          return String(v)
        },
      }
    })

    cols.push({
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 120,
      renderCell: (params: GridRenderCellParams<AdminUser>) => (
        <>
          {perms.can_edit && (
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {perms.can_delete && (
            <IconButton size="small" color="error" onClick={() => void remove(params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
          {!perms.can_edit && !perms.can_delete && (
            <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
          )}
        </>
      ),
    })

    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColumns, perms.can_edit, perms.can_delete])

  // ── Open dialogs ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setCore({
      ...emptyCore,
      industryId: filterIndustry || authedUser?.industryId || '',
      role: roles[0]?.key || 'sales',
    })
    setDynamicValues({})
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (row: AdminUser) => {
    setEditing(row)
    setCore({
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      email: row.email,
      password: '',
      role: row.role,
      industryId: row.industryId ?? '',
      isActive: row.isActive,
      reporting_to: row.reporting_to ?? '',
    })
    setDynamicValues((row.fields as Record<string, unknown>) ?? {})
    setFormError(null)
    setDialogOpen(true)
  }

  // ── Fetch manager candidates whenever the role/industry changes in the open dialog
  useEffect(() => {
    if (!dialogOpen) return
    if (!ROLES_WITH_MANAGER.has(core.role)) {
      setManagers([])
      return
    }
    let cancelled = false
    setLoadingManagers(true)
    void (async () => {
      try {
        const list = await listManagerCandidates(
          core.role,
          isSuperAdmin ? core.industryId || undefined : undefined,
        )
        if (cancelled) return
        setManagers(list)
        // If the previously-selected manager isn't valid for the new role,
        // clear it so we don't submit a stale UID.
        if (core.reporting_to && !list.some((m) => m._id === core.reporting_to)) {
          setCore((c) => ({ ...c, reporting_to: '' }))
        }
      } catch {
        if (!cancelled) setManagers([])
      } finally {
        if (!cancelled) setLoadingManagers(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, core.role, core.industryId, isSuperAdmin])

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (dynVals: Record<string, unknown>) => {
    setFormError(null)
    if (!core.firstName.trim()) { setFormError('First Name is required'); return }
    if (!core.email.trim()) { setFormError('Email is required'); return }
    if (!editing && !core.password) { setFormError('Password is required for a new user'); return }
    if (!core.role) { setFormError('Role is required'); return }
    if (isSuperAdmin && !core.industryId) { setFormError('Industry is required'); return }

    setSaving(true)
    try {
      // Only send reporting_to when the role can actually have a manager;
      // for superAdmin we explicitly clear any stale value.
      const reporting_to = ROLES_WITH_MANAGER.has(core.role)
        ? core.reporting_to || ''
        : ''
      if (editing) {
        await updateUser(editing._id, {
          firstName: core.firstName.trim(),
          lastName: core.lastName.trim(),
          role: core.role,
          industryId: core.industryId || undefined,
          isActive: core.isActive,
          password: core.password || undefined,
          reporting_to,
          fields: dynVals,
        })
        showToast('User updated')
      } else {
        await createUser({
          firstName: core.firstName.trim(),
          lastName: core.lastName.trim(),
          email: core.email.trim().toLowerCase(),
          password: core.password,
          role: core.role,
          industryId: core.industryId || undefined,
          isActive: core.isActive,
          reporting_to: reporting_to || undefined,
          fields: dynVals,
        })
        showToast('User created')
      }
      setDialogOpen(false)
      setEditing(null)
      await refresh()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } ; message?: string }
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: AdminUser) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete user "${row.email}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteUser(row._id)
          showToast('User deleted')
          await refresh()
        } catch (e) {
          const err = e as { response?: { data?: { message?: string } } }
          showToast(err?.response?.data?.message ?? 'Delete failed', 'error')
        }
      }
    })
  }

  // Quick-filter from the toolbar drives the server-side `q=` param.
  const onFilterModelChange = (m: GridFilterModel) => {
    const q = (m.quickFilterValues ?? []).join(' ').trim()
    if (q !== searchQuery) {
      setSearchQuery(q)
      setPaginationModel((p) => ({ ...p, page: 0 }))
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Users"
        subtitle="Add, edit, and manage users. Per-role custom fields are configured in Users → Roles & Permissions."
        action={
          perms.can_add && !isSuperAdmin ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              Add User
            </Button>
          ) : null
        }
        fullHeight
      >
        <Box sx={{ mb: 1 }} />

        <AppDataGrid
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          onFilterModelChange={onFilterModelChange}
          getRowId={(r) => r._id}
        />
      </AppCard>

      {/* ── Add / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? `Edit User — ${editing.email}` : 'New User'}</DialogTitle>
        <DialogContent dividers>
          <DynamicForm
            screen="users"
            industry_code={isSuperAdmin ? core.industryId : undefined}
            role_key={core.role}
            initialValues={dynamicValues as Record<string, string | number | boolean | null>}

            onSubmit={async (vals) => { await handleSubmit(vals as Record<string, unknown>) }}
            onCancel={closeDialog}
            submitLabel={editing ? 'Save' : 'Create User'}
            headerSlot={
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  Account
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <TextField
                    size="small"
                    label="First Name *"
                    value={core.firstName}
                    onChange={(e) => setCore({ ...core, firstName: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="Last Name"
                    value={core.lastName}
                    onChange={(e) => setCore({ ...core, lastName: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="Email *"
                    type="email"
                    value={core.email}
                    onChange={(e) => setCore({ ...core, email: e.target.value })}
                    disabled={!!editing}
                    fullWidth
                  />
                  <TextField
                    select
                    size="small"
                    label="Role *"
                    value={core.role}
                    onChange={(e) => setCore({ ...core, role: e.target.value })}
                    fullWidth
                    helperText="Form fields below auto-update based on the selected role"
                  >
                    {roles.length === 0 ? (
                      <MenuItem value="sales">sales</MenuItem>
                    ) : (
                      roles.map((r) => (
                        <MenuItem key={r._id} value={r.key}>{r.name} ({r.key})</MenuItem>
                      ))
                    )}
                  </TextField>
                  {isSuperAdmin && (
                    <TextField
                      select
                      size="small"
                      label="Industry *"
                      value={core.industryId}
                      onChange={(e) => setCore({ ...core, industryId: e.target.value })}
                      disabled={!!editing}
                      fullWidth
                    >
                      {industries.map((i) => (
                        <MenuItem key={i._id} value={i.code}>
                          {i.name} ({i.code})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {ROLES_WITH_MANAGER.has(core.role) && (
                    <TextField
                      select
                      size="small"
                      label="Reports To"
                      value={core.reporting_to}
                      onChange={(e) => setCore({ ...core, reporting_to: e.target.value })}
                      fullWidth
                      helperText={
                        loadingManagers
                          ? 'Loading managers…'
                          : managers.length === 0
                          ? 'No eligible manager exists for this role yet'
                          : 'Direct manager (drives lead-visibility hierarchy)'
                      }
                      disabled={loadingManagers || managers.length === 0}
                    >
                      <MenuItem value="">
                        <em>— Unassigned —</em>
                      </MenuItem>
                      {managers.map((m) => (
                        <MenuItem key={m._id} value={m._id}>
                          {m.name} ({m.role})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  Role-specific Fields
                </Typography>
                {formError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError}
                  </Alert>
                )}
              </Box>
            }
          />
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
