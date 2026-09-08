import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import EmailIcon from '@mui/icons-material/Email'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import BlockIcon from '@mui/icons-material/Block'
import { api } from '@/services/api'

interface LogItem {
  _id: string
  recipient: string
  subject: string
  trigger_action: string
  status: string
  createdAt: string
  error_message?: string
}

export function LeadEmailHistoryWidget({ leadId, recipientEmail }: { leadId?: string; recipientEmail?: string }) {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogItem[]>([])

  useEffect(() => {
    async function loadLogs() {
      setLoading(true)
      try {
        const res = await api.get('organization/email-settings/logs?pageSize=20')
        const allLogs: LogItem[] = res.data?.items || []
        const filtered = allLogs.filter(l =>
          (leadId && (l as any).lead_id === leadId) ||
          (recipientEmail && l.recipient.toLowerCase() === recipientEmail.toLowerCase())
        )
        setLogs(filtered)
      } catch {
        // Handle error silently
      } finally {
        setLoading(false)
      }
    }

    void loadLogs()
  }, [leadId, recipientEmail])

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading email delivery history...</Typography>
      </Box>
    )
  }

  if (logs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmailIcon color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            No automated emails dispatched to this lead yet.
          </Typography>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon color="primary" fontSize="small" /> Email Dispatch History ({logs.length})
      </Typography>

      {logs.map((log) => (
        <Paper key={log._id} variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {log.subject}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Trigger: {log.trigger_action} • To: {log.recipient}
              </Typography>
              {log.error_message && (
                <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5, fontWeight: 500 }}>
                  Reason: {log.error_message}
                </Typography>
              )}
            </Box>
            <Stack alignItems="flex-end" spacing={0.5}>
              <Chip
                label={log.status}
                size="small"
                icon={
                  log.status === 'SENT' ? <CheckCircleIcon fontSize="small" /> :
                  log.status === 'BOUNCED' || log.status === 'FAILED' ? <ErrorIcon fontSize="small" /> :
                  log.status === 'SUPPRESSED' ? <BlockIcon fontSize="small" /> : undefined
                }
                color={
                  log.status === 'SENT' ? 'success' :
                  log.status === 'BOUNCED' || log.status === 'FAILED' ? 'error' :
                  log.status === 'SUPPRESSED' ? 'warning' : 'default'
                }
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {new Date(log.createdAt).toLocaleString()}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
