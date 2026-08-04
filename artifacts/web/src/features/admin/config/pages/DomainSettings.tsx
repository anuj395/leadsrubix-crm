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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SaveIcon from '@mui/icons-material/Save'
import LanguageIcon from '@mui/icons-material/Language'
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

  const orgId = (user as any)?.organizationId || (user as any)?.organization_id

  const loadSettings = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await api.get(`organizations/${orgId}`)
      const data = res.data
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
  }, [orgId])

  const saveSettings = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      await api.put(`organizations/${orgId}`, {
        subdomain: form.subdomain.toLowerCase().trim() || undefined,
        customDomain: form.customDomain.toLowerCase().trim() || undefined,
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

                <Stack spacing={2}>
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
                </Stack>
              </CardContent>
            </Card>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
                onClick={saveSettings}
                disabled={saving}
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
