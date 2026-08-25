import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
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
import { useAppSelector } from '@/store/hooks'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'
import { useActionPermission } from '@/hooks/useActionPermission'

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
  createdAt?: string
}

export default function ProjectsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('configProjects')
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const indCode = String(user?.industryId || '').toLowerCase().trim();

  const labels = useMemo(() => {
    if (indCode === 'temp0002') {
      return {
        subtitle: 'Manage product catalog, suppliers, and details.',
        addBtn: 'Add Product',
        deleteMsg: 'Are you sure you want to delete this product?',
        deletedToast: 'Product deleted successfully',
        failLoadToast: 'Failed to load products catalog',
        failDeleteToast: 'Failed to delete product'
      };
    }
    if (indCode === 'temp0003') {
      return {
        subtitle: 'Manage medical specialties, departments, and credentials.',
        addBtn: 'Add Specialty',
        deleteMsg: 'Are you sure you want to delete this specialty?',
        deletedToast: 'Specialty deleted successfully',
        failLoadToast: 'Failed to load specialties catalog',
        failDeleteToast: 'Failed to delete specialty'
      };
    }
    if (indCode === 'temp0004') {
      return {
        subtitle: 'Manage courses, syllabus links, and program batches.',
        addBtn: 'Add Course',
        deleteMsg: 'Are you sure you want to delete this course?',
        deletedToast: 'Course deleted successfully',
        failLoadToast: 'Failed to load academic catalog',
        failDeleteToast: 'Failed to delete course'
      };
    }
    if (indCode === 'temp0005') {
      return {
        subtitle: 'Manage financial portfolios, advisor scopes, and asset classes.',
        addBtn: 'Add Portfolio',
        deleteMsg: 'Are you sure you want to delete this portfolio?',
        deletedToast: 'Portfolio deleted successfully',
        failLoadToast: 'Failed to load portfolios catalog',
        failDeleteToast: 'Failed to delete portfolio'
      };
    }
    if (indCode === 'temp0006') {
      return {
        subtitle: 'Manage IT services catalog, project scopes, and templates.',
        addBtn: 'Add Service / Project',
        deleteMsg: 'Are you sure you want to delete this service?',
        deletedToast: 'Service deleted successfully',
        failLoadToast: 'Failed to load projects catalog',
        failDeleteToast: 'Failed to delete service'
      };
    }
    if (indCode === 'temp0007') {
      return {
        subtitle: 'Manage product models, plant allocations, and dealer catalogs.',
        addBtn: 'Add Category',
        deleteMsg: 'Are you sure you want to delete this category?',
        deletedToast: 'Category deleted successfully',
        failLoadToast: 'Failed to load categories catalog',
        failDeleteToast: 'Failed to delete category'
      };
    }
    return {
      subtitle: 'Manage standard product catalogs, services, and inventory details.',
      addBtn: 'Add Product / Service',
      deleteMsg: 'Are you sure you want to delete this item?',
      deletedToast: 'Item deleted successfully',
      failLoadToast: 'Failed to load catalog',
      failDeleteToast: 'Failed to delete item'
    };
  }, [indCode]);

  const loadData = async () => {
    setLoading(true)
    try {
      const [resProjects, resolved] = await Promise.all([
        api.get('/resources/resourceProjects'),
        resolveScreen({ screen_key: 'configProjects', industry_code: user?.industryId || 'temp0001' })
      ])
      setItems(resProjects.data || [])
      setResolvedScreen(resolved)
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message || labels.failLoadToast,
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void loadData()
    }
  }, [user])

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resources/resourceProjects/${id}`)
      setToast({ open: true, msg: labels.deletedToast, sev: 'success' })
      loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || labels.failDeleteToast, sev: 'error' })
    }
  }

  const columns = useMemo<GridColDef<Project>[]>(() => {
    if (!resolvedScreen) return []

    const sNoCol: GridColDef<Project> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const idx = items.findIndex((item) => (item.id && item.id === params.row.id) || ((item as any)._id && (item as any)._id === (params.row as any)._id))
        return <Box sx={{ my: 'auto', fontWeight: 500 }}>{idx !== -1 ? idx + 1 : ''}</Box>
      }
    }

    const baseCols: GridColDef<Project>[] = resolvedScreen.table_headers.map((header) => {
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

          if ((header.type as string) === 'badge' || (header.type as string) === 'status' || header.key === 'status' || header.key === 'projectStatus' || header.key === 'project_status') {
            return <StatusBadge value={String(v)} />
          }
          if (header.type === 'date' || header.key === 'created_at' || header.key === 'createdAt') {
            try {
              const d = new Date(v as string)
              return !isNaN(d.getTime()) ? d.toLocaleString() : String(v)
            } catch {
              return String(v)
            }
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

    if (can_edit || can_delete) {
      cols.push({
        field: '__actions' as any,
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            {can_edit && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => navigate(`/configuration/projects/${p.row.id}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can_delete && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      })
    }

    return cols
  }, [resolvedScreen, items, navigate, can_edit, can_delete])

  if (!permsLoading && !can_view) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to view {resolvedScreen?.screen?.name || 'Projects'}.
        </Alert>
      </Box>
    )
  }

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
        title={resolvedScreen?.screen?.name || 'Projects List'}
        subtitle={labels.subtitle}
        action={
          can_add ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/configuration/projects/new')} sx={{ textTransform: 'none', fontWeight: 600 }}>
              {labels.addBtn}
            </Button>
          ) : undefined
        }
        fullHeight
      >
        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id || (r as any)._id} onReload={loadData} />
        </Box>
      </AppCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>{labels.deleteMsg}</DialogContent>
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
