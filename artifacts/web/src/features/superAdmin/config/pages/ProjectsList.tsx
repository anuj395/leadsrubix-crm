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
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'

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
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async (targetIndustry?: string) => {
    setLoading(true)
    try {
      let currentIndustries = industries
      if (currentIndustries.length === 0) {
        currentIndustries = await getIndustries(true)
        setIndustries(currentIndustries)
        if (currentIndustries.length > 0 && !selectedIndustry && !targetIndustry) {
          targetIndustry = currentIndustries[0].code
          setSelectedIndustry(targetIndustry)
        }
      }

      const activeIndustry = targetIndustry || selectedIndustry

      const [resProjects, orgsResult, resolved] = await Promise.all([
        api.get('/resources/resourceProjects'),
        listOrganizationsPaged({ page: 0, pageSize: 1000 }),
        resolveScreen({
          screen_key: 'configProjects',
          industry_code: activeIndustry,
          role_key: 'admin',
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
  }, [])

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
    if (!resolvedScreen) return []

    const baseCols: GridColDef<Project>[] = resolvedScreen.table_headers.map((header) => {
      if (header.key === 'organizationId' || header.key === 'organizationName') return null

      const col: GridColDef<Project> = {
        field: header.key as keyof Project,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable,
      }

      if (header.key === 'projectName') {
        col.flex = 1.2
        col.minWidth = 180
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>
      } else if (header.key === 'status') {
        col.width = 120
        col.renderCell = (p) => <StatusBadge value={p.value === 'ACTIVE' ? 'Active' : 'Inactive'} />
      } else if (header.key === 'createdAt') {
        col.field = 'created_at' as any
        col.width = 180
        col.renderCell = (p) => p.value ? new Date(p.value as string).toLocaleString() : ''
      }

      return col
    }).filter(Boolean) as GridColDef<Project>[]

    const cols: GridColDef<Project>[] = [
      {
        field: 'organizationName',
        headerName: 'Organization Name',
        flex: 1.2,
        minWidth: 180,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.row.organizationName || <em>Global Default</em>}</Box>,
      },
      ...baseCols
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
            <IconButton size="small" onClick={() => navigate(`/configuration/projects/${p.row.id}/edit?industry=${selectedIndustry}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    })

    return cols
  }, [resolvedScreen, filteredItems, selectedIndustry])

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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/configuration/projects/new?industry=${selectedIndustry}`)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Add Project
          </Button>
        }
        fullHeight
      >
        <Stack direction="row" spacing={2} sx={{ mb: 2, pt: 1 }}>
          <TextField
            select
            size="small"
            label="Select Industry"
            value={selectedIndustry}
            onChange={(e) => {
              setSelectedIndustry(e.target.value)
              void loadData(e.target.value)
            }}
            sx={{ minWidth: 240 }}
          >
            {industries.map((ind) => (
              <MenuItem key={ind.code} value={ind.code}>
                {ind.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

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
