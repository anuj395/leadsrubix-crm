import { useEffect, useMemo, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as VpnKeyIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material'
import type {
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
  GridRenderCellParams,
} from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import ChangePasswordModal from '../components/ChangePasswordModal'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import {
  listUsersPaged,
  listUsers,
  deleteUser,
  updateUser,
  type AdminUser,
} from '@/services/usersAdminService'
import {
  resolveScreen,
  type ResolvedTableHeader,
} from '@/services/screenAdminService'
import {
  getIndustries,
  type Industry,
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

export default function UserListPage() {
  const navigate = useNavigate()
  const authedUser = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = authedUser?.role === 'superAdmin'

  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [rowCount, setRowCount] = useState(0)
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map())

  // Shared Super Admin Scope Context
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  // Permissions mapping
  const [perms, setPerms] = useState<MyActionPerms>({
    screen_key: 'users',
    can_view: true,
    can_add: false,
    can_edit: false,
    can_delete: false,
  })

  // Pagination & Sorting state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Dynamic headers resolved from API
  const [resolvedHeaders, setResolvedHeaders] = useState<ResolvedTableHeader[]>([])

  // Modal states
  const [passModalUser, setPassModalUser] = useState<AdminUser | null>(null)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const showToast = (msg: string, sev: 'success' | 'error' = 'success') => {
    setToast({ open: true, msg, sev })
  }



  // Metadata loading simplified via useSuperAdminScope hook

  // Refresh user list and headers
  const refresh = async () => {
    setLoading(true)
    try {
      const activeIndustry = isSuperAdmin
        ? selectedIndustry || undefined
        : authedUser?.industryId

      const activeOrg = isSuperAdmin
        ? selectedOrg || undefined
        : (authedUser as any)?.organizationId || (authedUser as any)?.organization_id

      // 1. Fetch action permissions
      const actionPerms = await getMyActionPerms('users')
      setPerms(actionPerms)

      // 2. Fetch screen metadata
      const resolved = await resolveScreen({
        screen_key: 'users',
        industry_code: activeIndustry,
        role_key: undefined, // resolves roles generally
      })
      setResolvedHeaders(resolved.table_headers)

      // 3. Fetch all users (including admins) to map reporting manager email IDs
      const allUsers = await listUsers(activeIndustry, true, activeOrg)
      const uMap = new Map<string, string>()
      allUsers.forEach((u) => {
        uMap.set(String(u._id), u.email || '')
      })
      setUserMap(uMap)

      // 4. Fetch server paginated data
      const sort = sortModel[0]
      const sortField = sort && SERVER_SORTABLE.has(sort.field) ? sort.field : undefined
      const sortDir = sort?.sort === 'desc' ? 'desc' : 'asc'

      const paged = await listUsersPaged({
        industryId: activeIndustry,
        organizationId: activeOrg,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        q: searchQuery || undefined,
        sortField,
        sortDir,
      })

      setItems(paged.items)
      setRowCount(paged.total)
    } catch (e) {
      showToast('Failed to load users list', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && (!selectedIndustry || !selectedOrg)) return
    void refresh()
  }, [paginationModel, sortModel, searchQuery, selectedIndustry, selectedOrg, isSuperAdmin])

  const { confirmDelete } = useConfirm()

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

  const handleStatusToggle = useCallback(async (row: AdminUser, checked: boolean) => {
    try {
      await updateUser(row._id, { isActive: checked })
      showToast(`User status updated to ${checked ? 'Active' : 'Inactive'}`)
      await refresh()
    } catch (e: any) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message ?? 'Failed to update status', 'error')
    }
  }, [refresh])

  // Combine core and resolved headers to build columns list
  const allColumns = useMemo(() => {
    const headerMap = new Map<string, ResolvedTableHeader>()
    CORE_COLUMNS.forEach((c) => headerMap.set(c.key, c))

    resolvedHeaders.forEach((c) => {
      const keyToUse = c.key
      if (keyToUse === 'firstName' || keyToUse === 'lastName') {
        return
      }
      if (!headerMap.has(keyToUse)) {
        headerMap.set(keyToUse, c)
      } else {
        const core = headerMap.get(keyToUse)!
        headerMap.set(keyToUse, { ...core, order: c.order, visible: c.visible })
      }
    })

    return Array.from(headerMap.values())
      .filter((h) => h.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [resolvedHeaders])

  const gridColumns = useMemo<GridColDef<AdminUser>[]>(() => {
    const cols: GridColDef<AdminUser>[] = allColumns.map((header) => {
      // Hide organization columns (selected at top)
      if (header.key === 'organizationName') {
        return null as any
      }

      const col: GridColDef<AdminUser> = {
        field: header.key as keyof AdminUser,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable !== false,
      }

      if (header.key === 'organizationName') {
        col.flex = 1.3
        col.minWidth = 180
      } else if (header.key === 'name') {
        col.flex = 1.2
        col.minWidth = 160
        col.valueGetter = (_v, row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || '—'
      } else if (header.key === 'reportingTo') {
        col.valueGetter = (_v, row) => {
          const val = row.reportingTo || (row as any).reporting_to
          if (!val) return '—'
          return userMap.get(String(val)) || val
        }
      } else if (header.key === 'isActive' || header.key === 'status') {
        col.minWidth = 180
        col.flex = 1.2
      }

      if (header.type === 'badge' || header.key === 'isActive' || header.key === 'status' || header.key === 'role') {
        col.renderCell = (params: GridRenderCellParams<AdminUser>) => {
          if (header.key === 'isActive' || header.key === 'status') {
            const isAct = params.row.isActive !== false
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  size="small"
                  checked={isAct}
                  disabled={!perms.can_edit}
                  onChange={(e) => handleStatusToggle(params.row, e.target.checked)}
                />
                <StatusBadge value={isAct ? 'ACTIVE' : 'INACTIVE'} />
              </Box>
            )
          }
          return <StatusBadge value={params.value as string} />
        }
      }

      return col
    }).filter(Boolean) as GridColDef<AdminUser>[]

    // Append actions column at the end
    cols.push({
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 150,
      renderCell: (params: GridRenderCellParams<AdminUser>) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
          {perms.can_edit && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => navigate(`/users/${params.row._id}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Change Password">
                <IconButton size="small" color="warning" onClick={() => setPassModalUser(params.row)}>
                  <VpnKeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {perms.can_delete && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => void remove(params.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!perms.can_edit && !perms.can_delete && (
            <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
          )}
        </Stack>
      ),
    })

    return cols
  }, [allColumns, perms.can_edit, perms.can_delete, handleStatusToggle])

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
              onClick={() => navigate('/users/new')}
            >
              Add User
            </Button>
          ) : null
        }
        fullHeight
      >
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />

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
          onReload={refresh}
        />
      </AppCard>

      {passModalUser && (
        <ChangePasswordModal
          open={Boolean(passModalUser)}
          onClose={() => setPassModalUser(null)}
          user={passModalUser}
          onSuccess={refresh}
        />
      )}

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
