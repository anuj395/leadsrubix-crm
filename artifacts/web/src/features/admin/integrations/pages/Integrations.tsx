import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import FacebookIcon from '@mui/icons-material/Facebook'
import WebIcon from '@mui/icons-material/Web'
import ContactPageIcon from '@mui/icons-material/ContactPage'
import BusinessIcon from '@mui/icons-material/Business'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import HubIcon from '@mui/icons-material/Hub'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'

interface IntegrationItem {
  key: string
  name: string
  description: string
  icon: React.ReactNode
  comingSoon?: boolean
}

const INTEGRATION_ITEMS: IntegrationItem[] = [
  {
    key: 'ivr',
    name: 'Cloud Telephony & IVR',
    description: 'Connect multiple cloud telephony lines (Tata Smartflo, TeleCMI, Exotel, MyOperator, PBX) for real-time inbound call capture into Inbound Inquiries, intelligent agent routing, and Call Logs with recordings.',
    icon: <PhoneInTalkIcon sx={{ fontSize: 32, color: '#7C3AED' }} />,
  },
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Receive new leads from Facebook in your Leads Rubix account.',
    icon: <FacebookIcon sx={{ fontSize: 32, color: '#1877F2' }} />,
  },
  {
    key: '99acres',
    name: '99 Acres',
    description: 'Receive new leads from 99 Acres in your Leads Rubix account.',
    icon: <BusinessIcon sx={{ fontSize: 32, color: '#FF8F00' }} />,
  },
  {
    key: 'magicbricks',
    name: 'MagicBricks',
    description: 'Receive new leads from MagicBricks in your Leads Rubix account.',
    icon: <ContactPageIcon sx={{ fontSize: 32, color: '#E53935' }} />,
  },
  {
    key: 'housing',
    name: 'Housing.com',
    description: 'Receive new leads from Housing.com in your Leads Rubix account.',
    icon: <BusinessIcon sx={{ fontSize: 32, color: '#00ACC1' }} />,
  },
  {
    key: 'justdial',
    name: 'JustDial',
    description: 'Receive new leads from JustDial in your Leads Rubix account.',
    icon: <ContactPageIcon sx={{ fontSize: 32, color: '#F4511E' }} />,
  },
  {
    key: 'sulekha',
    name: 'Sulekha',
    description: 'Receive new leads from Sulekha in your Leads Rubix account.',
    icon: <ContactPageIcon sx={{ fontSize: 32, color: '#3949AB' }} />,
  },
  {
    key: 'website',
    name: 'Website',
    description: 'Receive new leads from your website’s contact form in your Leads Rubix account.',
    icon: <WebIcon sx={{ fontSize: 32, color: '#43A047' }} />,
  },
  {
    key: 'whatsapp',
    name: 'Notification Hub & Automation',
    description: 'Universal notification engine: multi-channel alerts (WhatsApp, Email, Push, Bell), dynamic templates & CRM routing rules.',
    icon: <HubIcon sx={{ fontSize: 32, color: '#2563EB' }} />,
  },
]

