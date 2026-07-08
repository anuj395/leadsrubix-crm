import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import type { GridColDef, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import {
  listOrganizationsPaged,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  type Organization,
} from '@/services/organizationsService'
import { resolveScreen, type ResolvedTableHeader } from '@/services/screenAdminService'
import { useAppSelector } from '@/store/hooks'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/common/ConfirmContext'
import { AppModal } from '@/components/common/Modal'
import { api } from '@/services/api'

const SERVER_SORTABLE = new Set(['createdAt', 'updatedAt', 'isActive'])

type FormValue = string | number | boolean | null

function toFormValues(row: Organization): Record<string, FormValue> {
  const out: Record<string, FormValue> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy') continue
    if (v === null) { out[k] = null; continue }
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v as FormValue
  }
  return out
}

export default function OrganizationsListPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = user?.role === 'superAdmin'

  const [items, setItems] = useState<Organization[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [columns, setColumns] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'createdAt', sort: 'desc' }])
  const [search, setSearch] = useState('')
  const [pwdDialog, setPwdDialog] = useState({ open: false, email: '', password: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [industries, setIndustries] = useState<Industry[]>([])
  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const [selectedFilterIndustry, setSelectedFilterIndustry] = useState<string>('')

  useEffect(() => {
    getIndustries(true)
      .then((inds) => {
        setIndustries(inds)
        if (isSuperAdmin) {
          const realEstate = inds.find((i) => i.code === 'temp0001')
          if (realEstate) setSelectedFilterIndustry(realEstate.code)
          else if (inds[0]) setSelectedFilterIndustry(inds[0].code)
        }
      })
      .catch((err) => console.error('Failed to load industries:', err))
  }, [isSuperAdmin])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const sort = sortModel[0]
      const sortField = sort?.field && SERVER_SORTABLE.has(sort.field) ? sort.field : undefined
      const sortDir = sort?.sort === 'asc' ? 'asc' : sort?.sort === 'desc' ? 'desc' : undefined
      const [paged, resolved] = await Promise.all([
        listOrganizationsPaged({
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          q: search || undefined,
          sortField,
          sortDir,
          industryId: isSuperAdmin ? (selectedFilterIndustry || undefined) : undefined,
        }),
        resolveScreen({
          screen_key: 'organization',
          industry_code: isSuperAdmin ? (selectedFilterIndustry || undefined) : undefined,
          role_key: isSuperAdmin ? 'admin' : undefined,
        }).catch(() => ({ table_headers: [] as ResolvedTableHeader[], form_fields: [] })),
      ])
      setItems(paged.items)
      setRowCount(paged.total)
      setColumns(resolved.table_headers ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }, [paginationModel.page, paginationModel.pageSize, sortModel, search, isSuperAdmin, selectedFilterIndustry])

  useEffect(() => { void refresh() }, [refresh])

  const gridColumns = useMemo<GridColDef<Organization>[]>(() => {
    const sorted = [...columns].sort((a, b) => a.order - b.order)
    const dataCols: GridColDef<Organization>[] = sorted.map((c) => ({
      field: c.key,
      headerName: c.label,
      flex: 1,
      minWidth: 140,
      sortable: c.sortable !== false && SERVER_SORTABLE.has(c.key),
      valueGetter: (_v, row) => (row as Record<string, unknown>)[c.key],
      renderCell: (p) => {
        const v = p.value
        const isToggleable = c.key === 'allowDuplicateLeads' || c.key === 'showAnalytics' || c.key === 'status'

        if (isToggleable && isSuperAdmin) {
          const isChecked = c.key === 'status' ? v === 'ACTIVE' : !!v
          return (
            <Switch
              size="small"
              checked={isChecked}
              sx={{
                '& .MuiSwitch-switchBase': {
                  color: '#fff',
                  '&.Mui-checked': {
                    color: '#fff',
                    '& + .MuiSwitch-track': {
                      backgroundColor: '#22c55e',
                      opacity: 1,
                    },
                  },
                },
                '& .MuiSwitch-track': {
                  backgroundColor: '#e0e0e0',
                  opacity: 1,
                },
              }}
              onChange={async (e) => {
                const nextVal = c.key === 'status'
                  ? (e.target.checked ? 'ACTIVE' : 'INACTIVE')
                  : e.target.checked
                try {
                  await updateOrganization(p.row._id, {
                    fields: { ...toFormValues(p.row), [c.key]: nextVal }
                  })
                  setToast({ open: true, msg: `${c.label} updated`, sev: 'success' })
                  await refresh()
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } }
                  setToast({ open: true, msg: err?.response?.data?.message ?? 'Update failed', sev: 'error' })
                }
              }}
            />
          )
        }

        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        const lowerKey = c.key.toLowerCase()
        if (lowerKey === 'isActive' || lowerKey === 'status' || typeof v === 'boolean') {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const actions: GridColDef<Organization> = {
      field: '__actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/organization/${p.row._id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isSuperAdmin && (
            <Tooltip title="Change Password">
              <IconButton size="small" onClick={() => { setPwdDialog({ open: true, email: String(p.row.emailId || p.row.email_id || ''), password: '' }) }}>
                <VpnKeyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isSuperAdmin && (
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  confirmDelete({
                    title: 'Confirm Deletion',
                    message: 'Are you sure you want to delete this organization? This action cannot be undone.',
                    onConfirm: async () => {
                      try {
                        await deleteOrganization(p.row._id)
                        setToast({ open: true, msg: 'Organization deleted', sev: 'success' })
                        await refresh()
                      } catch (e: unknown) {
                        const err = e as { response?: { data?: { message?: string } } }
                        setToast({ open: true, msg: err?.response?.data?.message ?? 'Delete failed', sev: 'error' })
                      }
                    }
                  })
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    }
    return [...dataCols, actions]
  }, [columns, isSuperAdmin, refresh])



  const submitChangePassword = async () => {
    if (!pwdDialog.email || !pwdDialog.password.trim()) {
      setToast({ open: true, msg: 'Password is required', sev: 'error' })
      return
    }
    setSavingPwd(true)
    try {
      await api.post('/users/change-password', {
        email: pwdDialog.email,
        password: pwdDialog.password,
      })
      setToast({ open: true, msg: 'Password changed successfully', sev: 'success' })
      setPwdDialog({ open: false, email: '', password: '' })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to change password', sev: 'error' })
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Organizations"
        subtitle="Organization records. Columns and the Add/Edit form are driven by the Screen Configuration system (screen key: organization)."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/organization/new${selectedFilterIndustry ? `?industry=${selectedFilterIndustry}` : ''}`)}>
            Add Organization
          </Button>
        }
        fullHeight
      >
        {isSuperAdmin && (
          <Stack direction="row" spacing={2} sx={{ mb: 2, pt: 1 }}>
            <TextField
              select
              size="small"
              label="Select Industry"
              value={selectedFilterIndustry}
              onChange={(e) => {
                setSelectedFilterIndustry(e.target.value)
                setPaginationModel((m) => ({ ...m, page: 0 }))
              }}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="">
                <em>All Industries</em>
              </MenuItem>
              {industries.map((ind) => (
                <MenuItem key={ind.code} value={ind.code}>
                  {ind.name} ({ind.code})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}

        {loading && items.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AppDataGrid onReload={refresh}
            height="100%"
            rows={items}
            columns={gridColumns}
            loading={loading}
            getRowId={(r) => r._id}
            paginationMode="server"
            sortingMode="server"
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            filterMode="server"
            onFilterModelChange={(model: GridFilterModel) => {
              const next = (model.quickFilterValues ?? []).join(' ').trim()
              if (next !== search) {
                setSearch(next)
                setPaginationModel((m) => ({ ...m, page: 0 }))
              }
            }}
          />
        )}
      </AppCard>

      <AppModal
        open={pwdDialog.open}
        onClose={() => setPwdDialog({ open: false, email: '', password: '' })}
        maxWidth="xs"
        title="Change Organization User Password"
        actions={
          <>
            <Button onClick={() => setPwdDialog({ open: false, email: '', password: '' })}>Cancel</Button>
            <Button variant="contained" onClick={submitChangePassword} disabled={savingPwd}>
              {savingPwd ? <CircularProgress size={18} /> : 'Change Password'}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Changing password for user: <strong>{pwdDialog.email}</strong>
          </Typography>
          <TextField
            label="New Password"
            type="password"
            value={pwdDialog.password || ''}
            onChange={(e) => setPwdDialog({ ...pwdDialog, password: e.target.value })}
            fullWidth
            size="small"
          />
        </Stack>
      </AppModal>

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
