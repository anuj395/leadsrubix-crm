import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import SaveIcon from '@mui/icons-material/Save'

import { useAuth } from '@/hooks/useAuth'
import {
  fetchPushLogs,
  fetchPushTemplates,
  updatePushTemplate,
  fetchPushQuotas,
  updatePushQuota,
  type PushLogItem,
  type PushTemplateItem,
  type PushQuotaItem
} from '../api/pushNotificationApi'
import { updateNotificationSetting, type OrgUserItem, type NotificationSettingsResponse } from '@/features/notifications/api/notificationApi'

import axiosInstance from '@/services/axiosInstance'

interface Props {
  showToast: (msg: string, severity?: 'success' | 'error') => void
  notificationPrefs?: NotificationSettingsResponse
  loadNotificationSettings: (indId?: string) => Promise<void>
}

const NOTIFICATION_TYPES = [
  { value: 'LEAD_ASSIGNED', label: 'New Lead Assigned', description: 'Triggered when a lead is assigned or transferred to a user.' },
  { value: 'TASK_DUE', label: 'Task Due Alert', description: 'Triggered when a follow-up task is due.' },
  { value: 'SYSTEM_ALERT', label: 'System Alert', description: 'General system-wide messages and alerts.' }
]

const DEFAULT_TEMPLATES_FALLBACK: PushTemplateItem[] = [
  {
    event_type: 'LEAD_ASSIGNED',
    title_template: '🎯 New Lead Assigned: {customer_name}',
    body_template: '{customer_name} ({lead_source}) was assigned to you by {assigned_by}.',
    is_active: true
  },
  {
    event_type: 'TASK_DUE',
    title_template: '⏰ Task Due Alert: {customer_name}',
    body_template: 'Follow-up task for {customer_name} is scheduled now.',
    is_active: true
  },
  {
    event_type: 'SYSTEM_ALERT',
    title_template: '🔔 System Alert',
    body_template: '{message}',
    is_active: true
  },
  {
    event_type: 'THIRD_PARTY_LEAD',
    title_template: '📥 New Inbound Lead: {customer_name}',
    body_template: 'New lead received via {lead_source} integration for project {project_name}.',
    is_active: true
  },
  {
    event_type: 'LEAD_TRANSFERRED',
    title_template: '🔄 Lead Transferred: {customer_name}',
    body_template: '{customer_name} was transferred to you by {assigned_by}.',
    is_active: true
  }
]

