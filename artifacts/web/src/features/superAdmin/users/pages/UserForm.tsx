import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
  const [roles, setRoles] = useState<AdminRole[]>([])
  
  const [editingItem, setEditingItem] = useState<AdminUser | null>(null)
  
  const [core, setCore] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: isSuperAdmin ? 'admin' : 'sales',
    industryId: isSuperAdmin ? '' : (authedUser?.industryId || ''),
    isActive: true,
    reportingTo: '',
  })
  
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({})
  const [managers, setManagers] = useState<ManagerCandidate[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load industries and edit-mode user details
  useEffect(() => {
    void (async () => {
      try {
        const inds = isSuperAdmin ? await getIndustries(true) : []
        setIndustries(inds)

        if (id) {
          const allUsers = await listUsers(isSuperAdmin ? undefined : authedUser?.industryId)
          const match = allUsers.find(u => u._id === id || u.id === id)
          if (match) {
            setEditingItem(match)
            setCore({
              firstName: match.firstName ?? '',
              lastName: match.lastName ?? '',
              email: match.email,
              role: match.role,
              industryId: match.industryId ?? '',
              isActive: !!match.isActive,
              reportingTo: match.reportingTo ?? (match as any).reporting_to ?? '',
            })
            setDynamicValues(match.fields || {})
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
    if (!ROLES_WITH_MANAGER.has(core.role)) {
      setManagers([])
      return
    }
    let cancelled = false
    setLoadingManagers(true)
    void (async () => {
      try {
        const list = await listManagerCandidates(
          core.role,
          isSuperAdmin ? core.industryId || undefined : undefined
        )
        if (cancelled) return
        setManagers(list)
        // Auto-assign matching reporting manager if matches edit state
        const targetManagerId = editingItem?.reportingTo || (editingItem as any)?.reporting_to || ''
        if (id && editingItem && list.some(m => m._id === targetManagerId)) {
          setCore(c => ({ ...c, reportingTo: targetManagerId }))
        }
      } catch (err) {
        console.error('Failed to load managers', err)
      } finally {
        if (!cancelled) setLoadingManagers(false)
      }
    })()
    return () => { cancelled = true }
  }, [core.role, core.industryId])

  const handleSubmit = async (dynVals: Record<string, unknown>) => {
    if (!core.firstName.trim() || !core.email.trim() || !core.role) {
      setFormError('Please fill out all required core fields.')
      return
    }

    try {
      setLoading(true)
      setFormError(null)

      const reportingTo = ROLES_WITH_MANAGER.has(core.role) ? core.reportingTo || '' : ''
      const payload: any = {
        firstName: core.firstName.trim(),
        lastName: core.lastName.trim(),
        role: core.role,
        industryId: core.industryId || undefined,
        isActive: core.isActive,
        reportingTo: reportingTo || undefined,
        fields: dynVals,
      }

      if (id) {
        if (editingItem && core.email.trim().toLowerCase() !== editingItem.email.toLowerCase()) {
          const isConfirmed = window.confirm('Are you sure you want to change the Email ID?')
          if (!isConfirmed) {
            setCore(c => ({ ...c, email: editingItem.email }))
            setLoading(false)
            return
          }
          payload.email = core.email.trim().toLowerCase()
        }
        await updateUser(id, payload)
        setToast({ open: true, msg: 'User updated successfully', sev: 'success' })
      } else {
        payload.email = core.email.trim().toLowerCase()
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

  if (initializing) {
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
          <DynamicForm
            screen="users"
            industryCode={isSuperAdmin ? core.industryId : undefined}
            roleKey={core.role}
            initialValues={dynamicValues as Record<string, string | number | boolean | null>}
            onSubmit={async (vals) => { await handleSubmit(vals as Record<string, unknown>) }}
            onCancel={() => navigate('/users')}
            submitLabel={id ? 'Save' : 'Create User'}
            headerSlot={
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  Account
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      size="small"
                      label="First Name"
                      value={core.firstName}
                      onChange={(e) => setCore({ ...core, firstName: e.target.value })}
                      required
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      size="small"
                      label="Last Name"
                      value={core.lastName}
                      onChange={(e) => setCore({ ...core, lastName: e.target.value })}
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      size="small"
                      label="Email"
                      type="email"
                      value={core.email}
                      onChange={(e) => setCore({ ...core, email: e.target.value })}
                      disabled={!!id}
                      required
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      size="small"
                      label="Role"
                      value={core.role}
                      onChange={(e) => setCore({ ...core, role: e.target.value })}
                      required
                      sx={inputSx}
                    >
                      {roles.length === 0 ? (
                        <MenuItem value="sales">sales</MenuItem>
                      ) : (
                        roles.map((r) => (
                          <MenuItem key={r._id} value={r.key}>{r.name} ({r.key})</MenuItem>
                        ))
                      )}
                    </TextField>
                  </Grid>

                  {isSuperAdmin && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        size="small"
                        label="Industry"
                        value={core.industryId}
                        onChange={(e) => setCore({ ...core, industryId: e.target.value })}
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
                  )}

                  {ROLES_WITH_MANAGER.has(core.role) && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        size="small"
                        label="Reports To"
                        value={core.reportingTo}
                        onChange={(e) => setCore({ ...core, reportingTo: e.target.value })}
                        disabled={loadingManagers}
                        sx={inputSx}
                      >
                        <MenuItem value="">
                          <em>— Unassigned —</em>
                        </MenuItem>
                        {managers.map((m) => (
                          <MenuItem key={m._id} value={m._id}>
                            {m.name && m.name !== m.email ? `${m.name} (${m.email})` : m.email} ({m.role})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  Role-specific Fields
                </Typography>
                {formError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError}
                  </Alert>
                )}
              </Box>
            }
          />
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
