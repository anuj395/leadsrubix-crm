import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/services/api'
import { listOrganizationsPaged, type Organization } from '@/services/organizationsService'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

export interface Project {
  id: string
  projectId?: string
  projectName: string
  developerName: string
  address: string
  reraLink: string
  walkthroughLink: string
  propertyType: string
  propertyStage: string
  projectStatus: 'Launched' | 'Pre Launch' | 'Intermediate Occupation'
  status: 'ACTIVE' | 'INACTIVE'
  organizationId?: string
  organizationName?: string
  createdAt?: string
}

export default function ProjectsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  // Shared Super Admin Scope Context
  const isSuperAdmin = true // Since this is a Super Admin only config page
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const activeIndustry = selectedIndustry || 'temp0001'
      const activeOrg = selectedOrg || undefined

      const params = new URLSearchParams()
      if (activeIndustry) params.set('industryId', activeIndustry)
      if (activeOrg) params.set('organizationId', activeOrg)

      const [resProjects, orgsResult, resolved] = await Promise.all([
        api.get(`/resources/resourceProjects?${params.toString()}`),
        listOrganizationsPaged({ page: 0, pageSize: 200 }),
        resolveScreen({
          screenKey: 'configProjects',
          industryCode: activeIndustry || 'temp0001',
          roleKey: 'admin',
        }),
      ])

      setItems(resProjects.data || [])
      setOrganizations(orgsResult.items || [])
      setResolvedScreen(resolved)
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message || 'Failed to load projects catalog',
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry, selectedOrg])

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resources/resourceProjects/${id}`)
      setToast({ open: true, msg: 'Project deleted successfully', sev: 'success' })
      loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to delete project', sev: 'error' })
    }
  }

  const filteredItems = useMemo(() => {
    if (!selectedIndustry) return items
    const selectedOrgIds = organizations
      .filter((o) => o.industryId === selectedIndustry)
      .map((o) => o.organizationId || o.id)
    return items.filter((item) => !item.organizationId || selectedOrgIds.includes(item.organizationId))
  }, [items, selectedIndustry, organizations])

  const columns = useMemo<GridColDef<Project>[]>(() => {
    const sNoCol: GridColDef<Project> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const idx = filteredItems.findIndex((item) => (item.id && item.id === params.row.id) || ((item as any)._id && (item as any)._id === (params.row as any)._id))
        return <Box sx={{ my: 'auto', fontWeight: 500 }}>{idx !== -1 ? idx + 1 : ''}</Box>
      }
    }

    const headersSource = resolvedScreen?.table_headers || (resolvedScreen as any)?.tableHeaders || []

    const baseCols: GridColDef<Project>[] = headersSource.map((header: any) => {
      if (header.key === 'organizationId' || header.key === 'organizationName') return null

      const col: GridColDef<Project> = {
        field: header.key as keyof Project,
        headerName: header.label,
        flex: 1,
        minWidth: 140,
        sortable: header.sortable ?? true,
        valueGetter: (_v, row) => {
          const r = (row as unknown) as Record<string, unknown>
          const camelKey = header.key.replace(/_([a-z])/g, (_: any, g: string) => g.toUpperCase())
          const snakeKey = header.key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)
          return r[header.key] ?? r[camelKey] ?? r[snakeKey]
        },
        renderCell: (p) => {
          const v = p.value
          if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>

          if (header.type === 'badge' || header.type === 'status' || header.key === 'status' || header.key === 'projectStatus') {
            return <StatusBadge value={String(v)} />
          }
          if (header.type === 'date' || header.key === 'created_at' || header.key === 'createdAt') {
            return new Date(v as string).toLocaleString()
          }
          if (header.type === 'image') {
            return <Box component="img" src={String(v)} sx={{ width: 48, height: 32, borderRadius: 1, objectFit: 'cover' }} />
          }
          return String(v)
        }
      }

      return col
    }).filter(Boolean) as GridColDef<Project>[]

    const nonStatusCols = baseCols.filter(c => c.field !== 'status' && c.field !== 'projectStatus' && (c as any).field !== 'project_status')
    const statusCols = baseCols.filter(c => c.field === 'status' || c.field === 'projectStatus' || (c as any).field === 'project_status')

    const cols: GridColDef<Project>[] = [
      sNoCol,
      ...nonStatusCols,
      ...statusCols
    ]

    cols.push({
      field: '__actions' as any,
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/configuration/projects/${p.row.id || (p.row as any)._id}/edit?industry=${selectedIndustry}&organization=${selectedOrg}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id || (p.row as any)._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    })

    return cols
  }, [resolvedScreen, filteredItems, navigate, selectedIndustry, selectedOrg])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppCard
        title="Projects List"
        subtitle="Manage master project parameters, RERA configurations, and links."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/configuration/projects/new?industry=${selectedIndustry}&organization=${selectedOrg}`)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Add Project
          </Button>
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

        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={filteredItems} columns={columns} getRowId={(r) => r.id} onReload={loadData} />
        </Box>
      </AppCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this project?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (deletingId) {
                await handleDelete(deletingId)
              }
              setDeleteConfirmOpen(false)
            }}
            color="error"
            variant="contained"
          >
            Delete
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
