import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import { api } from '@/services/api'
import { AppCard } from '@/components/ui/AppCard'

import { useAppSelector } from '@/store/hooks'

export default function WebsitePage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const loadingRef = React.useRef(false)

  const loadData = async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const resTokens = await api.get('/api-tokens')
      const tokens = resTokens.data || []
      
      const filtered = tokens.find((item: any) => String(item.source).toLowerCase() === 'website')
      if (filtered) {
        setApiKey(filtered.api_key || '')
      } else {
        const resCreate = await api.post('/api-tokens', {
          source: 'Website',
          countryCode: '+91',
          status: 'ACTIVE',
        })
        setApiKey(resCreate.data?.api_key || '')
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to configure Website integration', sev: 'error' })
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const indCode = String(user?.industryId || '').toLowerCase().trim();

  const labels = useMemo(() => {
    if (indCode === 'temp0003') {
      return {
        title: 'Website Integration',
        header: 'Receive New Patients from Website in Your Leads Rubix Account',
        subtitle: 'Configure automatic patient capturing from your own business website contact forms.',
        instructions: 'To integrate your Website patients with Leads Rubix, please copy and forward the integration details below to your Web Developer:',
        request: '"Please configure my Website forms to send all incoming patient registrations directly to my CRM via Webhook."',
        info: 'Once the Web Developer maps your contact form submission actions to the Webhook URL, patients will immediately begin streaming into your dynamic Leads Rubix panel.',
      };
    }
    if (indCode === 'temp0002') {
      return {
        title: 'Website Integration',
        header: 'Receive New Customers from Website in Your Leads Rubix Account',
        subtitle: 'Configure automatic order capturing from your own business website contact forms.',
        instructions: 'To integrate your Website customers with Leads Rubix, please copy and forward the integration details below to your Web Developer:',
        request: '"Please configure my Website forms to send all incoming inquiries directly to my CRM via Webhook."',
        info: 'Once the Web Developer maps your contact form submission actions to the Webhook URL, orders will immediately begin streaming into your dynamic Leads Rubix panel.',
      };
    }
    return {
      title: 'Website Integration',
      header: 'Receive New Leads from Website in Your Leads Rubix Account',
      subtitle: 'Configure automatic lead capturing from your own business website contact forms.',
      instructions: 'To integrate your Website leads with Leads Rubix, please copy and forward the integration details below to your Web Developer:',
      request: '"Please configure my Website forms to send all incoming leads directly to my CRM via Webhook."',
      info: 'Once the Web Developer maps your contact form submission actions to the Webhook URL, leads will immediately begin streaming into your dynamic Leads Rubix panel.',
    };
  }, [indCode]);

  const webhookUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api/webhook/createContacts'
    : 'https://api.leadsrubix.com/api/webhook/createContacts'

  const bodyData = {
    customer_name: '',
    contact_no: '',
    email: '',
    country_code: '',
    project: '',
    campaign: 'Website',
    token: apiKey,
  }

  const jsonBodyData = JSON.stringify(bodyData, null, 2)

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedUrl(true)
    setToast({ open: true, msg: 'Webhook URL copied to clipboard!', sev: 'success' })
    setTimeout(() => setCopiedUrl(false), 1500)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonBodyData)
    setCopiedJson(true)
    setToast({ open: true, msg: 'Payload parameters copied!', sev: 'success' })
    setTimeout(() => setCopiedJson(false), 1500)
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <IconButton
          onClick={() => navigate('/integrations')}
          color="primary"
          sx={{
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' }
          }}
          size="small"
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/integrations')}
          sx={{ color: 'text.secondary', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
        >
          Integrations
        </Link>
        <ArrowForwardIosIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Website
        </Typography>
      </Box>

      {loading && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}

      <AppCard title={labels.title} subtitle={labels.subtitle} fullHeight>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2, pr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary', fontSize: '1.25rem' }}>
            {labels.header}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            {labels.instructions}
          </Typography>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                  Instructions for Web Developer
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Integration Request
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    {labels.request}
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Webhook URL
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={webhookUrl}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleCopyUrl} size="small" edge="end">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    HTTP Method
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    POST
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Payload Format (JSON)
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
                    <IconButton
                      size="small"
                      onClick={handleCopyJson}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: copiedJson ? 'success.main' : 'grey.400',
                        zIndex: 2,
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <pre
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        borderRadius: 12,
                        padding: '16px',
                        fontSize: '0.85rem',
                        overflowX: 'auto',
                        margin: 0,
                        fontFamily: 'Consolas, Monaco, monospace',
                      }}
                    >
                      {jsonBodyData}
                    </pre>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: '#f8fafc', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Integration Processing Info
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  {labels.info}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
