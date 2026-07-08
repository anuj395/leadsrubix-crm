import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import Paper from '@mui/material/Paper'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { getResources } from '@/services/resourcesService'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { createRotationRule } from '@/services/leadDistributionService'

const inputSx = {
  width: '100%',
}

const multiInputSx = {
  width: '100%',
}

export default function ReassignLogicPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Lists
  const [sources, setSources] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])

  // Selection states
  const [source, setSource] = useState<string>('')
  const [selectedProjects, setSelectedProjects] = useState<any[]>([])
  const [rotationTime, setRotationTime] = useState<number>(30)

  // Roundrobin assignment selection
  const [selectedLeadManagers, setSelectedLeadManagers] = useState<AdminUser[]>([])
  const [selectedAssociates, setSelectedAssociates] = useState<AdminUser[]>([])

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true)
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
      } finally {
        setLoading(false)
      }
    }
    void loadOptions()
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
      setTimeout(() => navigate('/reassign/list'), 1500)
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to create rotation logic', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <AppCard
        title="Reassign Logic Section"
        subtitle="Configure unattended lead auto-rotation logic rules."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reassign/list')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 500 }}>
          (Note: Please configure Days first. Reassign logic can be created only after that.)
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mt: 2 }}>
          <Box component="form" onSubmit={onSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  size="small"
                  label="Lead Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  required
                  sx={inputSx}
                >
                  {sources.map((src: any) => (
                    <MenuItem key={src.id || src._id} value={src.leadSource}>
                      {src.leadSource}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={projects}
                  getOptionLabel={(p) => p.projectName || p.name || p}
                  value={selectedProjects}
                  onChange={(_, val) => setSelectedProjects(val)}
                  sx={multiInputSx}
                  renderInput={(params) => <TextField {...params} label="Project" fullWidth />}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  size="small"
                  label="Rotation Time (in mins)"
                  type="number"
                  value={rotationTime}
                  onChange={(e) => setRotationTime(Number(e.target.value))}
                  required
                  sx={inputSx}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={leadManagersList}
                  getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                  value={selectedLeadManagers}
                  onChange={(_, val) => setSelectedLeadManagers(val)}
                  sx={multiInputSx}
                  renderInput={(params) => <TextField {...params} label="Lead Manager" required fullWidth />}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={filteredAssociatesList}
                  getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                  value={selectedAssociates}
                  onChange={(_, val) => setSelectedAssociates(val)}
                  sx={multiInputSx}
                  renderInput={(params) => <TextField {...params} label="Associate" required fullWidth />}
                />
              </Grid>

              {/* Right-aligned action button */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 2 }}>
                  <Button onClick={() => navigate('/reassign/list')} variant="outlined" color="secondary" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                    Apply Reassign Logic
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </AppCard>

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