export default function IntegrationsPage() {
  const navigate = useNavigate()
  const [fbConnected, setFbConnected] = useState<boolean>(false)
  const [waConnected, setWaConnected] = useState<boolean>(false)
  const [activeTokens, setActiveTokens] = useState<any[]>([])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [resFb, resTokens, resWa] = await Promise.allSettled([
          api.get('/api-tokens/facebook'),
          api.get('/api-tokens'),
          api.get('/whatsapp-config'),
        ])

        if (resFb.status === 'fulfilled') {
          const d = resFb.value.data
          const hasToken = Boolean(d?.accessToken && String(d?.accessToken).trim() !== '')
          const hasPages = Array.isArray(d?.facebookPages) && d.facebookPages.length > 0
          setFbConnected(Boolean(hasToken && hasPages))
        }

        if (resTokens.status === 'fulfilled' && Array.isArray(resTokens.value.data)) {
          setActiveTokens(resTokens.value.data)
        }

        if (resWa.status === 'fulfilled' && resWa.value.data) {
          const d = resWa.value.data
          const isSimply = d.simply?.active && Boolean(d.simply?.accessToken)
          const isWapi = d.wapi?.active && Boolean(d.wapi?.wapi_token)
          const isChat = d.chatSimplified?.active
          setWaConnected(Boolean(isSimply || isWapi || isChat))
        }
      } catch (err) {
        console.warn('Could not fetch integration status:', err)
      }
    }
    void fetchStatus()
  }, [])

  const norm = (s: any) => String(s || '').toLowerCase().replace(/[\s\-_.]/g, '')

  const isPortalConnected = (key: string) => {
    if (key === 'whatsapp') {
      return Boolean(waConnected)
    }
    // Facebook is ONLY connected if user has completed Facebook OAuth login AND connected pages
    if (key === 'facebook') {
      return Boolean(fbConnected)
    }

    const matchSource = (sourceName: string) => {
      const n = norm(sourceName)
      if (key === 'ivr') return n.includes('ivr') || n.includes('telephony') || n.includes('exotel') || n.includes('mcube')
      if (key === '99acres') return n.includes('99acre') || n.includes('acres')
      if (key === 'magicbricks') return n.includes('magicbrick')
      if (key === 'housing') return n.includes('housing')
      if (key === 'justdial') return n.includes('justdial')
      if (key === 'sulekha') return n.includes('sulekha')
      if (key === 'website') return n.includes('website')
      return false
    }

    const matchingToken = activeTokens.find((t: any) => matchSource(t.source))
    // Portal is Connected ONLY IF active AND has verified inbound lead traffic / webhook activity
    return Boolean(
      matchingToken &&
      (matchingToken.status === 'ACTIVE' || matchingToken.status === 'Active') &&
      (matchingToken.hasTraffic === true || matchingToken.leadCount > 0)
    )
  }

  const handleConfigure = (key: string) => {
    if (key === 'whatsapp' || key === 'notifications') {
      navigate('/configuration/notifications')
    } else if (key === 'ivr') {
      navigate('/integrations/ivr')
    } else if (key === 'facebook') {
      navigate('/integrations/facebook')
    } else if (key === '99acres') {
      navigate('/integrations/99acres')
    } else if (key === 'magicbricks') {
      navigate('/integrations/magicbricks')
    } else if (key === 'housing') {
      navigate('/integrations/housing')
    } else if (key === 'justdial') {
      navigate('/integrations/justdial')
    } else if (key === 'sulekha') {
      navigate('/integrations/sulekha')
    } else if (key === 'website') {
      navigate('/integrations/website')
    } else {
      navigate('/integrations/api')
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        pb: { xs: 8, sm: 10 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
      }}
    >
      <AppCard
        title="Third-Party Integrations"
        subtitle="Manage and configure active incoming data lead streams with advertising engines, listing portals, and messaging platforms."
        sx={{ overflow: 'visible' }}
      >
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 2 }} sx={{ mt: 0.5 }}>
          {INTEGRATION_ITEMS.map((item) => {
            const isConnected = isPortalConnected(item.key)

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, xl: 3 }} key={item.key}>
                <Card
                  onClick={() => !item.comingSoon && handleConfigure(item.key)}
                  sx={{
                    height: '100%',
                    minHeight: 148,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: '12px',
                    boxShadow: 'rgba(100, 100, 111, 0.08) 0px 4px 16px 0px',
                    border: isConnected ? '1.5px solid #22C55E' : '1px solid #E2E8F0',
                    transition: 'all 0.2s ease',
                    cursor: item.comingSoon ? 'default' : 'pointer',
                    '&:hover': item.comingSoon ? {} : {
                      transform: 'translateY(-2px)',
                      boxShadow: 'rgba(100, 100, 111, 0.16) 0px 8px 24px 0px',
                      borderColor: isConnected ? '#16A34A' : 'primary.main',
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 2,
                      pb: '16px !important',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 1.5, bgcolor: 'action.hover', flexShrink: 0 }}>
                            {item.icon}
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }} noWrap>
                            {item.name}
                          </Typography>
                        </Box>
                        {item.comingSoon ? (
                          <Chip
                            label="Coming Soon"
                            size="small"
                            sx={{
                              bgcolor: '#FFF3CD',
                              color: '#856404',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                              borderRadius: '6px',
                            }}
                          />
                        ) : isConnected ? (
                          <Chip
                            icon={<CheckCircleRoundedIcon sx={{ fontSize: '0.8rem !important', color: '#16A34A !important' }} />}
                            label="Connected"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(34, 197, 94, 0.12)',
                              color: '#16A34A',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 22,
                              borderRadius: '6px',
                            }}
                          />
                        ) : item.key === 'whatsapp' ? (
                          <Chip
                            label="Config Required"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(245, 158, 11, 0.12)',
                              color: '#D97706',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                              borderRadius: '6px',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Configure"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(245, 158, 11, 0.12)',
                              color: '#D97706',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                              borderRadius: '6px',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.785rem',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mt: 0.5,
                          mb: 1.5,
                        }}
                      >
                        {item.description}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                      <Button
                        size="small"
                        color={isConnected ? 'success' : 'primary'}
                        disabled={item.comingSoon}
                        endIcon={<ArrowForwardIosIcon sx={{ fontSize: '9px !important' }} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConfigure(item.key)
                        }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          p: 0,
                          minWidth: 'auto',
                          color: isConnected ? '#16A34A' : 'primary.main',
                        }}
                      >
                        {isConnected ? 'Connected' : 'Configure'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </AppCard>
    </Box>
  )
}