export const PushNotificationsTab: React.FC<Props> = ({ showToast, notificationPrefs, loadNotificationSettings }) => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'

  const [subTab, setSubTab] = useState<'agents' | 'templates' | 'logs' | 'quotas'>('agents')
  const [loading, setLoading] = useState(false)
  const [fetchedUsers, setFetchedUsers] = useState<OrgUserItem[]>([])

  // Logs state
  const [logs, setLogs] = useState<PushLogItem[]>([])
  const [logStatus, setLogStatus] = useState<string>('all')
  const [logSearch, setLogSearch] = useState<string>('')

  // Templates state
  const [templates, setTemplates] = useState<PushTemplateItem[]>(DEFAULT_TEMPLATES_FALLBACK)
  const [editingTemplate, setEditingTemplate] = useState<PushTemplateItem | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateActive, setTemplateActive] = useState(true)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Quotas state
  const [quotas, setQuotas] = useState<PushQuotaItem[]>([])
  const [editingQuota, setEditingQuota] = useState<PushQuotaItem | null>(null)
  const [quotaLimitVal, setQuotaLimitVal] = useState<number>(10000)
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [savingQuota, setSavingQuota] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      if (subTab === 'agents') {
        try {
          const res = await axiosInstance.get<any>('/users')
          const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.users || []
          setFetchedUsers(list)
        } catch (uErr) {
          console.warn('Failed to fetch direct user list:', uErr)
        }
      } else if (subTab === 'logs') {
        const data = await fetchPushLogs({ status: logStatus, search: logSearch })
        setLogs(data)
      } else if (subTab === 'templates') {
        const data = await fetchPushTemplates()
        setTemplates(data && data.length > 0 ? data : DEFAULT_TEMPLATES_FALLBACK)
      } else if (subTab === 'quotas') {
        const data = await fetchPushQuotas()
        setQuotas(data)
      }
    } catch {
      showToast('Failed to load push notification data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [subTab, logStatus])

  const handleToggleAgentPush = async (agentUserId: string, currentVal: boolean) => {
    try {
      const types = ['LEAD_ASSIGNED', 'TASK_DUE', 'SYSTEM_ALERT', 'THIRD_PARTY_LEAD', 'LEAD_TRANSFERRED']
      await Promise.all(
        types.map(nt => 
          updateNotificationSetting({
            level: 'user',
            notificationType: nt,
            isEnabled: !currentVal,
            userId: agentUserId
          })
        )
      )
      showToast(`Agent push access ${!currentVal ? 'activated' : 'deactivated'} for all modules`)
      await loadNotificationSettings()
    } catch (err: any) {
      console.error('handleToggleAgentPush error:', err)
      showToast('Failed to update agent push setting', 'error')
    }
  }

  const handleOpenEditTemplate = (tmpl: PushTemplateItem) => {
    setEditingTemplate(tmpl)
    setTemplateTitle(tmpl.title_template || '')
    setTemplateBody(tmpl.body_template || '')
    setTemplateActive(tmpl.is_active !== false)
    setTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !templateTitle.trim() || !templateBody.trim()) return
    setSavingTemplate(true)
    try {
      await updatePushTemplate({
        event_type: editingTemplate.event_type,
        title_template: templateTitle.trim(),
        body_template: templateBody.trim(),
        is_active: templateActive
      })
      showToast('Push notification template saved successfully')
      setTemplateDialogOpen(false)
      void loadData()
    } catch {
      showToast('Failed to save template', 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleOpenEditQuota = (q: PushQuotaItem) => {
    setEditingQuota(q)
    setQuotaLimitVal(q.monthly_limit || 10000)
    setQuotaDialogOpen(true)
  }

  const handleSaveQuota = async () => {
    if (!editingQuota) return
    setSavingQuota(true)
    try {
      await updatePushQuota({
        organization_id: editingQuota.organization_id,
        monthly_limit: Number(quotaLimitVal)
      })
      showToast('Organization monthly push quota updated')
      setQuotaDialogOpen(false)
      void loadData()
    } catch {
      showToast('Failed to update quota limit', 'error')
    } finally {
      setSavingQuota(false)
    }
  }

  const insertPlaceholder = (tag: string, field: 'title' | 'body') => {
    if (field === 'title') {
      setTemplateTitle(prev => prev + ` ${tag}`)
    } else {
      setTemplateBody(prev => prev + ` ${tag}`)
    }
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {/* Sub navigation bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={subTab}
          onChange={(_, val) => setSubTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap' } }}
        >
          <Tab label="👥 Agent Push Access & Controls" value="agents" />
          <Tab label="📝 Message Templates" value="templates" />
          <Tab label="📊 Push Audit Logs" value="logs" />
          <Tab label="⚡ Organization Quotas" value="quotas" />
        </Tabs>
      </Box>

      {/* 1. AGENTS TAB */}
      {subTab === 'agents' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
            📲 Sales Agent Mobile Push Notification Controls
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enable or disable real-time mobile push notifications for individual sales agents and team members in your organization.
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Team Member / Agent</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Device Push Token</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 4 }}>Mobile Push Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const prefUsers = notificationPrefs?.orgUsers || []
                  const combinedMap = new Map<string, OrgUserItem>()
                  prefUsers.forEach(u => combinedMap.set(String(u._id || u.email), u))
                  fetchedUsers.forEach(u => {
                    const key = String(u._id || u.email)
                    if (!combinedMap.has(key)) combinedMap.set(key, u)
                  })
                  if (combinedMap.size === 0 && user) {
                    const uId = String(user.id || (user as any)._id || 'curr_user')
                    combinedMap.set(uId, { _id: uId, email: user.email, firstName: (user as any).firstName || (user as any).name || 'Current User', lastName: (user as any).lastName || '', role: user.role })
                  }
                  const effectiveUsers = Array.from(combinedMap.values())
                  
                  if (effectiveUsers.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No organization users found.
                        </TableCell>
                      </TableRow>
                    )
                  }

                  return effectiveUsers.map((u) => {
                    const hasToken = !!(u.device_id || (u.aws_push_tokens && u.aws_push_tokens.length > 0))
                    const userSettings = notificationPrefs?.allUsersSettings?.filter(s => String(s.user_id) === String(u._id)) || []
                    const disabledSetting = userSettings.find(s => s.is_enabled === false)
                    const isPushActive = !disabledSetting

                    return (
                      <TableRow key={u._id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email.split('@')[0]}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {u.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Alert severity="info" icon={false} sx={{ display: 'inline-flex', py: 0, px: 1, fontSize: '0.75rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {u.role || 'Sales Agent'}
                          </Alert>
                        </TableCell>
                        <TableCell>
                          <Alert severity={hasToken ? 'success' : 'warning'} icon={false} sx={{ display: 'inline-flex', py: 0, px: 1, fontSize: '0.75rem', borderRadius: '4px' }}>
                            {hasToken ? '📱 Token Active' : '⚠️ No Device Token'}
                          </Alert>
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 4 }}>
                          <Switch
                            checked={isPushActive}
                            onChange={() => void handleToggleAgentPush(u._id, isPushActive)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* 2. TEMPLATES TAB */}
      {subTab === 'templates' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
            📝 Custom Mobile Push Message Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customize the push title, message body, and dynamic placeholders (`{'{customer_name}'}`, `{'{lead_source}'}`, `{'{assigned_by}'}`) delivered to agents' phones.
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title Template</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Body Template</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((tmpl) => (
                    <TableRow key={tmpl.event_type} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {tmpl.event_type}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {tmpl.title_template}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {tmpl.body_template}
                      </TableCell>
                      <TableCell>
                        <Chip label={tmpl.is_active !== false ? 'Active' : 'Disabled'} color={tmpl.is_active !== false ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 3 }}>
                        <Button size="small" variant="outlined" onClick={() => handleOpenEditTemplate(tmpl)}>
                          Edit Template
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* 3. LOGS TAB */}
      {subTab === 'logs' && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                📊 AWS Push Notification Audit Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live audit trail of dispatched AWS SNS mobile push notifications and delivery status.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                size="small"
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                sx={{ width: 180 }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="DELIVERED">DELIVERED</MenuItem>
                <MenuItem value="FAILED">FAILED</MenuItem>
                <MenuItem value="SUPPRESSED_INACTIVE">SUPPRESSED (Inactive)</MenuItem>
                <MenuItem value="SUPPRESSED_QUOTA">SUPPRESSED (Quota Limit)</MenuItem>
              </TextField>
              <TextField
                size="small"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void loadData() }}
                sx={{ width: 220 }}
              />
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', maxHeight: 480, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Sent Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Recipient Agent</TableCell>
                    {isSuperAdmin && <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>}
                    <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title & Message</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>AWS Message ID / Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 7 : 6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No push notification audit logs recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt || (log as any).sent_at || Date.now()).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {log.user_name || log.user_email.split('@')[0]}
                          <Typography variant="caption" display="block" color="text.secondary">{log.user_email}</Typography>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {log.organization_name || log.organization_id || '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip label={log.event_type} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{log.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{log.body}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              log.status === 'DELIVERED' ? 'DELIVERED' 
                              : log.status === 'FAILED' ? 'FAILED' 
                              : log.status === 'SUPPRESSED_INACTIVE' ? 'INACTIVE (Suppressed)' 
                              : 'QUOTA EXCEEDED'
                            }
                            size="small"
                            color={log.status === 'DELIVERED' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: log.status === 'FAILED' ? 'error.main' : 'text.secondary' }}>
                          {log.aws_message_id || log.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* 4. QUOTAS TAB */}
      {subTab === 'quotas' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
            ⚡ Organization Push Notification Quotas & Limits
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage and enforce monthly push notification dispatch limits per client organization.
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Billing Month</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Used Push Messages</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Monthly Quota Limit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Usage Progress</TableCell>
                    {isSuperAdmin && <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 6 : 5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No organization push quotas found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotas.map((q) => {
                      const percent = Math.min(100, Math.round((q.used_count / (q.monthly_limit || 1)) * 100))
                      return (
                        <TableRow key={q.organization_id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {q.organization_name || q.organization_id}
                          </TableCell>
                          <TableCell>{q.billing_month}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{q.used_count.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{q.monthly_limit.toLocaleString()}</TableCell>
                          <TableCell sx={{ width: 180 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={percent} color={percent > 90 ? 'error' : percent > 75 ? 'warning' : 'primary'} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>{percent}%</Typography>
                            </Box>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell align="right" sx={{ pr: 3 }}>
                              <Button size="small" variant="outlined" onClick={() => handleOpenEditQuota(q)}>
                                Set Limit
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* EDIT TEMPLATE DIALOG */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Push Message Template ({editingTemplate?.event_type})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Dynamic Insert Placeholders:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {['{customer_name}', '{lead_source}', '{assigned_by}', '{project_name}'].map(tag => (
                  <Chip key={tag} label={tag} size="small" onClick={() => insertPlaceholder(tag, 'body')} sx={{ cursor: 'pointer', fontWeight: 600 }} />
                ))}
              </Stack>
            </Box>

            <TextField
              label="Push Title Template"
              fullWidth
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
            />

            <TextField
              label="Push Message Body Template"
              fullWidth
              multiline
              rows={3}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />

            <FormControlLabel
              control={<Switch checked={templateActive} onChange={(e) => setTemplateActive(e.target.checked)} />}
              label="Template Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => void handleSaveTemplate()} disabled={savingTemplate}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT QUOTA DIALOG */}
      <Dialog open={quotaDialogOpen} onClose={() => setQuotaDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Set Monthly Push Quota Limit</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Organization: <strong>{editingQuota?.organization_name || editingQuota?.organization_id}</strong>
            </Typography>
            <TextField
              label="Monthly Push Message Limit"
              type="number"
              fullWidth
              value={quotaLimitVal}
              onChange={(e) => setQuotaLimitVal(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuotaDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveQuota()} disabled={savingQuota}>
            {savingQuota ? 'Saving...' : 'Update Limit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
