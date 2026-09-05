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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CodeIcon from '@mui/icons-material/Code'
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { api } from '@/services/api'
import { AppCard } from '@/components/ui/AppCard'
import { useAppSelector } from '@/store/hooks'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`website-tabpanel-${index}`}
      aria-labelledby={`website-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
    </div>
  )
}

export default function WebsitePage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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
        title: 'Website Patient Integration',
        header: 'Stream Website Appointments Directly into Your CRM',
        subtitle: 'Connect your clinic/hospital website forms to automatically receive patient inquiries in real time.',
      };
    }
    if (indCode === 'temp0002') {
      return {
        title: 'Website Customer Integration',
        header: 'Stream Website Orders Directly into Your CRM',
        subtitle: 'Connect your store website contact forms to automatically capture customer inquiries in real time.',
      };
    }
    return {
      title: 'Website Lead Integration',
      header: 'Stream Website Inquiries Directly into Your CRM',
      subtitle: 'Connect any website contact form (WordPress, Elementor, CF7, Webflow, Wix) to automatically receive leads in real time.',
    };
  }, [indCode]);

  const webhookUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api/webhook/createContacts'
    : 'https://api1.leadsrubix.com/api/webhook/createContacts'

  const webhookUrlWithToken = apiKey ? `${webhookUrl}?token=${apiKey}` : webhookUrl

  const cf7PhpCode = `// Add this snippet to your theme's functions.php or Code Snippets plugin
add_action('wpcf7_before_send_mail', 'leadsrubix_cf7_integration');

function leadsrubix_cf7_integration($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if ($submission) {
        $posted_data = $submission->get_posted_data();
        
        $payload = array(
            'customer_name' => isset($posted_data['customer_name']) ? sanitize_text_field($posted_data['customer_name']) : (isset($posted_data['your-name']) ? sanitize_text_field($posted_data['your-name']) : 'Website Lead'),
            'contact_no'    => isset($posted_data['contact_no']) ? sanitize_text_field($posted_data['contact_no']) : (isset($posted_data['your-phone']) ? sanitize_text_field($posted_data['your-phone']) : ''),
            'email'         => isset($posted_data['email']) ? sanitize_email($posted_data['email']) : (isset($posted_data['your-email']) ? sanitize_email($posted_data['your-email']) : ''),
            'project'       => isset($posted_data['your-subject']) ? sanitize_text_field($posted_data['your-subject']) : 'Website Inquiry',
            'campaign'      => 'Website',
            'token'         => '${apiKey || 'YOUR_API_TOKEN'}'
        );

        wp_remote_post('${webhookUrl}', array(
            'method'      => 'POST',
            'headers'     => array('Content-Type' => 'application/json; charset=utf-8'),
            'body'        => json_encode($payload),
            'data_format' => 'body',
            'timeout'     => 15,
        ));
    }
}`

  const cf7FormHtml = `<label> Your Name
    [text* customer_name] </label>

<label> Your Email
    [email* email] </label>

<label> Your Phone Number
    [tel* contact_no] </label>

<label> Subject / Message
    [text your-subject] </label>

[submit "Submit Inquiry"]`

  const htmlJsCode = `<form id="crmLeadForm">
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="tel" name="phone" placeholder="Phone Number" required />
  <input type="text" name="project" placeholder="Requirement / Message" />
  <button type="submit">Submit Inquiry</button>
</form>

<script>
document.getElementById('crmLeadForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    project: formData.get('project') || 'Website Inquiry',
    campaign: 'Website',
    token: '${apiKey || 'YOUR_API_TOKEN'}'
  };

  try {
    const response = await fetch('${webhookUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === 'success' || response.ok) {
      alert('Thank you! Your inquiry has been submitted successfully.');
      this.reset();
    } else {
      alert('Error submitting form: ' + (result.message || 'Please try again.'));
    }
  } catch (err) {
    console.error('Submission Error:', err);
    alert('Something went wrong. Please try again later.');
  }
});
</script>`

  const phpCurlCode = `<?php
