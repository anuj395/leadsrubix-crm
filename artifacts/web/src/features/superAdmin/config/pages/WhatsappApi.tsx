import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SendIcon from '@mui/icons-material/Send'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import api from '@/services/axiosInstance'

import { useAppSelector } from '@/store/hooks'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

interface WhatsAppConfig {
  type: string
  url: string
  isActive: boolean
  incomingJson?: string
  transferJson?: string
  fields: Record<string, string>
}

const DEFAULT_CONFIGS: Record<string, WhatsAppConfig> = {
  simply_whatsapp: {
    type: 'Simply WhatsApp',
    url: 'https://app.simplywhatsapp.com/api/send',
    isActive: false,
    fields: {
      instanceId: '',
      accessToken: '',
      url: 'https://app.simplywhatsapp.com/api/send',
    },
  },
  wapi: {
    type: 'WHAPI',
    url: 'https://gate.whapi.cloud',
    isActive: false,
    fields: {
      wapiUrl: 'https://gate.whapi.cloud',
      wapiToken: '',
    },
  },
  chatsimplified: {
    type: 'ChatSimplified',
    url: 'https://www.chatsimplified.co/api/v1/',
    isActive: false,
    fields: {
      apiKey: '',
      baseUrl: 'https://www.chatsimplified.co/api/v1/',
    },
  },
}

const JSON_PAYLOADS = {
  simply_whatsapp: {
    incoming: {
      "Customer Name" : "customer_name",
      "Contact Number" : "contact_no",
      "Alternate Number" : "alternate_no",
      "Country Code" : "country_code",
      "Lead Type" : "lead_type",
      "Email": "email",
      "Lead Source": "lead_source",
      "Organization Name": "organizationName",
      "Message": "Please check your leads in CRM on daily basis, As WhatsApp notifications gets\n\nfail sometimes due to network connections \n\nDo"
    },
    transfer: {
      "Customer Name" : "customer_name",
      "Contact Number" : "contact_no",
      "Alternate Number" : "alternate_no",
      "Country Code" : "country_code",
      "Lead Type" : "lead_type",
      "Email": "email",
      "Lead Source": "lead_source",
      "Organization Name": "organizationName",
      "Message": "Hii"
    }
  },
  wapi: {
    incoming: {
      "Customer Name" : "customer_name",
      "Contact Number" : "contact_no",
      "Alternate Number" : "alternate_no",
      "Country Code" : "country_code",
      "Lead Type" : "lead_type",
      "Email": "email",
      "Lead Source": "lead_source",
      "Organization Name": "organizationName",
      "Message": "Hii dear"
    },
    transfer: {
      "Customer Name" : "customer_name",
      "Contact Number" : "contact_no",
      "Alternate Number" : "alternate_no",
      "Country Code" : "country_code",
      "Lead Type" : "lead_type",
      "Email": "email",
      "Lead Source": "lead_source",
      "Organization Name": "organizationName",
      "Message": "Hi abcd"
    }
  },
  chatsimplified: {
    incoming: {
      "Contact Number": "contact_no",
      "Template Name": "",
      "Template Language": "en"
    },
    transfer: {
      "Contact Number": "contact_no",
      "Template Name": "",
      "Template Language": "en"
    }
  }
}

