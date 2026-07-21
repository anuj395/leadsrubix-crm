import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import {
  Visibility as ViewIcon,
  DeleteSweep as ClearIcon,
  ArrowForward as OutgoingIcon,
  ArrowBack as IncomingIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/common/ConfirmContext'

export interface ApiLog {
  id: string
  timestamp: string
  direction: 'Incoming' | 'Outgoing'
  endpointName: string
  payloadPreview: string
  payloadFull: Record<string, any>
  statusCode: number
  responseTime: string
}

const INITIAL_LOGS: ApiLog[] = [
  {
    id: 'log_1',
    timestamp: '2026-06-15 12:35:14',
    direction: 'Incoming',
    endpointName: 'Facebook Lead Ads Webhook',
    payloadPreview: '{"lead_id": "891029", "name": "John Doe", "email": "john.doe@gmail.com", "phone": "+15550192"}',
    payloadFull: {
      object: 'page',
      entry: [
        {
          id: '10482930281',
          time: 1781504141,
          changes: [
            {
              value: {
                form_id: '3829103829',
                leadgen_id: '891029',
                created_time: 1781504141,
                page_id: '10482930281',
                adgroup_id: '29301829',
                ad_id: '9201820',
                name: 'John Doe',
                email: 'john.doe@gmail.com',
                phone: '+15550192',
                project: 'Villas at Meadowbrook',
              },
              field: 'leadgen',
            },
          ],
        },
      ],
    },
    statusCode: 200,
    responseTime: '45ms',
  },
  {
    id: 'log_2',
    timestamp: '2026-06-15 12:30:02',
    direction: 'Outgoing',
    endpointName: 'Google Sheets Exporter',
    payloadPreview: '{"spreadsheet_id": "sheet_12345", "range": "A2:G2", "values": [["John Doe", "john.doe@gmail.com"]]}',
    payloadFull: {
      action: 'append_row',
      spreadsheetId: '1pZ5V9204_j12k9aLmN428a-sheets',
      sheetName: 'Qualified Leads',
      data: {
        timestamp: '2026-06-15T07:00:02.128Z',
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        phone: '+15550192',
        status: 'Qualified',
        project: 'Villas at Meadowbrook',
        source: 'Facebook Ads',
      },
    },
    statusCode: 200,
    responseTime: '310ms',
  },
  {
    id: 'log_3',
    timestamp: '2026-06-15 11:45:22',
    direction: 'Incoming',
    endpointName: 'SendGrid Email Status Webhook',
    payloadPreview: '[{"email":"marketing@company.com","timestamp":1781501122,"event":"delivered","sg_event_id":"sg_123"}]',
    payloadFull: [
      {
        email: 'customer.care@rubix.com',
        timestamp: 1781501122,
        event: 'delivered',
        smtp_id: '<492018.mail@sendgrid.net>',
        sg_event_id: 'sg_delivered_9a2f1b8c',
        sg_message_id: 'msg_8291038.sg',
        response: '250 2.0.0 OK 1781501122 q10si29381plg.100 - gsmtp',
        tls: 1,
      },
    ],
    statusCode: 201,
    responseTime: '58ms',
  },
  {
    id: 'log_4',
    timestamp: '2026-06-15 11:12:05',
    direction: 'Outgoing',
    endpointName: 'Internal ERP Sync API',
    payloadPreview: '{"error": "Unauthorized key", "code": "AUTH_009", "message": "Failed to connect to ERP catalog"}',
    payloadFull: {
      request: {
        endpoint: '/api/v2/sync/leads',
        method: 'PUT',
        headers: {
          Authorization: 'Bearer expired_token_xyz',
        },
        body: {
          lead_id: 'lead_9028',
          amount: 54000,
          currency: 'USD',
          customer_id: 'cust_00921',
        },
      },
      response: {
        status: 401,
        statusText: 'Unauthorized',
        body: {
          error: 'Unauthorized key',
          code: 'AUTH_009',
          message: 'Failed to connect to ERP catalog. The provided Bearer token is expired or revoked.',
        },
      },
    },
    statusCode: 401,
    responseTime: '120ms',
  },
  {
    id: 'log_5',
    timestamp: '2026-06-15 10:05:00',
    direction: 'Incoming',
    endpointName: 'Facebook Lead Ads Webhook',
    payloadPreview: '{"error": "Bad Request", "message": "Signature verification failed. Invalid payload structure."}',
    payloadFull: {
      headers: {
        'x-hub-signature-256': 'sha256=invalid_signature_hash_value',
      },
      raw_payload: 'unstructured_text_payload_failed_to_parse',
      error: 'Signature verification failed. The secure webhook signature did not match.',
    },
    statusCode: 400,
    responseTime: '20ms',
  },
]

export default function IntegrationsApiDataPage() {
  const [logs, setLogs] = useState<ApiLog[]>(INITIAL_LOGS)
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const { confirmDelete } = useConfirm()

  const handleClearLogs = () => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to purge all API synced logs? This action cannot be undone.',
      onConfirm: () => {
        setLogs([])
        setToast({ open: true, msg: 'API logs cleared successfully', sev: 'success' })
      }
    })
  }

  const handleOpenDetail = (log: ApiLog) => {
    setSelectedLog(log)
    setDialogOpen(true)
  }

  const handleCopyPayload = () => {
    if (!selectedLog) return
    const text = JSON.stringify(selectedLog.payloadFull, null, 2)
    navigator.clipboard.writeText(text)
    setToast({ open: true, msg: 'Formatted JSON payload copied!', sev: 'success' })
  }

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs
    const query = search.toLowerCase()
    return logs.filter(
      (l) =>
        l.endpointName.toLowerCase().includes(query) ||
        l.payloadPreview.toLowerCase().includes(query) ||
        String(l.statusCode).includes(query),
    )
  }, [logs, search])

  const columns = useMemo<GridColDef<ApiLog>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: 'Timestamp',
        width: 170,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {p.value}
          </Typography>
        ),
      },
      {
        field: 'direction',
        headerName: 'Direction',
        width: 140,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: 'endpointName',
        headerName: 'Endpoint Link Name',
        flex: 1,
        minWidth: 200,
        renderCell: (p) => <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.value}</Typography>,
      },
      {
        field: 'payloadPreview',
        headerName: 'Payload Preview',
        flex: 1.5,
        minWidth: 280,
        renderCell: (p) => (
          <Box
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'text.secondary',
              backgroundColor: 'action.hover',
              p: 0.5,
              borderRadius: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '95%',
            }}
          >
            {p.value}
          </Box>
        ),
      },
      {
        field: 'statusCode',
        headerName: 'HTTP Status',
        width: 120,
        renderCell: (p) => {
          const code = p.value as number
          let statusText = String(code)
          if (code >= 200 && code < 300) statusText = `Success (${code})`
          else if (code >= 300 && code < 500) statusText = `Warning (${code})`
          else statusText = `Error (${code})`

          return <StatusBadge value={statusText} />
        },
      },
      {
        field: 'responseTime',
        headerName: 'Latency',
        width: 100,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary">
            {p.value}
          </Typography>
        ),
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Tooltip title="View Full Payload JSON">
            <IconButton size="small" onClick={() => handleOpenDetail(p.row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  )

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
        subtitle="Monitor incoming webhooks payloads, outgoing sync packets, latency profiles, and API endpoint delivery receipts."
        action={
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 220 }}
            />
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={handleClearLogs}
              disabled={logs.length === 0}
            >
              Clear Logs
            </Button>
          </Stack>
        }
        fullHeight
      >
        <AppDataGrid height="100%" rows={filteredLogs} columns={columns} getRowId={(r) => r.id} />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="span">
              Payload Sync Details
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              ID: {selectedLog?.id} | {selectedLog?.timestamp}
            </Typography>
          </Box>
          <Button startIcon={<CopyIcon />} size="small" onClick={handleCopyPayload} variant="outlined">
            Copy JSON
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: '#1E1E1E',
              color: '#D4D4D4',
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '0.85rem',
              overflowX: 'auto',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {selectedLog ? JSON.stringify(selectedLog.payloadFull, null, 2) : ''}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, px: 1 }}>
            <Typography variant="body2">
              Status Code:{' '}
              <span style={{ fontWeight: 700, color: selectedLog && selectedLog.statusCode < 300 ? '#4CAF50' : '#FF9800' }}>
                {selectedLog?.statusCode}
              </span>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              | Latency: {selectedLog?.responseTime}
            </Typography>
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
