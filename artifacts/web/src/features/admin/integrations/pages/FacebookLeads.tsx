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
import FacebookIcon from '@mui/icons-material/Facebook'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LogoutIcon from '@mui/icons-material/Logout'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed'
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
  const [tokenExpired, setTokenExpired] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activePages, setActivePages] = useState<any[]>([])
  const [fbConfig, setFbConfig] = useState<any>(null)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [selectedModalPage, setSelectedModalPage] = useState<any>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const fetchUserPages = async (token: string, existingPages: any[] = []) => {
    try {
      let rawPages: any[] = []
      try {
        const accountsRes = await axios.get('https://graph.facebook.com/me/accounts', {
          params: { access_token: token, limit: 500 },
        })
        rawPages = accountsRes.data?.data || []
      } catch (axiosErr) {
        console.warn('Axios /me/accounts failed, trying FB.api fallback:', axiosErr)
        if (window.FB) {
          rawPages = await new Promise((resolve) => {
            window.FB.api('/me/accounts', { access_token: token, limit: 500 }, (fbRes: any) => {
              resolve(fbRes?.data || [])
            })
          })
        }
      }

      if (rawPages.length > 0) {
        // Map existing form project mappings so refresh doesn't lose mapped project IDs
        const existingFormProjectMap: Record<string, string> = {}
        existingPages.forEach((p: any) => {
          ;(p.form_data || p.formData || []).forEach((f: any) => {
            if (f.projectId || f.project_id) {
              existingFormProjectMap[String(f.id)] = f.projectId || f.project_id
            }
          })
        })

        const pagesWithForms = await Promise.all(
          rawPages.map(async (page: any) => {
            try {
              const resForms = await axios.get(`https://graph.facebook.com/v17.0/${page.id}/leadgen_forms`, {
                params: { access_token: page.access_token },
              })
              const forms = (resForms.data?.data || []).map((form: any) => {
                const mappedProj = existingFormProjectMap[String(form.id)] || form.projectId || form.project_id || ''
                return {
                  ...form,
                  projectId: mappedProj,
                  project_id: mappedProj,
                }
              })
              return {
                ...page,
                formcount: forms.length,
                form_data: forms,
              }
            } catch {
              return { ...page, formcount: 0, form_data: [] }
            }
          })
        )

        setActivePages(pagesWithForms)
        // Background sync to backend database so pages and forms are permanently stored
        try {
          await api.put('/api-tokens/facebook/pages', { facebookPages: pagesWithForms })
        } catch (dbErr) {
          console.warn('Could not sync facebookPages to DB:', dbErr)
        }
        return pagesWithForms
      } else {
        if (existingPages.length === 0) {
          setActivePages([])
        }
        return []
      }
    } catch (err) {
      console.warn('Could not fetch user pages via Graph API:', err)
      return []
    }
  }

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
        // 1. Instantly display cached pages from DB for zero-latency UI
        const dbPages = resConfig.data.facebookPages || []
        if (dbPages.length > 0) {
          const pageIds = (resConfig.data.pageId || []).map(String)
          const filtered = dbPages.filter((p: any) => pageIds.includes(String(p.id)))
          setActivePages(filtered.length > 0 ? filtered : dbPages)
        }

        // 2. Restore user profile
        if (resConfig.data.userName) {
          setUserData({
            name: resConfig.data.userName,
            picture: { data: { url: resConfig.data.userPicture } },
            id: resConfig.data.fbUserId,
          })
        }

        // 3. If DB pages are empty, await live fetch to avoid 0-pages flash. If cached, background refresh.
        if (dbPages.length === 0) {
          await fetchUserPages(resConfig.data.accessToken, dbPages)
        } else {
          void fetchUserPages(resConfig.data.accessToken, dbPages)
        }

        // 4. Verify token validity with Meta Graph API
        try {
          const userRes = await axios.get('https://graph.facebook.com/me', {
            params: {
              fields: 'name,picture',
              access_token: resConfig.data.accessToken,
            },
          })
          if (userRes.data) {
            setUserData(userRes.data)
            setTokenExpired(false)
          }
        } catch (fbErr: any) {
          console.warn('Could not verify Facebook token validity:', fbErr)
          const errCode = fbErr.response?.data?.error?.code
          if (errCode === 190 || fbErr.response?.status === 400 || fbErr.response?.status === 401) {
            setTokenExpired(true)
          }
        }
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

      // Fetch user profile from Meta Graph API using longToken
      let fetchedUser: any = null
      try {
        const meRes = await axios.get('https://graph.facebook.com/me', {
          params: { fields: 'name,picture', access_token: longToken },
        })
        if (meRes.data) {
          fetchedUser = meRes.data
          setUserData(fetchedUser)
        }
      } catch (err) {
        console.warn('Could not fetch user profile during exchange:', err)
      }

      // Fetch user pages and leadgen forms using fetchUserPages helper
      const pagesWithForms = await fetchUserPages(longToken, fbConfig?.facebookPages || [])

      // Subscribe all pages to leadgen Webhook
      const pageIds: string[] = []
      if (pagesWithForms && pagesWithForms.length > 0) {
        for (const page of pagesWithForms) {
          try {
            await axios.post(`https://graph.facebook.com/${page.id}/subscribed_apps`, null, {
              params: {
                subscribed_fields: 'leadgen',
                access_token: page.access_token,
              },
            })
            pageIds.push(String(page.id))
          } catch (err) {
            console.error('Failed to subscribe page app:', page.id, err)
            pageIds.push(String(page.id))
          }
        }
      }

      // Atomically save token, profile, pages and pageIds to backend DB
      const resSave = await api.put('/api-tokens/facebook/token', {
        accessToken: longToken,
        appId: '296542553118517',
        appSecret: '143f8ed7ddec986f25598654d8b686f6',
        userName: fetchedUser?.name || userData?.name || 'Facebook User',
        userPicture: fetchedUser?.picture?.data?.url || userData?.picture?.data?.url || '',
        fbUserId: fetchedUser?.id || userData?.id || '',
        facebookPages: pagesWithForms || [],
        pageId: pageIds,
      })
      setFbConfig(resSave.data)
      if (pagesWithForms && pagesWithForms.length > 0) {
        setActivePages(pagesWithForms)
        setToast({ open: true, msg: 'Facebook pages integrated successfully!', sev: 'success' })
      } else {
        setToast({ open: true, msg: 'No Facebook pages found for this account', sev: 'error' })
      }
    } catch (e: any) {
      console.error('APICallAccessToken error:', e)
      setToast({ open: true, msg: 'Token exchange failed', sev: 'error' })
    } finally {
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

  const handleFacebookLogout = async () => {
    setLoading(true)
    try {
      if (window.FB && typeof window.FB.logout === 'function') {
        try {
          window.FB.logout(() => {})
        } catch (e) {
          console.warn('FB client logout notice:', e)
        }
      }

      await api.delete('/api-tokens/facebook/token')
      setLoginStatus(false)
      setUserData(null)
      setActivePages([])
      setFbConfig(null)
      setToast({ open: true, msg: 'Facebook account disconnected successfully', sev: 'success' })
    } catch (e: any) {
      console.error('Failed to disconnect Facebook account:', e)
      setToast({ open: true, msg: 'Failed to disconnect Facebook account', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        pb: { xs: 8, sm: 12 },
        width: '100%',
        minWidth: 0,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {loading && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}

      <AppCard title="Facebook Integration" subtitle="Manage connected Facebook business pages and capture Lead Ads automatically.">
        {loginStatus ? (
          <Box sx={{ mt: 1 }}>
            {tokenExpired && (
              <Alert
                severity="warning"
                icon={<WarningAmberRoundedIcon />}
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  alignItems: 'center',
                }}
                action={
                  <Button
                    color="warning"
                    size="small"
                    variant="contained"
                    startIcon={<FacebookIcon />}
                    onClick={handleFacebookLogin}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Renew Session
                  </Button>
                }
              >
                <strong>Facebook Token Expired:</strong> Your Meta authorization session has expired or was revoked. Please renew session to continue receiving live leads.
              </Alert>
            )}

            {/* Connected User Hero Card */}
            <Card
              variant="outlined"
              sx={{
                mb: 3.5,
                borderRadius: 2,
                p: 2.5,
                bgcolor: (theme) => tokenExpired
                  ? (theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(237, 108, 2, 0.04)')
                  : (theme.palette.mode === 'dark' ? 'rgba(24, 119, 242, 0.08)' : 'rgba(24, 119, 242, 0.04)'),
                border: '1px solid',
                borderColor: (theme) => tokenExpired ? alpha('#ed6c02', 0.35) : alpha('#1877F2', 0.25),
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
                      border: tokenExpired ? '2px solid #ed6c02' : '2px solid #1877F2',
                      boxShadow: tokenExpired ? '0 2px 8px rgba(237,108,2,0.25)' : '0 2px 8px rgba(24,119,242,0.25)',
                    }}
                  />
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {userData?.name || 'Facebook Business Account'}
                      </Typography>
                      {tokenExpired ? (
                        <Chip
                          icon={<WarningAmberRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                          label="Session Expired"
                          size="small"
                          color="warning"
                          sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.85rem !important' }} />}
                          label="Connected & Active"
                          size="small"
                          color="success"
                          sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
                      {tokenExpired
                        ? 'Token renewal required to maintain automatic Meta lead webhook delivery.'
                        : 'Meta Lead Ads Webhook integration authorized for this organization workspace.'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  {tokenExpired && (
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={<FacebookIcon />}
                      onClick={handleFacebookLogin}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        px: 2,
                        fontSize: '0.8125rem',
                      }}
                    >
                      Reconnect Account
                    </Button>
                  )}
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

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto', maxWidth: '100%' }}>
              <Table size="small" sx={{ minWidth: 680 }}>
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
                      <TableRow key={page.id} hover>
                        <TableCell sx={{ py: 1.75 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary">
                              {page.name}
                            </Typography>
                            <Box>
                              <Chip
                                icon={<DynamicFeedIcon sx={{ fontSize: '0.85rem !important' }} />}
                                label={`${page.formcount || page.form_data?.length || 0} Lead Forms Connected`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => setSelectedModalPage(page)}
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                  '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                  },
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
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Lead Form Routing Dialog Modal */}
            {selectedModalPage && (
              <FormModel
                open={Boolean(selectedModalPage)}
                onClose={() => setSelectedModalPage(null)}
                pageName={selectedModalPage.name}
                pageFormsData={selectedModalPage.form_data || []}
                pageId={selectedModalPage.id}
                allFacebookPages={fbConfig?.facebookPages || []}
                projectsList={projectsList}
                onSave={handleSavePageMappings}
              />
            )}
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
