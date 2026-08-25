import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { useConfirm } from '@/components/common/ConfirmContext'
import { api } from '@/services/api'
import { useActionPermission } from '@/hooks/useActionPermission'

export interface Holiday {
  id: string
  name: string
  date: string
  dayOfWeek: string
  type: 'National' | 'State' | 'Company Holiday'
  description: string
}

export default function HolidayConfigPage() {
  const navigate = useNavigate()
  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('holidays')
  const [items, setItems] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/holidays')
      setItems(res.data?.items || [])
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load holidays', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this holiday? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoading(true)
          await api.delete(`/holidays/${id}`)
          setToast({ open: true, msg: 'Holiday deleted successfully', sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message || 'Failed to delete holiday', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const columns = useMemo<GridColDef<Holiday>[]>(() => {
    const cols: GridColDef<Holiday>[] = [
      {
        field: 'name',
        headerName: 'Holiday Name',
        flex: 1,
        minWidth: 150,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 140,
        renderCell: (p) => (p.value ? new Date(p.value).toLocaleDateString() : ''),
      },
      { field: 'dayOfWeek', headerName: 'Day', width: 130 },
      {
        field: 'type',
        headerName: 'Type',
        width: 150,
      },
      { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 200 },
    ]

    if (can_edit || can_delete) {
      cols.push({
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            {can_edit && (
              <Tooltip title="Edit Holiday">
                <IconButton size="small" onClick={() => navigate(`/configuration/holiday-config/${p.row.id}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can_delete && (
              <Tooltip title="Delete Holiday">
                <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      })
    }

    return cols
  }, [navigate, can_edit, can_delete])

  if (!permsLoading && !can_view) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied: You do not have permission to view Holiday Configuration.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Holiday Configuration"
        subtitle="Manage regular list of holidays and company off shifts."
        action={
          can_add ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/configuration/holiday-config/new')} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Add Holiday
            </Button>
          ) : undefined
        }
        fullHeight
      >
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <AppDataGrid rows={items} columns={columns} getRowId={(row) => row.id} loading={loading} onReload={loadData} />
        </Box>
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
