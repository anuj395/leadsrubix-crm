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
import Typography from '@mui/material/Typography'
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
import { listOrganizationsPaged, type Organization } from '@/services/organizationsService'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import { getResources } from '@/services/resourcesService'
import { resolveScreen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'

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
  const [items, setItems] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
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

  // Dynamic industry-specific states
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [selectedIndustryInForm, setSelectedIndustryInForm] = useState<string>('')

  const loadData = async (targetIndustry?: string) => {
    setLoading(true)
    try {
      let currentIndustries = industries
      if (currentIndustries.length === 0) {
        currentIndustries = await getIndustries(true)
        setIndustries(currentIndustries)
      }

      const activeIndustry = targetIndustry || selectedIndustry || currentIndustries[0]?.code || ''
      if (activeIndustry && selectedIndustry !== activeIndustry) {
        setSelectedIndustry(activeIndustry)
      }

      const [resProjects, resOrgs, resolved] = await Promise.all([
        api.get('/resources/resourceProjects?all=true'),
        listOrganizationsPaged({ page: 0, pageSize: 200 }),
        resolveScreen({ screen_key: 'configProjects', industry_code: activeIndustry || undefined })
      ])
      
      setOrganizations(resOrgs.items || [])
      setResolvedScreen(resolved)

      // Filter projects to only those belonging to organizations under the active industry
      const orgIdsInIndustry = (resOrgs.items || [])
        .filter((o: Organization) => o.industry_id === activeIndustry || o.industryId === activeIndustry)
        .map((o: Organization) => String(o.organizationId || o.organization_id || ''))

      const filteredProjects = (resProjects.data || []).filter((p: Project) =>
        orgIdsInIndustry.includes(String(p.organizationId || ''))
      )
      setItems(filteredProjects)
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
    loadData()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    const industryForForm = selectedIndustry || industries[0]?.code || ''
    setSelectedIndustryInForm(industryForForm)
    setDialogOpen(true)
  }

  const openEditDialog = (proj: Project) => {
    setEditing(proj)
    const org = organizations.find(o => (o.organizationId || o.organization_id) === (proj.organizationId))
    const industryForForm = (org?.industry_id || org?.industryId || selectedIndustry || industries[0]?.code || '') as string
    setSelectedIndustryInForm(industryForForm)
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
      const col: GridColDef<Project> = {
        field: header.key as keyof Project,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable,
      }

      if (header.key === 'organizationId' || header.key === 'organization_id') {
        col.field = 'organizationName' as any
        col.flex = 1.2
        col.minWidth = 160
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.row.organizationName || p.value || <em>Global</em>}</Box>
      } else if (header.key === 'projectName' || header.key === 'project_name') {
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
    })

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
            title="Projects Master Catalog"
            subtitle="Catalog of properties and real estate developments (Super Admin View)."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>Add Project</Button>
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
        maxWidth="md" 
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
          <Stack spacing={3} sx={{ pt: 1, minHeight: editing ? 'auto' : '260px' }}>
            {!editing && !selectedIndustryInForm && (
              <Box sx={{ maxWidth: 400, mx: 'auto', width: '100%', py: 4, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, color: 'text.secondary' }}>
                  Select your business industry to initialize the form:
                </Typography>
                <TextField
                  select
                  size="medium"
                  label="Select Industry"
                  value={selectedIndustryInForm}
                  onChange={(e) => setSelectedIndustryInForm(e.target.value)}
                  fullWidth
                >
                  {industries.map((ind) => (
                    <MenuItem key={ind.code} value={ind.code}>
                      {ind.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}

            {(selectedIndustryInForm || editing) && (
              <>
                {!editing && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 600 }}>
                      Industry: {industries.find(i => i.code === selectedIndustryInForm)?.name || selectedIndustryInForm}
                    </Typography>
                    <Button size="small" onClick={() => setSelectedIndustryInForm('')}>
                      Change Industry
                    </Button>
                  </Box>
                )}
                <DynamicForm
                  screen="configProjects"
                  industry_code={selectedIndustryInForm}
                  role_key="admin"
                  initialValues={editing ? (editing as any) : { organizationId: '', status: 'ACTIVE' }}
                  onCancel={() => setDialogOpen(false)}
                  submitLabel={editing ? 'Save' : 'Create'}
                  onSubmit={async (values) => {
                    try {
                      if (editing) {
                        await api.put(`/resources/resourceProjects/${editing.id}`, values)
                        setToast({ open: true, msg: 'Project updated successfully', sev: 'success' })
                      } else {
                        await api.post('/resources/resourceProjects', values)
                        setToast({ open: true, msg: 'Project created successfully', sev: 'success' })
                      }
                      setDialogOpen(false)
                      loadData()
                    } catch (e: any) {
                      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save project', sev: 'error' })
                    }
                  }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
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
