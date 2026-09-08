import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FilterListIcon from '@mui/icons-material/FilterList'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { useNavigate } from 'react-router-dom'
import ConvertLeadModal from '../components/ConvertLeadModal'


export default function InquiriesListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const [loading, setLoading] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState('ALL')
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const res = await api.get('contacts', { params: { limit: 200 } })
      const rawItems = res.data?.items || res.data?.contacts || res.data || []
      // Filter Tier 1 Raw Inquiries or Fresh leads
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

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      if (filterStage === 'FRESH' && item.stage && !String(item.stage).toLowerCase().includes('fresh')) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (item.customer_name || item.customerName || '').toLowerCase().includes(q)
        const phoneMatch = (item.contact_number || item.contactNumber || '').toLowerCase().includes(q)
        const emailMatch = (item.email_id || item.emailId || '').toLowerCase().includes(q)
        if (!nameMatch && !phoneMatch && !emailMatch) return false
      }
      return true
    })
  }, [inquiries, filterStage, searchQuery])

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: 'CUSTOMER NAME',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate(`/leads/contacts/${params.row._id || params.row.id}`)}
        >
          {params.row.customer_name || params.row.customerName || 'Inquiry'}
        </Typography>
      ),
    },
    {
      field: 'contact_number',
      headerName: 'CONTACT NUMBER',
      flex: 1,
      minWidth: 130,
      valueGetter: (value, row) => row.contact_number || row.contactNumber || '—',
    },
    {
      field: 'email_id',
      headerName: 'EMAIL ID',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (value, row) => row.email_id || row.emailId || '—',
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
      headerName: 'LIFECYCLE STAGE',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.lifecycle_stage || params.row.stage || 'INQUIRY'}
          size="small"
          color="primary"
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'PUNCH DATE & TIME',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (value, row) => {
        const d = row.createdAt || row.created_at
        if (!d) return '—'
        return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      field: 'actions',
      headerName: 'ACTIONS',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleQualify(params.row._id || params.row.id)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
          >
            Qualify
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<HandshakeIcon />}
            onClick={() => handleOpenConvert(params.row)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
          >
            Deal
          </Button>
        </Stack>
      ),
    },
  ]

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, mb: 3 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
          Raw Inquiries (Tier 1 Inbox)
        </Typography>
        <Typography color="text.secondary">
          Track and qualify unverified incoming webhooks from Meta/Facebook Ads, Google, Web forms, and Phone calls before converting to sales leads.
        </Typography>
      </Box>

      <AppCard fullHeight title="Inquiries Cockpit" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search inquiries by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 320 }}
          />

          <Stack direction="row" spacing={1}>
            <Chip
              label="All Inquiries"
              clickable
              color={filterStage === 'ALL' ? 'primary' : 'default'}
              onClick={() => setFilterStage('ALL')}
            />
            <Chip
              label="Fresh Unqualified"
              clickable
              color={filterStage === 'FRESH' ? 'primary' : 'default'}
              onClick={() => setFilterStage('FRESH')}
            />
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppDataGrid
            rows={filteredInquiries}
            columns={columns}
            loading={loading}
            getRowId={(row) => row._id || row.id || Math.random()}
          />
        </Box>
      </AppCard>

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
    </Box>
  )
}
