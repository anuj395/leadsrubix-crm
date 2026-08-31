import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Checkbox from '@mui/material/Checkbox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import {
  createRotationRule,
  getRotationRuleById,
  updateRotationRule,
} from '@/services/leadDistributionService'
import { getResources, getLeadSources } from '@/services/resourcesService'
import { useAuth } from '@/hooks/useAuth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />
const checkedIcon = <CheckBoxIcon fontSize="small" />

export default function ReassignLogicPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = Boolean(editId)

  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
  } = useSuperAdminScope(isSuperAdmin)

  const activeOrgId = isSuperAdmin ? selectedOrg : ((user as any)?.organizationId || (user as any)?.organization_id)
  const activeIndCode = isSuperAdmin ? selectedIndustry : String((user as any)?.industryId || '').toLowerCase().trim()

  const isAllowedRole = user?.role === 'admin' || isSuperAdmin
  const { can_add, can_edit, loading: permsLoading } = useActionPermission('leadRotation')
  const hasPermission = isEdit ? can_edit : can_add

  // Form Field States
  const [source, setSource] = useState<string>('')
  const [project, setProject] = useState<string[]>([])
  const [rotationTime, setRotationTime] = useState<number | string>(15)
  const [assignedUsers, setAssignedUsers] = useState<string[]>([])
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])

  // Dropdown Options
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [projectsList, setProjectsList] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])

  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Manager Candidates (Team Leads, Lead Managers, Admins)
  const managerCandidates = useMemo(() => {
    return allUsers.filter(u => ['leadManager', 'teamLead', 'admin', 'superAdmin'].includes(u.role))
  }, [allUsers])

  // Full Recursive Hierarchy Downward Traversal
  const getSubtreeReportees = (managerIds: string[], usersList: AdminUser[]): AdminUser[] => {
    if (!managerIds || managerIds.length === 0) return usersList

    // Collect all identifiers (id, _id, uid, email) for the selected managers
    const selectedManagerObjects = usersList.filter(u =>
      managerIds.includes(String(u._id || u.id)) ||
      ((u as any).uid && managerIds.includes((u as any).uid)) ||
      (u.email && managerIds.includes(u.email.toLowerCase()))
    )

    const managerKeys = new Set<string>()
    selectedManagerObjects.forEach(m => {
      if (m._id) managerKeys.add(String(m._id).toLowerCase())
      if (m.id) managerKeys.add(String(m.id).toLowerCase())
      if ((m as any).uid) managerKeys.add(String((m as any).uid).toLowerCase())
      if (m.email) managerKeys.add(String(m.email).toLowerCase().trim())
    })

    const result: AdminUser[] = []
    const visited = new Set<string>(managerKeys)
    let frontier = Array.from(managerKeys)

    while (frontier.length > 0) {
      const nextFrontier: string[] = []
      for (const u of usersList) {
        const uId = String(u._id || u.id || '').toLowerCase()
        if (!uId || visited.has(uId)) continue

        const rep = String(u.reportingTo || (u as any).reporting_to || '').toLowerCase().trim()
        const repEmail = String((u as any).reportingToEmail || (u as any).reporting_to_email || '').toLowerCase().trim()

        if (frontier.includes(rep) || (repEmail && frontier.includes(repEmail))) {
          visited.add(uId)
          result.push(u)
          nextFrontier.push(uId)
          if (u.id) nextFrontier.push(String(u.id).toLowerCase())
          if ((u as any).uid) nextFrontier.push(String((u as any).uid).toLowerCase())
          if (u.email) nextFrontier.push(String(u.email).toLowerCase().trim())
        }
      }
      frontier = nextFrontier
    }

    return result
  }

  // Filter Assigned Users based on Selected Manager(s) using recursive hierarchy
  const candidateReportees = useMemo(() => {
    if (selectedManagers.length === 0) return allUsers
    return getSubtreeReportees(selectedManagers, allUsers)
  }, [allUsers, selectedManagers])

  // When manager changes, auto-select manager's team reportees
  const handleManagerChange = (managerIds: string[]) => {
    setSelectedManagers(managerIds)
    if (managerIds.length > 0) {
      const teamUsers = getSubtreeReportees(managerIds, allUsers)
      const teamUserIds = teamUsers.map(u => String(u._id || u.id))
      setAssignedUsers(teamUserIds)
    } else {
      setAssignedUsers([])
    }
  }

  // Load dropdown options whenever scope changes
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingOptions(true)
      try {
        const [usrs, sourcesRes, projectsRes] = await Promise.all([
          listUsers(activeIndCode, true, activeOrgId),
          getLeadSources(activeOrgId, activeIndCode),
          getResources('resourceProjects', activeOrgId, activeIndCode).catch(() => [])
        ])

        if (cancelled) return

        setAllUsers(usrs || [])

        // Dynamic Lead Sources from Resources master (ZERO hardcoding)
        setLeadSources(sourcesRes || [])

        const pData: any[] = Array.isArray(projectsRes) ? projectsRes : ((projectsRes as any)?.data || [])
        const pList = pData.map((p: any) => p.projectName || p.project_name || p.name || p.title || '').filter(Boolean)
        setProjectsList(Array.from(new Set(pList)))
      } catch (err) {
        console.error('Failed to load rotation dropdown options', err)
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeOrgId, activeIndCode])

  // Pre-load existing rule in Edit mode
  useEffect(() => {
    if (!isEdit || !editId) return
    void (async () => {
      setLoading(true)
      try {
        const rule: any = await getRotationRuleById(editId)
        if (rule) {
          setSource(rule.source || '')
          setProject(Array.isArray(rule.project) ? rule.project : (rule.project ? [rule.project] : []))
          setRotationTime(rule.rotationTime !== undefined ? rule.rotationTime : (rule.rotation_time || 15))

          const uIds = (rule.users || []).map((u: any) => String(u.uid || u._id || u.id || '')).filter(Boolean)
          const uEmails = (rule.users || []).map((u: any) => String(u.user_email || u.email || '').toLowerCase().trim()).filter(Boolean)
          const matchedUserIds = allUsers
            .filter((u) => {
              const uid = String(u._id || u.id || '')
              const uEmail = String(u.email || '').toLowerCase().trim()
              return (uid && uIds.includes(uid)) || (uEmail && uEmails.includes(uEmail))
            })
            .map((u) => String(u._id || u.id))
          setAssignedUsers(matchedUserIds)

          const mIds = (rule.leadManagerUsers || rule.lead_manager_users || []).map((m: any) => String(m.uid || m._id || m.id || '')).filter(Boolean)
          const mEmails = (rule.leadManagerUsers || rule.lead_manager_users || []).map((m: any) => String(m.user_email || m.email || '').toLowerCase().trim()).filter(Boolean)
          const matchedManagerIds = allUsers
            .filter((u) => {
              const uid = String(u._id || u.id || '')
              const uEmail = String(u.email || '').toLowerCase().trim()
              return (uid && mIds.includes(uid)) || (uEmail && mEmails.includes(uEmail))
            })
            .map((u) => String(u._id || u.id))
          setSelectedManagers(matchedManagerIds)
        }
      } catch (err) {
        console.error('Failed to load existing rotation rule', err)
        setToast({ open: true, msg: 'Failed to load rotation rule for editing', sev: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [isEdit, editId, allUsers.length])

  const generateUuid = () => {
    return 'reloc-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!source) {
      setToast({ open: true, msg: 'Please select a Lead Source', sev: 'error' })
      return
    }

    if (!rotationTime || Number(rotationTime) <= 0) {
      setToast({ open: true, msg: 'Please enter a valid Rotation Time (in minutes)', sev: 'error' })
      return
    }

    if (assignedUsers.length === 0) {
      setToast({ open: true, msg: 'Please select at least one Assigned User for Rotation Queue', sev: 'error' })
      return
    }

    setLoading(true)
    try {
      const selectedUsers = allUsers.filter((u) => assignedUsers.includes(String(u._id || u.id)))
      const selectedManagersList = allUsers.filter((u) => selectedManagers.includes(String(u._id || u.id)))

      const payload: any = {
        organizationId: isSuperAdmin ? selectedOrg : undefined,
        industryId: isSuperAdmin ? selectedIndustry : undefined,
        source: source,
        project: project,
        rotationTime: Number(rotationTime),
        users: selectedUsers.map((u) => ({ uid: String(u._id || u.id || ''), user_email: String(u.email || '') })),
        usersQueue: selectedUsers.map((u) => String(u.email || '')),
        leadManagerUsers: selectedManagersList.map((m) => ({ uid: String(m._id || m.id || ''), user_email: String(m.email || '') })),
        userIndex: 0,
        relocId: isEdit ? undefined : generateUuid(),
      }

      if (isEdit && editId) {
        await updateRotationRule(editId, payload)
        setToast({ open: true, msg: 'Reassign Logic Rule Updated Successfully!', sev: 'success' })
      } else {
        await createRotationRule(payload)
        setToast({ open: true, msg: 'Reassign Logic Rule Created Successfully!', sev: 'success' })
      }
      setTimeout(() => navigate('/reassign/list'), 1200)
    } catch (err: any) {
      setToast({
        open: true,
        msg: err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} reassign logic rule`,
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isAllowedRole || (!permsLoading && !hasPermission)) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: Reassign Logic is restricted to Admin role only.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {isSuperAdmin && (
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />
      )}

      <AppCard
        title={isEdit ? 'Edit Reassign Logic Rule' : 'Reassign Logic Section'}
        subtitle={isEdit ? 'Update existing unattended lead auto-rotation timeout parameters.' : 'Configure unattended lead auto-rotation logic rules.'}
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
        <Typography variant="body2" color="error" sx={{ mb: 2.5, fontWeight: 500 }}>
          (Note: Please configure Working Days & Holidays first. Reassign logic rotates leads during active business hours only.)
        </Typography>

        {loadingOptions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              {/* 1. Lead Source */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Lead Source"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                >
                  <MenuItem value="">
                    <em>Select Source</em>
                  </MenuItem>
                  {leadSources.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 2. Project (Multi-select with Checkboxes) */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={1}
                  options={projectsList}
                  disableCloseOnSelect
                  value={project}
                  onChange={(_, newValue) => setProject(newValue)}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option}
                          size="small"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500 }}
                        />
                      )
                    })
                  }
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={option}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Project"
                      placeholder={project.length === 0 ? 'Select Projects (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 3. Rotation Time (mins) */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Rotation Time (mins) *"
                  required
                  value={rotationTime}
                  onChange={(e) => setRotationTime(e.target.value)}
                  placeholder="e.g. 15"
                  inputProps={{ min: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                    },
                  }}
                  helperText="Time after which an unattended lead rotates to next agent."
                />
                <Stack direction="row" spacing={1} sx={{ mt: 0.8 }}>
                  {[15, 30, 60, 120].map((preset) => (
                    <Chip
                      key={preset}
                      label={`${preset}m`}
                      size="small"
                      clickable
                      color={Number(rotationTime) === preset ? 'primary' : 'default'}
                      onClick={() => setRotationTime(preset)}
                      sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600 }}
                    />
                  ))}
                </Stack>
              </Grid>

              {/* 4. Lead Managers (Recursive Filter & Auto-Select Team) */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={1}
                  options={managerCandidates}
                  getOptionLabel={(m) => m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email}
                  isOptionEqualToValue={(option, val) => String(option._id || option.id) === String(val._id || val.id)}
                  value={managerCandidates.filter(m => selectedManagers.includes(String(m._id || m.id)))}
                  onChange={(_, selected) => {
                    handleManagerChange(selected.map(m => String(m._id || m.id)))
                  }}
                  disableCloseOnSelect
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      )
                    })
                  }
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={String(option._id || option.id)}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email} ({option.email})
                        </Typography>
                        {option.role && (
                          <Chip
                            label={option.role}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 1, height: 20, fontSize: '0.72rem', textTransform: 'capitalize' }}
                          />
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Manage By (Lead Managers)"
                      placeholder={selectedManagers.length === 0 ? 'Select Managers (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 5. Assigned Users (Multi-Select with Checkboxes & Role Badges) */}
              <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={3}
                  options={candidateReportees}
                  getOptionLabel={(u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                  isOptionEqualToValue={(option, val) => String(option._id || option.id) === String(val._id || val.id)}
                  value={candidateReportees.filter(u => assignedUsers.includes(String(u._id || u.id)))}
                  onChange={(_, selected) => {
                    setAssignedUsers(selected.map(u => String(u._id || u.id)))
                  }}
                  disableCloseOnSelect
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email}
                          size="small"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500 }}
                        />
                      )
                    })
                  }
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={String(option._id || option.id)}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email} ({option.email})
                        </Typography>
                        {option.role && (
                          <Chip
                            label={option.role}
                            size="small"
                            sx={{ ml: 1, height: 20, fontSize: '0.72rem', textTransform: 'capitalize' }}
                          />
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned Users (Rotation Queue) *"
                      placeholder={assignedUsers.length === 0 ? 'Select Users' : ''}
                      required={assignedUsers.length === 0}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/reassign/list')}
                    sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '8px' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      borderRadius: '8px',
                      backgroundColor: '#1E293B',
                      '&:hover': { backgroundColor: '#0F172A' },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isEdit ? (
                      'Update Reassign Logic'
                    ) : (
                      'Apply Reassign Logic'
                    )}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
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


