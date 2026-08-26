import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Checkbox from '@mui/material/Checkbox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import {
  createDistributionRule,
  updateDistributionRule,
  getDistributionRuleById,
  type LeadDistributionRule
} from '@/services/leadDistributionService'
import { getResources } from '@/services/resourcesService'
import { api } from '@/services/api'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useAuth } from '@/hooks/useAuth'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />
const checkedIcon = <CheckBoxIcon fontSize="small" />

export default function LeadDistributionLogicPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id') || searchParams.get('leadDistId') || ''
  const isEdit = Boolean(editId)

  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const { can_add, can_edit, loading: permsLoading } = useActionPermission('leadDistribution')
  const hasPermission = isEdit ? can_edit : can_add

  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [activeTab, setActiveTab] = useState<'Normal' | 'Roundrobin'>('Normal')

  // Form Field State
  const [source, setSource] = useState('')
  const [project, setProject] = useState<string[]>([])
  const [location, setLocation] = useState<string[]>([])
  const [budget, setBudget] = useState<string[]>([])
  const [propertyType, setPropertyType] = useState<string[]>([])

  // User & Manager Assignment State
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  const [assignedUserNormal, setAssignedUserNormal] = useState<string>('')
  const [assignedUsersRoundrobin, setAssignedUsersRoundrobin] = useState<string[]>([])

  // Master Data Options
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [projectsList, setProjectsList] = useState<string[]>([])
  const [locationsList, setLocationsList] = useState<string[]>([])
  const [budgetsList, setBudgetsList] = useState<string[]>([])
  const [propertyTypesList, setPropertyTypesList] = useState<string[]>([])

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const activeOrgId = isSuperAdmin ? selectedOrg : ((user as any)?.organizationId || (user as any)?.organization_id)
  const activeIndCode = isSuperAdmin ? selectedIndustry : (user as any)?.industryId

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

    // Traverse downward through all sub-levels (e.g. Admin -> Lead Manager -> Team Lead -> Sales)
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

  // When manager changes in Roundrobin, auto-select manager's team
  const handleManagerChange = (managerIds: string[]) => {
    setSelectedManagers(managerIds)
    if (managerIds.length > 0) {
      const teamUsers = getSubtreeReportees(managerIds, allUsers)
      const teamUserIds = teamUsers.map(u => String(u._id || u.id))
      setAssignedUsersRoundrobin(teamUserIds)
    } else {
      setAssignedUsersRoundrobin([])
    }
  }

  // Load dropdown options whenever scope changes
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingOptions(true)
      try {
        const [
          usrs,
          sourcesRes,
          projectsRes,
          locationsRes,
          budgetsRes,
          typesRes
        ] = await Promise.all([
          listUsers(activeIndCode, true, activeOrgId),
          getResources('resourceLeadSources', activeOrgId, activeIndCode).catch(() => []),
          getResources('resourceProjects', activeOrgId, activeIndCode).catch(() => []),
          getResources('resourceLocations', activeOrgId, activeIndCode).catch(() => []),
          getResources('resourceBudgets', activeOrgId, activeIndCode).catch(() => []),
          getResources('resourcePropertyTypes', activeOrgId, activeIndCode).catch(() => [])
        ])

        if (cancelled) return

        setAllUsers(usrs || [])

        // Extract and normalize string array options
        const DEFAULT_SOURCES = ['Facebook', 'Google Ads', 'Website', 'Referral', 'Self Generated', 'Instagram', 'LinkedIn', 'Walk-in', 'Campaign', 'Cold Call']
        const sList = (sourcesRes || []).map((s: any) => s.source || s.leadSource || s.name || s.value || '').filter(Boolean)
        const combinedSources = sList.length > 0 ? sList : DEFAULT_SOURCES
        setLeadSources(Array.from(new Set(combinedSources)))

        const pData: any[] = Array.isArray(projectsRes) ? projectsRes : ((projectsRes as any)?.data || [])
        const pList = pData.map((p: any) => p.projectName || p.project_name || p.name || p.title || '').filter(Boolean)
        setProjectsList(Array.from(new Set(pList)))

        const locList = (locationsRes || []).map((l: any) => l.locationName || l.location || l.name || l.value || '').filter(Boolean)
        setLocationsList(Array.from(new Set(locList)))

        const bList = (budgetsRes || []).map((b: any) => b.budget || b.name || b.value || '').filter(Boolean)
        setBudgetsList(Array.from(new Set(bList)))

        const tList = (typesRes || []).map((t: any) => t.propertyType || t.property_type || t.name || t.value || '').filter(Boolean)
        setPropertyTypesList(Array.from(new Set(tList)))
      } catch (err) {
        console.error('Failed to load distribution dropdown options', err)
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeOrgId, activeIndCode])

  // Pre-load existing rule when in Edit mode
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    void (async () => {
      try {
        const rule = await getDistributionRuleById(editId)
        if (cancelled || !rule) return
        setActiveTab(rule.distributionType || 'Normal')
        setSource(rule.source || '')
        setProject(Array.isArray(rule.project) ? rule.project : (rule.project ? [rule.project] : []))
        setLocation(Array.isArray(rule.location) ? rule.location : (rule.location ? [rule.location] : []))
        setBudget(Array.isArray(rule.budget) ? rule.budget : (rule.budget ? [rule.budget] : []))
        setPropertyType(Array.isArray(rule.propertyType) ? rule.propertyType : (rule.propertyType ? [rule.propertyType] : []))

        if (rule.distributionType === 'Normal') {
          const u = rule.users?.[0]
          if (u) {
            setAssignedUserNormal(u.uid)
          }
        } else {
          // Roundrobin
          const uIds = (rule.users || []).map(u => u.uid)
          setAssignedUsersRoundrobin(uIds)
          const mIds = (rule.leadManagerUsers || []).map(m => m.uid)
          setSelectedManagers(mIds)
        }
      } catch (err) {
        console.error('Failed to load distribution rule for editing', err)
        setToast({ open: true, msg: 'Failed to load distribution rule for editing', sev: 'error' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [editId])

  const generateUuid = () => {
    return 'ld-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!source) {
      setToast({ open: true, msg: 'Lead Source is required', sev: 'error' })
      return
    }

    if (activeTab === 'Normal' && !assignedUserNormal) {
      setToast({ open: true, msg: 'Please select an Assigned User for Normal Assignment', sev: 'error' })
      return
    }

    if (activeTab === 'Roundrobin' && assignedUsersRoundrobin.length === 0) {
      setToast({ open: true, msg: 'Please select at least one Assigned User for Roundrobin Assignment', sev: 'error' })
      return
    }

    setLoading(true)
    try {
      let selectedUsers: AdminUser[] = []
      if (activeTab === 'Normal') {
        const found = allUsers.find(u => String(u._id || u.id) === String(assignedUserNormal))
        if (found) selectedUsers = [found]
      } else {
        selectedUsers = allUsers.filter(u => assignedUsersRoundrobin.includes(String(u._id || u.id)))
      }

      const selectedManagersList = allUsers.filter(u => selectedManagers.includes(String(u._id || u.id)))

      const payload: any = {
        organizationId: isSuperAdmin ? selectedOrg : undefined,
        industryId: isSuperAdmin ? selectedIndustry : undefined,
        source: source,
        project: project,
        location: location,
        budget: budget,
        propertyType: propertyType,
        users: selectedUsers.map(u => ({ uid: String(u._id || u.id || ''), user_email: String(u.email || '') })),
        usersQueue: selectedUsers.map(u => String(u.email || '')),
        leadManagerUsers: selectedManagersList.map(m => ({ uid: String(m._id || m.id || ''), user_email: String(m.email || '') })),
        distributionType: activeTab,
        userIndex: 0,
        leadDistId: isEdit ? undefined : generateUuid(),
      }

      if (isEdit && editId) {
        await updateDistributionRule(editId, payload)
        setToast({ open: true, msg: 'Lead Distribution Rule Updated Successfully!', sev: 'success' })
      } else {
        await createDistributionRule(payload)
        setToast({ open: true, msg: 'Lead Distribution Rule Created Successfully!', sev: 'success' })
      }
      setTimeout(() => navigate('/lead-distribution/list'), 1200)
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} lead distribution rule`, sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const isAllowedRole = user?.role === 'admin' || user?.role === 'superAdmin'

  if (!isAllowedRole || (!permsLoading && !hasPermission)) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: Lead Distribution is restricted to Admin role only.
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
        title={isEdit ? 'Edit Lead Distribution Rule' : 'Lead Distributor Logic Section'}
        subtitle={isEdit ? 'Update existing lead distribution criteria and user assignments.' : 'Configure automated normal and round-robin lead distribution rules.'}
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/lead-distribution/list')}
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
            onChange={(_, val) => {
              setActiveTab(val)
              if (val === 'Normal') {
                setSelectedManagers([])
              }
            }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Normal Assignment" value="Normal" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }} />
            <Tab label="Roundrobin Assignment" value="Roundrobin" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }} />
          </Tabs>
        </Box>

        {loadingOptions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={36} />
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
                  label="Lead Source *"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                >
                  <MenuItem value="">
                    <em>Select Lead Source</em>
                  </MenuItem>
                  {leadSources.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 2. Project */}
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
                      placeholder={project.length === 0 ? 'Select Project (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 3. Location */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={1}
                  options={locationsList}
                  disableCloseOnSelect
                  value={location}
                  onChange={(_, newValue) => setLocation(newValue)}
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
                      label="Location"
                      placeholder={location.length === 0 ? 'Select Location (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 4. Budget */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={1}
                  options={budgetsList}
                  disableCloseOnSelect
                  value={budget}
                  onChange={(_, newValue) => setBudget(newValue)}
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
                      label="Budget"
                      placeholder={budget.length === 0 ? 'Select Budget (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 5. Property Type */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={1}
                  options={propertyTypesList}
                  disableCloseOnSelect
                  value={propertyType}
                  onChange={(_, newValue) => setPropertyType(newValue)}
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
                      label="Property Type"
                      placeholder={propertyType.length === 0 ? 'Select Property Type (Optional)' : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  )}
                />
              </Grid>

              {/* 6. Lead Managers (Only in Roundrobin Assignment) */}
              {activeTab === 'Roundrobin' && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    limitTags={1}
                    options={managerCandidates}
                    getOptionLabel={(m) => m.name || m.email}
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
                            label={option.name || option.email}
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
                        label="Managers"
                        placeholder={selectedManagers.length === 0 ? 'Select Managers (Optional)' : ''}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                      />
                    )}
                  />
                </Grid>
              )}

              {/* 7. Assigned User(s) */}
              <Grid size={{ xs: 12, sm: 6, md: activeTab === 'Roundrobin' ? 12 : 4 }}>
                {activeTab === 'Normal' ? (
                  /* Single Select User Dropdown for Normal Assignment from All Users */
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Assigned Users *"
                    value={assignedUserNormal}
                    onChange={(e) => setAssignedUserNormal(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  >
                    <MenuItem value="">
                      <em>Select User</em>
                    </MenuItem>
                    {allUsers.map((u) => {
                      const uid = String(u._id || u.id)
                      const displayName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
                      return (
                        <MenuItem key={uid} value={uid}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {displayName} ({u.email})
                            </Typography>
                            {u.role && (
                              <Chip
                                label={u.role}
                                size="small"
                                sx={{ ml: 1, height: 20, fontSize: '0.72rem', textTransform: 'capitalize' }}
                              />
                            )}
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </TextField>
                ) : (
                  /* Multi-Select User Dropdown / Autocomplete with Checkboxes for Roundrobin (Filtered by Managers) */
                  <Box>
                    <Autocomplete
                      multiple
                      size="small"
                      limitTags={3}
                      options={candidateReportees}
                      getOptionLabel={(u) => u.name || u.email}
                      isOptionEqualToValue={(option, val) => String(option._id || option.id) === String(val._id || val.id)}
                      value={candidateReportees.filter(u => assignedUsersRoundrobin.includes(String(u._id || u.id)))}
                      onChange={(_, selected) => {
                        setAssignedUsersRoundrobin(selected.map(u => String(u._id || u.id)))
                      }}
                      disableCloseOnSelect
                      renderTags={(tagValue, getTagProps) =>
                        tagValue.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index })
                          return (
                            <Chip
                              key={key}
                              {...tagProps}
                              label={option.name || option.email}
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
                          label="Assigned Users *"
                          placeholder={
                            assignedUsersRoundrobin.length === 0 
                              ? (selectedManagers.length > 0 ? `Select from Manager's Team (${candidateReportees.length})...` : 'Select Sales Agents...')
                              : ''
                          }
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      )}
                    />

                    {/* Clean Roundrobin Queue Visualizer */}
                    {assignedUsersRoundrobin.length > 0 && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                          ROUND-ROBIN ROTATION QUEUE ({assignedUsersRoundrobin.length} AGENTS SELECTED)
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {candidateReportees.filter(u => assignedUsersRoundrobin.includes(String(u._id || u.id))).map((u, idx) => (
                            <Chip
                              key={String(u._id || u.id)}
                              label={`${idx + 1}. ${u.name || u.email}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              onDelete={() => {
                                setAssignedUsersRoundrobin(prev => prev.filter(id => id !== String(u._id || u.id)))
                              }}
                              sx={{ height: 26, fontSize: '0.78rem', fontWeight: 600, bgcolor: '#FFFFFF' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>

              {/* Action Buttons */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
                  <Button
                    variant="text"
                    onClick={() => navigate('/lead-distribution/list')}
                    sx={{ textTransform: 'none', fontWeight: 600, px: 3, color: 'text.secondary' }}
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
                      '&:hover': { backgroundColor: '#0F172A' }
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isEdit ? (
                      activeTab === 'Normal' ? 'Update Normal Assignment' : 'Update Roundrobin Assignment'
                    ) : (
                      activeTab === 'Normal' ? 'Apply Normal Assignment' : 'Apply Roundrobin Assignment'
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