// Custom Backend PHP Script
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = array(
        'name'     => $_POST['name'] ?? 'Website Inquiry',
        'phone'    => $_POST['phone'] ?? '',
        'email'    => $_POST['email'] ?? '',
        'project'  => $_POST['project'] ?? 'Website Requirement',
        'campaign' => 'Website',
        'token'    => '${apiKey || 'YOUR_API_TOKEN'}'
    );

    $ch = curl_init('${webhookUrl}');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        echo "Lead submitted successfully to CRM!";
    } else {
        echo "Submission failed: " . $response;
    }
}
?>`

  const handleCopySnippet = (code: string, label: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(label)
    setToast({ open: true, msg: `${label} copied to clipboard!`, sev: 'success' })
    setTimeout(() => setCopiedCode(null), 1500)
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            Connect your business website to Leads Rubix in 3 easy steps. Works automatically with all website builders and custom code!
          </Typography>

          {/* Quick 3-Step Non-Technical Banner */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'primary.light', bgcolor: '#f0f7ff', mb: 3.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RocketLaunchIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                Simple 3-Step Setup for Website Owners
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', height: '100%' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                    STEP 1
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Copy Webhook Link
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 1 }}>
                    Copy your 1-click Webhook URL below (your API Token is automatically included).
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleCopySnippet(webhookUrlWithToken, '1-Click Webhook URL')}
                    fullWidth
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Copy 1-Click Link
                  </Button>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', height: '100%' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                    STEP 2
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Paste into Your Form
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                    Paste the link into Elementor, Contact Form 7, WPForms, Webflow, or forward it to your Web Developer.
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', height: '100%' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                    STEP 3
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Test & Receive Leads Live
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                    Submit a test inquiry on your website form. The lead will immediately pop up in your CRM panel!
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          {/* Master 1-Click Credentials Card */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
              Your Master Webhook Credentials
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8 }}>
                    1-Click Webhook URL (Recommended - API Token Included)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={webhookUrlWithToken}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => handleCopySnippet(webhookUrlWithToken, '1-Click Webhook URL')} size="small" edge="end">
                            <ContentCopyIcon fontSize="small" color={copiedCode === '1-Click Webhook URL' ? 'success' : 'action'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8 }}>
                    Website API Token
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={apiKey || 'Loading API token...'}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => handleCopySnippet(apiKey, 'API Token')} size="small" edge="end">
                            <ContentCopyIcon fontSize="small" color={copiedCode === 'API Token' ? 'success' : 'action'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Integration Guides Header & Tabs */}
          <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden', mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc', px: 2, pt: 1 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    py: 1.5,
                  },
                }}
              >
                <Tab icon={<IntegrationInstructionsIcon fontSize="small" />} iconPosition="start" label="Elementor Forms (WordPress)" />
                <Tab icon={<CodeIcon fontSize="small" />} iconPosition="start" label="Contact Form 7 (WordPress)" />
                <Tab icon={<RocketLaunchIcon fontSize="small" />} iconPosition="start" label="WPForms / Webflow / Wix / No-Code" />
                <Tab icon={<CodeIcon fontSize="small" />} iconPosition="start" label="Custom Code (HTML / JS / PHP)" />
              </Tabs>
            </Box>

            {/* TAB 0: Elementor Forms */}
            <CustomTabPanel value={activeTab} index={0}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Elementor Pro Form Integration Guide
                  </Typography>
                  <Chip label="WordPress Builder" color="primary" size="small" variant="outlined" />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Follow these step-by-step instructions inside your WordPress Elementor Page Builder:
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleOutlineIcon color="success" fontSize="small" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                            Step 1: Copy Elementor Webhook URL (Includes API Token)
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleCopySnippet(webhookUrlWithToken, 'Elementor Webhook URL')}>
                          <ContentCopyIcon fontSize="small" color={copiedCode === 'Elementor Webhook URL' ? 'success' : 'action'} />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Paste this complete Webhook URL directly in <b>Elementor Form</b> → <b>Actions After Submit</b> → <b>Webhook</b> → <b>Webhook URL</b>:
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={webhookUrlWithToken}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => handleCopySnippet(webhookUrlWithToken, 'Elementor Webhook URL')} size="small" edge="end">
                                <ContentCopyIcon fontSize="small" color={copiedCode === 'Elementor Webhook URL' ? 'success' : 'action'} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: '#f8fafc' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CheckCircleOutlineIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Step 2: Map Elementor Field IDs (Advanced Tab)
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        In Elementor Form → <b>Form Fields</b> → Edit each field → open <b>Advanced</b> tab → set <b>ID</b>:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0, fontSize: '0.85rem', color: 'text.secondary' }}>
                        <li>Name field ID: <code style={{ fontWeight: 700 }}>customer_name</code> or <code style={{ fontWeight: 700 }}>name</code></li>
                        <li>Phone field ID: <code style={{ fontWeight: 700 }}>contact_no</code> or <code style={{ fontWeight: 700 }}>phone</code></li>
                        <li>Email field ID: <code style={{ fontWeight: 700 }}>email</code></li>
                        <li>Project/Message field ID: <code style={{ fontWeight: 700 }}>project</code></li>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: '#f8fafc' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CheckCircleOutlineIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Step 3 (Optional): Campaign Hidden Field
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        To label your leads with a specific campaign source, add a <b>Hidden</b> field in Elementor:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ffffff' }}>
                        <Typography variant="body2"><b>Field Type:</b> Hidden</Typography>
                        <Typography variant="body2"><b>Advanced ID:</b> <code>campaign</code></Typography>
                        <Typography variant="body2"><b>Default Value:</b> <code>Website</code></Typography>
                      </Paper>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CustomTabPanel>

            {/* TAB 1: Contact Form 7 */}
            <CustomTabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Contact Form 7 (CF7) WordPress Integration
                  </Typography>
                  <Chip label="PHP Hook" color="secondary" size="small" variant="outlined" />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Integrate WordPress <b>Contact Form 7</b> directly using standard WordPress action hooks (`wpcf7_before_send_mail`).
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      1. Contact Form 7 Field Tags
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopySnippet(cf7FormHtml, 'CF7 Form HTML')}
                    >
                      <ContentCopyIcon fontSize="small" color={copiedCode === 'CF7 Form HTML' ? 'success' : 'action'} />
                    </IconButton>
                  </Box>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: 8,
                      padding: '12px 16px',
                      fontSize: '0.82rem',
                      overflowX: 'auto',
                      margin: 0,
                      fontFamily: 'Consolas, Monaco, monospace',
                    }}
                  >
                    {cf7FormHtml}
                  </pre>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      2. Copy PHP Hook into Theme `functions.php`
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopySnippet(cf7PhpCode, 'CF7 PHP Hook')}
                    >
                      <ContentCopyIcon fontSize="small" color={copiedCode === 'CF7 PHP Hook' ? 'success' : 'action'} />
                    </IconButton>
                  </Box>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: 8,
                      padding: '14px 16px',
                      fontSize: '0.82rem',
                      overflowX: 'auto',
                      margin: 0,
                      fontFamily: 'Consolas, Monaco, monospace',
                    }}
                  >
                    {cf7PhpCode}
                  </pre>
                </Box>
              </Box>
            </CustomTabPanel>

            {/* TAB 2: WPForms / Webflow / Wix / No-Code */}
            <CustomTabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    WPForms, Gravity Forms, Webflow, Wix & No-Code Builders
                  </Typography>
                  <Chip label="No Code Setup" color="success" size="small" variant="outlined" />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Connect any form builder or landing page software using your 1-Click Webhook URL:
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        WPForms / Gravity Forms / Forminator
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        1. Enable Webhooks extension in your form plugin settings.<br />
                        2. Set Request Method to <b>POST</b>.<br />
                        3. Request URL: Paste your <b>1-Click Webhook URL</b>.<br />
                        4. Map fields: <b>Name</b>, <b>Phone</b>, <b>Email</b>, <b>Message</b>.
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Webflow / Wix / Squarespace / Zapier / Make
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        1. In Webflow / Wix Form settings, select <b>Webhook Action</b>.<br />
                        2. Target Endpoint: Paste your <b>1-Click Webhook URL</b>.<br />
                        3. All form submissions will automatically flow directly into Leads Rubix without extra configuration.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CustomTabPanel>

            {/* TAB 3: Custom Code */}
            <CustomTabPanel value={activeTab} index={3}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Custom Website Integration (HTML, JS Fetch & Backend PHP)
                  </Typography>
                  <Chip label="Developer API" color="default" size="small" variant="outlined" />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Use any of the code snippets below for custom websites built with HTML/JS or PHP:
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Option A: HTML + JavaScript (Fetch API)
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopySnippet(htmlJsCode, 'HTML & JS')}
                    >
                      <ContentCopyIcon fontSize="small" color={copiedCode === 'HTML & JS' ? 'success' : 'action'} />
                    </IconButton>
                  </Box>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: 8,
                      padding: '14px 16px',
                      fontSize: '0.82rem',
                      overflowX: 'auto',
                      margin: 0,
                      fontFamily: 'Consolas, Monaco, monospace',
                    }}
                  >
                    {htmlJsCode}
                  </pre>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Option B: Backend PHP (cURL)
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopySnippet(phpCurlCode, 'PHP cURL')}
                    >
                      <ContentCopyIcon fontSize="small" color={copiedCode === 'PHP cURL' ? 'success' : 'action'} />
                    </IconButton>
                  </Box>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: 8,
                      padding: '14px 16px',
                      fontSize: '0.82rem',
                      overflowX: 'auto',
                      margin: 0,
                      fontFamily: 'Consolas, Monaco, monospace',
                    }}
                  >
                    {phpCurlCode}
                  </pre>
                </Box>
              </Box>
            </CustomTabPanel>
          </Paper>

          {/* Non-Technical Troubleshooting Card */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.300', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpOutlineIcon color="action" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Troubleshooting & Submission Logs
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AssessmentIcon fontSize="small" />}
                onClick={() => navigate('/integrations/api-data')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View Webhook Transaction Logs
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Want to check if your website forms are sending data correctly? Click <b>View Webhook Transaction Logs</b> to inspect real-time transaction logs, payloads, and status reports for every incoming submission.
            </Typography>
          </Paper>
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
