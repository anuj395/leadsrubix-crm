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
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
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
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Facebook Connected Account
              </Typography>
              <Button variant="outlined" color="error" size="small" onClick={handleFacebookLogout}>
                LogOut
              </Button>
            </Box>

            {userData && (
              <Card sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 4, borderRadius: 2, border: '1px solid #f0f0f0' }}>
                <img
                  src={userData.picture?.data?.url}
                  alt={userData.name}
                  style={{ width: 50, height: 50, borderRadius: '50%' }}
                />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {userData.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                    Connected
                  </Typography>
                </Box>
              </Card>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Connected Pages ({activePages.length})
              </Typography>
              <Button variant="text" size="small" onClick={handleFacebookLogin} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Manage Facebook Pages
              </Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePages.map((page) => (
                  <React.Fragment key={page.id}>
                    <TableRow>
                      <TableCell>{page.id}</TableCell>
                      <TableCell>{page.category}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {page.name}
                          </Typography>
                          <Link
                            component="button"
                            variant="caption"
                            onClick={() => setExpandedId(expandedId === page.id ? null : page.id)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, textAlign: 'left', fontWeight: 600 }}
                          >
                            {page.formcount} lead forms connected
                            {expandedId === page.id ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                          </Link>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button color="error" size="small" onClick={() => handleUnsubscribe(page.id)} sx={{ textTransform: 'none' }}>
                          remove
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expandedId === page.id && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ bgcolor: '#fafafa', p: 0 }}>
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
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ maxWidth: 450 }}>
              Receive new leads from your Facebook Lead Ads directly in your Leads Rubix account.
            </Typography>
            <Button
              variant="contained"
              onClick={handleFacebookLogin}
              sx={{
                bgcolor: '#1877F2',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1,
                borderRadius: 2,
                '&:hover': { bgcolor: '#166FE5' },
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
