import React, { useEffect, useState } from 'react'
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

export default function SulekhaPage() {
  const navigate = useNavigate()
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
      
      const filtered = tokens.find((item: any) => String(item.source).toLowerCase() === 'sulekha')
      if (filtered) {
        setApiKey(filtered.api_key || '')
      } else {
        const resCreate = await api.post('/api-tokens', {
          source: 'Sulekha',
          countryCode: '+91',
          status: 'ACTIVE',
        })
        setApiKey(resCreate.data?.api_key || '')
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to configure Sulekha integration', sev: 'error' })
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const webhookUrl = 'https://api.leadsrubix.com/api/v1/webhooks/sulekha'

  const bodyData = {
    customer_name: '',
    contact_no: '',
    email: '',
    country_code: '',
    project: '',
    campaign: 'Sulekha',
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
          Sulekha
        </Typography>
      </Box>

      {loading && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}

      <AppCard title="Sulekha Integration" subtitle="Configure automatic lead capturing from your Sulekha advertisements." fullHeight>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2, pr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary', fontSize: '1.25rem' }}>
            Receive New Leads from Sulekha in Your Leads Rubix Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            To integrate your Sulekha leads with Leads Rubix, please copy and forward the integration details below to your Sulekha Account Manager:
          </Typography>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                  Instructions for Account Manager
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Integration Request
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    "Please configure my Sulekha account to send all incoming property leads directly to my CRM via Webhook."
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
                  Once the Sulekha setup is completed, their support team typically activates the webhook mapping within 3-5 business days.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  After activation, leads will immediately begin streaming into your dynamic Lead Management panel under the specified campaign parameters.
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
