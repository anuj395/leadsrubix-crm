import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HandshakeIcon from '@mui/icons-material/Handshake'
import PhoneIcon from '@mui/icons-material/Phone'
import AlarmIcon from '@mui/icons-material/Alarm'
import RepeatIcon from '@mui/icons-material/Repeat'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback'
import BlockIcon from '@mui/icons-material/Block'
import PersonIcon from '@mui/icons-material/Person'
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
import { normalizeStage } from '@/utils/stageUtils'
import ConvertLeadModal from '../components/ConvertLeadModal'
import LogCallModal from '../components/LogCallModal'
import CallbackModal from '../components/CallbackModal'
import NotInterestedModal from '../components/NotInterestedModal'

export default function InquiriesListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const [loading, setLoading] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [filterStage, setFilterStage] = useState<'FRESH' | 'CALLBACK' | 'CONTACTED' | 'UNASSIGNED' | 'ALL'>('FRESH')

  // Modals state
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [selectedContactForCall, setSelectedContactForCall] = useState<any | null>(null)
  const [callbackOpen, setCallbackOpen] = useState(false)
  const [selectedContactIdForCallback, setSelectedContactIdForCallback] = useState<string>('')
  const [notIntModalOpen, setNotIntModalOpen] = useState(false)
  const [selectedContactIdForNotInt, setSelectedContactIdForNotInt] = useState<string>('')

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const res = await api.get('contacts', { params: { limit: 5000 } })
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

  const handleOpenNotInt = (inquiryId: string) => {
    setSelectedContactIdForNotInt(inquiryId)
    setNotIntModalOpen(true)
  }

  // Summary Metrics & Triage Counts
  const { metrics, triageCounts } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let unassigned = 0
    let contactedToday = 0
    let qualifiedToday = 0
    let freshCount = 0
    let callbackCount = 0
    let contactedCount = 0

    inquiries.forEach((item) => {
      const stage = normalizeStage(item.stage || item.lifecycle_stage)
      const hasOwner = Boolean(item.contactOwnerEmail || item.contact_owner_email || item.contactOwnerId || item.contact_owner_id)
      if (!hasOwner) unassigned++

      if (stage === 'FRESH') freshCount++
      else if (stage === 'CALLBACK') callbackCount++
      else if (stage === 'INTERESTED' || stage === 'QUALIFIED') contactedCount++

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
      metrics: {
        total: inquiries.length,
        unassigned,
        contactedToday,
        qualifiedToday,
      },
      triageCounts: {
        fresh: freshCount,
        callback: callbackCount,
        contacted: contactedCount,
        unassigned,
        all: inquiries.length,
      }
    }
  }, [inquiries])

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      const stage = normalizeStage(item.stage || item.lifecycle_stage)
      const hasOwner = Boolean(item.contactOwnerEmail || item.contact_owner_email || item.contactOwnerId || item.contact_owner_id)

      if (filterStage === 'FRESH') {
        return stage === 'FRESH'
      }
      if (filterStage === 'CALLBACK') {
        return stage === 'CALLBACK'
      }
      if (filterStage === 'CONTACTED') {
        return stage === 'INTERESTED' || stage === 'QUALIFIED'
      }
      if (filterStage === 'UNASSIGNED') {
        return !hasOwner
      }
      return true
    })
  }, [inquiries, filterStage])

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: 'CUSTOMER / INQUIRY',
      flex: 1.1,
      minWidth: 145,
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
      field: 'urgency',
      headerName: 'SLA STATUS',
      width: 135,
      minWidth: 135,
      renderCell: (params) => {
        const row = params.row
        const created = row.createdAt || row.created_at
        const stage = normalizeStage(row.stage || row.lifecycle_stage)
        const isContacted = Boolean(row.last_contacted_at || row.lastContactedAt || stage === 'INTERESTED' || stage === 'QUALIFIED' || stage === 'CALLBACK' || stage === 'WON')

        if (!created) return <Typography variant="caption" color="text.secondary">—</Typography>

        const elapsedMin = Math.floor((Date.now() - new Date(created).getTime()) / 60000)

        if (isContacted) {
          return (
            <Chip
              size="small"
              icon={<CheckCircleIcon style={{ fontSize: 12 }} />}
              label="Responded"
              color="success"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
            />
          )
        }

        if (elapsedMin < 15) {
          return (
            <Tooltip title="Arrived within last 15 minutes - First call urgent!">
              <Chip
                size="small"
                icon={<AlarmIcon style={{ fontSize: 12, color: '#fff' }} />}
                label="< 15m Urgent"
                color="error"
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: 'error.main', color: '#fff' }}
              />
            </Tooltip>
          )
        } else if (elapsedMin < 120) {
          return (
            <Chip
              size="small"
              label={`${Math.round(elapsedMin / 60)}h ago`}
              color="warning"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
            />
          )
        } else {
          const days = Math.floor(elapsedMin / 1440)
          const label = days > 0 ? `${days}d overdue` : `${Math.floor(elapsedMin / 60)}h overdue`
          return (
            <Chip
              size="small"
              label={label}
              color="default"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}
            />
          )
        }
      },
    },
    {
      field: 'contact_number',
      headerName: 'PHONE',
      width: 110,
      minWidth: 110,
      valueGetter: (_, row) => row.contact_number || row.contactNumber || '—',
    },
    {
      field: 'project_name',
      headerName: 'PROJECT / REQ',
      flex: 1.1,
      minWidth: 140,
      renderCell: (params) => {
        const raw = params.row.project_name || params.row.projectName || params.row.propertyType
        if (!raw || String(raw).trim().toLowerCase() === 'test') {
          return (
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic' }}>
              General Inquiry
            </Typography>
          )
        }
        return (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }} noWrap>
            {raw}
          </Typography>
        )
      },
    },
    {
      field: 'source',
      headerName: 'SOURCE',
      width: 105,
      minWidth: 105,
      renderCell: (params) => {
        const src = String(params.row.source || params.row.lead_source || 'Inbound').trim()
        const isMeta = src.toLowerCase().includes('meta') || src.toLowerCase().includes('facebook')
        const isPortal = src.toLowerCase().includes('99') || src.toLowerCase().includes('acre') || src.toLowerCase().includes('magic')
        return (
          <Chip
            label={src}
            size="small"
            variant="outlined"
            color={isMeta ? 'primary' : isPortal ? 'secondary' : 'info'}
            sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
          />
        )
      },
    },
    {
      field: 'owner',
      headerName: 'ASSIGNED REP',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => {
        const owner = params.row.contactOwnerEmail || params.row.contact_owner_email || params.row.ownerName
        if (!owner) {
          return (
            <Chip
              icon={<PersonOffIcon style={{ fontSize: 12 }} />}
              label="Unassigned Pool"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
            />
          )
        }
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
              {owner}
            </Typography>
          </Stack>
        )
      },
    },
    {
      field: 'actions',
      headerName: 'FAST ACTIONS',
      width: 265,
      minWidth: 265,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
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
                startIcon={<PhoneIcon sx={{ fontSize: '13px !important' }} />}
                onClick={() => handleOpenCall(row)}
                sx={{
                  height: 24,
                  px: 0.75,
                  py: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                }}
              >
                Call
              </Button>
            </Tooltip>

            <Tooltip title="Qualify and promote into Verified Contacts">
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                onClick={() => handleQualify(id)}
                sx={{
                  height: 24,
                  px: 0.75,
                  py: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '5px',
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                }}
              >
                Qualify
              </Button>
            </Tooltip>

            <Tooltip title="Schedule redial / callback">
              <IconButton
                size="small"
                onClick={() => handleOpenCallback(id)}
                sx={{
                  width: 24,
                  height: 24,
                  color: 'warning.main',
                  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                  border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                  borderRadius: '5px',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.18),
                  },
                }}
              >
                <AlarmIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Create Deal in Revenue Pipeline">
              <IconButton
                size="small"
                onClick={() => handleOpenConvert(row)}
                sx={{
                  width: 24,
                  height: 24,
                  color: 'secondary.main',
                  bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
                  border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
                  borderRadius: '5px',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.18),
                  },
                }}
              >
                <HandshakeIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Mark as Junk / Spam / Disqualified">
              <IconButton
                size="small"
                onClick={() => handleOpenNotInt(id)}
                sx={{
                  width: 24,
                  height: 24,
                  color: 'error.main',
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                  border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                  borderRadius: '5px',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.18),
                  },
                }}
              >
                <BlockIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      },
    },
  ]

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, mb: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.25, color: 'text.primary', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Inbound Inquiries Triage Desk
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          High-velocity queue for incoming leads, ad submissions, and webhooks. Act quickly on fresh inquiries to maintain SLA.
        </Typography>
      </Box>

      {/* KPI Metric Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ mb: 1.5, flexShrink: 0 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <TrendingUpIcon color="primary" sx={{ fontSize: { xs: 24, sm: 28 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, display: 'block' }}>TOTAL INCOMING</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>{metrics.total}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <PersonOffIcon color="warning" sx={{ fontSize: { xs: 24, sm: 28 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, display: 'block' }}>UNASSIGNED POOL</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'warning.main', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>{metrics.unassigned}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <PhoneCallbackIcon color="info" sx={{ fontSize: { xs: 24, sm: 28 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, display: 'block' }}>CONTACTED TODAY</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'info.main', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>{metrics.contactedToday}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <CheckCircleIcon color="success" sx={{ fontSize: { xs: 24, sm: 28 } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, display: 'block' }}>QUALIFIED TODAY</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'success.main', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>{metrics.qualifiedToday}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <AppCard fullHeight title="Operational Triage Queue" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Operational Triage Tabs Bar */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mb: 1.5,
            overflowX: 'auto',
            pb: 0.5,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Chip
            label={`🚨 Needs First Response (${triageCounts.fresh})`}
            clickable
            color={filterStage === 'FRESH' ? 'primary' : 'default'}
            variant={filterStage === 'FRESH' ? 'filled' : 'outlined'}
            onClick={() => setFilterStage('FRESH')}
            sx={{
              height: 32,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '16px',
              border: filterStage === 'FRESH' ? 'none' : '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Chip
            label={`⏰ Callbacks Due (${triageCounts.callback})`}
            clickable
            color={filterStage === 'CALLBACK' ? 'warning' : 'default'}
            variant={filterStage === 'CALLBACK' ? 'filled' : 'outlined'}
            onClick={() => setFilterStage('CALLBACK')}
            sx={{
              height: 32,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '16px',
              border: filterStage === 'CALLBACK' ? 'none' : '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Chip
            label={`💬 In Discussion (${triageCounts.contacted})`}
            clickable
            color={filterStage === 'CONTACTED' ? 'info' : 'default'}
            variant={filterStage === 'CONTACTED' ? 'filled' : 'outlined'}
            onClick={() => setFilterStage('CONTACTED')}
            sx={{
              height: 32,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '16px',
              border: filterStage === 'CONTACTED' ? 'none' : '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Chip
            label={`👤 Unassigned Queue (${triageCounts.unassigned})`}
            clickable
            color={filterStage === 'UNASSIGNED' ? 'secondary' : 'default'}
            variant={filterStage === 'UNASSIGNED' ? 'filled' : 'outlined'}
            onClick={() => setFilterStage('UNASSIGNED')}
            sx={{
              height: 32,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '16px',
              border: filterStage === 'UNASSIGNED' ? 'none' : '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Chip
            label={`📋 All Incoming (${triageCounts.all})`}
            clickable
            color={filterStage === 'ALL' ? 'primary' : 'default'}
            variant={filterStage === 'ALL' ? 'filled' : 'outlined'}
            onClick={() => setFilterStage('ALL')}
            sx={{
              height: 32,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '16px',
              border: filterStage === 'ALL' ? 'none' : '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppDataGrid
            height="100%"
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

      {/* Not Interested / Junk Modal */}
      {notIntModalOpen && selectedContactIdForNotInt && (
        <NotInterestedModal
          open={notIntModalOpen}
          onClose={() => setNotIntModalOpen(false)}
          contactId={selectedContactIdForNotInt}
          onSuccess={() => {
            fetchInquiries()
            setToast({ open: true, msg: 'Inquiry marked as junk/lost', sev: 'success' })
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
