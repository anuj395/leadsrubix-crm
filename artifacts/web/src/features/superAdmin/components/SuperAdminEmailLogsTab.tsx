import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import RefreshIcon from '@mui/icons-material/Refresh'
import EmailIcon from '@mui/icons-material/Email'
import SearchIcon from '@mui/icons-material/Search'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

interface OrgItem {
  organizationId: string
  organizationName: string
}

interface EmailLogItem {
  _id: string
  organization_id?: string
  organizationName?: string
  recipient: string
  sender: string
  subject: string
  trigger_action: string
  status: string
  createdAt: string
  error_message?: string
}

export function SuperAdminEmailLogsTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin' || (user as any)?.roleKey === 'superAdmin'

  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [logs, setLogs] = useState<EmailLogItem[]>([])
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const loadOrganizations = async () => {
    if (!isSuperAdmin) return
    try {
      let res = await api.get('admin/email-settings/quotas').catch(() => null)
      if (!res?.data?.items) {
        res = await api.get('organizations/admin/quotas').catch(() => null)
      }
      setOrgs(res?.data?.items || [])
    } catch {
      // Silently catch orgs load
    }
  }

  const fetchLogs = async (orgIdFilter = selectedOrgFilter, statusFilter = selectedStatusFilter) => {
    setLoading(true)
    try {
      const orgParam = (isSuperAdmin && orgIdFilter !== 'all') ? `&organizationId=${orgIdFilter}` : ''
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      let res = await api.get(`organization/email-settings/logs?pageSize=100${orgParam}${statusParam}`).catch(() => null)
      if (!res?.data) {
        res = await api.get(`organizations/email-settings/logs?pageSize=100${orgParam}${statusParam}`).catch(() => null)
      }
      setLogs(res?.data?.items || [])
    } catch {
      showToast('Failed to load email logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      void loadOrganizations()
    }
    void fetchLogs()
  }, [isSuperAdmin])

  useEffect(() => {
    void fetchLogs(selectedOrgFilter, selectedStatusFilter)
  }, [selectedOrgFilter, selectedStatusFilter])

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      log.recipient.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      (log.organizationName || '').toLowerCase().includes(q) ||
      log.trigger_action.toLowerCase().includes(q)
    )
  })

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      <Stack spacing={3}>
        {/* Banner Card */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <EmailIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {isSuperAdmin ? 'Global System-Wide Email Delivery Logs' : 'Workspace Email Delivery Logs'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isSuperAdmin 
                  ? 'Track real-time email dispatches, delivery statuses, AWS SES notifications, and fallbacks across all enterprise tenant workspaces.'
                  : 'Track real-time automated email dispatches, trigger actions, and delivery status history for your organization.'}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Logs Table & Filter Controls Card */}
        <Card variant="outlined" sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
              sx={{ mb: 3 }}
            >
              <TextField
                size="small"
                placeholder="Search recipient, subject, trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                }}
                sx={{ minWidth: 280 }}
              />

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                {isSuperAdmin && (
                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <InputLabel>Filter Workspace</InputLabel>
                    <Select
                      value={selectedOrgFilter}
                      label="Filter Workspace"
                      onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Workspaces</MenuItem>
                      {orgs.map((org) => (
                        <MenuItem key={org.organizationId} value={org.organizationId}>
                          {org.organizationName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatusFilter}
                    label="Status"
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="SENT">SENT</MenuItem>
                    <MenuItem value="QUEUED">QUEUED</MenuItem>
                    <MenuItem value="FAILED">FAILED</MenuItem>
                    <MenuItem value="BOUNCED">BOUNCED</MenuItem>
                    <MenuItem value="SUPPRESSED">SUPPRESSED</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => void fetchLogs()}
                  sx={{ borderRadius: '8px', textTransform: 'none', px: 2, height: 40 }}
                >
                  Refresh Logs
                </Button>
              </Stack>
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={36} />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', maxHeight: 480, overflowY: 'auto' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {isSuperAdmin && <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>WORKSPACE ORGANIZATION</TableCell>}
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>RECIPIENT</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>SUBJECT</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>TRIGGER ACTION</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>TIMESTAMP</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 6 : 5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          No email delivery logs found matching the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log._id} hover>
                          {isSuperAdmin && <TableCell sx={{ fontWeight: 600 }}>{log.organizationName || 'Workspace'}</TableCell>}
                          <TableCell sx={{ fontWeight: 600 }}>{log.recipient}</TableCell>
                          <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Chip label={log.trigger_action} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.status}
                              size="small"
                              color={
                                log.status === 'SENT' ? 'success' :
                                log.status === 'BOUNCED' || log.status === 'FAILED' ? 'error' :
                                log.status === 'SUPPRESSED' ? 'warning' : 'info'
                              }
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
