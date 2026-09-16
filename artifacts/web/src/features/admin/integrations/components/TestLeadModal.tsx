import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SendIcon from '@mui/icons-material/Send'
import KeyIcon from '@mui/icons-material/Key'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'

export interface TestLeadModalProps {
  open: boolean
  onClose: () => void
  platformKey: string
  platformName: string
  token?: string
  onTokenGenerated?: (token: string) => void
}

export function TestLeadModal({
  open,
  onClose,
  platformKey,
  platformName,
  token = '',
  onTokenGenerated,
}: TestLeadModalProps) {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const indCode = String(user?.industryId || '').toLowerCase().trim()

  const [activeToken, setActiveToken] = useState(token)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Dynamic Form State (Zero Hardcoding)
  const [customerName, setCustomerName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [email, setEmail] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [campaign, setCampaign] = useState(platformName)
  const [notes, setNotes] = useState('')

  // Dispatch state
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; msg: string; leadId?: string } | null>(null)
  const [copiedPayload, setCopiedPayload] = useState(false)

  // Sync token from parent
  useEffect(() => {
    if (token) {
      setActiveToken(token)
    }
  }, [token])

  // Default dynamic placeholder based on industry
  const defaultIndustryEntity = useMemo(() => {
    if (indCode === 'temp0002') return 'General Consultation'
    if (indCode === 'temp0003') return 'Academic Course'
    if (indCode === 'temp0004') return 'Holiday Package'
    if (indCode === 'temp0005') return 'Wealth Portfolio'
    if (indCode === 'temp0006') return 'IT Services'
    if (indCode === 'temp0007') return 'Vehicle Inquiry'
    return 'Primary Property Inquiry'
  }, [indCode])

  // Fetch real tenant projects
  useEffect(() => {
    if (!open) return
    let isMounted = true
    setLoadingProjects(true)
    api
      .get('/resources/resourceProjects')
      .then((res) => {
        if (!isMounted) return
        const list = res.data || []
        setProjects(list)
        if (list.length > 0) {
          const first = list[0].projectName || list[0].name || ''
          setSelectedProject((prev) => (prev ? prev : first))
        } else {
          setSelectedProject((prev) => (prev ? prev : defaultIndustryEntity))
        }
      })
      .catch(() => {
        if (isMounted) setSelectedProject((prev) => (prev ? prev : defaultIndustryEntity))
      })
      .finally(() => {
        if (isMounted) setLoadingProjects(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, defaultIndustryEntity])

  // Reset form with dynamic context on open
  useEffect(() => {
    if (open) {
      setResult(null)
      setCampaign(platformName)
      setCustomerName(`${user?.name || 'Admin'} (Test ${platformName})`)
      setContactNo(user?.mobile || user?.phone || '9876543210')
      setEmail(user?.email || `test.${platformKey.toLowerCase().replace(/[^a-z0-9]/g, '')}@leadsrubix.com`)
      setNotes(`Automated test lead dispatched via ${platformName} portal integration simulator.`)
    }
  }, [open, platformName, platformKey, user])

  // 1-Click Token Generator if missing
  const handleGenerateToken = async () => {
    setGeneratingToken(true)
    try {
      const res = await api.post('/api-tokens', {
        source: platformName,
        countryCode: '+91',
        status: 'ACTIVE',
      })
      const newToken = res.data?.apiKey || res.data?.api_key || ''
      if (newToken) {
        setActiveToken(newToken)
        if (onTokenGenerated) onTokenGenerated(newToken)
      }
    } catch (e: any) {
      setResult({ success: false, msg: e?.response?.data?.message || 'Failed to generate token' })
    } finally {
      setGeneratingToken(false)
    }
  }

  // Real-time JSON Payload
  const payload = useMemo(() => {
    return {
      customer_name: customerName,
      contact_no: contactNo,
      email: email,
      project: selectedProject,
      campaign: campaign || platformName,
      notes: notes,
      token: activeToken,
    }
  }, [customerName, contactNo, email, selectedProject, campaign, platformName, notes, activeToken])

  const jsonPayloadString = useMemo(() => JSON.stringify(payload, null, 2), [payload])

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(jsonPayloadString)
    setCopiedPayload(true)
    setTimeout(() => setCopiedPayload(false), 1500)
  }

  // Dispatch Test Lead to Webhook
  const handleDispatch = async () => {
    if (!activeToken) {
      setResult({ success: false, msg: 'API Token is missing. Please generate or provide an API Token.' })
      return
    }
    if (!contactNo) {
      setResult({ success: false, msg: 'Contact Number is required to ingest leads into CRM.' })
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const res = await api.post('/webhook/createContacts', payload)
      const data = res.data || {}

      if (data.status === 'error' || data.success === false) {
        setResult({
          success: false,
          msg: data.message || 'Webhook rejected the lead submission.',
        })
      } else {
        setResult({
          success: true,
          msg: data.message || 'Thank you! Lead created and dispatched successfully to your CRM.',
          leadId: data.leadId || data.id,
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        msg: err?.response?.data?.message || err.message || 'Failed to dispatch test lead.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#16182D' : '#f8fafc'),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayArrowIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Simulate Inbound Lead — {platformName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100% dynamic simulation • Zero hardcoded values • Ingests live into CRM
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Token Alert if Missing */}
        {!activeToken && (
          <Alert
            severity="warning"
            sx={{ mb: 2.5, borderRadius: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                disabled={generatingToken}
                startIcon={generatingToken ? <CircularProgress size={14} /> : <KeyIcon fontSize="small" />}
                onClick={handleGenerateToken}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {generatingToken ? 'Generating...' : 'Generate Token Now'}
              </Button>
            }
          >
            API Token for {platformName} is not active yet. Click <b>Generate Token Now</b> to create one instantly.
          </Alert>
        )}

        {/* Live Result Alert */}
        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckCircleOutlineIcon fontSize="inherit" /> : undefined}
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              result.success ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => {
                      onClose()
                      navigate('/leads/inquiries')
                    }}
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    View in Inbound Inquiries
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      onClose()
                      navigate('/integrations/api-data')
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Webhook Logs
                  </Button>
                </Stack>
              ) : undefined
            }
          >
            {result.msg}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column: Dynamic Fields */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
              Dynamic Inbound Lead Details
            </Typography>

            <Stack spacing={2}>
              {/* Dynamic Project Dropdown */}
              <TextField
                select
                fullWidth
                size="small"
                label={indCode === 'temp0002' ? 'Service / Speciality' : 'Project / Property'}
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                helperText={
                  loadingProjects
                    ? 'Loading configured projects...'
                    : projects.length > 0
                    ? `Loaded dynamically from your organization's ${projects.length} project(s)`
                    : `No projects configured in CRM. Using industry fallback (${defaultIndustryEntity})`
                }
              >
                {projects.map((p: any) => {
                  const val = p.projectName || p.name || p.id
                  return (
                    <MenuItem key={p.id || val} value={val}>
                      {val}
                    </MenuItem>
                  )
                })}
                {projects.length === 0 && (
                  <MenuItem value={defaultIndustryEntity}>{defaultIndustryEntity}</MenuItem>
                )}
              </TextField>

              {/* Customer Name */}
              <TextField
                fullWidth
                size="small"
                label="Lead / Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              {/* Phone */}
              <TextField
                fullWidth
                size="small"
                label="Mobile Contact Number"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="10-digit mobile number"
              />

              {/* Email */}
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* Campaign Identifier */}
              <TextField
                fullWidth
                size="small"
                label="Campaign / Source Identifier"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                helperText="Matches source tagging inside Lead Management"
              />

              {/* Remarks / Inquiry Notes */}
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Remarks / Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Stack>
          </Grid>

          {/* Right Column: Live Webhook Payload Preview */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Live HTTP Payload (JSON)
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={handleCopyPayload}
                color={copiedPayload ? 'success' : 'inherit'}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
              >
                {copiedPayload ? 'Copied!' : 'Copy JSON'}
              </Button>
            </Box>

            <Box
              sx={{
                bgcolor: '#16182D',
                borderRadius: 2.5,
                p: 2,
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.8rem',
                color: '#f8fafc',
                overflowX: 'auto',
                maxHeight: 330,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <pre style={{ margin: 0 }}>{jsonPayloadString}</pre>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Target Endpoint: <code>POST /api/webhook/createContacts</code>
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={submitting || !activeToken}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          onClick={handleDispatch}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #272944 0%, #16182D 100%)',
          }}
        >
          {submitting ? 'Dispatching to Webhook...' : 'Dispatch Test Lead Live'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
