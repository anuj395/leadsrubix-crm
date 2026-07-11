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

export default function ScreenPermissionsPage() {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [fields, setFields] = useState<ScreenField[]>([])
  const [industryId, setIndustryId] = useState('')
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

  // Load industries + screens once.
  useEffect(() => {
    void (async () => {
      try {
        const [inds, scrs] = await Promise.all([getIndustries(), getScreens()])
        setIndustries(inds)
        setScreens(scrs)
        const realEstate = inds.find((i) => i.code === 'temp0001')
        if (realEstate) setIndustryId(realEstate._id)
        else if (inds[0]) setIndustryId(inds[0]._id)
        if (scrs[0]) setScreenId(scrs[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
      }
    })()
  }, [])

  // Roles for selected industry (race-safe).
  useEffect(() => {
    if (!industryId) return
    let cancelled = false
    setRoleId('')
    void (async () => {
      try {
        const list = await getRoles(industryId)
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
  }, [industryId])

  // Fields for selected screen (race-safe).
  useEffect(() => {
    if (!screenId) {
      setFields([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const list = await getScreenFields(screenId)
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
  }, [screenId])

  // Existing permission set for the (screen, role, industry) triple (race-safe).
  useEffect(() => {
    if (!industryId || !roleId || !screenId) {
      setEnabled(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const perms = await getScreenPermissions({
          screen_id: screenId,
          roleId: roleId,
          industryId: industryId,
          enabledOnly: true,
        })
        if (!cancelled) setEnabled(new Set(perms.map((p) => p.field_id)))
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
  }, [industryId, roleId, screenId])

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
    if (!industryId || !roleId || !screenId) return
    setSaving(true)
    try {
      await bulkSetScreenPermissions({
        screen_id: screenId,
        roleId: roleId,
        industryId: industryId,
        field_ids: [...enabled],
      })
      setToast({ open: true, msg: 'Permissions updated', sev: 'success' })
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
        field: 'order',
        headerName: 'Order',
        width: 80,
        type: 'number',
      },
      {
        field: 'field_key',
        headerName: 'Field Key',
        flex: 1,
        renderCell: (p) => <code>{p.value}</code>,
      },
      {
        field: 'label',
        headerName: 'Display Label',
        flex: 1.2,
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
            disabled={!industryId || !roleId || !screenId || saving || loading}
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
              <MenuItem key={i._id} value={i._id}>
                {i.name} ({i.code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            sx={{ minWidth: 200 }}
            disabled={!roles.length}
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
            {roles.map((r) => (
              <MenuItem key={r._id} value={r._id}>
                {r.name} ({r.key})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !screenId || !industryId || !roleId ? (
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
