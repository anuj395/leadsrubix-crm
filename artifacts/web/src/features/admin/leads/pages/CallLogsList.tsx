import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CallMadeIcon from '@mui/icons-material/CallMade'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import api from '@/services/axiosInstance'

interface CallLog {
  _id: string
  id?: string
  customerName?: string
  customer_name?: string
  contactNumber?: string
  contact_no?: string
  createdBy?: string
  created_by?: string
  type?: string
  direction?: 'Inbound' | 'Outbound'
  duration: number | string
  stage?: string
  status?: 'Answered' | 'Missed' | 'No Answer' | 'Busy'
  created_at?: string
  createdAt?: string
  details?: string
  notes?: string
}

export default function CallLogsListPage() {
  const { user } = useAppSelector(selectAuth)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [logs, setLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(false)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })

  const fetchLogs = async () => {
    const userAny = user as any
    if (!userAny?.id) return
    setLoading(true)
    try {
      const filter: Record<string, unknown> = {}
      if (statusFilter !== 'All') {
        filter.stage = [statusFilter.toUpperCase()]
      }

      const res = await api.post('/call-logs/search', {
        uid: userAny.uid || userAny.id,
        filter,
        sort: { created_at: -1 },
        searchString: search,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      })

      setLogs(res.data || [])
    } catch (err) {
      console.error('Failed to fetch call logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search, statusFilter, paginationModel.page, paginationModel.pageSize])

  const stats = useMemo(() => {
    const total = logs.length
    const answered = logs.filter((l) => (l.stage || l.status || '').toLowerCase() === 'answered').length
    const missed = logs.filter((l) => (l.stage || l.status || '').toLowerCase() === 'missed').length
    const inbound = logs.filter((l) => (l.type || l.direction || '').toLowerCase() === 'inbound').length
    const outbound = logs.filter((l) => (l.type || l.direction || '').toLowerCase() === 'outbound').length
    return { total, answered, missed, inbound, outbound }
  }, [logs])

  const columns = useMemo<GridColDef<CallLog>[]>(() => [
    {
      field: 'type',
      headerName: 'Dir',
      width: 80,
      renderCell: (params) => {
        const isI = String(params.value || '').toLowerCase() === 'inbound'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {isI ? (
              <CallReceivedIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
            ) : (
              <CallMadeIcon sx={{ color: 'secondary.main', fontSize: '1.1rem' }} />
            )}
          </Box>
        )
      },
    },
    {
      field: 'customerName',
      headerName: 'Customer Name',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_v, row) => row.customerName || row.customer_name || '',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'contactNumber',
      headerName: 'Phone Number',
      flex: 1,
      minWidth: 130,
      valueGetter: (_v, row) => row.contactNumber || row.contact_no || ''
    },
    {
      field: 'createdBy',
      headerName: 'Agent',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.createdBy || row.created_by || '',
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          <SupportAgentIcon sx={{ fontSize: '1.05rem', color: 'text.secondary' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: 'stage',
      headerName: 'Status',
      width: 120,
      valueGetter: (_v, row) => row.stage || row.status || '',
      renderCell: (params) => <StatusBadge value={params.value} />,
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
      valueGetter: (_v, row) => {
        const d = Number(row.duration) || 0;
        if (d === 0) return '0s';
        const mins = Math.floor(d / 60);
        const secs = d % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      }
    },
    {
      field: 'created_at',
      headerName: 'Date & Time',
      flex: 1.2,
      minWidth: 140,
      valueGetter: (_v, row) => {
        const dateStr = row.created_at || row.createdAt;
        return dateStr ? new Date(dateStr).toLocaleString() : '';
      }
    },
    {
      field: 'details',
      headerName: 'Call Summary/Notes',
      flex: 2,
      minWidth: 240,
      valueGetter: (_v, row) => row.details || row.notes || '',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {params.value}
        </Typography>
      ),
    },
  ], [])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
      
      {/* Analytics widgets */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 2,
        }}
      >
        <AppCard title="Total Calls" subtitle="Total logged calls">
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
            {stats.total}
          </Typography>
        </AppCard>
        <AppCard title="Answered" subtitle="Successfully answered">
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
            {stats.answered}
          </Typography>
        </AppCard>
        <AppCard title="Missed" subtitle="Missed incoming calls">
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
            {stats.missed}
          </Typography>
        </AppCard>
        <AppCard title="Inbound" subtitle="Incoming call logs">
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
            {stats.inbound}
          </Typography>
        </AppCard>
        <AppCard title="Outbound" subtitle="Outgoing call logs">
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'secondary.main' }}>
            {stats.outbound}
          </Typography>
        </AppCard>
      </Box>

      {/* Search and Table */}
      <AppCard
        title="Call Logs List"
        subtitle="Curated agent call details and client conversations."
        fullHeight
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search logs by customer, agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            size="small"
            select
            label="Call Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Answered">Answered</MenuItem>
            <MenuItem value="Missed">Missed</MenuItem>
            <MenuItem value="No Answer">No Answer</MenuItem>
            <MenuItem value="Busy">Busy</MenuItem>
          </TextField>
        </Stack>

        <AppDataGrid
          height="400px"
          rows={logs}
          columns={columns}
          loading={loading}
          getRowId={(r) => r._id || r.id || JSON.stringify(r)}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      </AppCard>
    </Box>
  )
}
