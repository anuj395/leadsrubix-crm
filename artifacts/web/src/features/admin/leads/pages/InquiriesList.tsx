import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HandshakeIcon from '@mui/icons-material/Handshake'
import PhoneIcon from '@mui/icons-material/Phone'
import AlarmIcon from '@mui/icons-material/Alarm'
import RepeatIcon from '@mui/icons-material/Repeat'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { GridColDef } from '@mui/x-data-grid'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { useNavigate } from 'react-router-dom'
import ConvertLeadModal from '../components/ConvertLeadModal'
import LogCallModal from '../components/LogCallModal'
import CallbackModal from '../components/CallbackModal'

export default function InquiriesListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const [loading, setLoading] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState('ALL')

  // Modals state
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [selectedContactForCall, setSelectedContactForCall] = useState<any | null>(null)
  const [callbackOpen, setCallbackOpen] = useState(false)
  const [selectedContactIdForCallback, setSelectedContactIdForCallback] = useState<string>('')

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const res = await api.get('contacts', { params: { limit: 300 } })
      const rawItems = res.data?.items || res.data?.contacts || res.data || []
      setInquiries(Array.isArray(rawItems) ? rawItems : [])
    } catch (err: any) {
      console.warn('Failed to fetch inquiries:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInquiries()
  }, [])

  const handleQualify = async (id: string) => {
    try {
      await api.post(`contacts/${id}/qualify`)
      setToast({ open: true, msg: 'Inquiry qualified to Lead successfully!', sev: 'success' })
      fetchInquiries()
    } catch (err: any) {
      setToast({ open: true, msg: err?.message || 'Failed to qualify inquiry', sev: 'error' })
    }
  }

  const handleOpenConvert = (inquiry: any) => {
    setSelectedInquiry(inquiry)
    setConvertModalOpen(true)
  }

  const handleOpenCall = (inquiry: any) => {
    setSelectedContactForCall(inquiry)
    setLogCallOpen(true)
  }

  const handleOpenCallback = (inquiryId: string) => {
    setSelectedContactIdForCallback(inquiryId)
    setCallbackOpen(true)
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let unassigned = 0
    let contactedToday = 0
    let qualifiedToday = 0

    inquiries.forEach((item) => {
      const hasOwner = item.contactOwnerEmail || item.contact_owner_email || item.contactOwnerId
      if (!hasOwner) unassigned++

      const cDate = item.last_contacted_at || item.lastContactedAt || item.call_response_time
      if (cDate && new Date(cDate).toISOString().split('T')[0] === todayStr) {
        contactedToday++
      }

      const qDate = item.qualified_at || item.qualifiedAt
      if (qDate && new Date(qDate).toISOString().split('T')[0] === todayStr) {
        qualifiedToday++
      }
    })

    return {
      total: inquiries.length,
      unassigned,
      contactedToday,
      qualifiedToday,
    }
  }, [inquiries])

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      const isAlreadyConverted =
        item.is_converted === true ||
        item.isConverted === true ||
        (item.stage && String(item.stage).toUpperCase().includes('DEAL'))

      if (isAlreadyConverted) return false

      const st = String(item.stage || '').toUpperCase()

      if (filterStage === 'FRESH' && (st.includes('CALLBACK') || st.includes('CONTACTED') || st.includes('INTERESTED') || st.includes('QUALIFIED'))) {
        return false
      }
      if (filterStage === 'CALLBACK' && !(st.includes('CALLBACK') || st.includes('CALL_BACK'))) {
        return false
      }
      if (filterStage === 'CONTACTED' && !(st.includes('CONTACTED') || st.includes('INTERESTED'))) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (item.customer_name || item.customerName || '').toLowerCase().includes(q)
        const phoneMatch = (item.contact_number || item.contactNumber || '').toLowerCase().includes(q)
        const emailMatch = (item.email_id || item.emailId || '').toLowerCase().includes(q)
        const projMatch = (item.project_name || item.projectName || '').toLowerCase().includes(q)
        if (!nameMatch && !phoneMatch && !emailMatch && !projMatch) return false
      }
      return true
    })
  }, [inquiries, filterStage, searchQuery])

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: 'CUSTOMER / INQUIRY',
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => {
        const name = params.row.customer_name || params.row.customerName || 'New Inquiry'
        const inqCount = params.row.inquiryCount || (params.row.inquiries && params.row.inquiries.length) || 1
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() => navigate(`/leads/contacts/${params.row._id || params.row.id}`)}
            >
              {name}
            </Typography>
            {inqCount > 1 && (
              <Tooltip title={`Repeat Customer: ${inqCount} inquiries received over time`}>
                <Chip
                  icon={<RepeatIcon style={{ fontSize: 12 }} />}
                  size="small"
                  label={`Repeat (${inqCount} Inquiries)`}
                  color="secondary"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, width: 'fit-content' }}
                />
              </Tooltip>
            )}
          </Box>
        )
      },
    },
    {
      field: 'contact_number',
      headerName: 'PHONE NUMBER',
      flex: 1,
      minWidth: 130,
      valueGetter: (_, row) => row.contact_number || row.contactNumber || '—',
    },
    {
      field: 'project_name',
      headerName: 'PROJECT / REQUIREMENT',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (_, row) => row.project_name || row.projectName || row.propertyType || '—',
    },
    {
      field: 'source',
      headerName: 'SOURCE',
      flex: 0.9,
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={params.row.source || params.row.lead_source || 'Direct'}
          size="small"
          variant="outlined"
          color="info"
        />
      ),
    },
    {
      field: 'stage',
      headerName: 'STAGE',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <StatusBadge value={params.row.stage || params.row.lifecycle_stage || 'INBOUND'} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'RECEIVED AT',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (_, row) => {
        const d = row.createdAt || row.created_at
        if (!d) return '—'
        return new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      field: 'actions',
      headerName: 'FAST ACTIONS',
      flex: 1.8,
      minWidth: 320,
      sortable: false,
      renderCell: (params) => {
        const row = params.row
        const id = row._id || row.id
        return (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ height: '100%' }}>
            <Tooltip title="Log phone conversation outcome">
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<PhoneIcon />}
                onClick={() => handleOpenCall(row)}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.3 }}
              >
                Call
              </Button>
            </Tooltip>

            <Tooltip title="Schedule redial / callback">
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<AlarmIcon />}
                onClick={() => handleOpenCallback(id)}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.3 }}
              >
                Callback
              </Button>
            </Tooltip>

            <Tooltip title="Promote to Qualified Sales Lead">
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleQualify(id)}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.3 }}
              >
                Qualify
              </Button>
            </Tooltip>

            <Tooltip title="Create Deal in Revenue Pipeline">
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<HandshakeIcon />}
                onClick={() => handleOpenConvert(row)}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.3 }}
              >
                Deal
              </Button>
            </Tooltip>
          </Stack>
        )
      },
    },
  ]

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: 'text.primary' }}>
          Inbound Inquiries
        </Typography>
        <Typography variant="body2" color="text.secondary">
          High-velocity triage inbox for newly received customer inquiries, webhook submissions, and incoming calls.
        </Typography>
      </Box>

      {/* KPI Metric Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.75 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <TrendingUpIcon color="primary" sx={{ fontSize: { xs: 24, sm: 32 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block' }}>TOTAL INCOMING</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>{metrics.total}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.75 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <PersonOffIcon color="warning" sx={{ fontSize: { xs: 24, sm: 32 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block' }}>UNASSIGNED POOL</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'warning.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>{metrics.unassigned}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.75 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <PhoneCallbackIcon color="info" sx={{ fontSize: { xs: 24, sm: 32 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block' }}>CONTACTED TODAY</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'info.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>{metrics.contactedToday}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.75 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <CheckCircleIcon color="success" sx={{ fontSize: { xs: 24, sm: 32 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block' }}>QUALIFIED TODAY</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'success.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>{metrics.qualifiedToday}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <AppCard fullHeight title="Inquiries Triage" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by customer name, phone, email, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 340 } }}
          />

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, overflowX: 'auto', pb: 0.5 }}>
            <Chip
              label="All Inquiries"
              clickable
              color={filterStage === 'ALL' ? 'primary' : 'default'}
              variant={filterStage === 'ALL' ? 'filled' : 'outlined'}
              onClick={() => setFilterStage('ALL')}
            />
            <Chip
              label="Fresh Inbound"
              clickable
              color={filterStage === 'FRESH' ? 'primary' : 'default'}
              variant={filterStage === 'FRESH' ? 'filled' : 'outlined'}
              onClick={() => setFilterStage('FRESH')}
            />
            <Chip
              label="Callbacks Scheduled"
              clickable
              color={filterStage === 'CALLBACK' ? 'warning' : 'default'}
              variant={filterStage === 'CALLBACK' ? 'filled' : 'outlined'}
              onClick={() => setFilterStage('CALLBACK')}
            />
            <Chip
              label="Contacted / In Progress"
              clickable
              color={filterStage === 'CONTACTED' ? 'info' : 'default'}
              variant={filterStage === 'CONTACTED' ? 'filled' : 'outlined'}
              onClick={() => setFilterStage('CONTACTED')}
            />
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppDataGrid
            rows={filteredInquiries}
            columns={columns}
            loading={loading}
            getRowId={(row) => row._id || row.id || Math.random()}
            onReload={fetchInquiries}
          />
        </Box>
      </AppCard>

      {/* Log Call Modal */}
      {logCallOpen && selectedContactForCall && (
        <LogCallModal
          open={logCallOpen}
          onClose={() => setLogCallOpen(false)}
          contact={selectedContactForCall}
          onSuccess={() => {
            fetchInquiries()
            setToast({ open: true, msg: 'Call logged successfully!', sev: 'success' })
          }}
        />
      )}

      {/* Callback Modal */}
      {callbackOpen && selectedContactIdForCallback && (
        <CallbackModal
          open={callbackOpen}
          onClose={() => setCallbackOpen(false)}
          contactId={selectedContactIdForCallback}
          onSuccess={() => {
            fetchInquiries()
            setToast({ open: true, msg: 'Callback scheduled successfully!', sev: 'success' })
          }}
        />
      )}

      {/* Convert to Deal Modal */}
      {convertModalOpen && selectedInquiry && (
        <ConvertLeadModal
          open={convertModalOpen}
          onClose={() => setConvertModalOpen(false)}
          contact={selectedInquiry}
          onSuccess={() => {
            fetchInquiries()
            setToast({ open: true, msg: 'Deal created successfully!', sev: 'success' })
          }}
        />
      )}

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
