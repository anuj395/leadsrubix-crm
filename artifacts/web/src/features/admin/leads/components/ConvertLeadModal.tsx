import React, { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import {
  Transform as TransformIcon,
  Business as BusinessIcon,
  MonetizationOn as MonetizationOnIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { api } from '@/services/api'
import { listPipelines, type Pipeline, type Stage } from '@/services/dealsService'
import { type Contact } from '@/services/contactsService'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'

interface ConvertLeadModalProps {
  open: boolean
  onClose: () => void
  contact: Contact | null
  onSuccess: (res: any) => void
}

export default function ConvertLeadModal({ open, onClose, contact, onSuccess }: ConvertLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)

  // Form State
  const [accountName, setAccountName] = useState('')
  const [createDeal, setCreateDeal] = useState(true)
  const [dealTitle, setDealTitle] = useState('')
  const [dealAmount, setDealAmount] = useState<number>(0)
  const [stageId, setStageId] = useState('')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [dealNotes, setDealNotes] = useState('')

  useEffect(() => {
    if (!open || !contact) return
    setError(null)
    const customerName = contact.customerName || contact.customer_name || 'Qualified Lead'
    setAccountName(`${customerName} Co.`)
    const parsedBudget = contact.budget ? Number(String(contact.budget).replace(/[^0-9]/g, '')) : 0
    setDealAmount(parsedBudget || 0)
    setExpectedCloseDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setDealNotes(contact.notes ? String(contact.notes) : '')

    const orgId = (contact.organization_id || contact.organizationId) as string | undefined
    const indId = (contact.industry_id || contact.industryId) as string | undefined

    void resolveScreen({
      screenKey: 'deals',
      industryCode: indId,
      organizationId: orgId,
    }).then(res => setResolvedScreen(res)).catch(() => setResolvedScreen(null))

    void (async () => {
      try {
        const pipes = await listPipelines()
        setPipelines(pipes)
        if (pipes.length > 0) {
          const defaultPipe = pipes.find(p => p.isDefault || p.is_default) || pipes[0]
          setSelectedPipelineId(String(defaultPipe._id || defaultPipe.id || ''))
          if (defaultPipe.stages && defaultPipe.stages.length > 0) {
            setStageId(String(defaultPipe.stages[0].stageId || defaultPipe.stages[0].stage_id || defaultPipe.stages[0].name || ''))
          }
        }
      } catch (err) {
        console.error('Failed to load pipelines for conversion', err)
      }
    })()
  }, [open, contact])

  const activePipeline = pipelines.find(p => (p._id || p.id) === selectedPipelineId) || pipelines[0]
  const stages: Stage[] = activePipeline?.stages || []

  const handleConvert = async () => {
    if (!contact) return
    if (!accountName.trim()) {
      setError('Account name is required')
      return
    }
    if (createDeal && !dealTitle.trim()) {
      setError('Deal title is required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const selectedStageObj = stages.find(s => (s.stageId || s.stage_id || s.name) === stageId)

      const payload = {
        accountName: accountName.trim(),
        createDeal,
        dealTitle: dealTitle.trim(),
        dealAmount: Number(dealAmount || 0),
        pipelineId: selectedPipelineId,
        stageId,
        stageName: selectedStageObj?.name || stageId,
        probability: selectedStageObj?.probability ?? 25,
        expectedCloseDate,
        dealNotes
      }

      const res = await api.post(`/contacts/${contact._id}/convert`, payload)
      onSuccess(res.data)
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || 'Failed to convert lead')
    } finally {
      setLoading(false)
    }
  }

  if (!contact) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TransformIcon color="primary" />
        Convert Qualified Lead
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Converting this lead will automatically establish an <strong>Account</strong>, link the <strong>Contact</strong>, and optionally generate an active <strong>Sales Deal</strong>.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Section 1: Account */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <BusinessIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                1. Account (Company / Client Entity)
              </Typography>
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Account Name"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Acme Corp or Rajesh Sharma Holdings"
            />
          </Box>

          {/* Section 2: Contact Person */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                2. Contact: {String(contact.customerName || contact.customer_name || 'Contact')} ({String(contact.contactNumber || contact.contact_number || '')})
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              All historical calls, tasks, and notes will remain intact and linked to this contact.
            </Typography>
          </Box>

          {/* Section 3: Sales Deal */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createDeal}
                  onChange={(e) => setCreateDeal(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  3. Create a New Deal in {resolvedScreen?.name || resolvedScreen?.screen?.name || 'Sales Pipeline'}
                </Typography>
              }
            />

            {createDeal && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={resolvedScreen?.formFields?.find(f => f.key === 'title')?.label || 'Deal Title'}
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={resolvedScreen?.formFields?.find(f => f.key === 'amount')?.label || 'Deal Amount'}
                    type="number"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />

                  {pipelines.length > 1 && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Pipeline</InputLabel>
                      <Select
                        value={selectedPipelineId}
                        label="Pipeline"
                        onChange={(e) => setSelectedPipelineId(e.target.value)}
                      >
                        {pipelines.map(p => (
                          <MenuItem key={p._id || (p.id as string)} value={p._id || (p.id as string)}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{resolvedScreen?.formFields?.find(f => f.key === 'stage')?.label || 'Stage'}</InputLabel>
                    <Select
                      value={stageId}
                      label={resolvedScreen?.formFields?.find(f => f.key === 'stage')?.label || 'Stage'}
                      onChange={(e) => setStageId(e.target.value)}
                    >
                      {stages.map(s => (
                        <MenuItem key={s.stageId || s.stage_id || s.name} value={s.stageId || s.stage_id || s.name}>
                          {s.name} ({s.probability}%)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    size="small"
                    label={resolvedScreen?.formFields?.find(f => f.key === 'expectedCloseDate')?.label || 'Expected Close Date'}
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label={resolvedScreen?.formFields?.find(f => f.key === 'notes')?.label || 'Deal Strategy Notes'}
                  value={dealNotes}
                  onChange={(e) => setDealNotes(e.target.value)}
                  placeholder="Key opportunity details, client requirements..."
                />
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConvert}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <TransformIcon />}
        >
          Convert Lead
        </Button>
      </DialogActions>
    </Dialog>
  )
}
