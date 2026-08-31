import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import TableContainer from '@mui/material/TableContainer'
import Tooltip from '@mui/material/Tooltip'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FacebookIcon from '@mui/icons-material/Facebook'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LogoutIcon from '@mui/icons-material/Logout'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { alpha } from '@mui/material/styles'
import axios from 'axios'
import { api } from '@/services/api'
import { AppCard } from '@/components/ui/AppCard'
import FormModel from './FormModel'

declare global {
  interface Window {
    FB: any
  }
}

export default function FacebookLeadsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loginStatus, setLoginStatus] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activePages, setActivePages] = useState<any[]>([])
  const [fbConfig, setFbConfig] = useState<any>(null)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [resConfig, resProjects] = await Promise.all([
        api.get('/api-tokens/facebook'),
        api.get('/resources/resourceProjects'),
      ])
      setFbConfig(resConfig.data)
      setProjectsList(resProjects.data || [])

      if (resConfig.data?.accessToken) {
        setLoginStatus(true)
        // Set loaded active pages
        const allPages = resConfig.data.facebookPages || []
        const pageIds = resConfig.data.pageId || []
        setActivePages(allPages.filter((p: any) => pageIds.includes(p.id)))
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to load Facebook configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (window.FB) {
      window.FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          setLoginStatus(true)
          window.FB.api('/me', { fields: 'name,picture' }, (data: any) => {
            setUserData(data)
          })
        }
      })
    }
  }, [])

  const handleFacebookLogin = () => {
    if (!window.FB) {
      setToast({ open: true, msg: 'Facebook SDK not loaded yet', sev: 'error' })
      return
    }

    const permissions = [
      'public_profile',
      'email',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_manage_ads',
      'leads_retrieval',
      'ads_management',
      'business_management',
    ]

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          setLoginStatus(true)
          setLoading(true)
          window.FB.api('/me', { fields: 'name,picture' }, (data: any) => {
            setUserData(data)
          })
          void APICallAccessToken(response.authResponse)
        }
      },
      { scope: permissions.join(',') }
    )
  }

  const APICallAccessToken = async (authResponse: any) => {
    try {
      const resExchange = await api.post('/api-tokens/facebook/exchange', {
        shortToken: authResponse.accessToken,
      })
      const longToken = resExchange.data.longToken

      // Save token to backend
      const resSave = await api.put('/api-tokens/facebook/token', {
        accessToken: longToken,
        appId: '296542553118517',
        appSecret: '143f8ed7ddec986f25598654d8b686f6',
      })
      setFbConfig(resSave.data)

      // Fetch user accounts/pages
      window.FB.api('/me/accounts', { access_token: longToken, limit: 500 }, async (response: any) => {
        if (response.data) {
          const pagesWithForms = await Promise.all(
            response.data.map(async (page: any) => {
              try {
                const resForms = await axios.get(`https://graph.facebook.com/v17.0/${page.id}/leadgen_forms`, {
                  params: { access_token: page.access_token },
                })
                return {
                  ...page,
                  formcount: resForms.data?.data?.length || 0,
                  form_data: resForms.data?.data || [],
                }
              } catch {
                return { ...page, formcount: 0, form_data: [] }
              }
            })
          )

          // Save pages list to DB
          const resPages = await api.put('/api-tokens/facebook/pages', { facebookPages: pagesWithForms })
          setFbConfig(resPages.data)

          // Subscribe all pages to leadgen Webhook
          const pageIds: string[] = []
          for (const page of pagesWithForms) {
            try {
              const resSub = await axios.post(`https://graph.facebook.com/${page.id}/subscribed_apps`, {
                subscribed_fields: 'leadgen',
                access_token: page.access_token,
              })
              if (resSub.status === 200) {
                pageIds.push(page.id)
              }
            } catch (err) {
              console.error('Failed to subscribe page app:', page.id, err)
            }
          }

          // Save active subscribed page ids to DB
          const resSubscribed = await api.put('/api-tokens/facebook/subscribe', { pageId: pageIds })
          setFbConfig(resSubscribed.data)
          setActivePages(pagesWithForms.filter((p: any) => pageIds.includes(p.id)))
          setToast({ open: true, msg: 'Facebook pages integrated successfully!', sev: 'success' })
        }
        setLoading(false)
      })
    } catch (e: any) {
      setToast({ open: true, msg: 'Token exchange failed', sev: 'error' })
      setLoading(false)
    }
  }

  const handleSavePageMappings = async (updatedPages: any[]) => {
    try {
      setLoading(true)
      const res = await api.put('/api-tokens/facebook/pages', { facebookPages: updatedPages })
      setFbConfig(res.data)
      const pageIds = res.data.pageId || []
      setActivePages(updatedPages.filter((p: any) => pageIds.includes(p.id)))
      setToast({ open: true, msg: 'Form mapped successfully!', sev: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to map form to project', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async (pageId: string) => {
    const selectedPage = fbConfig?.facebookPages?.find((p: any) => p.id === pageId)
    if (!selectedPage) return

    try {
      setLoading(true)
      await axios.delete(`https://graph.facebook.com/${pageId}/subscribed_apps`, {
        params: {
          subscribed_fields: 'leadgen',
          access_token: selectedPage.access_token,
        },
      })

      const res = await api.put('/api-tokens/facebook/unsubscribe', { pageId: pageId })
      setFbConfig(res.data)
      setActivePages(activePages.filter((p) => p.id !== pageId))
      setToast({ open: true, msg: 'Page removed successfully!', sev: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to unsubscribe page', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleFacebookLogout = () => {
    if (window.FB) {
      window.FB.logout(async () => {
        setLoginStatus(false)
        setUserData(null)
        setActivePages([])
        await api.delete('/api-tokens/facebook/token')
        setToast({ open: true, msg: 'Logged out successfully', sev: 'success' })
      })
    }
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
        overflow: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/integrations')}
          sx={{ color: 'text.secondary', textDecoration: 'underline' }}
        >
          Integrations
        </Link>
        <ArrowForwardIosIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Facebook
        </Typography>
      </Box>

      {loading && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}

      <AppCard title="Facebook Integration" subtitle="Manage connected Facebook business pages and capture Lead Ads automatically.">
        {loginStatus ? (
          <Box sx={{ mt: 1 }}>
            {/* Connected User Hero Card */}
            <Card
              variant="outlined"
              sx={{
                mb: 3.5,
                borderRadius: 2,
                p: 2.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(24, 119, 242, 0.08)' : 'rgba(24, 119, 242, 0.04)',
                border: '1px solid',
                borderColor: (theme) => alpha('#1877F2', 0.25),
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={userData?.picture?.data?.url}
                    alt={userData?.name || 'Facebook User'}
                    sx={{
                      width: 52,
                      height: 52,
                      border: '2px solid #1877F2',
                      boxShadow: '0 2px 8px rgba(24,119,242,0.25)',
                    }}
                  />
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {userData?.name || 'Facebook Business Account'}
                      </Typography>
                      <Chip
                        icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.85rem !important' }} />}
                        label="Connected & Active"
                        size="small"
                        color="success"
                        sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
                      Meta Lead Ads Webhook integration authorized for this organization workspace.
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={handleFacebookLogout}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    px: 2,
                    fontSize: '0.8125rem',
                  }}
                >
                  Disconnect Account
                </Button>
              </Stack>
            </Card>

            {/* Connected Pages Section */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1}>
                  <FacebookIcon color="primary" sx={{ fontSize: 20 }} /> Connected Facebook Pages ({activePages.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  Manage incoming Lead Ads webhooks and map lead forms to CRM projects.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleFacebookLogin}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#1877F2',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#166FE5', boxShadow: 'none' },
                }}
              >
                Manage Facebook Pages
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 }}>Page Name & Forms</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Page ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activePages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No Facebook pages connected yet. Click "Manage Facebook Pages" above to select pages.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activePages.map((page) => (
                      <React.Fragment key={page.id}>
                        <TableRow hover sx={{ bgcolor: expandedId === page.id ? (theme) => alpha(theme.palette.primary.main, 0.04) : 'inherit' }}>
                          <TableCell sx={{ py: 1.75 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              <Typography variant="body2" fontWeight={700} color="text.primary">
                                {page.name}
                              </Typography>
                              <Box>
                                <Chip
                                  icon={expandedId === page.id ? <ExpandLessIcon sx={{ fontSize: '1rem !important' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem !important' }} />}
                                  label={`${page.formcount || page.form_data?.length || 0} Lead Forms Connected`}
                                  size="small"
                                  color={expandedId === page.id ? "primary" : "default"}
                                  variant={expandedId === page.id ? "filled" : "outlined"}
                                  onClick={() => setExpandedId(expandedId === page.id ? null : page.id)}
                                  sx={{
                                    height: 24,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) },
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                              {page.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={page.category || 'Page'} size="small" variant="outlined" sx={{ fontSize: '0.72rem', fontWeight: 500 }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label="Active & Synced"
                              size="small"
                              color="success"
                              sx={{ height: 22, fontWeight: 600, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              color="error"
                              variant="outlined"
                              size="small"
                              startIcon={<DeleteOutlineIcon sx={{ fontSize: '1rem !important' }} />}
                              onClick={() => handleUnsubscribe(page.id)}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem', py: 0.4 }}
                            >
                              Remove Page
                            </Button>
                          </TableCell>
                        </TableRow>

                        {expandedId === page.id && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', p: 2 }}>
                              <FormModel
                                pageFormsData={page.form_data || []}
                                pageId={page.id}
                                allFacebookPages={fbConfig?.facebookPages || []}
                                dispatcher={null}
                                projectsList={projectsList}
                                setExpandedId={setExpandedId}
                                onSave={handleSavePageMappings}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2.5 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '12px',
                bgcolor: alpha('#1877F2', 0.1),
                color: '#1877F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FacebookIcon sx={{ fontSize: 34 }} />
            </Box>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ maxWidth: 450, fontSize: '0.875rem' }}>
              Receive new leads from your Facebook Lead Ads directly in your Leads Rubix account.
            </Typography>
            <Button
              variant="contained"
              startIcon={<FacebookIcon />}
              onClick={handleFacebookLogin}
              sx={{
                bgcolor: '#1877F2',
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 3,
                py: 1,
                borderRadius: '8px',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#166FE5',
                  boxShadow: 'none',
                },
              }}
            >
              Login with Facebook
            </Button>
          </Box>
        )}
      </AppCard>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
