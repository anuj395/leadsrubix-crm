import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import {
  Visibility as ViewIcon,
  DeleteSweep as ClearIcon,
  Download as DownloadIcon,
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/common/ConfirmContext'
import { api } from '@/services/api'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'

export interface ApiLog {
  id: string
  _id: string
  created_at: string
  customer_name: string
  contact_no: string
  email: string
  alternate_no: string
  country_code: string
  associate_contact: string
  budget: string
  location: string
  project: string
  property_type: string
  property_stage: string
  property_sub_type: string
  stage: string
  lead_source: string
  campaign: string
  add_set: string
  contact_owner_email: string
  status: 'SUCCESS' | 'FAILED'
  fail_reason: string
  lead_id: string
  lead_assign_time: string
}

export default function IntegrationsApiDataPage() {
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [apiFilter, setApiFilter] = useState('7') // 7 days, 30 days, or all
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const filterQs = apiFilter !== 'all' ? `?apiFilter=${apiFilter}` : ''
      const [logsRes, headersRes] = await Promise.all([
        api.get(`/webhook/api-data${filterQs}`),
        resolveScreen({ screen_key: 'contacts' })
      ])
      setLogs(logsRes.data || [])
      setResolvedScreen(headersRes)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load API transaction logs', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [apiFilter])

  const { confirmDelete } = useConfirm()

  const handleClearLogs = () => {
    confirmDelete({
      title: 'Confirm Purging Logs',
      message: 'Are you sure you want to delete all incoming API logs? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoading(true)
          await api.delete('/webhook/api-data')
          setLogs([])
          setToast({ open: true, msg: 'API logs cleared successfully', sev: 'success' })
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message || 'Failed to clear logs', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleOpenDetail = (log: ApiLog) => {
    setSelectedLog(log)
    setDialogOpen(true)
  }

  const exportFile = () => {
    if (!resolvedScreen) return;
    
    // Construct dynamic mappings based on active screen headers
    const mappings = resolvedScreen.tableHeaders.reduce((acc, h) => {
      acc[h.key] = h.label;
      return acc;
    }, {} as Record<string, string>);

    const exportData = logs.map((item) => {
      const row: Record<string, any> = {
        'Status': item.status,
        'Error Reason': item.fail_reason || 'N/A',
        'Lead ID': item.lead_id || 'N/A',
        'Created At': item.created_at ? new Date(item.created_at).toLocaleString() : '',
      };

      // Add dynamic fields mapped to their label names
      resolvedScreen.tableHeaders.forEach((h) => {
        const value = (item as any)[h.key] || (item as any)[h.key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)] || '';
        row[h.label] = value;
      });

      return row;
    });

    if (exportData.length === 0) {
      setToast({ open: true, msg: 'No data to export', sev: 'error' });
      return;
    }

    // Generate CSV file content
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(',')
      )
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `API_Data_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredLogs = useMemo(() => {
    let result = logs

    // Apply status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(l => l.status === statusFilter)
    }

    // Apply search query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.customer_name.toLowerCase().includes(q) ||
          l.contact_no.includes(q) ||
          (l.fail_reason && l.fail_reason.toLowerCase().includes(q))
      )
    }

    return result
  }, [logs, search, statusFilter])

  const columns = useMemo<GridColDef<ApiLog>[]>(() => {
    const cols: GridColDef<ApiLog>[] = [
      {
        field: 'created_at',
        headerName: 'Timestamp',
        width: 170,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {p.value ? new Date(p.value as string).toLocaleString() : ''}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: 'customer_name',
        headerName: 'Customer Name',
        width: 150,
        renderCell: (p) => <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.value || 'N/A'}</Typography>,
      },
      {
        field: 'contact_no',
        headerName: 'Contact Number',
        width: 150,
        renderCell: (p) => p.value || 'N/A',
      },
      {
        field: 'lead_source',
        headerName: 'Source',
        width: 140,
        renderCell: (p) => p.value || 'API Integration',
      },
      {
        field: 'fail_reason',
        headerName: 'Error Reason',
        flex: 1.2,
        minWidth: 180,
        renderCell: (p) => p.value || <em style={{ color: '#aaa' }}>None</em>,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Tooltip title="View Transaction Details">
            <IconButton size="small" onClick={() => handleOpenDetail(p.row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ]

    return cols
  }, [resolvedScreen])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppCard
        title="API Data Transaction Logs"
        subtitle="Monitor incoming webhooks payloads, duplicate validations, status codes, and API transaction metrics."
        action={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Date Filter</InputLabel>
              <Select
                value={apiFilter}
                label="Date Filter"
                onChange={(e) => setApiFilter(e.target.value)}
              >
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="all">All Logs</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SUCCESS">Success Only</MenuItem>
                <MenuItem value="FAILED">Failed Only</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
        fullHeight
      >
        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative', mt: 1 }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={filteredLogs} columns={columns} getRowId={(r) => r._id || r.id} />
        </Box>
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="span">
              API Transaction Details
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              ID: {selectedLog?._id || selectedLog?.id} | {selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString() : ''}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.customer_name || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Contact Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.contact_no || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Email ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.email || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.project || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Budget</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.budget || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Location</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.location || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Property Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.property_type || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Lead Source</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.lead_source || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Owner Email</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog?.contact_owner_email || 'N/A'}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Full Payload Attributes</Typography>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  backgroundColor: '#1E1E1E',
                  color: '#D4D4D4',
                  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                  maxHeight: '250px',
                  whiteSpace: 'pre-wrap',
                  borderRadius: 1
                }}
              >
                {selectedLog ? JSON.stringify(selectedLog, null, 2) : ''}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, px: 1 }}>
            <Typography variant="body2">
              Status:{' '}
              <span style={{ fontWeight: 700, color: selectedLog && selectedLog.status === 'SUCCESS' ? '#4CAF50' : '#FF9800' }}>
                {selectedLog?.status}
              </span>
            </Typography>
            {selectedLog?.fail_reason && (
              <Typography variant="body2" color="error" sx={{ ml: 2 }}>
                Reason: {selectedLog.fail_reason}
              </Typography>
            )}
          </Box>
          <Button onClick={() => setDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
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
