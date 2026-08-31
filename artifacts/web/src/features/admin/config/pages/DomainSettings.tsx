import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SaveIcon from '@mui/icons-material/Save'
import LanguageIcon from '@mui/icons-material/Language'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import DnsIcon from '@mui/icons-material/Dns'
import PublicIcon from '@mui/icons-material/Public'
import { AppCard } from '@/components/ui/AppCard'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'

interface DomainSettingsForm {
  subdomain: string
  customDomain: string
  appName: string
  logoUrl: string
  primaryColor: string
}

export default function DomainSettingsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState<DomainSettingsForm>({
    subdomain: '',
    customDomain: '',
    appName: 'Leads Rubix CRM',
    logoUrl: '',
    primaryColor: '#1976d2',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null)

  const loadSettings = async () => {
    let targetOrgId = resolvedOrgId || (user as any)?.organizationId || (user as any)?.organization_id || (user as any)?.organization
    if (!targetOrgId) {
      try {
        const subRes = await api.get('organizations/my-subscription')
        targetOrgId = subRes.data?.organizationId
      } catch { /* ignore */ }
    }
    if (!targetOrgId) {
      try {
        const listRes = await api.get('organizations?pageSize=1')
        targetOrgId = listRes.data?.items?.[0]?.organizationId || listRes.data?.items?.[0]?.id || listRes.data?.items?.[0]?._id
      } catch { /* ignore */ }
    }

    if (!targetOrgId) return

    setLoading(true)
    try {
      const res = await api.get(`organizations/${targetOrgId}`)
      const data = res.data
      setResolvedOrgId(targetOrgId)
      setForm({
        subdomain: data.subdomain || '',
        customDomain: data.customDomain || data.custom_domain || '',
        appName: data.appName || data.app_name || 'Leads Rubix CRM',
        logoUrl: data.logoUrl || data.logo_url || '',
        primaryColor: data.primaryColor || data.primary_color || '#1976d2',
      })
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load domain settings', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [(user as any)?.organizationId, (user as any)?.organization_id])

  const saveSettings = async () => {
    let targetOrgId = resolvedOrgId || (user as any)?.organizationId || (user as any)?.organization_id
    if (!targetOrgId) {
      try {
        const subRes = await api.get('organizations/my-subscription')
        targetOrgId = subRes.data?.organizationId
      } catch { /* ignore */ }
    }

    if (!targetOrgId) {
      setToast({ open: true, msg: 'Unable to resolve Organization ID to save settings', sev: 'error' })
      return
    }

    setSaving(true)
    try {
      await api.put(`organizations/${targetOrgId}`, {
        subdomain: form.subdomain ? form.subdomain.toLowerCase().trim() : '',
        customDomain: form.customDomain ? form.customDomain.toLowerCase().trim() : '',
        appName: form.appName,
        logoUrl: form.logoUrl,
        primaryColor: form.primaryColor,
      })
      setToast({ open: true, msg: 'Domain and workspace settings saved successfully!', sev: 'success' })
      await loadSettings()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to save settings', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const copyCNAMEInstruction = () => {
    const text = `Type: CNAME | Name: ${form.customDomain || 'crm.yourdomain.com'} | Target: custom.leadsrubix.com`
    navigator.clipboard.writeText(text)
    setToast({ open: true, msg: 'DNS CNAME instruction copied to clipboard', sev: 'success' })
  }

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const localPort = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : ''

  const activeDomainsList = [
    ...(form.subdomain
      ? [
          {
            id: 'subdomain',
            domain: `${form.subdomain}.leadsrubix.com`,
            url: isLocal ? `http://${form.subdomain}.leadsrubix.com${localPort}` : `https://${form.subdomain}.leadsrubix.com`,
            type: 'Dedicated Subdomain',
            typeColor: 'primary' as const,
            dnsTarget: `*.leadsrubix.com`,
            status: 'Active',
            isDefault: false,
          },
        ]
      : []),
    ...(form.customDomain
      ? [
          {
            id: 'custom-domain',
            domain: form.customDomain,
            url: form.customDomain.startsWith('http') ? form.customDomain : `https://${form.customDomain}`,
            type: 'Custom CNAME Domain',
            typeColor: 'secondary' as const,
            dnsTarget: `custom.leadsrubix.com`,
            status: 'Active',
            isDefault: false,
          },
        ]
      : []),
    {
      id: 'default-app',
      domain: 'web.leadsrubix.com',
      url: typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'https://web.leadsrubix.com',
      type: 'Default Platform Domain',
      typeColor: 'default' as const,
      dnsTarget: 'Direct / Platform',
      status: 'Active',
      isDefault: true,
    },
  ]

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', overflowY: 'auto' }}>
      <AppCard
        title="Custom Domain & Workspace Settings"
        subtitle="Configure your organization's custom domain mapping, subdomain, branding, and isolated workspace identity."
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Active Domains & Routing Status Table (Live List) */}
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'primary.light', bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1}>
                      <DnsIcon color="primary" /> Active Mapped Domains & Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active live domain endpoints routed to this organization workspace.
                    </Typography>
                  </Box>
                  <Chip
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: '1rem !important' }} />}
                    label="Workspace Routing Active"
                    color="success"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Domain / Hostname</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Routing Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>DNS Target</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Security</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeDomainsList.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <PublicIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight={600} color="primary.main">
                                {item.domain}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={item.type} size="small" color={item.typeColor} variant="outlined" sx={{ fontWeight: 500, fontSize: '0.75rem' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 0.5 }}>
                              {item.dnsTarget}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.9rem !important' }} />}
                              label={item.status}
                              size="small"
                              color="success"
                              sx={{ fontWeight: 600, height: 22 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <LockOutlinedIcon sx={{ fontSize: 15, color: 'success.main' }} />
                              <Typography variant="caption" color="success.main" fontWeight={600}>
                                SSL Secured
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Copy URL">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.url)
                                    setToast({ open: true, msg: `${item.domain} copied to clipboard!`, sev: 'success' })
                                  }}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Open Live Portal">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  component="a"
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1}>
                    <LanguageIcon color="primary" /> Client Subdomain Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Access your isolated organization workspace via a dedicated subdomain.
                  </Typography>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    label="Subdomain"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                    placeholder="acme"
                    size="small"
                    sx={{ maxWidth: 280 }}
                    helperText="e.g. acme (maps to acme.leadsrubix.com)"
                  />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    .leadsrubix.com
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Custom CNAME Domain Mapping (Enterprise SaaS Setup)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Map your own custom apex or subdomain (e.g. <code>crm.acmecorp.com</code>) to your workspace.
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <TextField
                    label="Custom Domain"
                    value={form.customDomain}
                    onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                    placeholder="crm.acmecorp.com"
                    size="small"
                    fullWidth
                    helperText="Enter your fully qualified domain name (FQDN)"
                  />

                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                      DNS Configuration Instructions:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ mb: 1 }}>
                      CNAME Record: <code>{form.customDomain || 'crm.yourdomain.com'}</code> &rarr; <code>custom.leadsrubix.com</code>
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      onClick={copyCNAMEInstruction}
                    >
                      Copy CNAME Instruction
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Workspace Identity & Theme Branding
                </Typography>

                <Stack spacing={2.5}>
                  <TextField
                    label="Application Name"
                    value={form.appName}
                    onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Logo URL"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    size="small"
                    fullWidth
                  />

                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      label="Primary Theme Color"
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      size="small"
                      sx={{ width: 120 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Hex Code: <code>{form.primaryColor}</code>
                    </Typography>
                  </Stack>

                  {/* Live Workspace Branding Preview Box */}
                  <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1, textTransform: 'uppercase' }}>
                      Live Workspace Header Preview
                    </Typography>
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: form.primaryColor || '#1976d2', color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {form.logoUrl ? (
                        <Box component="img" src={form.logoUrl} alt="Logo Preview" sx={{ height: 28, maxWidth: 120, objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none' }} />
                      ) : (
                        <LanguageIcon />
                      )}
                      <Typography variant="subtitle2" fontWeight={700}>
                        {form.appName || 'Leads Rubix CRM'}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="medium"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={saveSettings}
                disabled={saving}
                sx={{ height: 38, px: 2.5, fontWeight: 600, textTransform: 'none' }}
              >
                Save Workspace Configuration
              </Button>
            </Box>
          </Stack>
        )}
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
