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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import {
  getRotationRules,
  deleteRotationRule,
  createRotationRule,
  type LeadRotationRule,
} from '@/services/leadDistributionService'
import { getResources } from '@/services/resourcesService'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { resolveScreen } from '@/services/screenAdminService'
import { useAuth } from '@/hooks/useAuth'

export default function ReassignListPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<LeadRotationRule[]>([])
  const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([])
  const [dynamicFormFields, setDynamicFormFields] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form Option Lists
  const [sources, setSources] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])

  // Selection states
  const [source, setSource] = useState<string>('')
  const [selectedProjects, setSelectedProjects] = useState<any[]>([])
  const [rotationTime, setRotationTime] = useState<number>(30)

  // Selection assignees
  const [selectedLeadManagers, setSelectedLeadManagers] = useState<AdminUser[]>([])
  const [selectedAssociates, setSelectedAssociates] = useState<AdminUser[]>([])

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
        getRotationRules(),
        resolveScreen({
          screen_key: 'leadRotation',
          industry_code: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          role_key: user?.role === 'superAdmin' ? 'admin' : undefined,
        })
      ])
      setItems(rulesList)
      setDynamicHeaders(resolved?.table_headers || [])
      setDynamicFormFields(resolved?.form_fields || [])
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to load rotation rules or screen configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadFormOptions = async () => {
    try {
      const [srcs, projs, usrs] = await Promise.all([
        getResources('resourceLeadSources'),
        getResources('resourceProjects'),
        listUsers(),
      ])
      setSources(srcs || [])
      setProjects(projs || [])
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
  const filteredAssociatesList = useMemo(() => {
    if (selectedLeadManagers.length === 0) return associatesList
    const managerEmails = selectedLeadManagers.map((m) => m.email.toLowerCase())
    return associatesList.filter(
      (u) => u.reporting_to && managerEmails.includes(u.reporting_to.toLowerCase())
    )
  }, [selectedLeadManagers, associatesList])

  const generateUuid = () => {
    return 'reloc-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
  }

  const handleOpenAdd = () => {
    setSource('')
    setSelectedProjects([])
    setRotationTime(30)
    setSelectedLeadManagers([])
    setSelectedAssociates([])
    setDialogOpen(true)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) {
      setToast({ open: true, msg: 'Please select a Lead Source', sev: 'error' })
      return
    }
    if (selectedLeadManagers.length === 0) {
      setToast({ open: true, msg: 'Please select a Lead Manager', sev: 'error' })
      return
    }
    if (selectedAssociates.length === 0) {
      setToast({ open: true, msg: 'Please select an Associate', sev: 'error' })
      return
    }
    if (!rotationTime || rotationTime <= 0) {
      setToast({ open: true, msg: 'Please specify a valid Rotation Time (in mins)', sev: 'error' })
      return
    }

    const payload = {
      source,
      project: selectedProjects.map((p) => String(p.projectName || p.name || p.value || p)),
      rotation_time: Number(rotationTime),
      users: selectedAssociates.map((a) => ({
        uid: a._id || a.id || '',
        user_email: a.email,
      })),
      usersQueue: selectedAssociates.map((a) => a.email),
      leadManager_users: selectedLeadManagers.map((m) => ({
        uid: m._id || m.id || '',
        user_email: m.email,
      })),
      userIndex: 0,
      reloc_id: generateUuid(),
    }

    setLoading(true)
    try {
      await createRotationRule(payload)
      setToast({ open: true, msg: 'Reassign Created!!', sev: 'success' })
      setDialogOpen(false)
      void loadData()
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to create rotation logic', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this Lead Rotation Logic?',
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteRotationRule(id)
          setToast({ open: true, msg: 'Lead Rotation Deleted!!', sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to delete rotation logic', sev: 'error' })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Build columns dynamically from headers configuration
  const columns = useMemo<GridColDef<LeadRotationRule>[]>(() => {
    const activeHeaders = [...dynamicHeaders]
      .filter((h) => h.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const mappedCols: GridColDef<LeadRotationRule>[] = activeHeaders.map((c) => {
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
          if (c.key === 'project') {
            return val && val.length > 0 ? val.join(', ') : 'All'
          }
          if (c.key === 'rotation_time') {
            return val
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

  // Dynamically rendered fields list
  const formFields = useMemo(() => {
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
    if (isFieldVisible('rotation_time')) {
      fields.push({
        key: 'rotation_time',
        order: getFieldOrder('rotation_time', 3),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="rotation_time">
            <TextField
              label="Rotation Time (in mins)"
              type="number"
              value={rotationTime}
              onChange={(e) => setRotationTime(Number(e.target.value))}
              fullWidth
              required
              size="medium"
            />
          </Grid>
        )
      })
    }
    if (isFieldVisible('users')) {
      fields.push({
        key: 'leadManager',
        order: getFieldOrder('users', 4) - 0.5,
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
        order: getFieldOrder('users', 4),
        element: (
          <Grid size={{ xs: 12, sm: 4 }} key="users">
            <Autocomplete
              multiple
              options={filteredAssociatesList}
              getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
              value={selectedAssociates}
              onChange={(_, val) => setSelectedAssociates(val)}
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
    rotationTime,
    leadManagersList,
    selectedLeadManagers,
    filteredAssociatesList,
    selectedAssociates,
  ])

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Lead Distribution"
        subtitle="Manage lead rotation parameters and unattended reassignment logs."
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

      {/* Dialog modal for creating rotation rules */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Reassign Logic</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="error" sx={{ mb: 3, fontWeight: 500 }}>
            (Note: Please configure Days first. Reassign logic can be created only after that.)
          </Typography>

          <Box component="form" onSubmit={onSubmit} id="reassign-logic-form">
            <Grid container spacing={3}>
              {formFields}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="reassign-logic-form" variant="contained" color="primary" disabled={loading}>
            Apply Reassign Logic
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
