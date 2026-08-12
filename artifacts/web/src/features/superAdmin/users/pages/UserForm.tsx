import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SettingsIcon from '@mui/icons-material/Settings'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { useAppSelector } from '@/store/hooks'
import {
  listUsers,
  createUser,
  updateUser,
  listManagerCandidates,
  type AdminUser,
  type ManagerCandidate,
} from '@/services/usersAdminService'
import {
  getIndustries,
  getRoles,
  type Industry,
  type AdminRole,
} from '@/services/sidebarAdminService'

import {
  listOrganizationsPaged,
  type Organization,
} from '@/services/organizationsService'

import { api } from '@/services/api'

const ROLES_WITH_MANAGER = new Set(['sales', 'teamLead', 'leadManager', 'admin'])

const inputSx = {
  width: '100%',
}

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const authedUser = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = authedUser?.role === 'superAdmin'

  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [industries, setIndustries] = useState<Industry[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])

  const [editingItem, setEditingItem] = useState<AdminUser | null>(null)

  const [core, setCore] = useState({
    industryId: isSuperAdmin ? '' : (authedUser?.industryId || ''),
    organizationId: isSuperAdmin ? '' : ((authedUser as any)?.organizationId || ''),
    isActive: true,
  })
  const [selectedRole, setSelectedRole] = useState(isSuperAdmin ? 'admin' : 'sales')

  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({})
  const [managers, setManagers] = useState<ManagerCandidate[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [configMissing, setConfigMissing] = useState(false)
  const [checkingConfig, setCheckingConfig] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const orgId = isSuperAdmin ? core.organizationId : (authedUser as any)?.organizationId;
    const indId = isSuperAdmin ? core.industryId : authedUser?.industryId;

    if (!orgId) {
      setConfigMissing(false);
      return;
    }

    let cancelled = false;
    setCheckingConfig(true);

    void (async () => {
      try {
        const params: Record<string, string> = { organizationId: orgId };
        if (indId) {
          params.industryId = indId;
        }

        const [teamsRes, branchesRes, designationsRes] = await Promise.all([
          api.get('teams', { params }),
          api.get('branches', { params }),
          api.get('designations', { params })
        ]);

        if (cancelled) return;

        const hasTeams = (teamsRes.data?.items || teamsRes.data || []).length > 0;
        const hasBranches = (branchesRes.data?.items || branchesRes.data || []).length > 0;
        const hasDesignations = (designationsRes.data?.items || designationsRes.data || []).length > 0;

        setConfigMissing(!hasTeams || !hasBranches || !hasDesignations);
      } catch (err) {
        console.error('Failed to check workspace configurations:', err);
      } finally {
        if (!cancelled) {
          setCheckingConfig(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [core.organizationId, core.industryId, isSuperAdmin, authedUser]);

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load industries, organizations, and edit-mode user details
  useEffect(() => {
    void (async () => {
      try {
        const [inds, orgsData] = await Promise.all([
          isSuperAdmin ? getIndustries(true) : Promise.resolve([]),
          listOrganizationsPaged({ page: 0, pageSize: 200 })
        ])
        setIndustries(inds)
        setOrganizations(orgsData.items)

        if (id) {
          const allUsers = await listUsers(isSuperAdmin ? undefined : authedUser?.industryId)
          const match = allUsers.find(u => u._id === id || u.id === id)
          if (match) {
            setEditingItem(match)
            setCore({
              industryId: match.industryId ?? '',
              organizationId: (match as any).organizationId ?? (match as any).organization_id ?? '',
              isActive: !!match.isActive,
            })
            setSelectedRole(match.role || 'sales')
            setDynamicValues({
              ...(match.fields || {}),
              firstName: match.firstName ?? '',
              lastName: match.lastName ?? '',
              email: match.email ?? '',
              role: match.role ?? '',
              reportingTo: match.reportingTo ?? (match as any).reporting_to ?? '',
              contactNumber: (match as any).contactNumber ?? (match as any).contact_number ?? '',
              designation: (match as any).designation ?? '',
              team: (match as any).team ?? '',
              branch: (match as any).branch ?? '',
            })
          } else {
            setToast({ open: true, msg: 'User not found', sev: 'error' })
          }
        }
      } catch (e: any) {
        setToast({ open: true, msg: 'Failed to initialize form data', sev: 'error' })
      } finally {
        setInitializing(false)
      }
    })()
  }, [id, isSuperAdmin, authedUser])

  const filteredOrgs = useMemo<Organization[]>(() => {
    if (!core.industryId) return organizations
    return organizations.filter((o: Organization) => o.industryId === core.industryId)
  }, [organizations, core.industryId])

  // Load roles dynamically when industry changes
  useEffect(() => {
    const targetIndustry = isSuperAdmin ? core.industryId : authedUser?.industryId
    if (!targetIndustry) {
      setRoles([])
      return
    }
    void (async () => {
      try {
        const rls = await getRoles(targetIndustry)
        setRoles(rls)
      } catch (err) {
        console.error('Failed to load roles:', err)
      }
    })()
  }, [core.industryId, authedUser?.industryId, isSuperAdmin])

  // Fetch managers dynamically when role or industry changes
  useEffect(() => {
    if (!ROLES_WITH_MANAGER.has(selectedRole)) {
      setManagers([])
      return
    }
    let cancelled = false
    setLoadingManagers(true)
    void (async () => {
      try {
        const list = await listManagerCandidates(
          selectedRole,
          isSuperAdmin ? core.industryId || undefined : undefined
        )
        if (cancelled) return
        setManagers(list)
        // Auto-assign matching reporting manager if matches edit state
        const targetManagerId = editingItem?.reportingTo || (editingItem as any)?.reporting_to || ''
        if (id && editingItem && list.some(m => m._id === targetManagerId)) {
          setDynamicValues(prev => ({ ...prev, reportingTo: targetManagerId }))
        }
      } catch (err) {
        console.error('Failed to load managers', err)
      } finally {
        if (!cancelled) setLoadingManagers(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedRole, core.industryId])

  const handleSubmit = async (dynVals: Record<string, unknown>) => {
    try {
      setLoading(true)
      setFormError(null)

      const role = String(dynVals.role || '')
      const email = String(dynVals.email || '')
      const firstName = String(dynVals.firstName || '')
      const lastName = String(dynVals.lastName || '')
      const reportingTo = String(dynVals.reportingTo || '')

      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role,
        industryId: core.industryId || undefined,
        organizationId: core.organizationId || undefined,
        isActive: core.isActive,
        reportingTo: reportingTo || undefined,
        fields: {
          ...dynVals,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          reportingTo: reportingTo || undefined,
        },
      }

      if (id) {
        if (editingItem && email.trim().toLowerCase() !== editingItem.email.toLowerCase()) {
          const isConfirmed = window.confirm('Are you sure you want to change the Email ID?')
          if (!isConfirmed) {
            setLoading(false)
            return
          }
          payload.email = email.trim().toLowerCase()
        }
        await updateUser(id, payload)
        setToast({ open: true, msg: 'User updated successfully', sev: 'success' })
      } else {
        payload.email = email.trim().toLowerCase()
        await createUser(payload)
        setToast({ open: true, msg: 'User created successfully', sev: 'success' })
      }
      setTimeout(() => navigate('/users'), 1500)
    } catch (e: any) {
      setFormError(e?.response?.data?.message || e?.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  if (initializing || checkingConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title={id ? 'Edit User' : 'Add User'}
        subtitle="Manage login credentials, user roles, hierarchy and custom attributes."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/users')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          {configMissing && !id ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 3,
                textAlign: 'center',
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.15) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 4,
                  boxShadow: '0 8px 32px 0 rgba(255, 87, 34, 0.08)',
                  border: '1px solid rgba(255, 87, 34, 0.15)',
                }}
              >
                <SettingsIcon sx={{ fontSize: 40, color: '#ff5722' }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: '#2d3748' }}>
                Configuration Required
              </Typography>

              <Typography variant="body1" sx={{ color: '#718096', mb: 4, lineHeight: 1.6, maxWidth: 460 }}>
                Please go to Settings and configure Team, Branch, and Designation before adding users.
              </Typography>

              {!isSuperAdmin && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/settings')}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.3)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px 0 rgba(15, 23, 42, 0.4)',
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    },
                  }}
                >
                  Go to Settings
                </Button>
              )}
            </Box>
          ) : (
            <DynamicForm
              screen="users"
              industryCode={isSuperAdmin ? core.industryId : undefined}
              roleKey={isSuperAdmin ? selectedRole : authedUser?.role}
              organizationId={isSuperAdmin ? core.organizationId : (authedUser as any)?.organizationId}
              initialValues={dynamicValues as Record<string, string | number | boolean | null>}
              disabledFields={id ? ['email'] : []}
              onSubmit={async (vals) => { await handleSubmit(vals as Record<string, unknown>) }}
              onChange={(vals) => {
                if (vals.role && vals.role !== selectedRole) {
                  setSelectedRole(String(vals.role))
                }
              }}
              onCancel={() => navigate('/users')}
              submitLabel={id ? 'Save' : 'Create User'}
              headerSlot={
                (isSuperAdmin || formError) && (
                  <Box sx={{ mb: 3 }}>
                    {isSuperAdmin && (
                      <>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                          Tenant Selection
                        </Typography>
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                              select
                              size="small"
                              label="Industry"
                              value={core.industryId}
                              onChange={(e) => setCore({ ...core, industryId: e.target.value, organizationId: '' })}
                              disabled={!!id}
                              required
                              sx={inputSx}
                            >
                              {industries.map((i) => (
                                <MenuItem key={i._id} value={i.code}>
                                  {i.name} ({i.code})
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                              select
                              size="small"
                              label="Organization"
                              value={core.organizationId}
                              onChange={(e) => setCore({ ...core, organizationId: e.target.value })}
                              disabled={!!id || !core.industryId}
                              required
                              sx={inputSx}
                            >
                              {filteredOrgs.map((o: any) => (
                                <MenuItem key={o.organizationId || o.id || o._id} value={o.organizationId || o.id || o._id}>
                                  {o.name || o.organizationName || o.organization_name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                        </Grid>
                      </>
                    )}
                    {formError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                        {formError}
                      </Alert>
                    )}
                  </Box>
                )
              }
            />
          )}
        </Box>
      </AppCard>

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
