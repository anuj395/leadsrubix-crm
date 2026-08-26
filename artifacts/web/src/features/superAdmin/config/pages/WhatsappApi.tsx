import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
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

  const [configs, setConfigs] = useState<Record<string, WhatsAppConfig>>(DEFAULT_CONFIGS)
  const [activeView, setActiveView] = useState<'list' | 'simply_whatsapp' | 'wapi' | 'chatsimplified'>('list')
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [incomingMessage, setIncomingMessage] = useState("")
  const [transferMessage, setTransferMessage] = useState("")
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadConfig = async (orgId?: string) => {
    try {
      const activeOrg = orgId || selectedOrg
      const params = activeOrg ? `?organizationId=${activeOrg}` : ''
      const response = await api.get(`/whatsapp-config${params}`)
      const data = response.data
      if (data) {
        setConfigs({
          simply_whatsapp: {
            type: 'Simply WhatsApp',
            url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
            isActive: data.simply?.active || false,
            incomingJson: data.simply?.incoming_json,
            transferJson: data.simply?.transfer_json,
            fields: {
              instanceId: data.simply?.instanceId || '',
              accessToken: data.simply?.accessToken || '',
              url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
            }
          },
          wapi: {
            type: 'WHAPI',
            url: data.wapi?.wapi_url || 'https://gate.whapi.cloud',
            isActive: data.wapi?.active || false,
            incomingJson: data.wapi?.incoming_json,
            transferJson: data.wapi?.transfer_json,
            fields: {
              wapiUrl: data.wapi?.wapi_url || 'https://gate.whapi.cloud',
              wapiToken: data.wapi?.wapi_token || '',
            }
          },
          chatsimplified: {
            type: 'ChatSimplified',
            url: data.chatSimplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
            isActive: data.chatSimplified?.active || false,
            incomingJson: data.chatSimplified?.incoming_json,
            transferJson: data.chatSimplified?.transfer_json,
            fields: {
              apiKey: data.chatSimplified?.api_key || '',
              baseUrl: data.chatSimplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
            }
          }
        })
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

  const mapResponseData = (data: any) => {
    setConfigs({
      simply_whatsapp: {
        type: 'Simply WhatsApp',
        url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
        isActive: data.simply?.active || false,
        incomingJson: data.simply?.incoming_json,
        transferJson: data.simply?.transfer_json,
        fields: {
          instanceId: data.simply?.instanceId || '',
          accessToken: data.simply?.accessToken || '',
          url: data.simply?.url || 'https://app.simplywhatsapp.com/api/send',
        }
      },
      wapi: {
        type: 'WHAPI',
        url: data.wapi?.wapi_url || 'https://gate.whapi.cloud',
        isActive: data.wapi?.active || false,
        incomingJson: data.wapi?.incoming_json,
        transferJson: data.wapi?.transfer_json,
        fields: {
          wapiUrl: data.wapi?.wapi_url || 'https://gate.whapi.cloud',
          wapiToken: data.wapi?.wapi_token || '',
        }
      },
      chatsimplified: {
        type: 'ChatSimplified',
        url: data.chatSimplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
        isActive: data.chatSimplified?.active || false,
        incomingJson: data.chatSimplified?.incoming_json,
        transferJson: data.chatSimplified?.transfer_json,
        fields: {
          apiKey: data.chatSimplified?.api_key || '',
          baseUrl: data.chatSimplified?.url || 'https://www.chatsimplified.co/api/v1/abcd',
        }
      }
    })
  }

  const handleToggle = async (key: string) => {
    const nextActive = !configs[key].isActive

    // Build payload so only ONE is active
    const payload = {
      organizationId: selectedOrg,
      simply: {
        active: key === 'simply_whatsapp' ? nextActive : false,
      },
      wapi: {
        active: key === 'wapi' ? nextActive : false,
      },
      chatSimplified: {
        active: key === 'chatsimplified' ? nextActive : false,
      }
    }

    try {
      const response = await api.post(`/whatsapp-config?organizationId=${selectedOrg || ''}`, payload)
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: 'Status updated!',
        sev: 'success',
      })
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        msg: 'Error updating status',
        sev: 'error',
      })
    }
  }

  const handleConfigureClick = (key: 'simply_whatsapp' | 'wapi' | 'chatsimplified') => {
    setEditFields(configs[key].fields)
    setIncomingMessage(configs[key].incomingJson || JSON.stringify(JSON_PAYLOADS[key].incoming, null, 2))
    setTransferMessage(configs[key].transferJson || JSON.stringify(JSON_PAYLOADS[key].transfer, null, 2))
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
      if (!fVal.trim()) {
        setToast({
          open: true,
          msg: 'Please fill all fields',
          sev: 'error',
        })
        return
      }
    }

    let payload: any = {}
    if (key === 'simply_whatsapp') {
      payload.simply = {
        url: editFields.url,
        instanceId: editFields.instanceId,
        accessToken: editFields.accessToken,
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
      }
    } else if (key === 'wapi') {
      payload.wapi = {
        wapi_url: editFields.wapiUrl,
        wapi_token: editFields.wapiToken,
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
      }
    } else if (key === 'chatsimplified') {
      payload.chatSimplified = {
        url: editFields.baseUrl,
        api_key: editFields.apiKey,
        incoming_json: incomingMessage,
        transfer_json: transferMessage,
      }
    }

    try {
      const response = await api.post('/whatsapp-config', payload)
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: 'Updated successfully!',
        sev: 'success',
      })
      setActiveView('list')
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        msg: 'Error updating config',
        sev: 'error',
      })
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

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleSaveConfig}
                sx={{
                  backgroundColor: '#181620',
                  color: 'white',
                  px: 5,
                  py: 1,
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#2b2938',
                  },
                }}
              >
                Submit
              </Button>
            </Box>
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
