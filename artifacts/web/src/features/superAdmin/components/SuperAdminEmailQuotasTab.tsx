import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import EditIcon from '@mui/icons-material/Edit'
import SpeedIcon from '@mui/icons-material/Speed'
import RefreshIcon from '@mui/icons-material/Refresh'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { api } from '@/services/api'

interface OrgQuotaItem {
  organizationId: string
  organizationName: string
  emailQuota: {
    dailyLimit: number
    monthlyLimit: number
    rateLimitPerMinute: number
    usedToday: number
    usedThisMonth: number
  }
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

export function SuperAdminEmailQuotasTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<OrgQuotaItem[]>([])
  const [editingOrg, setEditingOrg] = useState<OrgQuotaItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Logs State
  const [logs, setLogs] = useState<EmailLogItem[]>([])
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  // Form Inputs
  const [dailyLimitInput, setDailyLimitInput] = useState(2000)
  const [monthlyLimitInput, setMonthlyLimitInput] = useState(50000)
  const [rateLimitInput, setRateLimitInput] = useState(300)

  const loadQuotas = async () => {
    setLoading(true)
    try {
      let res = await api.get('admin/email-settings/quotas').catch(() => null)
      if (!res?.data?.items) {
        res = await api.get('organizations/admin/quotas').catch(() => null)
      }
      setItems(res?.data?.items || [])
    } catch {
      showToast('Failed to load enterprise email quotas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (orgIdFilter = selectedOrgFilter, statusFilter = selectedStatusFilter) => {
    try {
      const orgParam = orgIdFilter !== 'all' ? `&organizationId=${orgIdFilter}` : ''
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      let res = await api.get(`organization/email-settings/logs?pageSize=50${orgParam}${statusParam}`).catch(() => null)
      if (!res?.data) {
        res = await api.get(`organizations/email-settings/logs?pageSize=50${orgParam}${statusParam}`).catch(() => null)
      }
      setLogs(res?.data?.items || [])
    } catch {
      // Silently catch logs load error
    }
  }

  useEffect(() => {
    void loadQuotas()
    void fetchLogs()
  }, [])

  useEffect(() => {
    void fetchLogs(selectedOrgFilter, selectedStatusFilter)
  }, [selectedOrgFilter, selectedStatusFilter])

  const openEdit = (org: OrgQuotaItem) => {
    setEditingOrg(org)
    setDailyLimitInput(org.emailQuota?.dailyLimit || 2000)
    setMonthlyLimitInput(org.emailQuota?.monthlyLimit || 50000)
    setRateLimitInput(org.emailQuota?.rateLimitPerMinute || 300)
    setDialogOpen(true)
  }

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg) return

    setSaving(true)
    try {
      const payload = {
        dailyLimit: Number(dailyLimitInput),
        monthlyLimit: Number(monthlyLimitInput),
        rateLimitPerMinute: Number(rateLimitInput)
      }
      await api.put(`admin/email-settings/quotas/${editingOrg.organizationId}`, payload)
        .catch(() => api.put(`organizations/admin/quotas/${editingOrg.organizationId}`, payload))
      showToast(`Updated email quota limits for ${editingOrg.organizationName}`)
      setDialogOpen(false)
      void loadQuotas()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update quota', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Super Admin Email Quotas & Rate-Limit Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set custom daily limits, monthly allowances, and per-minute sending caps across all tenant workspaces.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 3 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Workspace Organization</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Daily Limit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Today's Usage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Monthly Limit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rate Limit / Min</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No workspace organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((org) => {
                    const used = org.emailQuota?.usedToday || 0
                    const limit = org.emailQuota?.dailyLimit || 2000
                    const pct = Math.min(Math.round((used / limit) * 100), 100)
                    return (
                      <TableRow key={org.organizationId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{org.organizationName}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{limit.toLocaleString()}</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            {used.toLocaleString()} / {limit.toLocaleString()} ({pct}%)
                          </Typography>
                          <LinearProgress variant="determinate" value={pct} color={pct > 90 ? 'error' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
                        </TableCell>
                        <TableCell>{(org.emailQuota?.monthlyLimit || 50000).toLocaleString()}</TableCell>
                        <TableCell>{(org.emailQuota?.rateLimitPerMinute || 300).toLocaleString()} / min</TableCell>
                        <TableCell align="right" sx={{ pr: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => openEdit(org)}
                            sx={{ textTransform: 'none', borderRadius: '8px' }}
                          >
                            Edit Quota
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Quota Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={(e) => void handleSaveQuota(e)}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Edit Email Quota - {editingOrg?.organizationName}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                type="number"
                label="Daily Sending Limit"
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                fullWidth
                size="small"
              />
              <TextField
                type="number"
                label="Monthly Sending Limit"
                value={monthlyLimitInput}
                onChange={(e) => setMonthlyLimitInput(Number(e.target.value))}
                fullWidth
                size="small"
              />
              <TextField
                type="number"
                label="Rate Limit Per Minute"
                value={rateLimitInput}
                onChange={(e) => setRateLimitInput(Number(e.target.value))}
                fullWidth
                size="small"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Quota'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      </Stack>
    </Box>
  )
}