export default function WhatsappApiPage() {
  const user = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
  } = useSuperAdminScope(isSuperAdmin)

  const PLACEHOLDER_TAGS = [
    'customer_name',
    'contact_no',
    'alternate_no',
    'country_code',
    'lead_type',
    'email',
    'lead_source',
    'project',
    'assigned_agent',
    'organizationName'
  ]

  const [configs, setConfigs] = useState<Record<string, WhatsAppConfig>>(DEFAULT_CONFIGS)
  const [activeView, setActiveView] = useState<'list' | 'simply_whatsapp' | 'wapi' | 'chatsimplified'>('list')
  const [isFormActive, setIsFormActive] = useState(false)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [incomingMessage, setIncomingMessage] = useState("")
  const [transferMessage, setTransferMessage] = useState("")
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('Hello from Leads Rubix CRM! Your WhatsApp integration is working. 🚀')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Reset active configuration when organization or industry scope changes
  useEffect(() => {
    setActiveView('list')
    setTestResult(null)
  }, [selectedOrg, selectedIndustry])

  const mapResponseData = (data: any) => {
    if (!data) return
    setConfigs({
      simply_whatsapp: {
        type: 'Simply WhatsApp',
        url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
        isActive: Boolean(data.simply?.active),
        incomingJson: data.simply?.incoming_json || data.simply?.incomingJson,
        transferJson: data.simply?.transfer_json || data.simply?.transferJson,
        fields: {
          instanceId: data.simply?.instanceId || data.simply?.instance_id || '',
          accessToken: data.simply?.accessToken || data.simply?.access_token || '',
          url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
        }
      },
      wapi: {
        type: 'WHAPI',
        url: data.wapi?.wapiUrl || data.wapi?.wapi_url || 'https://gate.whapi.cloud',
        isActive: Boolean(data.wapi?.active),
        incomingJson: data.wapi?.incoming_json || data.wapi?.incomingJson,
        transferJson: data.wapi?.transfer_json || data.wapi?.transferJson,
        fields: {
          wapiUrl: data.wapi?.wapiUrl || data.wapi?.wapi_url || 'https://gate.whapi.cloud',
          wapiToken: data.wapi?.wapiToken || data.wapi?.wapi_token || '',
        }
      },
      chatsimplified: {
        type: 'ChatSimplified',
        url: data.chatSimplified?.url || data.chat_simplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
        isActive: Boolean(data.chatSimplified?.active || data.chat_simplified?.active),
        incomingJson: data.chatSimplified?.incoming_json || data.chat_simplified?.incoming_json || data.chatSimplified?.incomingJson,
        transferJson: data.chatSimplified?.transfer_json || data.chat_simplified?.transfer_json || data.chatSimplified?.transferJson,
        fields: {
          apiKey: data.chatSimplified?.apiKey || data.chatSimplified?.api_key || data.chat_simplified?.api_key || '',
          baseUrl: data.chatSimplified?.url || data.chat_simplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
        }
      }
    })
  }

  const loadConfig = async (orgId?: string) => {
    try {
      const activeOrg = orgId || selectedOrg
      const params = activeOrg ? `?organizationId=${activeOrg}` : ''
      const response = await api.get(`/whatsapp-config${params}`)
      if (response.data) {
        mapResponseData(response.data)
      }
    } catch (e) {
      console.error('Error loading WhatsApp configs from server', e)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && (!selectedIndustry || !selectedOrg)) return
    void loadConfig(selectedOrg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry, selectedOrg, isSuperAdmin])

  const handleToggle = async (key: string) => {
    const nextActive = !configs[key].isActive

    // Build payload preserving all current credentials and activating only the toggled provider
    const payload = {
      organizationId: selectedOrg,
      industryId: selectedIndustry,
      simply: {
        url: configs.simply_whatsapp.fields.url,
        instance_id: configs.simply_whatsapp.fields.instanceId,
        access_token: configs.simply_whatsapp.fields.accessToken,
        instanceId: configs.simply_whatsapp.fields.instanceId,
        accessToken: configs.simply_whatsapp.fields.accessToken,
        incoming_json: configs.simply_whatsapp.incomingJson,
        transfer_json: configs.simply_whatsapp.transferJson,
        active: key === 'simply_whatsapp' ? nextActive : false,
      },
      wapi: {
        wapi_url: configs.wapi.fields.wapiUrl,
        wapi_token: configs.wapi.fields.wapiToken,
        wapiUrl: configs.wapi.fields.wapiUrl,
        wapiToken: configs.wapi.fields.wapiToken,
        incoming_json: configs.wapi.incomingJson,
        transfer_json: configs.wapi.transferJson,
        active: key === 'wapi' ? nextActive : false,
      },
      chatSimplified: {
        url: configs.chatsimplified.fields.baseUrl,
        api_key: configs.chatsimplified.fields.apiKey,
        apiKey: configs.chatsimplified.fields.apiKey,
        incoming_json: configs.chatsimplified.incomingJson,
        transfer_json: configs.chatsimplified.transferJson,
        active: key === 'chatsimplified' ? nextActive : false,
      }
    }

    try {
      const response = await api.post(`/whatsapp-config?organizationId=${selectedOrg || ''}`, payload)
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: `WhatsApp integration status updated!`,
        sev: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        msg: err.response?.data?.message || 'Error updating status',
        sev: 'error',
      })
    }
  }

  const handleConfigureClick = (key: 'simply_whatsapp' | 'wapi' | 'chatsimplified') => {
    setEditFields(configs[key].fields)
    setIsFormActive(Boolean(configs[key].isActive))
    setIncomingMessage(configs[key].incomingJson || JSON.stringify(JSON_PAYLOADS[key].incoming, null, 2))
    setTransferMessage(configs[key].transferJson || JSON.stringify(JSON_PAYLOADS[key].transfer, null, 2))
    setTestResult(null)
    setActiveView(key)
  }

  const handleFieldChange = (fieldKey: string, val: string) => {
    setEditFields((prev) => ({
      ...prev,
      [fieldKey]: val,
    }))
  }

  const handleSaveConfig = async () => {
    if (activeView === 'list') return
    const key = activeView

    // Validate required fields
    for (const [fKey, fVal] of Object.entries(editFields)) {
      if (!fVal || !fVal.trim()) {
        setToast({
          open: true,
          msg: 'Please fill all required configuration fields',
          sev: 'error',
        })
        return
      }
    }

    // Defensive JSON validation
    try {
      if (incomingMessage.trim().startsWith('{')) JSON.parse(incomingMessage.trim())
      if (transferMessage.trim().startsWith('{')) JSON.parse(transferMessage.trim())
    } catch (jsonErr: any) {
      setToast({
        open: true,
        msg: 'Invalid JSON payload in templates: ' + jsonErr.message,
        sev: 'error',
      })
      return
    }

    let payload: any = {
      organizationId: selectedOrg,
      industryId: selectedIndustry,
    }

    if (key === 'simply_whatsapp') {
      payload.simply = {
        url: editFields.url.trim(),
        instance_id: editFields.instanceId.trim(),
        access_token: editFields.accessToken.trim(),
        instanceId: editFields.instanceId.trim(),
        accessToken: editFields.accessToken.trim(),
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
        active: isFormActive,
      }
      if (isFormActive) {
        payload.wapi = { active: false }
        payload.chatSimplified = { active: false }
      }
    } else if (key === 'wapi') {
      payload.wapi = {
        wapi_url: editFields.wapiUrl.trim().replace(/\/+$/, ''),
        wapi_token: editFields.wapiToken.trim(),
        wapiUrl: editFields.wapiUrl.trim().replace(/\/+$/, ''),
        wapiToken: editFields.wapiToken.trim(),
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
        active: isFormActive,
      }
      if (isFormActive) {
        payload.simply = { active: false }
        payload.chatSimplified = { active: false }
      }
    } else if (key === 'chatsimplified') {
      payload.chatSimplified = {
        url: editFields.baseUrl.trim(),
        api_key: editFields.apiKey.trim(),
        apiKey: editFields.apiKey.trim(),
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
        active: isFormActive,
      }
      if (isFormActive) {
        payload.simply = { active: false }
        payload.wapi = { active: false }
      }
    }

    try {
      const response = await api.post(`/whatsapp-config?organizationId=${selectedOrg || ''}`, payload)
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: 'WhatsApp configuration saved successfully!',
        sev: 'success',
      })
      setActiveView('list')
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        msg: err.response?.data?.message || 'Error updating config',
        sev: 'error',
      })
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      setTestResult({ success: false, msg: 'Please enter a recipient mobile number (e.g. 919876543210).' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const key = activeView
      let testCredentials: any = null
      if (key === 'wapi') {
        testCredentials = {
          wapi_url: (editFields.wapiUrl || '').trim().replace(/\/+$/, ''),
          wapi_token: (editFields.wapiToken || '').trim(),
        }
      } else if (key === 'simply_whatsapp') {
        testCredentials = {
          url: (editFields.url || '').trim(),
          instance_id: (editFields.instanceId || '').trim(),
          access_token: (editFields.accessToken || '').trim(),
        }
      } else if (key === 'chatsimplified') {
        testCredentials = {
          url: (editFields.baseUrl || '').trim(),
          api_key: (editFields.apiKey || '').trim(),
        }
      }

      const response = await api.post('/whatsapp-config/test', {
        organizationId: selectedOrg,
        recipientPhone: testPhone.trim(),
        message: testMsg.trim(),
        provider: key === 'simply_whatsapp' ? 'simply' : key,
        testCredentials
      })

      setTestResult({
        success: true,
        msg: response.data?.message || 'Test WhatsApp message sent successfully! 🚀'
      })
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to dispatch test WhatsApp message'
      setTestResult({
        success: false,
        msg: errorMsg
      })
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setToast({
      open: true,
      msg: 'Copied successfully!',
      sev: 'success',
    })
  }

  const rows = useMemo(() => [
    { id: 'simply_whatsapp', type: configs.simply_whatsapp.type, url: configs.simply_whatsapp.url, isActive: configs.simply_whatsapp.isActive },
    { id: 'wapi', type: configs.wapi.type, url: configs.wapi.url, isActive: configs.wapi.isActive },
    { id: 'chatsimplified', type: configs.chatsimplified.type, url: configs.chatsimplified.url, isActive: configs.chatsimplified.isActive },
  ], [configs])

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'type',
        headerName: 'Type',
        flex: 1,
        minWidth: 150,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'url',
        headerName: 'Url',
        flex: 2,
        minWidth: 300,
        renderCell: (p) => (
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'text.secondary' }}>
            {p.value}
          </Box>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Deactivate / Activate',
        width: 200,
        align: 'center',
        headerAlign: 'center',
        renderCell: (p) => (
          <Switch
            checked={p.value}
            onChange={() => handleToggle(p.id as string)}
            sx={{
              '& .MuiSwitch-switchBase': {
                color: '#fff',
                '&.Mui-checked': {
                  color: '#fff',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#22c55e',
                    opacity: 1,
                  },
                },
              },
              '& .MuiSwitch-track': {
                backgroundColor: '#e0e0e0',
                opacity: 1,
              },
            }}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Configuration',
        width: 150,
        align: 'center',
        headerAlign: 'center',
        renderCell: (p) => (
          <Button
            variant="contained"
            size="small"
            onClick={() => handleConfigureClick(p.id as 'simply_whatsapp' | 'wapi' | 'chatsimplified')}
            sx={{
              backgroundColor: '#181620',
              color: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#2b2938',
              },
            }}
          >
            Configure
          </Button>
        ),
      },
    ],
    [rows]
  )

  if (activeView !== 'list') {
    const key = activeView
    const isSimply = key === 'simply_whatsapp'
    const isWapi = key === 'wapi'
    const isChatSimplified = key === 'chatsimplified'

    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setActiveView('list')}
            startIcon={<ArrowBackIcon />}
            sx={{
              borderColor: '#181620',
              color: '#181620',
              '&:hover': {
                borderColor: '#2b2938',
                backgroundColor: 'rgba(24, 22, 32, 0.04)',
              },
            }}
          >
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#181620' }}>
            {configs[key].type} Configuration
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isFormActive}
                onChange={(e) => setIsFormActive(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    color: '#fff',
                    '&.Mui-checked': {
                      color: '#fff',
                      '& + .MuiSwitch-track': {
                        backgroundColor: '#22c55e',
                        opacity: 1,
                      },
                    },
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: '#e0e0e0',
                    opacity: 1,
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {isFormActive ? 'Active Provider' : 'Inactive'}
                </Typography>
              </Box>
            }
            sx={{ ml: 'auto' }}
          />
        </Box>

        <AppCard title={`${configs[key].type} API Details`} subtitle={`Configure your ${configs[key].type} credentials and access settings.`}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {isSimply && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Instance ID"
                  required
                  value={editFields.instanceId || ''}
                  onChange={(e) => handleFieldChange('instanceId', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Access Token"
                  required
                  value={editFields.accessToken || ''}
                  onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="URL"
                  required
                  value={editFields.url || ''}
                  onChange={(e) => handleFieldChange('url', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {isWapi && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="WHAPI URL"
                  required
                  value={editFields.wapiUrl || ''}
                  onChange={(e) => handleFieldChange('wapiUrl', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="WHAPI Token"
                  required
                  value={editFields.wapiToken || ''}
                  onChange={(e) => handleFieldChange('wapiToken', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  placeholder="Paste your WHAPI Channel Token here"
                />
              </Box>
            )}

            {isChatSimplified && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="API Key"
                  required
                  value={editFields.apiKey || ''}
                  onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="API Base URL"
                  required
                  value={editFields.baseUrl || ''}
                  onChange={(e) => handleFieldChange('baseUrl', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {/* Template Variables Helper Chips */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
                Available Placeholders (Click to copy):
              </Typography>
              {PLACEHOLDER_TAGS.map((tag) => (
                <Tooltip key={tag} title={`Click to copy {{${tag}}}`}>
                  <Chip
                    label={`{{${tag}}}`}
                    size="small"
                    onClick={() => copyToClipboard(`{{${tag}}}`)}
                    sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', '&:hover': { bgcolor: '#e2e8f0' } }}
                  />
                </Tooltip>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* Lead (Incoming) Payload */}
              <Box
                component="fieldset"
                sx={{
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  borderRadius: 2,
                  p: 2,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <legend style={{ padding: '0 8px', fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                  Lead (Incoming)
                </legend>
                <Button
                  onClick={() => copyToClipboard(incomingMessage)}
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: '0.85rem' }} />}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    zIndex: 10,
                    backgroundColor: '#181620',
                    color: 'white',
                    textTransform: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    minHeight: '28px',
                    height: '28px',
                    paddingInline: '10px',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: '#2b2938',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Copy
                </Button>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  value={incomingMessage}
                  onChange={(e) => setIncomingMessage(e.target.value)}
                  InputProps={{
                    style: {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      color: '#333',
                    }
                  }}
                  sx={{
                    mt: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiOutlinedInput-root': {
                      padding: 0,
                      backgroundColor: 'transparent',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&.Mui-focused': {
                        boxShadow: 'none',
                      }
                    }
                  }}
                />
              </Box>

              {/* Lead (Transfer) Payload */}
              <Box
                component="fieldset"
                sx={{
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  borderRadius: 2,
                  p: 2,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <legend style={{ padding: '0 8px', fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                  Lead (Transfer)
                </legend>
                <Button
                  onClick={() => copyToClipboard(transferMessage)}
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: '0.85rem' }} />}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    zIndex: 10,
                    backgroundColor: '#181620',
                    color: 'white',
                    textTransform: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    minHeight: '28px',
                    height: '28px',
                    paddingInline: '10px',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: '#2b2938',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Copy
                </Button>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  InputProps={{
                    style: {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      color: '#333',
                    }
                  }}
                  sx={{
                    mt: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiOutlinedInput-root': {
                      padding: 0,
                      backgroundColor: 'transparent',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&.Mui-focused': {
                        boxShadow: 'none',
                      }
                    }
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                onClick={() => {
                  setTestResult(null)
                  setTestDialogOpen(true)
                }}
                sx={{
                  borderColor: '#181620',
                  color: '#181620',
                  px: 3,
                  py: 1,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#2b2938',
                    backgroundColor: 'rgba(24, 22, 32, 0.04)',
                  },
                }}
              >
                Test Connection
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveConfig}
                sx={{
                  backgroundColor: '#181620',
                  color: 'white',
                  px: 5,
                  py: 1,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#2b2938',
                  },
                }}
              >
                Save Configuration
              </Button>
            </Box>
          </Box>
        </AppCard>

        {/* Send Test WhatsApp Message Dialog */}
        <Dialog open={testDialogOpen} onClose={() => !testing && setTestDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Send Test WhatsApp Message</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Test your <strong>{configs[activeView as keyof typeof configs]?.type}</strong> configuration by sending a real-time message to your mobile number.
            </Typography>

            {testResult && (
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {testResult.msg}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Recipient Mobile Number (with country code)"
              placeholder="e.g. 919876543210"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              helperText="Enter 10-12 digits without '+' (e.g. 919876543210 for India)"
              sx={{ mb: 2.5, mt: 0.5 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Test Message Content"
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTestDialogOpen(false)} disabled={testing} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSendTestMessage}
              disabled={testing || !testPhone.trim()}
              startIcon={testing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{
                backgroundColor: '#181620',
                color: 'white',
                '&:hover': { backgroundColor: '#2b2938' }
              }}
            >
              {testing ? 'Sending...' : 'Send Test Message'}
            </Button>
          </DialogActions>
        </Dialog>

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

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', overflowY: 'auto' }}>
      <AppCard title="WhatsApp API List" subtitle="Enable, deactivate, or configure your integrations.">
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />
        <Box sx={{ height: 350, width: '100%' }}>
          <AppDataGrid onReload={loadConfig}
            height="100%"
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
          />
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
