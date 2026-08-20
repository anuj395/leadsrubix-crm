import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ContentCopy as CopyIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useConfirm } from '@/components/common/ConfirmContext'
import { useAppSelector } from '@/store/hooks'

export interface ApiEndpoint {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  status: 'Active' | 'Inactive'
  type: 'Incoming Webhook' | 'Outgoing Webhook' | 'Rest API'
  description: string
}

export default function IntegrationsApiPage() {
  const user = useAppSelector((s) => s.auth.user)
  const indCode = String(user?.industryId || '').toLowerCase().trim();

  const initialApis = useMemo<ApiEndpoint[]>(() => {
    if (indCode === 'temp0003') {
      return [
        {
          id: 'a1',
          name: 'Facebook Patient Webhook',
          url: 'https://api.leadsrubix.com/api/v1/webhooks/facebook',
          method: 'POST',
          status: 'Active',
          type: 'Incoming Webhook',
          description: 'Receives real-time patient registrations from Facebook campaigns.',
        },
        {
          id: 'a2',
          name: 'Google Sheets Patient Exporter',
          url: 'https://script.google.com/macros/s/AKfycbz.../exec',
          method: 'POST',
          status: 'Active',
          type: 'Outgoing Webhook',
          description: 'Pushes patient records to external spreadsheet catalog.',
        },
        {
          id: 'a3',
          name: 'SendGrid Email Status Webhook',
          url: 'https://api.leadsrubix.com/api/v1/webhooks/sendgrid',
          method: 'POST',
          status: 'Active',
          type: 'Incoming Webhook',
          description: 'Tracks delivery, bounce, and open status of outbound emails.',
        },
        {
          id: 'a4',
          name: 'Internal Hospital ERP Sync API',
          url: 'https://erp.internal.company.com/api/patients',
          method: 'PUT',
          status: 'Inactive',
          type: 'Rest API',
          description: 'Synchronizes patient records with internal healthcare ERP systems.',
        },
      ];
    }
    if (indCode === 'temp0002') {
      return [
        {
          id: 'a1',
          name: 'Facebook Lead Ads Webhook',
          url: 'https://api.leadsrubix.com/api/v1/webhooks/facebook',
          method: 'POST',
          status: 'Active',
          type: 'Incoming Webhook',
          description: 'Receives real-time customer submissions from Facebook Ad campaigns.',
        },
        {
          id: 'a2',
          name: 'Google Sheets Exporter',
          url: 'https://script.google.com/macros/s/AKfycbz.../exec',
          method: 'POST',
          status: 'Active',
          type: 'Outgoing Webhook',
          description: 'Pushes qualified order records to external spreadsheet catalog.',
        },
        {
          id: 'a3',
          name: 'SendGrid Email Status Webhook',
          url: 'https://api.leadsrubix.com/api/v1/webhooks/sendgrid',
          method: 'POST',
          status: 'Active',
          type: 'Incoming Webhook',
          description: 'Tracks delivery, bounce, and open status of outbound emails.',
        },
        {
          id: 'a4',
          name: 'Internal Store ERP Sync API',
          url: 'https://erp.internal.company.com/api/orders',
          method: 'PUT',
          status: 'Inactive',
          type: 'Rest API',
          description: 'Synchronizes completed sales records with internal ERP systems.',
        },
      ];
    }
    return [
      {
        id: 'a1',
        name: 'Facebook Lead Ads Webhook',
        url: 'https://api.leadsrubix.com/api/v1/webhooks/facebook',
        method: 'POST',
        status: 'Active',
        type: 'Incoming Webhook',
        description: 'Receives real-time lead submissions from Facebook Ad campaigns.',
      },
      {
        id: 'a2',
        name: 'Google Sheets Exporter',
        url: 'https://script.google.com/macros/s/AKfycbz.../exec',
        method: 'POST',
        status: 'Active',
        type: 'Outgoing Webhook',
        description: 'Pushes qualified lead records to external spreadsheet catalog.',
      },
      {
        id: 'a3',
        name: 'SendGrid Email Status Webhook',
        url: 'https://api.leadsrubix.com/api/v1/webhooks/sendgrid',
        method: 'POST',
        status: 'Active',
        type: 'Incoming Webhook',
        description: 'Tracks delivery, bounce, and open status of outbound emails.',
      },
      {
        id: 'a4',
        name: 'Internal ERP Sync API',
        url: 'https://erp.internal.company.com/api/leads',
        method: 'PUT',
        status: 'Inactive',
        type: 'Rest API',
        description: 'Synchronizes completed sales records with internal ERP systems.',
      },
    ];
  }, [indCode]);

  const subtitle = useMemo(() => {
    if (indCode === 'temp0003') return 'Configure incoming patient triage webhooks and outgoing data sync API integrations.'
    if (indCode === 'temp0002') return 'Configure incoming customer webhooks and outgoing data sync API integrations.'
    return 'Configure incoming lead capture webhooks and outgoing data sync API integrations.'
  }, [indCode])

  const [items, setItems] = useState<ApiEndpoint[]>([])
  useEffect(() => {
    setItems(initialApis)
  }, [initialApis])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiEndpoint | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    name: '',
    url: '',
    method: 'POST' as ApiEndpoint['method'],
    status: 'Active' as ApiEndpoint['status'],
    type: 'Incoming Webhook' as ApiEndpoint['type'],
    description: '',
  })

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      name: '',
      url: 'https://',
      method: 'POST',
      status: 'Active',
      type: 'Incoming Webhook',
      description: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (apiE: ApiEndpoint) => {
    setEditing(apiE)
    setForm({
      name: apiE.name,
      url: apiE.url,
      method: apiE.method,
      status: apiE.status,
      type: apiE.type,
      description: apiE.description,
    })
    setDialogOpen(true)
  }

  const { confirmDelete } = useConfirm()

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this API endpoint? This action cannot be undone.',
      onConfirm: () => {
        setItems((prev) => prev.filter((a) => a.id !== id))
        setToast({ open: true, msg: 'API endpoint deleted successfully', sev: 'success' })
      }
    })
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setToast({ open: true, msg: 'Endpoint URL copied to clipboard!', sev: 'success' })
  }

  const handleSave = () => {
    if (!form.name || !form.url) {
      setToast({ open: true, msg: 'Name and URL are required', sev: 'error' })
      return
    }

    if (editing) {
      setItems((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? {
                ...a,
                ...form,
              }
            : a,
        ),
      )
      setToast({ open: true, msg: 'API Endpoint updated successfully', sev: 'success' })
    } else {
      const newApi: ApiEndpoint = {
        id: `a_${Date.now()}`,
        ...form,
      }
      setItems((prev) => [newApi, ...prev])
      setToast({ open: true, msg: 'API Endpoint added successfully', sev: 'success' })
    }
    setDialogOpen(false)
  }

  const columns = useMemo<GridColDef<ApiEndpoint>[]>(
    () => [
      {
        field: 'name',
        headerName: 'API Endpoint Name',
        flex: 1.2,
        minWidth: 180,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'method',
        headerName: 'Method',
        width: 100,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: 'url',
        headerName: 'Endpoint URL',
        flex: 1.5,
        minWidth: 250,
        renderCell: (p) => (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.value}
            </Box>
            <Tooltip title="Copy URL">
              <IconButton size="small" onClick={() => handleCopy(p.value)}>
                <CopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: 'type',
        headerName: 'Integration Type',
        width: 160,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
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
        title="API Endpoints Catalog"
        subtitle={subtitle}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add API
          </Button>
        }
        fullHeight
      >
        <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit API Integration' : 'Add API Integration'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                label="API Endpoint Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Box>
            <Box>
              <TextField
                select
                fullWidth
                label="HTTP Method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as ApiEndpoint['method'] })}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </TextField>
            </Box>
            <Box>
              <TextField
                select
                fullWidth
                label="Integration Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ApiEndpoint['type'] })}
              >
                <MenuItem value="Incoming Webhook">Incoming Webhook</MenuItem>
                <MenuItem value="Outgoing Webhook">Outgoing Webhook</MenuItem>
                <MenuItem value="Rest API">Rest API</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                label="Endpoint URL"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
            </Box>
            <Box>
              <TextField
                select
                fullWidth
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ApiEndpoint['status'] })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
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
