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
import Tooltip from '@mui/material/Tooltip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  Transform as TransformIcon,
  Business as BusinessIcon,
  MonetizationOn as MonetizationOnIcon,
  Person as PersonIcon,
  InfoOutlined as InfoIcon,
  HelpOutline as HelpIcon
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

  // Dual-Engine Customer Type: B2C (Direct Consumer) vs B2B (Corporate Account)
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C')

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
    const customerName = contact.customerName || contact.customer_name || (contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : '') || 'Qualified Lead'
    const indId = String(contact.industry_id || contact.industryId || '').toLowerCase()
    
    // IT Services (temp0006) and Manufacturing (temp0007) default to B2B Corporate
    const isB2BVertical = indId === 'temp0006' || indId === 'temp0007' || Boolean(contact.companyName)
    const defaultType = isB2BVertical ? 'B2B' : 'B2C'
    setCustomerType(defaultType)

    if (isB2BVertical) {
      setAccountName(contact.companyName || `${customerName} Co.`)
      setDealTitle(contact.companyName ? `${contact.companyName} - Opportunity` : `${customerName} Co. - Enterprise Opportunity`)
    } else {
      setAccountName('')
      const projectName = contact.projectName || (contact as any).project_name || 'Opportunity'
      setDealTitle(`${customerName} - ${projectName}`)
    }

    const parsedBudget = contact.budget ? Number(String(contact.budget).replace(/[^0-9]/g, '')) : 0
    setDealAmount(parsedBudget || 0)
    setExpectedCloseDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setDealNotes(contact.notes ? String(contact.notes) : '')

    const orgId = (contact.organization_id || contact.organizationId) as string | undefined

    void resolveScreen({
      screenKey: 'deals',
      industryCode: indId,
      organizationId: orgId,
    }).then(res => setResolvedScreen(res)).catch(() => setResolvedScreen(null))

    void (async () => {
      try {
        const pipes = await listPipelines({ organizationId: orgId, industryId: indId })
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

  // Recalculate title on customer type toggle if user hasn't typed custom
  const handleTypeChange = (newType: 'B2C' | 'B2B') => {
    setCustomerType(newType)
    if (!contact) return
    const customerName = contact.customerName || contact.customer_name || 'Qualified Lead'
    const projectName = contact.projectName || (contact as any).project_name || 'Opportunity'
    if (newType === 'B2B') {
      if (!accountName.trim()) setAccountName(`${customerName} Co.`)
      setDealTitle(`${accountName || customerName + ' Co.'} - ${projectName}`)
    } else {
      setDealTitle(`${customerName} - ${projectName}`)
    }
  }

  const activePipeline = pipelines.find(p => (p._id || p.id) === selectedPipelineId) || pipelines[0]
  const stages: Stage[] = activePipeline?.stages || []

  const handleConvert = async () => {
    if (!contact) return
    
    // Only enforce Account Name in B2B mode
    if (customerType === 'B2B' && !accountName.trim()) {
      setError('Please enter the Company / Organization Name for B2B Corporate conversion')
      return
    }

    if (createDeal) {
      if (Number(dealAmount) < 0) {
        setError('Deal amount cannot be negative')
        return
      }
      if (expectedCloseDate) {
        const closeTime = new Date(expectedCloseDate).getTime()
        if (!isNaN(closeTime) && closeTime < Date.now() - 24 * 60 * 60 * 1000) {
          setError('Expected close date cannot be in the past')
          return
        }
      }
    }

    try {
      setLoading(true)
      setError(null)
      const activeStageId = stageId || (stages[0]?.stageId || stages[0]?.stage_id || stages[0]?.name || 'QUALIFICATION')
      const selectedStageObj = stages.find(s => (s.stageId || s.stage_id || s.name) === activeStageId) || stages[0]

      const customerName = contact.customerName || (contact as any).customer_name || 'Customer'
      const fallbackTitle = `${customerName} - Opportunity`

      const payload = {
        customerType,
        accountName: customerType === 'B2B' ? accountName.trim() : undefined,
        createDeal,
        dealTitle: (dealTitle.trim()) || fallbackTitle,
        dealAmount: Number(dealAmount || 0),
        pipelineId: selectedPipelineId || undefined,
        stageId: activeStageId,
        stageName: selectedStageObj?.name || activeStageId,
        probability: selectedStageObj?.probability ?? 25,
        expectedCloseDate,
        dealNotes
      }

      const targetContactId = contact._id || (contact as any).id
      const res = await api.post(`/contacts/${targetContactId}/convert`, payload)
      onSuccess(res.data)
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || 'Failed to convert lead to deal')
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
          {customerType === 'B2C' ? (
            <>Promotes this verified contact into an active <strong>Sales Deal</strong>. All historical calls, inquiries, and tasks will remain intact.</>
          ) : (
            <>Promotes this lead into an active <strong>Sales Deal</strong> and links it to a <strong>Corporate Account (Company)</strong>.</>
          )}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Customer Type Selector (Layman Guide standard) */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Customer Type
                </Typography>
                <Tooltip title="Choose 'Individual / Personal (B2C)' for direct buyers (homebuyers, patients, students). Choose 'Business / Corporate (B2B)' when selling to a registered company or business." arrow>
                  <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Stack>
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                {customerType === 'B2C' ? 'Direct Consumer (No Company required)' : 'Corporate / B2B Client'}
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={customerType}
              exclusive
              onChange={(_, val) => { if (val) handleTypeChange(val) }}
              size="small"
              fullWidth
            >
              <ToggleButton value="B2C" sx={{ textTransform: 'none', fontWeight: 600, gap: 1 }}>
                <PersonIcon fontSize="small" /> Individual / Personal (B2C)
              </ToggleButton>
              <ToggleButton value="B2B" sx={{ textTransform: 'none', fontWeight: 600, gap: 1 }}>
                <BusinessIcon fontSize="small" /> Business / Corporate (B2B)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Section 1: Account (Mounted ONLY in B2B mode) */}
          {customerType === 'B2B' && (
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                <BusinessIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Company / Organization Entity
                </Typography>
                <Tooltip title="Enter the registered company name for invoicing, corporate contracts, and multi-contact tracking." arrow>
                  <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Stack>
              <TextField
                fullWidth
                size="small"
                label="Company / Organization Name"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Acme Corp or Digital Rubix Pvt Ltd"
              />
            </Box>
          )}

          {/* Section 2: Contact Person */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PersonIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Contact Person: {String(contact.customerName || contact.customer_name || 'Contact')} ({String(contact.contactNumber || contact.contact_number || '')})
              </Typography>
              <Tooltip title="This contact will remain the primary person associated with all past and future activities." arrow>
                <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              All historical calls, tasks, inquiries, and notes will remain intact and linked to this contact.
            </Typography>
          </Box>

          {/* Section 3: Sales Deal */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createDeal}
                  onChange={(e) => setCreateDeal(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Create a New Deal in {resolvedScreen?.name || resolvedScreen?.screen?.name || 'Sales Pipeline'}
                  </Typography>
                  <Tooltip title="Generates an active commercial deal card in your sales pipeline with stage tracking and revenue value." arrow>
                    <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </Box>
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
                  helperText="A clear title identifying this sales opportunity"
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
                    helperText="Expected commercial / booking value"
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
                    helperText="Target completion or closing date"
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
                  placeholder="Key opportunity details, client requirements, or negotiation points..."
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
          sx={{ fontWeight: 700 }}
        >
          {customerType === 'B2C' ? 'Convert to Deal' : 'Convert to B2B Deal'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export { ConvertLeadModal }

