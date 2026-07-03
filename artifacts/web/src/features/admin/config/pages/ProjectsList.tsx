import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material'
import {
  type GridColDef,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter
} from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/services/api'
import { getResources } from '@/services/resourcesService'
import { useAppSelector } from '@/store/hooks'
import { resolveScreen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'

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

const PROPERTY_STATUS_OPTIONS = [
  { label: 'Launched', value: 'Launched' },
  { label: 'Pre Launch', value: 'Pre Launch' },
  { label: 'Intermediate Occupation', value: 'Intermediate Occupation' }
]

export default function ProjectsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Project[]>([])
  const [propertyTypes, setPropertyTypes] = useState<any[]>([])
  const [propertyStages, setPropertyStages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    projectName: '',
    developerName: '',
    address: '',
    reraLink: '',
    walkthroughLink: '',
    propertyType: '',
    propertyStage: '',
    projectStatus: 'Launched' as Project['projectStatus'],
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [resProjects, types, stages, resolved] = await Promise.all([
        api.get('/resources/resourceProjects'),
        getResources('resourcePropertyTypes'),
        getResources('resourcePropertyStages'),
        resolveScreen({ screen_key: 'configProjects', industry_code: user?.industryId || user?.industry_id })
      ])
      setItems(resProjects.data || [])
      setPropertyTypes(types)
      setPropertyStages(stages)
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
    if (user) {
      void loadData()
    }
  }, [user])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      projectName: '',
      developerName: '',
      address: '',
      reraLink: '',
      walkthroughLink: '',
      propertyType: '',
      propertyStage: '',
      projectStatus: 'Launched',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (proj: Project) => {
    setEditing(proj)
    setForm({
      projectName: proj.projectName || '',
      developerName: proj.developerName || '',
      address: proj.address || '',
      reraLink: proj.reraLink || '',
      walkthroughLink: proj.walkthroughLink || '',
      propertyType: proj.propertyType || '',
      propertyStage: proj.propertyStage || '',
      projectStatus: proj.projectStatus || 'Launched',
    })
    setDialogOpen(true)
  }

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

  const handleSave = async () => {
    if (!form.projectName || !form.developerName) {
      setToast({ open: true, msg: 'Developer Name and Project Name are required', sev: 'error' })
      return
    }

    try {
      if (editing) {
        await api.put(`/resources/resourceProjects/${editing.id}`, form)
        setToast({ open: true, msg: 'Project updated successfully', sev: 'success' })
      } else {
        await api.post('/resources/resourceProjects', form)
        setToast({ open: true, msg: 'Project created successfully', sev: 'success' })
      }
      setDialogOpen(false)
      loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save project', sev: 'error' })
    }
  }

  const handleExport = () => {
    if (!resolvedScreen || items.length === 0) return
    const headers = resolvedScreen.table_headers.map(h => h.label)
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(",")].concat(items.map(row => resolvedScreen.table_headers.map(h => `"${row[h.key as keyof Project] ?? ''}"`).join(","))).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `projects_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ open: true, msg: 'Exported successfully!', sev: 'success' })
  }

  const handleImport = () => {
    setToast({ open: true, msg: `Import template ready!`, sev: 'success' })
  }

  const columns = useMemo<GridColDef<Project>[]>(() => {
    if (!resolvedScreen) return []

    const cols: GridColDef<Project>[] = resolvedScreen.table_headers.map((header) => {
      // Admin doesn't need to see organization name/id column
      if (header.key === 'organizationId' || header.key === 'organization_id') return null

      const col: GridColDef<Project> = {
        field: header.key as keyof Project,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable,
      }

      if (header.key === 'projectName' || header.key === 'project_name') {
        col.flex = 1.2
        col.minWidth = 160
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>
      } else if (header.key === 'developerName' || header.key === 'developer_name') {
        col.flex = 1.2
        col.minWidth = 150
      } else if (header.key === 'propertyType') {
        col.width = 140
      } else if (header.key === 'propertyStage' || header.key === 'property_stage') {
        col.width = 140
      } else if (header.key === 'projectStatus' || header.key === 'project_status') {
        col.width = 160
        col.renderCell = (p) => <StatusBadge value={p.value} />
      } else if (header.key === 'address') {
        col.flex = 1.2
        col.minWidth = 160
      } else if (header.key === 'reraLink' || header.key === 'rera_link') {
        col.width = 140
        col.renderCell = (p) => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>View Link</a> : <em>N/A</em>
      } else if (header.key === 'walkthroughLink' || header.key === 'walkthrough_link') {
        col.width = 150
        col.renderCell = (p) => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>View Link</a> : <em>N/A</em>
      } else if (header.key === 'status') {
        col.width = 100
        col.renderCell = (p) => (
          <Chip
            label={p.value}
            size="small"
            color={p.value === 'ACTIVE' ? 'success' : 'default'}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        )
      } else if (header.key === 'createdAt') {
        col.width = 130
        col.renderCell = (p) => p.value ? new Date(p.value).toLocaleDateString() : ''
      }

      return col
    }).filter(Boolean) as GridColDef<Project>[]

    cols.push({
      field: '__actions' as any,
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEditDialog(p.row)}>
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
  }, [resolvedScreen, items])

  const renderField = (field: ResolvedFormField) => {
    // Admin does not render organizationId or organization_id input field
    if (field.key === 'organizationId' || field.key === 'organization_id') return null

    if (field.key === 'developerName' || field.key === 'developer_name') {
      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          value={form.developerName}
          onChange={(e) => setForm(prev => ({ ...prev, developerName: e.target.value }))}
          required={field.required}
        />
      )
    }

    if (field.key === 'projectName' || field.key === 'project_name') {
      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          value={form.projectName}
          onChange={(e) => setForm(prev => ({ ...prev, projectName: e.target.value }))}
          required={field.required}
        />
      )
    }

    if (field.key === 'propertyType') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.propertyType}
          onChange={(e) => setForm(prev => ({ ...prev, propertyType: e.target.value }))}
          required={field.required}
        >
          {propertyTypes.map((t) => (
            <MenuItem key={t.id || t.name} value={t.name || t.value}>
              {t.name || t.value}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    if (field.key === 'propertyStage' || field.key === 'property_stage') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.propertyStage}
          onChange={(e) => setForm(prev => ({ ...prev, propertyStage: e.target.value }))}
          required={field.required}
        >
          {propertyStages.map((s) => (
            <MenuItem key={s.id || s.name} value={s.name || s.value}>
              {s.name || s.value}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    if (field.key === 'projectStatus' || field.key === 'project_status') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.projectStatus}
          onChange={(e) => setForm(prev => ({ ...prev, projectStatus: e.target.value as any }))}
          required={field.required}
        >
          {PROPERTY_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )
    }



    if (field.key === 'address') {
      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          value={form.address}
          onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
          required={field.required}
        />
      )
    }

    if (field.key === 'reraLink' || field.key === 'rera_link') {
      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          value={form.reraLink}
          onChange={(e) => setForm(prev => ({ ...prev, reraLink: e.target.value }))}
          required={field.required}
        />
      )
    }

    if (field.key === 'walkthroughLink' || field.key === 'walkthrough_link') {
      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          value={form.walkthroughLink}
          onChange={(e) => setForm(prev => ({ ...prev, walkthroughLink: e.target.value }))}
          required={field.required}
        />
      )
    }

    return (
      <TextField
        key={field.key}
        fullWidth
        label={field.label}
        value={form[field.key as keyof typeof form] || ''}
        onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
        required={field.required}
      />
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
      {(() => {
        const CustomToolbar = () => (
          <GridToolbarContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <GridToolbarColumnsButton />
              <GridToolbarFilterButton />
              <GridToolbarDensitySelector />
              <GridToolbarExport />
              <Button
                color="primary"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleImport}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: 0,
                  minWidth: 0,
                  padding: '4px 5px',
                }}
              >
                Import
              </Button>
            </Box>
            <GridToolbarQuickFilter />
          </GridToolbarContainer>
        )

        return (
          <AppCard
            title="Projects Catalog"
            subtitle="Catalog of properties, real estate developments, and sales units."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>Add Project</Button>
            }
            fullHeight
          >
            <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
              {loading && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                  <LinearProgress />
                </Box>
              )}
              <AppDataGrid 
                height="100%" 
                rows={items} 
                columns={columns} 
                getRowId={(r) => r.id}
                slots={{ toolbar: CustomToolbar }}
              />
            </Box>
          </AppCard>
        )
      })()}

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle>{editing ? 'Edit Project' : 'Add New Project'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              pt: 1,
            }}
          >
            {(() => {
              const fields = resolvedScreen?.form_fields || []
              const renderedKeys = new Set<string>()

              return fields.map((field) => {
                if (renderedKeys.has(field.key)) return null

                if (field.key === 'developerName' || field.key === 'developer_name') {
                  const sibling = fields.find(f => f.key === 'projectName' || f.key === 'project_name')
                  if (sibling) {
                    renderedKeys.add('projectName')
                    renderedKeys.add('project_name')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(sibling)}
                      </Box>
                    )
                  }
                }

                if (field.key === 'propertyType') {
                  const sibling = fields.find(f => f.key === 'propertyStage' || f.key === 'property_stage')
                  if (sibling) {
                    renderedKeys.add('propertyStage')
                    renderedKeys.add('property_stage')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(sibling)}
                      </Box>
                    )
                  }
                }

                if (field.key === 'projectStatus' || field.key === 'project_status') {
                  const sibling = fields.find(f => f.key === 'status')
                  if (sibling) {
                    renderedKeys.add('status')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(sibling)}
                      </Box>
                    )
                  }
                }

                if (field.key === 'reraLink' || field.key === 'rera_link') {
                  const sibling = fields.find(f => f.key === 'walkthroughLink' || f.key === 'walkthrough_link')
                  if (sibling) {
                    renderedKeys.add('walkthroughLink')
                    renderedKeys.add('walkthrough_link')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(sibling)}
                      </Box>
                    )
                  }
                }

                return renderField(field)
              })
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this project? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deletingId) {
                handleDelete(deletingId);
              }
              setDeleteConfirmOpen(false);
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
