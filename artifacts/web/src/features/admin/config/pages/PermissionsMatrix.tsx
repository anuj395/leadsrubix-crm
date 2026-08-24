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
import { useAuth } from '@/hooks/useAuth'
import {
  getRoles,
  getMenus,
  getPermissions,
  bulkSetPermissions,
  type AdminRole,
  type SidebarMenuRecord,
} from '@/services/sidebarAdminService'

export default function AdminPermissionsMatrixPage() {
  const { user } = useAuth()
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [menus, setMenus] = useState<SidebarMenuRecord[]>([])
  const [roleId, setRoleId] = useState('')
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load roles + master menu catalog once under tenant scope.
  useEffect(() => {
    void (async () => {
      try {
        const [rolesList, allMenus] = await Promise.all([
          getRoles((user as any)?.industryId || (user as any)?.industry_id, (user as any)?.organizationId || (user as any)?.organization_id),
          getMenus()
        ])
        setRoles(rolesList)
        setMenus(allMenus)
        if (rolesList[0]) setRoleId(rolesList[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load permissions matrix', sev: 'error' })
      }
    })()
  }, [user])

  // Reload active permissions whenever roleId changes.
  useEffect(() => {
    if (!roleId) {
      setEnabled(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const perms = await getPermissions({
          roleId,
          industryId: (user as any)?.industryId || (user as any)?.industry_id,
          visibleOnly: true,
        })
        if (cancelled) return
        const activeSet = new Set(perms.map((p) => String(p.menuId || p.menu_id)))
        setEnabled(activeSet)
      } catch (e: any) {
        if (!cancelled) setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load role permissions', sev: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roleId, user])

  const menuById = useMemo(() => new Map(menus.map((m) => [m._id, m])), [menus])

  const getParent = useMemo(() => {
    const parentMap = new Map<string, SidebarMenuRecord>()
    menus.forEach((m) => {
      if (!m.key.includes('.')) {
        parentMap.set(m.key, m)
      }
    })

    return (item: SidebarMenuRecord): SidebarMenuRecord | null => {
      const pId = item.parent_id || (item as any).parentId
      if (pId) {
        const found = menus.find((m) => m._id === pId)
        if (found && found._id !== item._id) return found
      }
      if (item.key && item.key.includes('.')) {
        const parentKey = item.key.split('.')[0]
        const found = parentMap.get(parentKey) || menus.find((m) => m.key === parentKey)
        if (found && found._id !== item._id) return found
      }
      return null
    }
  }, [menus])

  const sortedMenus = useMemo(() => {
    const roots = menus.filter((m) => !getParent(m)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    const childrenByParentId = new Map<string, SidebarMenuRecord[]>()

    menus.forEach((m) => {
      const parent = getParent(m)
      if (parent) {
        const pId = parent._id
        if (!childrenByParentId.has(pId)) {
          childrenByParentId.set(pId, [])
        }
        childrenByParentId.get(pId)!.push(m)
      }
    })

    const result: SidebarMenuRecord[] = []
    const seen = new Set<string>()

    roots.forEach((r) => {
      if (!seen.has(r._id)) {
        result.push(r)
        seen.add(r._id)
      }
      const children = (childrenByParentId.get(r._id) || []).sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      children.forEach((c) => {
        if (!seen.has(c._id)) {
          result.push(c)
          seen.add(c._id)
        }
      })
    })

    menus.forEach((m) => {
      if (!seen.has(m._id)) {
        result.push(m)
        seen.add(m._id)
      }
    })

    return result
  }, [menus, getParent])

  const toggle = (menuId: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) {
        next.delete(menuId)
      } else {
        next.add(menuId)
        const current = menus.find((m) => m._id === menuId)
        if (current) {
          const parent = getParent(current)
          if (parent) {
            next.add(parent._id)
          }
        }
      }
      return next
    })
  }

  const selectAll = () => {
    setEnabled(new Set(menus.map((m) => m._id)))
  }

  const deselectAll = () => {
    setEnabled(new Set())
  }

  const save = async () => {
    if (!roleId) return
    setSaving(true)
    try {
      await bulkSetPermissions({
        roleId,
        industryId: (user as any)?.industryId || (user as any)?.industry_id || 'temp0001',
        menuIds: Array.from(enabled),
      })
      setToast({ open: true, msg: 'Permissions matrix saved successfully for organization', sev: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo<GridColDef<SidebarMenuRecord>[]>(
    () => [
      {
        field: 'parent_id',
        headerName: 'Parent Menu',
        flex: 1,
        valueGetter: (_, row) => {
          const parent = getParent(row)
          return parent ? `${parent.name}` : '— (Root)'
        },
      },
      {
        field: 'name',
        headerName: 'Menu Name',
        flex: 1.2,
        renderCell: (p) => {
          const m = p.row
          const parent = getParent(m)
          const isRoot = !parent
          return (
            <span style={{ fontWeight: isRoot ? 600 : 400, paddingLeft: isRoot ? 0 : 20 }}>
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
        field: 'enabled',
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
    [enabled, menuById],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" fontWeight={700}>
            Organization Sidebar Permissions Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage sidebar menu visibility for roles within your organization in complete tenant isolation.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Select Role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              sx={{ minWidth: 240 }}
              size="small"
            >
              {roles.map((r) => (
                <MenuItem key={r._id} value={r._id}>
                  {r.name} ({r.key})
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
                disabled={saving || !roleId}
              >
                Save Matrix
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, height: 0 }}>
          <AppDataGrid
            height="100%"
            rows={sortedMenus}
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
