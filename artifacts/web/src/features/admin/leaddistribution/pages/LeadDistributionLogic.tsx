import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import Paper from '@mui/material/Paper'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { getResources } from '@/services/resourcesService'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { createDistributionRule } from '@/services/leadDistributionService'

const inputSx = {
  width: '100%',
}

const multiInputSx = {
  width: '100%',
}

export default function LeadDistributionLogicPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'normal' | 'roundrobin'>('normal')

  // Lists
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

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true)
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
      setTimeout(() => navigate('/leadDistribution/list'), 1500)
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
      setTimeout(() => navigate('/leadDistribution/list'), 1500)
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to create roundrobin assignment logic', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <AppCard
        title="Lead Distributor Logic Section"
        subtitle="Configure automated normal and round-robin lead distribution rules."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/leadDistribution/list')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        
        {/* Navigation Tabs */}
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
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box component="form" onSubmit={onSubmitNormal}>
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
                  <Autocomplete
                    multiple
                    size="small"
                    options={locations}
                    getOptionLabel={(l) => l.locationName || l.name || l}
                    value={selectedLocations}
                    onChange={(_, val) => setSelectedLocations(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Location" fullWidth />}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={budgets}
                    getOptionLabel={(b) => b.budgetValue || b.name || b}
                    value={selectedBudgets}
                    onChange={(_, val) => setSelectedBudgets(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Budget" fullWidth />}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={propertyTypes}
                    getOptionLabel={(pt) => pt.propertyType || pt.name || pt}
                    value={selectedPropertyTypes}
                    onChange={(_, val) => setSelectedPropertyTypes(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Property Type" fullWidth />}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    size="small"
                    options={associatesList}
                    getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                    value={associate}
                    onChange={(_, val) => setAssociate(val)}
                    sx={inputSx}
                    renderInput={(params) => <TextField {...params} label="Associate" required fullWidth />}
                  />
                </Grid>

                {/* Right-aligned action buttons */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 2 }}>
                    <Button onClick={() => navigate('/leadDistribution/list')} variant="outlined" color="secondary" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Apply Normal Assignment
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}

        {activeTab === 'roundrobin' && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box component="form" onSubmit={onSubmitRoundrobin}>
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
                  <Autocomplete
                    multiple
                    size="small"
                    options={locations}
                    getOptionLabel={(l) => l.locationName || l.name || l}
                    value={selectedLocations}
                    onChange={(_, val) => setSelectedLocations(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Location" fullWidth />}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={budgets}
                    getOptionLabel={(b) => b.budgetValue || b.name || b}
                    value={selectedBudgets}
                    onChange={(_, val) => setSelectedBudgets(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Budget" fullWidth />}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={propertyTypes}
                    getOptionLabel={(pt) => pt.propertyType || pt.name || pt}
                    value={selectedPropertyTypes}
                    onChange={(_, val) => setSelectedPropertyTypes(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Property Type" fullWidth />}
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
                    options={roundRobinAssociatesList}
                    getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                    value={roundRobinAssociates}
                    onChange={(_, val) => setRoundRobinAssociates(val)}
                    sx={multiInputSx}
                    renderInput={(params) => <TextField {...params} label="Associate" required fullWidth />}
                  />
                </Grid>

                {/* Right-aligned action buttons */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 2 }}>
                    <Button onClick={() => navigate('/leadDistribution/list')} variant="outlined" color="secondary" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Apply Roundrobin Assignment
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}

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
