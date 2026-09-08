import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import SaveIcon from '@mui/icons-material/Save'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import CodeIcon from '@mui/icons-material/Code'
import { api } from '@/services/api'

interface EmailTemplate {
  triggerKey: string
  name: string
  subject: string
  bodyHtml: string
  isEnabled: boolean
}

const MERGE_TAGS = [
  { tag: '{{customerName}}', label: 'Customer/Lead Name' },
  { tag: '{{agentName}}', label: 'Assigned Agent Name' },
  { tag: '{{contactNumber}}', label: 'Contact Phone' },
  { tag: '{{source}}', label: 'Lead Source' },
  { tag: '{{orgName}}', label: 'Organization Name' },
  { tag: '{{transferredBy}}', label: 'Transferred By' },
  { tag: '{{campaign}}', label: 'Ad Campaign' }
]

export function ActionEmailTemplatesTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTrigger, setSelectedTrigger] = useState<string>('lead_created')

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      let res = await api.get('organization/email-settings').catch(() => null)
      if (!res?.data) {
        res = await api.get('organizations/email-settings').catch(() => null)
      }
      setTemplates(res?.data?.emailTemplates || [])
    } catch {
      showToast('Failed to load email templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTemplates()
  }, [])

  const currentTemplate = templates.find(t => t.triggerKey === selectedTrigger) || {
    triggerKey: selectedTrigger,
    name: 'Custom Template',
    subject: '',
    bodyHtml: '',
    isEnabled: true
  }

  const handleUpdateCurrent = (field: keyof EmailTemplate, value: any) => {
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.triggerKey === selectedTrigger)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], [field]: value }
        return updated
      } else {
        return [...prev, { ...currentTemplate, [field]: value }]
      }
    })
  }

  const insertMergeTag = (tag: string, targetField: 'subject' | 'bodyHtml') => {
    if (targetField === 'subject') {
      handleUpdateCurrent('subject', (currentTemplate.subject || '') + ' ' + tag)
    } else {
      handleUpdateCurrent('bodyHtml', (currentTemplate.bodyHtml || '') + ' ' + tag)
    }
    showToast(`Inserted tag ${tag}`)
  }

  const handleSaveTemplates = async () => {
    setSaving(true)
    try {
      await api.post('organization/email-settings', {
        emailTemplates: templates
      })
      showToast('Action email templates saved successfully for your workspace!')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save email templates', 'error')
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
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
              <MarkEmailReadIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Action-Triggered Email Templates Manager
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Customize automated email messages sent when leads are created, transferred, or ingested from 3rd-party platforms.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveTemplates}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: '8px' }}
          >
            Save All Templates
          </Button>
        </Stack>
      </Paper>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 3 }}>
          {/* Action Trigger Selector Chips */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Select Action Trigger to Customize:
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mb: 3, gap: 1 }}>
            {[
              { key: 'lead_created', label: '📩 New Lead Created' },
              { key: 'lead_transferred', label: '🔄 Lead Transferred to Agent' },
              { key: 'webhook_ingested', label: '🌐 3rd-Party Webhook Lead Ingested' }
            ].map((trig) => (
              <Chip
                key={trig.key}
                label={trig.label}
                clickable
                color={selectedTrigger === trig.key ? 'primary' : 'default'}
                variant={selectedTrigger === trig.key ? 'filled' : 'outlined'}
                onClick={() => setSelectedTrigger(trig.key)}
                sx={{ fontWeight: 700, py: 2, px: 1, borderRadius: '10px' }}
              />
            ))}
          </Stack>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', bgcolor: 'action.hover' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {currentTemplate.name || 'Action Template'}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentTemplate.isEnabled !== false}
                    onChange={(e) => handleUpdateCurrent('isEnabled', e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active Trigger</Typography>}
              />
            </Stack>

            {/* Merge Tag Chips */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <CodeIcon fontSize="small" /> Click to Insert Dynamic Merge Tags:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                {MERGE_TAGS.map((m) => (
                  <Chip
                    key={m.tag}
                    label={`+ ${m.label} (${m.tag})`}
                    size="small"
                    variant="outlined"
                    clickable
                    color="secondary"
                    onClick={() => insertMergeTag(m.tag, 'bodyHtml')}
                    sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
                  />
                ))}
              </Stack>
            </Box>

            <Stack spacing={2.5}>
              <TextField
                fullWidth
                size="small"
                label="Email Subject Line"
                value={currentTemplate.subject}
                onChange={(e) => handleUpdateCurrent('subject', e.target.value)}
                placeholder="e.g. New Lead Assigned: {{customerName}}"
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Email HTML Body Content"
                value={currentTemplate.bodyHtml}
                onChange={(e) => handleUpdateCurrent('bodyHtml', e.target.value)}
                placeholder="<p>Hello <strong>{{agentName}}</strong>, a new lead {{customerName}} has arrived!</p>"
              />
            </Stack>
          </Paper>
        </CardContent>
      </Card>
      </Stack>
    </Box>
  )
}
