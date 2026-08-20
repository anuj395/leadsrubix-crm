import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { PlayArrow as PlayIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listLeads, deleteLead, convertLead, type Lead } from '@/services/leadsService'
import { useConfirm } from '@/components/common/ConfirmContext'

export default function LeadsListPage() {
  const [items, setItems] = useState<Lead[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listLeads()
      setItems(list)
    } catch (e: unknown) {
      setToast({ open: true, msg: 'Failed to load leads', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Lead) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete lead: ${String(row.firstName)} ${String(row.lastName || '')}?`,
      onConfirm: async () => {
        try {
          await deleteLead(row._id)
          setToast({ open: true, msg: 'Lead deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to delete lead', sev: 'error' })
        }
      }
    })
  }

  const handleConvert = async (row: Lead) => {
    confirmDelete({
      title: 'Convert Lead',
      message: `Are you sure you want to convert Lead: ${String(row.firstName)} ${String(row.lastName || '')} to Account & Contact?`,
      onConfirm: async () => {
        setLoading(true)
        try {
          await convertLead({ leadId: row._id })
          setToast({ open: true, msg: 'Lead converted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to convert lead', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const columns = useMemo<GridColDef<Lead>[]>(() => [
    { field: 'firstName', headerName: 'First Name', flex: 1.2, minWidth: 130 },
    { field: 'lastName', headerName: 'Last Name', flex: 1.2, minWidth: 130 },
    { field: 'companyName', headerName: 'Company Name', flex: 1.5, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 170 },
    { field: 'phone', headerName: 'Phone', flex: 1.2, minWidth: 130 },
    {
      field: 'leadStatus',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => {
        const val = params.value || 'NEW'
        let color: 'info' | 'success' | 'warning' | 'error' = 'info'
        if (val === 'CONVERTED' || val === 'QUALIFIED') color = 'success'
        if (val === 'UNQUALIFIED') color = 'error'
        return <StatusBadge value={String(val)} />
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 140,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
          {params.row.leadStatus !== 'CONVERTED' && (
            <Tooltip title="Convert Lead">
              <IconButton onClick={() => handleConvert(params.row)} size="small" color="primary">
                <PlayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
        <Box sx={{ typography: 'h5', fontWeight: 700 }}>Leads Management</Box>
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
