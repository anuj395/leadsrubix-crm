import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import CallMadeIcon from '@mui/icons-material/CallMade'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback'
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import api from '@/services/axiosInstance'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import { useAppSelector } from '@/store/hooks'

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
  organization_name?: string
}

type FilterType = 'ALL' | 'ANSWERED' | 'MISSED' | 'INBOUND' | 'OUTBOUND'

export default function SuperAdminCallLogsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = user?.role === 'superAdmin'
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')
  const [statusFilter, setStatusFilter] = useState('All')
  const [logs, setLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(false)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })

  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.post('/call-logs/masterSearch', {
        filter: {},
        sort: { created_at: -1 },
        page: 1,
        pageSize: 500,
        industryId: isSuperAdmin ? selectedIndustry || undefined : undefined,
        organizationId: isSuperAdmin ? selectedOrg || undefined : undefined,
      })

      setLogs(res.data || [])
    } catch (err) {
      console.error('Failed to fetch master call logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && (!selectedIndustry || !selectedOrg)) return
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry, selectedOrg, isSuperAdmin])

  const stats = useMemo(() => {
    const total = logs.length
    const answered = logs.filter((l) => (l.stage || l.status || '').toLowerCase() === 'answered').length
    const missed = logs.filter((l) => (l.stage || l.status || '').toLowerCase() === 'missed').length
    const inbound = logs.filter((l) => (l.type || l.direction || '').toLowerCase() === 'inbound').length
    const outbound = logs.filter((l) => (l.type || l.direction || '').toLowerCase() === 'outbound').length
    return { total, answered, missed, inbound, outbound }
  }, [logs])

  const filteredLogs = useMemo(() => {
    let list = logs
    if (activeFilter === 'ANSWERED') list = list.filter(l => (l.stage || l.status || '').toLowerCase() === 'answered')
    else if (activeFilter === 'MISSED') list = list.filter(l => (l.stage || l.status || '').toLowerCase() === 'missed')
    else if (activeFilter === 'INBOUND') list = list.filter(l => (l.type || l.direction || '').toLowerCase() === 'inbound')
    else if (activeFilter === 'OUTBOUND') list = list.filter(l => (l.type || l.direction || '').toLowerCase() === 'outbound')

    if (statusFilter !== 'All') {
      list = list.filter(l => (l.stage || l.status || '').toLowerCase() === statusFilter.toLowerCase())
    }
    return list
  }, [logs, activeFilter, statusFilter])

  const columns = useMemo<GridColDef<CallLog>[]>(() => {
    const indCode = String(selectedIndustry || '').toLowerCase().trim()
    const customerLabel = indCode === 'temp0003' ? 'Patient Name' : 
                          indCode === 'temp0004' ? 'Student Name' : 
                          indCode === 'temp0005' ? 'Client Name' : 
                          indCode === 'temp0006' ? 'Lead Name' : 
                          indCode === 'temp0007' ? 'Distributor Name' : 
                          'Customer Name'
    const agentLabel = indCode === 'temp0003' ? 'Attending Doctor' : 
                       indCode === 'temp0004' ? 'Counselor' : 
                       indCode === 'temp0005' ? 'Advisor' : 
                       indCode === 'temp0006' ? 'Tech Lead' : 
                       indCode === 'temp0007' ? 'Manager' : 
                       'Agent'

    const sNoCol: GridColDef<CallLog> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      valueGetter: (_v, row) => {
        const idx = filteredLogs.findIndex((item) => (item._id || item.id) === (row._id || row.id))
        return idx !== -1 ? idx + 1 : ''
      }
    }

    return [
      sNoCol,
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
        headerName: customerLabel,
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
        headerName: agentLabel,
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
        field: 'organization_name',
        headerName: 'Organization Name',
        flex: 1.2,
        minWidth: 150,
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
          const d = Number(row.duration) || 0
          if (d === 0) return '0s'
          const mins = Math.floor(d / 60)
          const secs = d % 60
          return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
        }
      },
      {
        field: 'created_at',
        headerName: 'Date & Time',
        flex: 1.2,
        minWidth: 140,
        valueGetter: (_v, row) => {
          const dateStr = row.created_at || row.createdAt
          return dateStr ? new Date(dateStr).toLocaleString() : ''
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
    ]
  }, [filteredLogs, selectedIndustry])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
      
      {/* Compact Interactive Analytics Summary Bar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.5,
        }}
      >
        <Paper
          elevation={0}
          onClick={() => setActiveFilter('ALL')}
          sx={{
            p: 1.25,
            px: 1.75,
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: activeFilter === 'ALL' ? 'primary.main' : 'divider',
            bgcolor: activeFilter === 'ALL' ? 'primary.50' : 'background.paper',
            boxShadow: activeFilter === 'ALL' ? '0 0 0 2px rgba(24, 119, 242, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
            }
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: activeFilter === 'ALL' ? 'primary.main' : 'action.hover',
              color: activeFilter === 'ALL' ? '#fff' : 'primary.main',
              flexShrink: 0,
            }}
          >
            <PhoneInTalkIcon sx={{ fontSize: '1.15rem' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5, display: 'block', whiteSpace: 'nowrap' }}>
              Total Calls
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
              {stats.total}
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          onClick={() => setActiveFilter(activeFilter === 'ANSWERED' ? 'ALL' : 'ANSWERED')}
          sx={{
            p: 1.25,
            px: 1.75,
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: activeFilter === 'ANSWERED' ? 'success.main' : 'divider',
            bgcolor: activeFilter === 'ANSWERED' ? 'success.50' : 'background.paper',
            boxShadow: activeFilter === 'ANSWERED' ? '0 0 0 2px rgba(46, 125, 50, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: 'success.main',
            }
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: activeFilter === 'ANSWERED' ? 'success.main' : 'action.hover',
              color: activeFilter === 'ANSWERED' ? '#fff' : 'success.main',
              flexShrink: 0,
            }}
          >
            <PhoneCallbackIcon sx={{ fontSize: '1.15rem' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5, display: 'block', whiteSpace: 'nowrap' }}>
              Answered
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'success.main' }}>
              {stats.answered}
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          onClick={() => setActiveFilter(activeFilter === 'MISSED' ? 'ALL' : 'MISSED')}
          sx={{
            p: 1.25,
            px: 1.75,
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: activeFilter === 'MISSED' ? 'error.main' : 'divider',
            bgcolor: activeFilter === 'MISSED' ? 'error.50' : 'background.paper',
            boxShadow: activeFilter === 'MISSED' ? '0 0 0 2px rgba(211, 47, 47, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: 'error.main',
            }
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: activeFilter === 'MISSED' ? 'error.main' : 'action.hover',
              color: activeFilter === 'MISSED' ? '#fff' : 'error.main',
              flexShrink: 0,
            }}
          >
            <PhoneMissedIcon sx={{ fontSize: '1.15rem' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5, display: 'block', whiteSpace: 'nowrap' }}>
              Missed
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'error.main' }}>
              {stats.missed}
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          onClick={() => setActiveFilter(activeFilter === 'INBOUND' ? 'ALL' : 'INBOUND')}
          sx={{
            p: 1.25,
            px: 1.75,
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: activeFilter === 'INBOUND' ? 'info.main' : 'divider',
            bgcolor: activeFilter === 'INBOUND' ? 'info.50' : 'background.paper',
            boxShadow: activeFilter === 'INBOUND' ? '0 0 0 2px rgba(2, 136, 209, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: 'info.main',
            }
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: activeFilter === 'INBOUND' ? 'info.main' : 'action.hover',
              color: activeFilter === 'INBOUND' ? '#fff' : 'info.main',
              flexShrink: 0,
            }}
          >
            <CallReceivedIcon sx={{ fontSize: '1.15rem' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5, display: 'block', whiteSpace: 'nowrap' }}>
              Inbound
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'info.main' }}>
              {stats.inbound}
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          onClick={() => setActiveFilter(activeFilter === 'OUTBOUND' ? 'ALL' : 'OUTBOUND')}
          sx={{
            p: 1.25,
            px: 1.75,
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: activeFilter === 'OUTBOUND' ? 'secondary.main' : 'divider',
            bgcolor: activeFilter === 'OUTBOUND' ? 'secondary.50' : 'background.paper',
            boxShadow: activeFilter === 'OUTBOUND' ? '0 0 0 2px rgba(156, 39, 176, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: 'secondary.main',
            }
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: activeFilter === 'OUTBOUND' ? 'secondary.main' : 'action.hover',
              color: activeFilter === 'OUTBOUND' ? '#fff' : 'secondary.main',
              flexShrink: 0,
            }}
          >
            <CallMadeIcon sx={{ fontSize: '1.15rem' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5, display: 'block', whiteSpace: 'nowrap' }}>
              Outbound
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'secondary.main' }}>
              {stats.outbound}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Table */}
      <AppCard
        title="Call Logs List"
        subtitle="Curated agent call details and client conversations."
        fullHeight
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        action={
          <TextField
            size="small"
            select
            label="Call Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Answered">Answered</MenuItem>
            <MenuItem value="Missed">Missed</MenuItem>
            <MenuItem value="No Answer">No Answer</MenuItem>
            <MenuItem value="Busy">Busy</MenuItem>
          </TextField>
        }
      >
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />

        <Box sx={{ flex: 1, minHeight: 400, width: '100%', mt: isSuperAdmin ? 1.5 : 0 }}>
          <AppDataGrid
            rows={filteredLogs}
            columns={columns}
            loading={loading}
            getRowId={(r) => r._id || r.id || JSON.stringify(r)}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onReload={fetchLogs}
          />
        </Box>
      </AppCard>
    </Box>
  )
}
