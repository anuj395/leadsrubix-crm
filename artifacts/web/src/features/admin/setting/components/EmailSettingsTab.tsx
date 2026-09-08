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
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/HourglassEmpty'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import SendIcon from '@mui/icons-material/Send'
import EmailIcon from '@mui/icons-material/Email'
import RefreshIcon from '@mui/icons-material/Refresh'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import { api } from '@/services/api'

interface DnsRecord {
  name: string
  type: string
  value: string
}

interface SesConfig {
  identityDomain?: string
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED'
  verificationToken?: string
  dkimTokens?: string[]
  dnsRecords?: {
    txtRecord?: DnsRecord
    cnameRecords?: DnsRecord[]
  }
  fromEmail?: string
  fromName?: string
  useCustomSes?: boolean
}

interface QuotaInfo {
  dailyLimit: number
  monthlyLimit: number
  rateLimitPerMinute: number
  usedToday: number
  usedThisMonth: number
}

interface EmailLogItem {
  _id: string
  recipient: string
  sender: string
  subject: string
  trigger_action: string
  status: string
  duration_ms: number
  createdAt: string
  error_message?: string
}

export function EmailSettingsTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [verifyingDomain, setVerifyingDomain] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Config State
  const [sesConfig, setSesConfig] = useState<SesConfig | null>(null)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [fromNameInput, setFromNameInput] = useState('')
  const [fromEmailInput, setFromEmailInput] = useState('')
  const [useCustomSesToggle, setUseCustomSesToggle] = useState(false)

  // Logs State
  const [logs, setLogs] = useState<EmailLogItem[]>([])
  const [testEmailInput, setTestEmailInput] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const fetchEmailConfig = async () => {
    setLoading(true)
    try {
      let res = await api.get('organization/email-settings/ses').catch(() => null)
      if (!res?.data) {
        res = await api.get('organizations/email-settings/ses').catch(() => null)
      }
      if (!res?.data) {
        throw new Error('Failed to load email settings')
      }
      const data = res.data
      setSesConfig(data.sesConfig || {})
      setQuota(data.quota || null)
      setDomainInput(data.sesConfig?.identityDomain || '')
      setFromNameInput(data.sesConfig?.fromName || '')
      setFromEmailInput(data.sesConfig?.fromEmail || '')
      setUseCustomSesToggle(!!data.sesConfig?.useCustomSes)
    } catch {
      showToast('Failed to load workspace email settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      let res = await api.get('organization/email-settings/logs?pageSize=50').catch(() => null)
      if (!res?.data) {
        res = await api.get('organizations/email-settings/logs?pageSize=50').catch(() => null)
      }
      setLogs(res?.data?.items || [])
    } catch {
      // Silently catch log load
    }
  }

  useEffect(() => {
    void fetchEmailConfig()
    void fetchLogs()
  }, [])

  const copyToClipboard = (text: string, labelKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(labelKey)
    showToast(`Copied ${labelKey} to clipboard!`)
    setTimeout(() => setCopiedKey(null), 3000)
  }

  const handleStartVerification = async () => {
    if (!domainInput.trim()) {
      showToast('Please enter a valid domain name (e.g., mail.yourcompany.com)', 'error')
      return
    }

    setVerifyingDomain(true)
    try {
      const payload = {
        domain: domainInput.trim(),
        fromName: fromNameInput.trim(),
        fromEmail: fromEmailInput.trim(),
        useCustomSes: useCustomSesToggle
      }
      const res = await api.post('organization/email-settings/ses/verify-domain', payload)
        .catch(() => api.post('organizations/email-settings/ses/verify-domain', payload))
      setSesConfig(res.data.sesConfig)
      showToast('Domain verification initiated! Copy the DNS records below to your domain DNS provider.')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to initiate domain verification', 'error')
    } finally {
      setVerifyingDomain(false)
    }
  }

  const handleCheckStatus = async () => {
    setCheckingStatus(true)
    try {
      const res = await api.post('organization/email-settings/ses/check-status')
        .catch(() => api.post('organizations/email-settings/ses/check-status'))
      if (res.data?.isVerified) {
        showToast('🎉 Success! Your domain DNS is verified and ready for email sending!', 'success')
      } else {
        showToast(`Status: ${res.data?.verificationStatus || 'PENDING'}. DNS propagation may take a few minutes.`, 'error')
      }
      void fetchEmailConfig()
    } catch {
      showToast('Failed to check domain status', 'error')
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmailInput.trim()) {
      showToast('Enter recipient email address for test ping', 'error')
      return
    }

    setSendingTest(true)
    try {
      await api.post('organization/email-settings/enqueue-test', {
        recipient: testEmailInput.trim(),
        subject: 'LeadsRubix Queue Ping Test',
        bodyHtml: '<p>Your LeadsRubix email queue and AWS SES integration are working perfectly!</p>'
      })
      showToast('Test email enqueued into high-speed sending queue!', 'success')
      setTestEmailInput('')
      setTimeout(() => void fetchLogs(), 1500)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to enqueue test email', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  const isVerified = sesConfig?.verificationStatus === 'VERIFIED'
  const usedToday = quota?.usedToday || 0
  const dailyLimit = quota?.dailyLimit || 2000
  const quotaPercent = Math.min(Math.round((usedToday / dailyLimit) * 100), 100)

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      <Stack spacing={3}>
      {/* Overview Banner Card */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px', backgroundColor: 'background.paper', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <EmailIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Workspace Email & Custom Domain Settings
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Send automated emails (lead assignments, inquiry acknowledgments, status updates) from your official company domain name.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', minWidth: 260, bgcolor: 'action.hover' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Daily Sending Quota
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {usedToday.toLocaleString()} / {dailyLimit.toLocaleString()} emails
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: quotaPercent > 90 ? 'error.main' : 'success.main' }}>
                {quotaPercent}% Used
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={quotaPercent} color={quotaPercent > 90 ? 'error' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
          </Paper>
        </Stack>
      </Paper>

      {/* 3-Step Setup Wizard Card */}
      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Simple 3-Step Domain Setup Guide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow these easy steps to connect your company domain name in less than 3 minutes.
          </Typography>

          <Stack spacing={3}>
            {/* Step 1: Domain & Sender Details */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="Step 1" size="small" color="primary" sx={{ fontWeight: 800 }} /> Enter Your Company Domain & Sender Details
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  size="small"
                  label="Domain Name"
                  placeholder="e.g. clinic.com or mail.clinic.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Sender Name"
                  placeholder="e.g. City Hospital Desk"
                  value={fromNameInput}
                  onChange={(e) => setFromNameInput(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Sender Email Address"
                  placeholder="e.g. care@clinic.com"
                  value={fromEmailInput}
                  onChange={(e) => setFromEmailInput(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={handleStartVerification}
                  disabled={verifyingDomain}
                  sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: '8px' }}
                >
                  {verifyingDomain ? <CircularProgress size={20} color="inherit" /> : 'Generate DNS Records'}
                </Button>
              </Stack>
            </Box>

            {/* Step 2: Copy DNS Records */}
            {sesConfig?.dnsRecords && (
              <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Step 2" size="small" color="primary" sx={{ fontWeight: 800 }} /> Copy & Add Records to Your Domain DNS
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    {checkingStatus ? <CircularProgress size={16} /> : 'Check DNS Status'}
                  </Button>
                </Stack>

                {/* TXT Verification Record */}
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                  1. TXT Verification Record
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.paper', borderRadius: '8px' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        Type: {sesConfig.dnsRecords.txtRecord?.type} | Host: {sesConfig.dnsRecords.txtRecord?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                        Value: {sesConfig.dnsRecords.txtRecord?.value}
                      </Typography>
                    </Box>
                    <Tooltip title="Copy Record Value">
                      <Button
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => copyToClipboard(sesConfig.dnsRecords?.txtRecord?.value || '', 'TXT Record')}
                        sx={{ textTransform: 'none', ml: 1 }}
                      >
                        Copy
                      </Button>
                    </Tooltip>
                  </Stack>
                </Paper>

                {/* DKIM CNAME Records */}
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                  2. DKIM CNAME Records (Required for 100% Inbox Delivery)
                </Typography>
                <Stack spacing={1}>
                  {sesConfig.dnsRecords.cnameRecords?.map((cname, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: '8px' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            Host: {cname.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                            Value: {cname.value}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => copyToClipboard(cname.value, `DKIM ${idx + 1}`)}
                          sx={{ textTransform: 'none', ml: 1 }}
                        >
                          Copy
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Step 3: Verification Status Badge */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="Step 3" size="small" color="primary" sx={{ fontWeight: 800 }} /> Domain Verification Status
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  {isVerified ? (
                    <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
                  ) : (
                    <PendingIcon color="warning" sx={{ fontSize: 28 }} />
                  )}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Status: {isVerified ? 'VERIFIED & ACTIVE' : (sesConfig?.verificationStatus || 'PENDING VERIFICATION')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isVerified
                        ? 'Emails will be sent using your official company domain via AWS SES.'
                        : 'If unverified or pending, system automatically falls back to default verified LeadRubix identity so zero emails fail.'}
                    </Typography>
                  </Box>
                </Stack>

                <FormControlLabel
                  control={
                    <Switch
                      checked={useCustomSesToggle}
                      onChange={(e) => setUseCustomSesToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Custom Domain</Typography>}
                />
              </Paper>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Expandable Layman Help Guide Accordion */}
      <Accordion variant="outlined" sx={{ borderRadius: '12px !important' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HelpOutlineIcon color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Need Help? How to Add DNS Records in Cloudflare, GoDaddy, or Namecheap (Click to Expand)
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" paragraph>
            Adding DNS records takes less than 2 minutes:
          </Typography>
          <ol style={{ paddingLeft: 20, margin: 0, fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
            <li>Log in to your Domain Provider (Cloudflare / GoDaddy / Namecheap / Route53).</li>
            <li>Go to <strong>DNS Settings</strong> or <strong>Manage DNS</strong>.</li>
            <li>Click <strong>Add Record</strong>:
              <ul>
                <li>Add 1 <strong>TXT</strong> Record (Name: <code>{sesConfig?.dnsRecords?.txtRecord?.name || '_amazonaws'}</code>, Value: paste copied TXT value).</li>
                <li>Add 3 <strong>CNAME</strong> Records (Copy each CNAME Host and CNAME Value from Step 2 above).</li>
              </ul>
            </li>
            <li>Click Save. DNS updates usually take 1 to 5 minutes to verify.</li>
          </ol>
        </AccordionDetails>
      </Accordion>

      {/* Dispatch Test Ping Card */}
      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Test High-Speed Email Queue Engine
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a test email through the asynchronous high-throughput queue (capable of 5,000 emails/minute).
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              label="Recipient Test Email"
              placeholder="e.g. admin@yourcompany.com"
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SendIcon />}
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: '8px' }}
            >
              {sendingTest ? <CircularProgress size={20} color="inherit" /> : 'Enqueue Test Email'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Live Email Delivery Logs Table */}
      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Email Delivery Logs & Status History
            </Typography>
            <Button size="small" onClick={() => void fetchLogs()} startIcon={<RefreshIcon />}>
              Refresh Logs
            </Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', maxHeight: 320, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>Recipient</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>Trigger</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'action.hover' }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No recent email logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{log.recipient}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell><Chip label={log.trigger_action} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          size="small"
                          color={
                            log.status === 'SENT' ? 'success' :
                            log.status === 'BOUNCED' || log.status === 'FAILED' ? 'error' :
                            log.status === 'SUPPRESSED' ? 'warning' : 'default'
                          }
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      </Stack>
    </Box>
  )
}
