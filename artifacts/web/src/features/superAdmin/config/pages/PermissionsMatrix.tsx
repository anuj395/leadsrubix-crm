import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { Save as SaveIcon } from '@mui/icons-material'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import {
  getIndustries,
  getRoles,
  getMenus,
  getPermissions,
  bulkSetPermissions,
  type Industry,
  type AdminRole,
  type SidebarMenuRecord,
} from '@/services/sidebarAdminService'

export default function PermissionsMatrixPage() {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [menus, setMenus] = useState<SidebarMenuRecord[]>([])
  const [industryId, setIndustryId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load industries + master menu catalog once.
  useEffect(() => {
    void (async () => {
      try {
        const [inds, allMenus] = await Promise.all([getIndustries(), getMenus()])
        setIndustries(inds)
        setMenus(allMenus)
        const realEstate = inds.find((i) => i.code === 'temp0001')
        if (realEstate) setIndustryId(realEstate._id)
        else if (inds[0]) setIndustryId(inds[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load', sev: 'error' })
      }
    })()
  }, [])

  // Reload roles whenever industry changes.
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
        if (cancelled) return
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load roles', sev: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [industryId])

  // Reload current selections whenever (industry, role) changes.
  useEffect(() => {
    if (!industryId || !roleId) {
      setEnabled(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const perms = await getPermissions({
          industryId: industryId,
          roleId: roleId,
          visibleOnly: true,
        })
        if (cancelled) return
        setEnabled(new Set(perms.map((p) => p.menu_id || p.menuId)))
      } catch (e: any) {
        if (cancelled) return
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load permissions', sev: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [industryId, roleId])

  // Group menus by parent for flat ordering.
  const groupedMenus = useMemo(() => {
    const roots = menus.filter((m) => !m.parent_id).sort((a, b) => a.order - b.order)
    return roots.map((root) => ({
      root,
      children: menus
        .filter((m) => m.parent_id === root._id)
        .sort((a, b) => a.order - b.order),
    }))
  }, [menus])

  const orphanMenus = useMemo(() => {
    const byId = new Map(menus.map((m) => [m._id, m]))
    return menus.filter((m) => m.parent_id && !byId.has(m.parent_id))
  }, [menus])

  const flatMenus = useMemo(() => {
    const list: SidebarMenuRecord[] = []
    groupedMenus.forEach(({ root, children }) => {
      list.push(root)
      children.forEach((c) => {
        list.push(c)
      })
    })
    orphanMenus.forEach((o) => {
      if (!list.some((existing) => existing._id === o._id)) {
        list.push(o)
      }
    })
    return list
  }, [groupedMenus, orphanMenus])

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      const isChecking = !next.has(id)
      if (isChecking) {
        next.add(id)
        menus
          .filter((m) => m.parent_id === id)
          .forEach((c) => next.add(c._id))
      } else {
        next.delete(id)
        menus
          .filter((m) => m.parent_id === id)
          .forEach((c) => next.delete(c._id))
      }
      return next
    })
  }

  const save = async () => {
    if (!industryId || !roleId) return
    setSaving(true)
    try {
      await bulkSetPermissions({
        industryId: industryId,
        roleId: roleId,
        menu_ids: [...enabled],
      })
      setToast({ open: true, msg: 'Permissions updated', sev: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo<GridColDef<SidebarMenuRecord>[]>(
    () => [
      {
        field: 'parent_name',
        headerName: 'Parent Menu',
        flex: 1,
        valueGetter: (_, row) => {
          if (!row.parent_id) return '— (Root)'
          const parent = menus.find((m) => m._id === row.parent_id)
          return parent ? `${parent.name}` : '—'
        },
      },
      {
        field: 'name',
        headerName: 'Menu Name',
        flex: 1.2,
        renderCell: (p) => {
          const m = p.row
          const isRoot = !m.parent_id
          return (
            <span style={{ fontWeight: isRoot ? 600 : 400, paddingLeft: isRoot ? 0 : 16 }}>
              {!isRoot ? '↳ ' : ''}{m.name}
            </span>
          )
        },
      },
      {
        field: 'key',
        headerName: 'Menu Key',
        flex: 1,
        renderCell: (p) => <code>{p.value}</code>,
      },
      {
        field: 'route',
        headerName: 'Route',
        flex: 1.2,
        renderCell: (p) => (p.value ? <code>{p.value}</code> : <span style={{ color: '#aaa' }}>—</span>),
      },
      {
        field: 'visible',
        headerName: 'Sidebar Visibility',
        width: 160,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const m = p.row
          return (
            <Checkbox
              size="small"
              checked={enabled.has(m._id)}
              onChange={() => toggle(m._id)}
            />
          )
        },
      },
    ],
    [menus, enabled],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', pb: '16px !important' }}>
          {/* Header Section */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ mb: 2, minWidth: 0, flexWrap: 'wrap', flexShrink: 0 }}
          >
            <Stack sx={{ minWidth: 0, flex: { xs: '1 1 4rem', sm: '1 1 12rem' } }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'secondary.main',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  lineHeight: 1.4,
                  mb: 0.5,
                }}
              >
                Sidebar Permissions
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.55,
                }}
              >
                Pick which menus each (industry, role) sees. Saving overwrites the current set.
              </Typography>
            </Stack>

            <Box sx={{
              flexShrink: 0,
              maxWidth: '100%',
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
            }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={save}
                disabled={!industryId || !roleId || saving || loading}
              >
                {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save'}
              </Button>
            </Box>
          </Stack>

          {/* Fixed Selectors */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0, pt: 1.5 }}>
            <TextField
              select
              size="small"
              label="Industry"
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              sx={{ minWidth: 220 }}
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
              sx={{ minWidth: 220 }}
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

          <Divider sx={{ mb: 2, flexShrink: 0 }} />

          {/* Table Area */}
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : !roleId ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Select an industry and role to manage permissions.
              </Typography>
            ) : flatMenus.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No menus exist yet — create some on the Menus page first.
              </Typography>
            ) : (
              <AppDataGrid
                height="55vh"
                rows={flatMenus}
                columns={columns}
                loading={loading}
                getRowId={(m) => m._id}
              />
            )}
          </Box>
        </CardContent>
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
