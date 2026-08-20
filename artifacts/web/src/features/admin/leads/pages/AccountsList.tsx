import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { listAccounts, deleteAccount, type Account } from '@/services/accountsService'
import { useConfirm } from '@/components/common/ConfirmContext'

export default function AccountsListPage() {
  const [items, setItems] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listAccounts()
      setItems(list)
    } catch (e: unknown) {
      setToast({ open: true, msg: 'Failed to load accounts', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Account) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete account: ${String(row.name)}?`,
      onConfirm: async () => {
        try {
          await deleteAccount(row._id)
          setToast({ open: true, msg: 'Account deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to delete account', sev: 'error' })
        }
      }
    })
  }

  const columns = useMemo<GridColDef<Account>[]>(() => [
    { field: 'name', headerName: 'Account Name', flex: 1.5, minWidth: 150 },
    { field: 'industry', headerName: 'Industry', flex: 1.2, minWidth: 130 },
    { field: 'website', headerName: 'Website', flex: 1.5, minWidth: 170 },
    { field: 'phone', headerName: 'Phone', flex: 1.2, minWidth: 130 },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(params.row)} size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ], [])

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ typography: 'h5', fontWeight: 700 }}>Accounts Management</Box>
      </Stack>

      <AppCard title="" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppDataGrid
          rows={items}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          checkboxSelection
          onRowSelectionModelChange={(ids) => setSelectedIds(ids as string[])}
        />
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
