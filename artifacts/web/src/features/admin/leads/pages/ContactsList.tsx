import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listContacts, deleteContact, type Contact } from '@/services/contactsService'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { selectAuth } from '@/features/auth'

export default function ContactsListPage() {
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId
  const navigate = useNavigate()

  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  // Load screen config using useTableConfig
  const { columns: dbColumns, loading: configLoading, error: configError } =
    useTableConfig('contacts', industryId)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listContacts()
      setItems(list)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load contacts', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Contact) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete contact: ${String(row.customer_name ?? row.name ?? row._id)}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteContact(row._id)
          setToast({ open: true, msg: 'Contact deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } }
          setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete contact', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Contact>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<Contact> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      sortable: col.sortable !== false,
      valueGetter: (_v: unknown, row: Contact) => (row as Record<string, unknown>)[col.key],
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          col.type === 'badge' ||
          col.key.toLowerCase().includes('status') ||
          col.key.toLowerCase().includes('priority') ||
          col.key.toLowerCase() === 'lead_type'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const actionsCol: GridColDef<Contact> = {
      field: '__actions__',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 120,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/leads/contacts/${p.row._id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }

    return [...dataCols, actionsCol]
  }, [dbColumns])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {configError && (
        <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }}>
          {configError}
        </Alert>
      )}
      {!configLoading && dbColumns.length === 0 && (
        <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }}>
          No columns resolved for this screen config.
        </Alert>
      )}

      <AppCard
        title="Contacts"
        subtitle="Customer / lead contacts. The columns and Add form are driven by the Screen Configuration system."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/leads/contacts/new')}>
            Add Contact
          </Button>
        }
        fullHeight
      >
        <AppDataGrid
          height="100%"
          rows={items}
          columns={gridColumns}
          loading={loading || configLoading}
          getRowId={(r) => r._id}
          onReload={refresh}
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
