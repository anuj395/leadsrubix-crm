import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import { Add as AddIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { listContacts, createContact, type Contact } from '@/services/contactsService'
import { resolveScreen, type ResolvedTableHeader } from '@/services/screenAdminService'
import { useAppSelector } from '@/store/hooks'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

export default function ContactsListPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = user?.role === 'superAdmin'
  const [items, setItems] = useState<Contact[]>([])
  const [columns, setColumns] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const refresh = async () => {
    setLoading(true)
    try {
      const activeIndustry = isSuperAdmin ? selectedIndustry || undefined : undefined
      const activeOrg = isSuperAdmin ? selectedOrg || undefined : undefined

      const [list, resolved] = await Promise.all([
        listContacts({ industryId: activeIndustry, organizationId: activeOrg }),
        resolveScreen({
          screenKey: 'contacts',
          industryCode: isSuperAdmin ? activeIndustry || 'temp0001' : undefined,
          roleKey: isSuperAdmin ? 'admin' : undefined,
          organizationId: isSuperAdmin ? activeOrg || undefined : undefined,
        }),
      ])
      setItems(list)
      setColumns(resolved.table_headers)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && (!selectedIndustry || !selectedOrg)) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry, selectedOrg, isSuperAdmin])

  const gridColumns = useMemo<GridColDef<Contact>[]>(() => {
    const sNoCol: GridColDef<Contact> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      valueGetter: (_v, row) => {
        const idx = items.findIndex((item) => item._id === row._id)
        return idx !== -1 ? idx + 1 : ''
      }
    }

    const sorted = [...columns].sort((a, b) => a.order - b.order)
    const dataCols = sorted.map((c): GridColDef<Contact> => ({
      field: c.key,
      headerName: c.label,
      flex: 1,
      minWidth: 140,
      sortable: c.sortable !== false,
      valueGetter: (_v, row) => {
        const r = row as Record<string, unknown>
        const camelKey = c.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
        const snakeKey = c.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        return r[c.key] ?? r[camelKey] ?? r[snakeKey]
      },
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (c.type === 'date' || c.key === 'createdAt' || c.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          c.type === 'badge' ||
          c.key.toLowerCase().includes('status') ||
          c.key.toLowerCase().includes('priority') ||
          c.key.toLowerCase() === 'lead_type'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    return [sNoCol, ...dataCols]
  }, [columns, items])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Contacts"
        subtitle="Customer / lead contacts. The columns and Add form are driven by the Screen Configuration system."
        action={
          <Tooltip title="Add a new lead contact to the database">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/leads/contacts/new?industry=${selectedIndustry || ''}&organization=${selectedOrg || ''}`)}>
              Add Contact
            </Button>
          </Tooltip>
        }
        fullHeight
      >
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />
        <AppDataGrid onReload={refresh}
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading}
          getRowId={(r) => r._id}
        />
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
