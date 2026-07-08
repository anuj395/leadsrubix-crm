import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { Add as AddIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { listContacts, createContact, type Contact } from '@/services/contactsService'
import { resolveScreen, type ResolvedTableHeader } from '@/services/screenAdminService'
import { useAppSelector } from '@/store/hooks'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function ContactsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Contact[]>([])
  const [columns, setColumns] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const [list, resolved] = await Promise.all([
        listContacts(),
        resolveScreen({
          screen_key: 'contacts',
          industry_code: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          role_key: user?.role === 'superAdmin' ? 'admin' : undefined,
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
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gridColumns = useMemo<GridColDef<Contact>[]>(() => {
    const sorted = [...columns].sort((a, b) => a.order - b.order)
    return sorted.map((c) => ({
      field: c.key,
      headerName: c.label,
      flex: 1,
      minWidth: 140,
      sortable: c.sortable !== false,
      valueGetter: (_v, row) => (row as Record<string, unknown>)[c.key],
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
  }, [columns])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Contacts"
        subtitle="Customer / lead contacts. The columns and Add form are driven by the Screen Configuration system."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Contact
          </Button>
        }
        fullHeight
      >
        <AppDataGrid onReload={refresh}
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading}
          getRowId={(r) => r._id}
        />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Contact</DialogTitle>
        <DialogContent dividers>
          <DynamicForm
            screen="contacts"
            onCancel={() => setDialogOpen(false)}
            submitLabel="Create"
            onSubmit={async (values) => {
              await createContact(values)
              setDialogOpen(false)
              setToast({ open: true, msg: 'Contact created', sev: 'success' })
              await refresh()
            }}
          />
        </DialogContent>
      </Dialog>

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
