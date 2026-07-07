import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import {
  getDistributionRules,
  deleteDistributionRule,
  createDistributionRule,
  type LeadDistributionRule,
} from '@/services/leadDistributionService'
import { getResources } from '@/services/resourcesService'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { resolveScreen } from '@/services/screenAdminService'
import { useAuth } from '@/hooks/useAuth'

export default function LeadDistributionListPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<LeadDistributionRule[]>([])
  const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([])
  const [dynamicFormFields, setDynamicFormFields] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'normal' | 'roundrobin'>('normal')

  // Lists for Form Dropdowns
  const [sources, setSources] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [propertyTypes, setPropertyTypes] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])

  // Selection states
  const [source, setSource] = useState<string>('')
  const [selectedProjects, setSelectedProjects] = useState<any[]>([])
  const [selectedLocations, setSelectedLocations] = useState<any[]>([])
  const [selectedBudgets, setSelectedBudgets] = useState<any[]>([])
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<any[]>([])

  // Normal assignment selection
  const [associate, setAssociate] = useState<AdminUser | null>(null)

  // Roundrobin assignment selection
  const [selectedLeadManagers, setSelectedLeadManagers] = useState<AdminUser[]>([])
  const [roundRobinAssociates, setRoundRobinAssociates] = useState<AdminUser[]>([])

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const { confirmDelete } = useConfirm()

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesList, resolved] = await Promise.all([
        getDistributionRules(),
        resolveScreen({
          screen_key: 'leadDistribution',
          industry_code: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          role_key: user?.role === 'superAdmin' ? 'admin' : undefined,
        })
      ])
      setItems(rulesList)
      setDynamicHeaders(resolved?.table_headers || [])
      setDynamicFormFields(resolved?.form_fields || [])
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to load distribution rules or screen configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadFormOptions = async () => {
    try {
      const [srcs, projs, locs, bdgts, pts, usrs] = await Promise.all([
        getResources('resourceLeadSources'),
        getResources('resourceProjects'),
        getResources('resourceLocations'),
        getResources('resourceBudgets'),
        getResources('resourcePropertyTypes'),
        listUsers(),
      ])
      setSources(srcs || [])
      setProjects(projs || [])
      setLocations(locs || [])
      setBudgets(bdgts || [])
      setPropertyTypes(pts || [])
      setAllUsers(usrs || [])
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to load options criteria', sev: 'error' })
    }
  }

  useEffect(() => {
    void loadData()
    void loadFormOptions()
  }, [])

  // Filtered lists of users
  const leadManagersList = allUsers.filter(
    (u) => u.role === 'leadManager' || u.role === 'teamLead'
  )

  const associatesList = allUsers.filter(
    (u) => u.role === 'sales' || u.role === 'teamLead' || u.role === 'leadManager'
  )

  // Filter roundrobin associates based on selected lead managers
  const roundRobinAssociatesList = useMemo(() => {
    if (selectedLeadManagers.length === 0) return associatesList
    const managerEmails = selectedLeadManagers.map((m) => m.email.toLowerCase())
    return associatesList.filter(
      (u) => u.reporting_to && managerEmails.includes(u.reporting_to.toLowerCase())
    )
  }, [selectedLeadManagers, associatesList])

  const generateUuid = () => {
    return 'ld-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
  }

  const handleOpenAdd = () => {
    setSource('')
    setSelectedProjects([])
    setSelectedLocations([])
    setSelectedBudgets([])
    setSelectedPropertyTypes([])
    setAssociate(null)
    setSelectedLeadManagers([])
    setRoundRobinAssociates([])
    setActiveTab('normal')
    setDialogOpen(true)
  }

  const onSubmitNormal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) {
      setToast({ open: true, msg: 'Please select a Lead Source', sev: 'error' })
      return
    }
    if (!associate) {
      setToast({ open: true, msg: 'Please select an associate', sev: 'error' })
      return
    }

    const payload = {
      source,
      project: selectedProjects.map((p) => String(p.projectName || p.name || p.value || p)),
      location: selectedLocations.map((l) => String(l.locationName || l.name || l.value || l)),
      budget: selectedBudgets.map((b) => String(b.budgetValue || b.name || b.value || b)),
      property_type: selectedPropertyTypes.map((pt) => String(pt.propertyType || pt.name || pt.value || pt)),
      users: [
        {
          uid: associate._id || associate.id || '',
          user_email: associate.email,
        },
      ],
      usersQueue: [associate.email],
      leadManager_users: [],
      distribution_type: 'Normal' as const,
      userIndex: 0,
      lead_dist_id: generateUuid(),
    }

    setLoading(true)
    try {
      await createDistributionRule(payload)
      setToast({ open: true, msg: 'Lead Distribution Created!!', sev: 'success' })
      setDialogOpen(false)
      void loadData()
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to create normal assignment logic', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onSubmitRoundrobin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) {
      setToast({ open: true, msg: 'Please select a Lead Source', sev: 'error' })
      return
    }
    if (selectedLeadManagers.length === 0) {
      setToast({ open: true, msg: 'Please select a Lead Manager', sev: 'error' })
      return
    }
    if (roundRobinAssociates.length === 0) {
      setToast({ open: true, msg: 'Please select an Associate', sev: 'error' })
      return
    }

    const payload = {
      source,
      project: selectedProjects.map((p) => String(p.projectName || p.name || p.value || p)),
      location: selectedLocations.map((l) => String(l.locationName || l.name || l.value || l)),
      budget: selectedBudgets.map((b) => String(b.budgetValue || b.name || b.value || b)),
      property_type: selectedPropertyTypes.map((pt) => String(pt.propertyType || pt.name || pt.value || pt)),
      users: roundRobinAssociates.map((a) => ({
        uid: a._id || a.id || '',
        user_email: a.email,
      })),
      usersQueue: roundRobinAssociates.map((a) => a.email),
      leadManager_users: selectedLeadManagers.map((m) => ({
        uid: m._id || m.id || '',
        user_email: m.email,
      })),
      distribution_type: 'Roundrobin' as const,
      userIndex: 0,
      lead_dist_id: generateUuid(),
    }

    setLoading(true)
    try {
      await createDistributionRule(payload)
      setToast({ open: true, msg: 'Lead Distribution Created!!', sev: 'success' })
      setDialogOpen(false)
      void loadData()
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to create roundrobin assignment logic', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this Lead Distribution Logic?',
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteDistributionRule(id)
          setToast({ open: true, msg: 'Lead Distribution Deleted!!', sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to delete distribution logic', sev: 'error' })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Build columns dynamically from headers configuration
  const columns = useMemo<GridColDef<LeadDistributionRule>[]>(() => {
    const activeHeaders = [...dynamicHeaders]
      .filter((h) => h.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const mappedCols: GridColDef<LeadDistributionRule>[] = activeHeaders.map((c) => {
      return {
        field: c.key,
        headerName: c.label,
        flex: c.key === 'users' ? 1.5 : 1.2,
        minWidth: c.key === 'users' ? 200 : 140,
        sortable: c.sortable !== false,
        renderCell: (p) => {
          const val = p.value
          if (c.key === 'users') {
            const list = p.row.users || []
            return list.map((u) => u.user_email).join(', ')
          }
          if (['project', 'location', 'budget', 'property_type'].includes(c.key)) {
            return val && val.length > 0 ? val.join(', ') : 'All'
          }
          if (c.key === 'distribution_type') {
            return <Box sx={{ color: 'primary.main', fontWeight: 600 }}>{val}</Box>
          }
          if (c.key === 'source') {
            return <Box sx={{ fontWeight: 600 }}>{val}</Box>
          }
          return val ? String(val) : '—'
        }
      }
    })

    // Append actions column at the end
    mappedCols.push({
      field: '__actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    })

    return mappedCols
  }, [dynamicHeaders])

  // Helpers to check if form fields are configured visible
  const isFieldVisible = (key: string) => {
    if (dynamicFormFields.length === 0) return true // Default fallback
    return dynamicFormFields.some((f) => f.key === key && f.visible !== false)
  }

  // Sort helper for dialog fields
  const getFieldOrder = (key: string, defaultOrder: number) => {
    const f = dynamicFormFields.find((field) => field.key === key)
    return f ? f.order || defaultOrder : defaultOrder
  }

  // Dynamically rendered fields list for Normal Assignment Form
  const normalFields = useMemo(() => {
    const fields = []
    if (isFieldVisible('source')) {
      fields.push({
        key: 'source',
        order: getFieldOrder('source', 1),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="source">
            <TextField
              select
              label="Lead Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              fullWidth
              required
              size="medium"
            >
              {sources.map((src: any) => (
                <MenuItem key={src.id || src._id} value={src.leadSource}>
                  {src.leadSource}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )
      })
    }
    if (isFieldVisible('project')) {
      fields.push({
        key: 'project',
        order: getFieldOrder('project', 2),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="project">
            <Autocomplete
              multiple
              options={projects}
              getOptionLabel={(p) => p.projectName || p.name || p}
              value={selectedProjects}
              onChange={(_, val) => setSelectedProjects(val)}
              renderInput={(params) => <TextField {...params} label="Project" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('location')) {
      fields.push({
        key: 'location',
        order: getFieldOrder('location', 3),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="location">
            <Autocomplete
              multiple
              options={locations}
              getOptionLabel={(l) => l.locationName || l.name || l}
              value={selectedLocations}
              onChange={(_, val) => setSelectedLocations(val)}
              renderInput={(params) => <TextField {...params} label="Location" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('budget')) {
      fields.push({
        key: 'budget',
        order: getFieldOrder('budget', 4),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="budget">
            <Autocomplete
              multiple
              options={budgets}
              getOptionLabel={(b) => b.budgetValue || b.name || b}
              value={selectedBudgets}
              onChange={(_, val) => setSelectedBudgets(val)}
              renderInput={(params) => <TextField {...params} label="Budget" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('property_type')) {
      fields.push({
        key: 'property_type',
        order: getFieldOrder('property_type', 5),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="property_type">
            <Autocomplete
              multiple
              options={propertyTypes}
              getOptionLabel={(pt) => pt.propertyType || pt.name || pt}
              value={selectedPropertyTypes}
              onChange={(_, val) => setSelectedPropertyTypes(val)}
              renderInput={(params) => <TextField {...params} label="Property Type" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('users')) {
      fields.push({
        key: 'users',
        order: getFieldOrder('users', 7),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="users">
            <Autocomplete
              options={associatesList}
              getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
              value={associate}
              onChange={(_, val) => setAssociate(val)}
              renderInput={(params) => <TextField {...params} label="Associate" required size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    return fields.sort((a, b) => a.order - b.order).map((f) => f.element)
  }, [
    dynamicFormFields,
    source,
    sources,
    projects,
    selectedProjects,
    locations,
    selectedLocations,
    budgets,
    selectedBudgets,
    propertyTypes,
    selectedPropertyTypes,
    associatesList,
    associate,
  ])

  // Dynamically rendered fields list for Roundrobin Assignment Form
  const roundRobinFields = useMemo(() => {
    const fields = []
    if (isFieldVisible('source')) {
      fields.push({
        key: 'source',
        order: getFieldOrder('source', 1),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="source">
            <TextField
              select
              label="Lead Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              fullWidth
              required
              size="medium"
            >
              {sources.map((src: any) => (
                <MenuItem key={src.id || src._id} value={src.leadSource}>
                  {src.leadSource}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )
      })
    }
    if (isFieldVisible('project')) {
      fields.push({
        key: 'project',
        order: getFieldOrder('project', 2),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="project">
            <Autocomplete
              multiple
              options={projects}
              getOptionLabel={(p) => p.projectName || p.name || p}
              value={selectedProjects}
              onChange={(_, val) => setSelectedProjects(val)}
              renderInput={(params) => <TextField {...params} label="Project" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('location')) {
      fields.push({
        key: 'location',
        order: getFieldOrder('location', 3),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="location">
            <Autocomplete
              multiple
              options={locations}
              getOptionLabel={(l) => l.locationName || l.name || l}
              value={selectedLocations}
              onChange={(_, val) => setSelectedLocations(val)}
              renderInput={(params) => <TextField {...params} label="Location" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('budget')) {
      fields.push({
        key: 'budget',
        order: getFieldOrder('budget', 4),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="budget">
            <Autocomplete
              multiple
              options={budgets}
              getOptionLabel={(b) => b.budgetValue || b.name || b}
              value={selectedBudgets}
              onChange={(_, val) => setSelectedBudgets(val)}
              renderInput={(params) => <TextField {...params} label="Budget" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('property_type')) {
      fields.push({
        key: 'property_type',
        order: getFieldOrder('property_type', 5),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="property_type">
            <Autocomplete
              multiple
              options={propertyTypes}
              getOptionLabel={(pt) => pt.propertyType || pt.name || pt}
              value={selectedPropertyTypes}
              onChange={(_, val) => setSelectedPropertyTypes(val)}
              renderInput={(params) => <TextField {...params} label="Property Type" size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    // Roundrobin always lists lead manager + associates (mapped under users field key)
    if (isFieldVisible('users')) {
      fields.push({
        key: 'leadManager',
        order: getFieldOrder('users', 6) - 0.5,
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="leadManager">
            <Autocomplete
              multiple
              options={leadManagersList}
              getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
              value={selectedLeadManagers}
              onChange={(_, val) => setSelectedLeadManagers(val)}
              renderInput={(params) => <TextField {...params} label="Lead Manager" required size="medium" fullWidth />}
            />
          </Grid>
        )
      })
      fields.push({
        key: 'users',
        order: getFieldOrder('users', 6),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="users">
            <Autocomplete
              multiple
              options={roundRobinAssociatesList}
              getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
              value={roundRobinAssociates}
              onChange={(_, val) => setRoundRobinAssociates(val)}
              renderInput={(params) => <TextField {...params} label="Associate" required size="medium" fullWidth />}
            />
          </Grid>
        )
      })
    }
    return fields.sort((a, b) => a.order - b.order).map((f) => f.element)
  }, [
    dynamicFormFields,
    source,
    sources,
    projects,
    selectedProjects,
    locations,
    selectedLocations,
    budgets,
    selectedBudgets,
    propertyTypes,
    selectedPropertyTypes,
    leadManagersList,
    selectedLeadManagers,
    roundRobinAssociatesList,
    roundRobinAssociates,
  ])

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Lead Distribution"
        subtitle="Manage lead distribution rules and assignees."
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add Logic
          </Button>
        }
      >
        <Box sx={{ flex: 1, minHeight: 400 }}>
          <AppDataGrid
            rows={items}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
          />
        </Box>
      </AppCard>

      {/* Dialog modal for creating logic rules */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Lead Distribution Logic</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Normal Assignment" value="normal" sx={{ fontWeight: 600, textTransform: 'none' }} />
              <Tab label="Roundrobin Assignment" value="roundrobin" sx={{ fontWeight: 600, textTransform: 'none' }} />
            </Tabs>
          </Box>

          {activeTab === 'normal' && (
            <Box component="form" onSubmit={onSubmitNormal} id="normal-logic-form">
              <Grid container spacing={3}>
                {normalFields}
              </Grid>
            </Box>
          )}

          {activeTab === 'roundrobin' && (
            <Box component="form" onSubmit={onSubmitRoundrobin} id="roundrobin-logic-form">
              <Grid container spacing={3}>
                {roundRobinFields}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={activeTab === 'normal' ? 'normal-logic-form' : 'roundrobin-logic-form'}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Apply Logic
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.sev}
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
