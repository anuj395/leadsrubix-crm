import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import FacebookIcon from '@mui/icons-material/Facebook'
import WebIcon from '@mui/icons-material/Web'
import ContactPageIcon from '@mui/icons-material/ContactPage'
import BusinessIcon from '@mui/icons-material/Business'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { AppCard } from '@/components/ui/AppCard'

interface IntegrationItem {
  key: string
  name: string
  description: string
  icon: React.ReactNode
  comingSoon?: boolean
}

const INTEGRATION_ITEMS: IntegrationItem[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Receive new leads from Facebook in your Leads Rubix account.',
    icon: <FacebookIcon sx={{ fontSize: 32, color: '#1877F2' }} />,
  },
  {
    key: '99acres',
    name: '99Acres',
    description: 'Receive new leads from 99Acres in your Leads Rubix account.',
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
    name: 'WhatsApp',
    description: 'Receive new leads from your WhatsApp contact form in your Leads Rubix account.',
    icon: <WhatsAppIcon sx={{ fontSize: 32, color: '#25D366' }} />,
    comingSoon: true,
  },
]

export default function IntegrationsPage() {
  const navigate = useNavigate()

  const handleConfigure = (key: string) => {
    if (key === 'facebook') {
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
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      <AppCard
        title="Third-Party Integrations"
        subtitle="Manage and configure active incoming data lead streams with advertising engines, listing portals, and messaging platforms."
      >
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {INTEGRATION_ITEMS.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.key}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 2,
                  boxShadow: 'rgba(100, 100, 111, 0.15) 0px 7px 29px 0px',
                  border: '1px solid #f0f0f0',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {item.icon}
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {item.name}
                      </Typography>
                    </Box>
                    {item.comingSoon && (
                      <Chip
                        label="Coming Soon"
                        size="small"
                        sx={{
                          bgcolor: '#FFF3CD',
                          color: '#856404',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderRadius: '8px',
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48, mb: 2 }}>
                    {item.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      color="primary"
                      disabled={item.comingSoon}
                      endIcon={<ArrowForwardIosIcon sx={{ fontSize: '10px !important' }} />}
                      onClick={() => handleConfigure(item.key)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Configure
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </AppCard>
    </Box>
  )
}
