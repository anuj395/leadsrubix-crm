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
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { Save as SaveIcon } from '@mui/icons-material'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import {
  getRoles,
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

export default function AdminScreenPermissionsPage() {
  const { user } = useAuth()
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

  // Load tenant roles + screens once.
  useEffect(() => {
    void (async () => {
      try {
        const [rolesList, scrs] = await Promise.all([
          getRoles((user as any)?.industryId || (user as any)?.industry_id, (user as any)?.organizationId || (user as any)?.organization_id),
          getScreens()
        ])
        setRoles(rolesList)
        const filtered = scrs.filter((s) => s.key !== 'users')
        setScreens(filtered)
        if (rolesList[0]) setRoleId(rolesList[0]._id)
        if (filtered[0]) setScreenId(filtered[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screen permissions data', sev: 'error' })
      }
    })()
  }, [user])

  // Reload fields + permissions whenever roleId or screenId changes.
  useEffect(() => {
    if (!screenId) {
      setFields([])
      setEnabled(new Set())
      return
    }

    if (!isUsersScreen && !roleId) {
      setFields([])
      setEnabled(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        if (isUsersScreen) {
          const fieldList = await getScreenFields(screenId)
          if (cancelled) return
          setFields(fieldList)
          const activeSet = new Set(
            fieldList.filter((f) => f.isFormVisible !== false && (f as any).is_form_visible !== false).map((f) => String(f._id))
          )
          setEnabled(activeSet)
        } else {
          const [fieldList, permList] = await Promise.all([
            getScreenFields(screenId),
            getScreenPermissions({
              roleId,
              screenId,
              industryId: (user as any)?.industryId || (user as any)?.industry_id,
              enabledOnly: true,
            }),
          ])
          if (cancelled) return
          setFields(fieldList)
          const activeSet = new Set(permList.map((p) => String(p.fieldId || (p as any).field_id)))
          setEnabled(activeSet)
        }
      } catch (e: any) {
        if (!cancelled) setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screen permissions', sev: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roleId, screenId, isUsersScreen, user])

  const toggle = (fieldId: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
  }

  const selectAll = () => setEnabled(new Set(fields.map((f) => f._id)))
  const deselectAll = () => setEnabled(new Set())

  const save = async () => {
    if (!screenId) return
    if (!isUsersScreen && !roleId) return
    setSaving(true)
    try {
      if (isUsersScreen) {
        // Save organization-level visibility directly to ScreenField documents
        await Promise.all(
          fields.map((f) =>
            api.put(`screen-fields/${f._id}`, {
              isFormVisible: enabled.has(f._id),
              is_form_visible: enabled.has(f._id),
            })
          )
        )
        setToast({ open: true, msg: 'User field visibility updated successfully for organization', sev: 'success' })
      } else {
        await bulkSetScreenPermissions({
          screenId,
          roleId,
          industryId: (user as any)?.industryId || (user as any)?.industry_id || 'temp0001',
          fieldIds: Array.from(enabled),
        })
        setToast({ open: true, msg: 'Screen field permissions saved successfully for organization', sev: 'success' })
      }
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

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
        valueGetter: (_, row) => row.isRequired || row.is_required,
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
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" fontWeight={700}>
            Organization Permission Fields
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage screen field visibility and access control for roles within your organization in complete tenant isolation.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Select Role"
              value={isUsersScreen ? 'org-level' : roleId}
              onChange={(e) => setRoleId(e.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
              disabled={isUsersScreen || !roles.length}
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

            <TextField
              select
              label="Select Screen"
              value={screenId}
              onChange={(e) => setScreenId(e.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
            >
              {screens.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name} ({s.key})
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={selectAll}>
                Select All
              </Button>
              <Button size="small" color="inherit" onClick={deselectAll}>
                Deselect All
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
                onClick={save}
                disabled={saving || (!isUsersScreen && !roleId) || !screenId}
              >
                Save Permissions
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, height: 0 }}>
          <AppDataGrid
            height="100%"
            rows={fields}
            columns={columns}
            loading={loading}
            getRowId={(r) => r._id}
          />
        </Box>
      </Card>

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
