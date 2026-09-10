import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Divider from '@mui/material/Divider'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  DashboardCustomize as TemplateHubIcon,
  OpenInNew as OpenInNewIcon,
  Badge as BadgeIcon,
  Groups as GroupsIcon,
  LocationCity as BranchIcon,
  Speed as AnalyticsIcon,
  MenuOpen as MenuIcon,
  Security as SecurityIcon,
  ViewCompact as ScreenIcon,
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  getIndustries,
  createIndustryRecord,
  updateIndustryRecord,
  deleteIndustryRecord,
  type Industry,
  type IndustryDesignation,
} from '@/services/sidebarAdminService'

interface FormState {
  _id?: string
  code: string
  name: string
  description: string
  isActive: boolean
  status: string
}

const emptyForm: FormState = { code: '', name: '', description: '', isActive: true, status: 'Launched' }

export default function IndustriesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Template Hub State
  const [templateHubIndustry, setTemplateHubIndustry] = useState<Industry | null>(null)
  const [hubTab, setHubTab] = useState<number>(0)
  const [hubDesignations, setHubDesignations] = useState<IndustryDesignation[]>([])
  const [newDesigName, setNewDesigName] = useState('')
  const [hubTeamName, setHubTeamName] = useState('')
  const [hubTeamCode, setHubTeamCode] = useState('')
  const [hubBranchName, setHubBranchName] = useState('')
  const [hubBranchCode, setHubBranchCode] = useState('')
  const [savingHub, setSavingHub] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await getIndustries(false))
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (row: Industry) => {
    setForm({ _id: row._id, code: row.code, name: row.name, description: row.description ?? '', isActive: row.isActive, status: row.status ?? 'Launched' })
    setDialogOpen(true)
  }

  const openTemplateHub = (row: Industry) => {
    setTemplateHubIndustry(row)
    setHubTab(0)
    const desigs = row.baseline_designations || row.baselineDesignations || []
    setHubDesignations([...desigs])
    setHubTeamName(row.default_team_name || row.defaultTeamName || 'General Sales Team')
    setHubTeamCode(row.default_team_code || row.defaultTeamCode || 'GST')
    setHubBranchName(row.default_branch_name || row.defaultBranchName || 'Head Office')
    setHubBranchCode(row.default_branch_code || row.defaultBranchCode || 'HQ')
    setNewDesigName('')
  }

  const handleAddDesignation = () => {
    const trimmed = newDesigName.trim()
    if (!trimmed) return
    const value = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    if (hubDesignations.some(d => d.value === value || d.name.toLowerCase() === trimmed.toLowerCase())) {
      setToast({ open: true, msg: 'Designation already exists', sev: 'error' })
      return
    }
    setHubDesignations([...hubDesignations, { name: trimmed, value, label: trimmed }])
    setNewDesigName('')
  }

  const handleRemoveDesignation = (idx: number) => {
    const updated = [...hubDesignations]
    updated.splice(idx, 1)
    setHubDesignations(updated)
  }

  const saveTemplateHubDefaults = async () => {
    if (!templateHubIndustry) return
    setSavingHub(true)
    try {
      await updateIndustryRecord(templateHubIndustry._id, {
        baseline_designations: hubDesignations,
        default_team_name: hubTeamName,
        default_team_code: hubTeamCode,
        default_branch_name: hubBranchName,
        default_branch_code: hubBranchCode,
      })
      setToast({ open: true, msg: 'Industry Template Defaults Saved Successfully!', sev: 'success' })
      await refresh()
      setTemplateHubIndustry(null)
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to save template defaults', sev: 'error' })
    } finally {
      setSavingHub(false)
    }
  }

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setToast({ open: true, msg: 'Code and name are required', sev: 'error' }); return
    }
    setSaving(true)
    try {
      if (form._id) {
        await updateIndustryRecord(form._id, { code: form.code, name: form.name, description: form.description, isActive: form.isActive, status: form.status })
      } else {
        await createIndustryRecord({ code: form.code, name: form.name, description: form.description, isActive: form.isActive, status: form.status })
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Saved', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally { setSaving(false) }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: Industry) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete industry "${row.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteIndustryRecord(row._id)
          setToast({ open: true, msg: 'Deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Industry>[]>(() => [
    { field: 'code', headerName: 'Code', minWidth: 120,
      renderCell: (p) => <Box component="code" sx={{ fontWeight: 600 }}>{String(p.value)}</Box> },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'description', headerName: 'Description', flex: 1.2, minWidth: 180,
      renderCell: (p) => p.value ? String(p.value) : <Box sx={{ color: 'text.secondary' }}>—</Box> },
    {
      field: 'templateDefaults',
      headerName: 'Baseline Template Setup',
      minWidth: 220,
      sortable: false,
      renderCell: (p) => {
        const desigs = p.row.baseline_designations || p.row.baselineDesignations || []
        const count = desigs.length
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<TemplateHubIcon fontSize="small" />}
              onClick={() => openTemplateHub(p.row)}
              sx={{ textTransform: 'none', py: 0.25, px: 1 }}
            >
              Template Hub ({count || 4} Roles)
            </Button>
          </Stack>
        )
      }
    },
    { field: 'isActive', headerName: 'Active', minWidth: 90,
      renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
    },
    { field: 'status', headerName: 'Status', minWidth: 110,
      renderCell: (p) => p.value ? String(p.value) : 'Launched',
    },
    { field: '__actions', headerName: 'Actions', sortable: false, filterable: false, disableColumnMenu: true,
      align: 'right', headerAlign: 'right', width: 110,
      renderCell: (p) => (
        <>
          <Tooltip title="Edit Metadata">
            <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => void remove(p.row)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </>
      ),
    },
  ], [])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Industries & Baseline Templates"
        subtitle="Tenants and vertical industries served by Leads Rubix CRM. Configure baseline templates cloned into new organizations."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Industry</Button>}
        fullHeight
      >
        <AppDataGrid rows={items} columns={gridColumns} loading={loading} getRowId={(r) => r._id} height="100%" onReload={refresh} />
      </AppCard>

      {/* Basic Metadata Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Industry' : 'New Industry'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              helperText="Stable identifier (e.g. temp0001, real-estate)" disabled={!!form._id} fullWidth />
            <TextField label="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
            <TextField
              select
              label="Status"
              value={form.status || 'Launched'}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              fullWidth
            >
              <MenuItem value="Launched">Launched</MenuItem>
              <MenuItem value="Pre-Launched">Pre-Launched</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </TextField>
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SuperAdmin Industry Template Hub Dialog */}
      <Dialog
        open={Boolean(templateHubIndustry)}
        onClose={() => setTemplateHubIndustry(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TemplateHubIcon color="primary" />
            <Box>
              <Typography variant="h6" component="div">
                Industry Basic Template Hub: {templateHubIndustry?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Identifier: <code>{templateHubIndustry?.code}</code> | Define the baseline defaults provisioned for new tenant workspaces.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <Tabs
          value={hubTab}
          onChange={(_, v) => setHubTab(v)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="1. Baseline Setup (Designations & Team)" />
          <Tab label="2. Template Assets & Builders" />
        </Tabs>

        <DialogContent sx={{ minHeight: 380, pt: 2.5 }}>
          {hubTab === 0 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon fontSize="small" color="primary" /> Baseline Team & Branch Defaults
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Default Team Name"
                      value={hubTeamName}
                      onChange={(e) => setHubTeamName(e.target.value)}
                      fullWidth
                      helperText="Default team auto-created for new orgs (e.g. General Sales Team)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Default Team Code"
                      value={hubTeamCode}
                      onChange={(e) => setHubTeamCode(e.target.value)}
                      fullWidth
                      helperText="Short code (e.g. GST)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Default Branch Name"
                      value={hubBranchName}
                      onChange={(e) => setHubBranchName(e.target.value)}
                      fullWidth
                      helperText="Default branch auto-created (e.g. Head Office)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Default Branch Code"
                      value={hubBranchCode}
                      onChange={(e) => setHubBranchCode(e.target.value)}
                      fullWidth
                      helperText="Short code (e.g. HQ)"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeIcon fontSize="small" color="primary" /> Baseline Designations ({hubDesignations.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  These designations will be cloned into every newly signed-up organization for this vertical.
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Enter designation title (e.g. Senior Consultant)"
                    value={newDesigName}
                    onChange={(e) => setNewDesigName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddDesignation()
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddDesignation}
                    disabled={!newDesigName.trim()}
                  >
                    Add
                  </Button>
                </Stack>

                <Paper variant="outlined" sx={{ p: 2, minHeight: 100, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {hubDesignations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', m: 'auto' }}>
                      No baseline designations configured yet. Add designations above.
                    </Typography>
                  ) : (
                    hubDesignations.map((d, idx) => (
                      <Chip
                        key={d.value || idx}
                        label={`${d.label || d.name}`}
                        onDelete={() => handleRemoveDesignation(idx)}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    ))
                  )}
                </Paper>
              </Box>
            </Stack>
          )}

          {hubTab === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click below to configure the baseline templates for <strong>{templateHubIndustry?.name}</strong>. Any organization created under this vertical will inherit these configurations.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <AnalyticsIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>Analytics & KPIs Template</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Customize tabs, KPI cards, visual charts, and calculation formulas for this vertical.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        endIcon={<OpenInNewIcon />}
                        onClick={() => navigate(`/ui-navigation/analytics-config?industryId=${templateHubIndustry?.code}`)}
                        fullWidth
                      >
                        Open Dashboard Builder
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <MenuIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>Sidebar Menus Template</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Configure menu items, order, icons, and module routing for this industry's roles.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        endIcon={<OpenInNewIcon />}
                        onClick={() => navigate(`/ui-navigation/menus?industryId=${templateHubIndustry?.code}`)}
                        fullWidth
                      >
                        Open Menus Builder
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <SecurityIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>Role Action Permissions</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Define baseline View / Add / Edit / Delete matrix for Admin, Lead Manager, Team Lead, and Sales.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        endIcon={<OpenInNewIcon />}
                        onClick={() => navigate(`/access-control/permissions?industryId=${templateHubIndustry?.code}`)}
                        fullWidth
                      >
                        Open Permissions Matrix
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <ScreenIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>Screen Fields & Layouts</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Configure custom fields, labels, required flags, and input types for CRM screens.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        endIcon={<OpenInNewIcon />}
                        onClick={() => navigate(`/ui-navigation/screen-fields?industryId=${templateHubIndustry?.code}`)}
                        fullWidth
                      >
                        Open Screen Fields
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTemplateHubIndustry(null)}>Close</Button>
          {hubTab === 0 && (
            <Button
              variant="contained"
              onClick={saveTemplateHubDefaults}
              disabled={savingHub}
              startIcon={savingHub ? <CircularProgress size={16} /> : undefined}
            >
              {savingHub ? 'Saving Defaults...' : 'Save Baseline Defaults'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
