import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import SaveIcon from '@mui/icons-material/Save'
import TimerIcon from '@mui/icons-material/Timer'
import { api } from '@/services/api'

export function SlaWorkflowsTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    enabled: true,
    freshLeadTimeoutMinutes: 60,
    escalateToManager: true,
    autoReassignOnBreach: false,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('sla-config').catch(() => ({ data: null }))
      if (res?.data?.item) {
        const item = res.data.item
        setForm({
          enabled: Boolean(item.enabled),
          freshLeadTimeoutMinutes: Number(item.freshLeadTimeoutMinutes) || 60,
          escalateToManager: Boolean(item.escalateToManager),
          autoReassignOnBreach: Boolean(item.autoReassignOnBreach),
        })
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load SLA settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('sla-config', form)
      showToast('SLA Workflow rules updated successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to save SLA settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 780 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          SLA Timeout & Automated Escalation Engine
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Define maximum response time thresholds for Fresh leads and configure automated escalation triggers when SLA limits are breached.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                />
              }
              label={
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Enable Automated SLA Breach Monitoring
                </Typography>
              }
            />

            <TextField
              select
              label="Fresh Lead SLA Response Timeout"
              fullWidth
              value={form.freshLeadTimeoutMinutes}
              onChange={(e) => setForm((p) => ({ ...p, freshLeadTimeoutMinutes: Number(e.target.value) || 60 }))}
            >
              <MenuItem value={15}>15 Minutes (High Priority SLA)</MenuItem>
              <MenuItem value={30}>30 Minutes</MenuItem>
              <MenuItem value={60}>1 Hour (Standard SLA)</MenuItem>
              <MenuItem value={120}>2 Hours</MenuItem>
              <MenuItem value={240}>4 Hours</MenuItem>
              <MenuItem value={1440}>24 Hours</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={form.escalateToManager}
                  onChange={(e) => setForm((p) => ({ ...p, escalateToManager: e.target.checked }))}
                />
              }
              label="Escalate & Send Alert Notification to Sales Manager on SLA Breach"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.autoReassignOnBreach}
                  onChange={(e) => setForm((p) => ({ ...p, autoReassignOnBreach: e.target.checked }))}
                />
              }
              label="Automatically Reassign Lead to Next Available Agent on SLA Breach"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Save SLA Rules'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
