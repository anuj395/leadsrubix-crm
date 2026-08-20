import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { Save as SaveIcon } from '@mui/icons-material'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/services/api'
import {
  getIndustries,
  getRoles,
  type Industry,
  type AdminRole,
} from '@/services/sidebarAdminService'
import {
  getScreens,
  getScreenFields,
  getScreenPermissions,
  bulkSetScreenPermissions,
  type Screen,
  type ScreenField,
} from '@/services/screenAdminService'
import { useAuth } from '@/hooks/useAuth'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'

export default function ScreenPermissionsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry: industryId,
    setSelectedIndustry: setIndustryId,
    filteredOrgs,
    selectedOrg: orgId,
    setSelectedOrg: setOrgId,
  } = useSuperAdminScope(isSuperAdmin)

  const orgs = useMemo(() => {
    return filteredOrgs.map((o) => ({ value: o.code, label: o.name }))
  }, [filteredOrgs])

  const [roles, setRoles] = useState<AdminRole[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [fields, setFields] = useState<ScreenField[]>([])
  const [roleId, setRoleId] = useState('')
  const [screenId, setScreenId] = useState('')
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const selectedScreenKey = useMemo(() => {
    return screens.find((s) => s._id === screenId)?.key || ''
  }, [screens, screenId])
  const isUsersScreen = selectedScreenKey === 'users'

  // Reload screens whenever orgId or industryId changes.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const scrs = await getScreens(orgId || undefined, industryId || undefined)
        if (cancelled) return
        setScreens(scrs)
        if (scrs[0]) setScreenId(scrs[0]._id)
        else setScreenId('')
      } catch (e: any) {
        if (cancelled) return
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screens', sev: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId, industryId])

  // Roles for selected industry and organization (race-safe).
  useEffect(() => {
    if (!industryId) return
    let cancelled = false
    setRoleId('')
    void (async () => {
      try {
        const list = await getRoles(industryId, orgId || undefined)
        if (cancelled) return
        setRoles(list)
        setRoleId(list[0]?._id ?? '')
      } catch (e: any) {
        if (!cancelled) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load roles', sev: 'error' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [industryId, orgId])

  // Fields for selected screen (race-safe).
  useEffect(() => {
    if (!screenId) {
      setFields([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const list = await getScreenFields(screenId, orgId || undefined, industryId || undefined)
        if (!cancelled) setFields(list)
      } catch (e: any) {
        if (!cancelled) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load fields', sev: 'error' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [screenId, orgId, industryId])

  // Existing permission set for the (screen, role, industry, organization) quadruple (race-safe).
  useEffect(() => {
    if (!industryId || !screenId) {
      setEnabled(new Set())
      return
    }
    if (!isUsersScreen && !roleId) {
      setEnabled(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        if (isUsersScreen) {
          if (cancelled) return
          const activeSet = new Set(
            fields.filter((f) => f.isFormVisible !== false && (f as any).is_form_visible !== false).map((f) => String(f._id))
          )
          setEnabled(activeSet)
        } else {
          const perms = await getScreenPermissions({
            screenId: screenId,
            industryId: industryId,
            organizationId: orgId || undefined,
            roleId: roleId,
            enabledOnly: true,
          })
          if (cancelled) return
          setEnabled(new Set(perms.map((p) => String(p.fieldId || (p as any).field_id))))
        }
      } catch (e: any) {
        if (!cancelled) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load permissions', sev: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [industryId, orgId, roleId, screenId, fields, isUsersScreen])

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    [fields],
  )

  const toggle = (fieldId: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
  }

  const selectAll = () => setEnabled(new Set(sortedFields.map((f) => f._id)))
  const clearAll = () => setEnabled(new Set())

  const save = async () => {
    if (!screenId || !industryId || (!isUsersScreen && !roleId)) return
    setSaving(true)
    try {
      if (isUsersScreen) {
        await Promise.all(
          fields.map((f) =>
            api.put(`screen-fields/${f._id}`, {
              isFormVisible: enabled.has(f._id),
              is_form_visible: enabled.has(f._id),
            })
          )
        )
        setToast({ open: true, msg: 'User field visibility updated successfully', sev: 'success' })
      } else {
        await bulkSetScreenPermissions({
          screenId,
          roleId,
          industryId,
          organizationId: orgId || undefined,
          fieldIds: Array.from(enabled),
        })
        setToast({ open: true, msg: 'Screen permissions updated', sev: 'success' })
      }
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const allOn = sortedFields.length > 0 && sortedFields.every((f) => enabled.has(f._id))

  const columns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      {
        field: 'fieldKey',
        headerName: 'Field Key',
        flex: 1,
        valueGetter: (_, row) => row.fieldKey || row.field_key,
        renderCell: (p) => <code>{p.value}</code>,
      },
      {
        field: 'label',
        headerName: 'Display Label',
        flex: 1.2,
      },
      {
        field: 'order',
        headerName: 'Order',
        width: 80,
        type: 'number',
      },
      {
        field: 'type',
        headerName: 'Field Type',
        width: 120,
        renderCell: (p) => <StatusBadge value={p.value} hideDot />,
      },
      {
        field: 'is_required',
        headerName: 'Required',
        width: 100,
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'enabled',
        headerName: 'Form Access / Visibility',
        flex: 1,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const f = p.row
          return (
            <Checkbox
              size="small"
              checked={enabled.has(f._id)}
              onChange={() => toggle(f._id)}
            />
          )
        },
      },
    ],
    [enabled],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Permission Fields"
        subtitle="Manage field visibility and form access permissions per role and industry."
        action={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={!industryId || (!isUsersScreen && !roleId) || !screenId || saving || loading}
          >
            {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save'}
          </Button>
        }
        fullHeight
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0, pt: 1.5 }}>
          <TextField
            select
            size="small"
            label="Screen"
            value={screenId}
            onChange={(e) => setScreenId(e.target.value)}
            sx={{ minWidth: 200 }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 400,
                  },
                },
              },
            }}
          >
            {screens.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name} ({s.key})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Industry"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            sx={{ minWidth: 200 }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 400,
                  },
                },
              },
            }}
          >
            {industries.map((i) => (
              <MenuItem key={i.code} value={i.code}>
                {i.name} ({i.code})
              </MenuItem>
            ))}
          </TextField>
          {orgs.length > 0 && (
            <TextField
              select
              size="small"
              label="Organization / Workspace"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              sx={{ minWidth: 200 }}
              disabled={!industryId}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    style: {
                      maxHeight: 400,
                    },
                  },
                },
              }}
            >
              {orgs.map((org) => (
                <MenuItem key={org.value} value={org.value}>
                  {org.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="Role"
            value={isUsersScreen ? 'org-level' : roleId}
            onChange={(e) => setRoleId(e.target.value)}
            sx={{ minWidth: 200 }}
            disabled={isUsersScreen || !roles.length}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 400,
                  },
                },
              },
            }}
          >
            {isUsersScreen ? (
              <MenuItem value="org-level">Organization-level (All Roles)</MenuItem>
            ) : (
              roles.map((r) => (
                <MenuItem key={r._id} value={r._id}>
                  {r.name} ({r.key})
                </MenuItem>
              ))
            )}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !screenId || !industryId || (!isUsersScreen && !roleId) ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Pick a screen, industry, and role to manage permissions.
          </Typography>
        ) : sortedFields.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            This screen has no fields yet — add some on the Screen Fields page.
          </Typography>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, flexShrink: 0 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {sortedFields.length} field{sortedFields.length === 1 ? '' : 's'} • {enabled.size} enabled
              </Typography>
              <Button size="small" onClick={allOn ? clearAll : selectAll}>
                {allOn ? 'Clear all' : 'Select all'}
              </Button>
            </Stack>
            <AppDataGrid
              height="55vh"
              rows={sortedFields}
              columns={columns}
              loading={loading}
              getRowId={(f) => f._id}
            />
          </Box>
        )}
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
