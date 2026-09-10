import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SendIcon from '@mui/icons-material/Send'
import HistoryIcon from '@mui/icons-material/History'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import DescriptionIcon from '@mui/icons-material/Description'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import api from '@/services/axiosInstance'

interface WhatsAppConfig {
  type: string
  url: string
  isActive: boolean
  incomingJson?: string
  transferJson?: string
  fields: Record<string, string>
}

interface WhatsAppLogItem {
  _id: string
  recipient_phone: string
  recipient_name: string
  recipient_type: string
  event_type: string
  provider: string
  is_universal: boolean
  status: string
  error_message?: string
  message_body?: string
  createdAt: string
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

const DEFAULT_SCENARIO_TEMPLATES = {
  incoming: `*New Lead Alert!* 🚀\n\n*Name:* {{customer_name}}\n*Phone:* {{contact_no}}\n*Email:* {{email}}\n*Source:* {{lead_source}}\n*Assigned To:* {{assigned_agent}}\n*Company:* {{organization_name}}\n\n_Please follow up promptly for maximum conversion speed._`,
  transfer: `*Lead Reassigned Alert* 🔄\n\n*Customer:* {{customer_name}}\n*Phone:* {{contact_no}}\n*Source:* {{lead_source}}\n*New Representative:* {{assigned_agent}}\n*Transferred By/From:* {{previous_agent}}\n\n_Please check your CRM pipeline for history & next action._`,
  taskReminder: `*Follow-Up Reminder Due* ⏰\n\n*Lead:* {{customer_name}}\n*Phone:* {{contact_no}}\n*Reminder/Task:* {{task_title}}\n*Due Time:* {{task_due}}\n*Assigned Representative:* {{assigned_agent}}\n\n_Keep your response time sharp!_`,
  dealWon: `🎉 *Deal Won Milestone!* 🏆\n\n*Deal:* {{deal_title}}\n*Amount:* {{deal_amount}}\n*Customer:* {{customer_name}}\n*Owner:* {{assigned_agent}}\n*Organization:* {{organization_name}}\n\n_Congratulations to the team on closing this opportunity!_`,
  customerWelcome: `Hello *{{customer_name}}*, thank you for contacting *{{organization_name}}*! 🤝\n\nWe have received your inquiry regarding *{{lead_source}}*. Our representative *{{assigned_agent}}* will connect with you shortly.\n\nHave an urgent question? Reply directly to this chat!`
}

export default function WhatsappApiPage() {
  const PLACEHOLDER_TAGS = [
    'customer_name',
    'contact_no',
    'alternate_no',
    'country_code',
    'email',
    'lead_source',
    'lead_type',
    'budget',
    'location',
    'property_type',
    'assigned_agent',
    'agent_phone',
    'previous_agent',
    'organization_name',
    'deal_title',
    'deal_amount',
    'task_title',
    'task_due'
  ]

  const [configs, setConfigs] = useState<Record<string, WhatsAppConfig>>(DEFAULT_CONFIGS)
  const [activeView, setActiveView] = useState<'list' | 'simply_whatsapp' | 'wapi' | 'chatsimplified'>('list')
  const [isFormActive, setIsFormActive] = useState(false)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [incomingMessage, setIncomingMessage] = useState("")
  const [transferMessage, setTransferMessage] = useState("")
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('Hello from Leads Rubix CRM! Your WhatsApp integration is operational. 🚀')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  // 2-Tier Hierarchy State
  const [apiSource, setApiSource] = useState<'universal' | 'custom' | 'universal_master'>('universal')
  const [useCustomApi, setUseCustomApi] = useState<boolean>(false)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [savingGatewayMode, setSavingGatewayMode] = useState<boolean>(false)

  // Recipient Controls State
  const [notifyAssignedAgent, setNotifyAssignedAgent] = useState<boolean>(true)
  const [notifyAdmin, setNotifyAdmin] = useState<boolean>(true)
  const [adminPhoneOverride, setAdminPhoneOverride] = useState<string>('')
  const [notifyCustomerWelcome, setNotifyCustomerWelcome] = useState<boolean>(false)
  const [savingRecipients, setSavingRecipients] = useState<boolean>(false)

  // Scenario Templates State
  const [templateTab, setTemplateTab] = useState<number>(0)
  const [incomingTemplate, setIncomingTemplate] = useState<string>(DEFAULT_SCENARIO_TEMPLATES.incoming)
  const [transferTemplate, setTransferTemplate] = useState<string>(DEFAULT_SCENARIO_TEMPLATES.transfer)
  const [taskReminderTemplate, setTaskReminderTemplate] = useState<string>(DEFAULT_SCENARIO_TEMPLATES.taskReminder)
  const [dealWonTemplate, setDealWonTemplate] = useState<string>(DEFAULT_SCENARIO_TEMPLATES.dealWon)
  const [customerWelcomeTemplate, setCustomerWelcomeTemplate] = useState<string>(DEFAULT_SCENARIO_TEMPLATES.customerWelcome)
  const [savingTemplates, setSavingTemplates] = useState<boolean>(false)

  // Audit Logs State
  const [logsDialogOpen, setLogsDialogOpen] = useState<boolean>(false)
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState<boolean>(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const hasCustomConfigured = useMemo(() => {
    const simplyValid = configs.simply_whatsapp?.isActive && Boolean(configs.simply_whatsapp?.fields?.accessToken?.trim())
    const wapiValid = configs.wapi?.isActive && Boolean(configs.wapi?.fields?.wapiToken?.trim())
    const chatValid = configs.chatsimplified?.isActive && Boolean(configs.chatsimplified?.fields?.apiKey?.trim() || configs.chatsimplified?.fields?.token?.trim())
    return simplyValid || wapiValid || chatValid
  }, [configs])

  const activeProviderName = useMemo(() => {
    if (activeProvider === 'simply' || (configs.simply_whatsapp?.isActive && configs.simply_whatsapp?.fields?.accessToken?.trim())) return 'Simply WhatsApp'
    if (activeProvider === 'wapi' || (configs.wapi?.isActive && configs.wapi?.fields?.wapiToken?.trim())) return 'WHAPI Cloud'
    if (activeProvider === 'chatsimplified' || configs.chatsimplified?.isActive) return 'ChatSimplified'
    return null
  }, [configs, activeProvider])

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

    // Hierarchy State
    setApiSource(data.apiSource || 'universal')
    setUseCustomApi(Boolean(data.useCustomApi))
    setActiveProvider(data.activeProvider || null)

    // Recipient Controls
    if (data.notifyAssignedAgent !== undefined) setNotifyAssignedAgent(Boolean(data.notifyAssignedAgent))
    if (data.notifyAdmin !== undefined) setNotifyAdmin(Boolean(data.notifyAdmin))
    if (data.adminPhoneOverride !== undefined) setAdminPhoneOverride(data.adminPhoneOverride || '')
    if (data.notifyCustomerWelcome !== undefined) setNotifyCustomerWelcome(Boolean(data.notifyCustomerWelcome))

    // Scenario Templates
    if (data.incomingTemplate) setIncomingTemplate(data.incomingTemplate)
    if (data.transferTemplate) setTransferTemplate(data.transferTemplate)
    if (data.taskReminderTemplate) setTaskReminderTemplate(data.taskReminderTemplate)
    if (data.dealWonTemplate) setDealWonTemplate(data.dealWonTemplate)
    if (data.customerWelcomeTemplate) setCustomerWelcomeTemplate(data.customerWelcomeTemplate)
  }

  const loadConfig = async () => {
    try {
      const response = await api.get('/whatsapp-config')
      if (response.data) {
        mapResponseData(response.data)
      }
    } catch (e) {
      console.error('Error loading WhatsApp configs from server', e)
    }
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const response = await api.get('/whatsapp-config/logs?limit=50')
      if (response.data?.logs) {
        setLogs(response.data.logs)
      }
    } catch (e) {
      console.error('Error loading WhatsApp logs', e)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Toggle Custom Gateway vs Platform Universal Gateway Mode
  const handleSwitchGatewayMode = async (nextUseCustom: boolean) => {
    setSavingGatewayMode(true)
    try {
      const response = await api.post('/whatsapp-config', {
        useCustomApi: nextUseCustom,
        use_custom_api: nextUseCustom,
      })
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: nextUseCustom
          ? 'Switched to Custom Company WhatsApp Gateway!'
          : 'Switched to Platform Universal WhatsApp Gateway (SuperAdmin Gateway)!',
        sev: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        msg: err.response?.data?.message || 'Error updating gateway mode',
        sev: 'error',
      })
    } finally {
      setSavingGatewayMode(false)
    }
  }

  // Save Recipient Preferences
  const handleSaveRecipients = async () => {
    setSavingRecipients(true)
    try {
      const response = await api.post('/whatsapp-config', {
        notifyAssignedAgent,
        notify_assigned_agent: notifyAssignedAgent,
        notifyAdmin,
        notify_admin: notifyAdmin,
        adminPhoneOverride: adminPhoneOverride.trim(),
        admin_phone_override: adminPhoneOverride.trim(),
        notifyCustomerWelcome,
        notify_customer_welcome: notifyCustomerWelcome
      })
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: 'Team notification recipient preferences saved successfully!',
        sev: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        msg: err.response?.data?.message || 'Error saving notification preferences',
        sev: 'error',
      })
    } finally {
      setSavingRecipients(false)
    }
  }

  // Save Scenario Message Templates
  const handleSaveTemplates = async () => {
    setSavingTemplates(true)
    try {
      const response = await api.post('/whatsapp-config', {
        incomingTemplate,
        incoming_template: incomingTemplate,
        transferTemplate,
        transfer_template: transferTemplate,
        taskReminderTemplate,
        task_reminder_template: taskReminderTemplate,
        dealWonTemplate,
        deal_won_template: dealWonTemplate,
        customerWelcomeTemplate,
        customer_welcome_template: customerWelcomeTemplate,
      })
      mapResponseData(response.data)
      setToast({
        open: true,
        msg: 'WhatsApp scenario templates saved successfully!',
        sev: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        msg: err.response?.data?.message || 'Error saving scenario templates',
        sev: 'error',
      })
    } finally {
      setSavingTemplates(false)
    }
  }

  const handleToggle = async (key: string) => {
    const nextActive = !configs[key].isActive

    const payload = {
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
      const response = await api.post('/whatsapp-config', payload)
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

    let payload: any = {}
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
      const response = await api.post('/whatsapp-config', payload)
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
        recipientPhone: testPhone.trim(),
        message: testMsg.trim(),
        provider: key === 'simply_whatsapp' ? 'simply' : key,
        testCredentials
      })

      setTestResult({
        success: true,
        msg: response.data?.message || 'Test WhatsApp message dispatched successfully! 🚀'
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
      msg: 'Copied placeholder to clipboard!',
      sev: 'success',
    })
  }

  const resetCurrentTemplate = () => {
    if (templateTab === 0) setIncomingTemplate(DEFAULT_SCENARIO_TEMPLATES.incoming)
    else if (templateTab === 1) setTransferTemplate(DEFAULT_SCENARIO_TEMPLATES.transfer)
    else if (templateTab === 2) setTaskReminderTemplate(DEFAULT_SCENARIO_TEMPLATES.taskReminder)
    else if (templateTab === 3) setDealWonTemplate(DEFAULT_SCENARIO_TEMPLATES.dealWon)
    else if (templateTab === 4) setCustomerWelcomeTemplate(DEFAULT_SCENARIO_TEMPLATES.customerWelcome)
    setToast({
      open: true,
      msg: 'Template reset to standard default!',
      sev: 'success'
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
        headerName: 'Provider Type',
        flex: 1,
        minWidth: 160,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'url',
        headerName: 'Endpoint URL',
        flex: 2,
        minWidth: 260,
        renderCell: (p) => (
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>
            {p.value}
          </Box>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Active Status',
        width: 160,
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
        headerName: 'Action',
        width: 140,
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
              fontSize: '0.8rem',
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

  // Sub-view: Edit specific provider credentials
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

        <AppCard title={`${configs[key].type} API Credentials`} subtitle={`Configure your ${configs[key].type} access tokens and gateway settings.`}>
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
                  label="WHAPI Channel Token"
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
                  Lead (Incoming Payload)
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
                  rows={8}
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
                  sx={{ mt: 2 }}
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
                  Lead (Transfer Payload)
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
                  rows={8}
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
                  sx={{ mt: 2 }}
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

  // Main View: 2-Tier Architecture Dashboard
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', overflowY: 'auto' }}>
      
      {/* Top Bar with Logs Action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#181620' }}>
            WhatsApp Integration & Automated Notifications
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Enterprise 2-tier WhatsApp gateway with multi-recipient broadcasting and dynamic templates.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => {
            loadLogs()
            setLogsDialogOpen(true)
          }}
          sx={{
            borderColor: '#181620',
            color: '#181620',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#2b2938',
              backgroundColor: 'rgba(24, 22, 32, 0.04)',
            }
          }}
        >
          Delivery Audit Logs
        </Button>
      </Box>

      {/* 2-Tier Operational Status Banner */}
      {apiSource === 'custom' ? (
        <Alert
          severity="success"
          icon={<CheckCircleIcon sx={{ fontSize: 24 }} />}
          sx={{ mb: 3, fontWeight: 500, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label={`Custom Gateway (${activeProviderName || 'Active'})`} color="success" sx={{ fontWeight: 700 }} />
              <Button
                size="small"
                variant="outlined"
                disabled={savingGatewayMode}
                onClick={() => handleSwitchGatewayMode(false)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', borderColor: '#16a34a', color: '#16a34a' }}
              >
                Switch to Universal Gateway
              </Button>
            </Box>
          }
        >
          <strong>Custom Company WhatsApp Gateway Active:</strong> All outbound notifications are broadcasting directly from your company's verified WhatsApp number via <strong>{activeProviderName}</strong>. Assigned sales agents and administrators receive real-time notifications.
        </Alert>
      ) : (
        <Alert
          severity="info"
          icon={<InfoIcon sx={{ fontSize: 24, color: '#0284c7' }} />}
          sx={{ mb: 3, fontWeight: 500, border: '1px solid #bae6fd', bgcolor: '#f0f9ff' }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="Universal Platform Gateway" sx={{ bgcolor: '#0284c7', color: 'white', fontWeight: 700 }} />
              {hasCustomConfigured && (
                <Button
                  size="small"
                  variant="outlined"
                  disabled={savingGatewayMode}
                  onClick={() => handleSwitchGatewayMode(true)}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', borderColor: '#0284c7', color: '#0284c7' }}
                >
                  Activate Custom Gateway
                </Button>
              )}
            </Box>
          }
        >
          <strong>Platform Universal Gateway Active (Zero-Downtime Fallback):</strong> Your workspace is operating on the central Leads Rubix Universal WhatsApp Gateway. All lead alerts to assigned agents and managers work immediately with zero configuration. You can also activate your company's custom WhatsApp API below at any time.
        </Alert>
      )}

      {/* Gateway Architecture Mode Selection Card */}
      <AppCard title="Gateway Architecture Mode" subtitle="Choose between the managed Universal Platform Gateway or your own Custom WhatsApp account.">
        <Box sx={{ pt: 1 }}>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <RadioGroup
              value={useCustomApi ? 'custom' : 'universal'}
              onChange={(e) => handleSwitchGatewayMode(e.target.value === 'custom')}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                
                {/* Option 1: Universal Platform Gateway */}
                <Box
                  onClick={() => !useCustomApi || handleSwitchGatewayMode(false)}
                  sx={{
                    p: 2.5,
                    border: '2px solid',
                    borderColor: !useCustomApi ? '#0284c7' : '#e2e8f0',
                    borderRadius: 2,
                    bgcolor: !useCustomApi ? '#f0f9ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Radio
                    checked={!useCustomApi}
                    value="universal"
                    name="gateway-mode"
                    sx={{ p: 0.5, color: '#0284c7', '&.Mui-checked': { color: '#0284c7' } }}
                  />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                        Leads Rubix Universal Gateway
                      </Typography>
                      <Chip label="Zero Setup" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      Fully managed high-throughput platform gateway maintained by SuperAdmin. Instantly notifies your sales reps and managers on lead capture with 100% uptime.
                    </Typography>
                  </Box>
                </Box>

                {/* Option 2: Custom Company Gateway */}
                <Box
                  onClick={() => useCustomApi || handleSwitchGatewayMode(true)}
                  sx={{
                    p: 2.5,
                    border: '2px solid',
                    borderColor: useCustomApi ? '#16a34a' : '#e2e8f0',
                    borderRadius: 2,
                    bgcolor: useCustomApi ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Radio
                    checked={useCustomApi}
                    value="custom"
                    name="gateway-mode"
                    sx={{ p: 0.5, color: '#16a34a', '&.Mui-checked': { color: '#16a34a' } }}
                  />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                        Custom Company WhatsApp Gateway
                      </Typography>
                      <Chip label="Verified Number" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      Connect your own official business WhatsApp number via WHAPI, Simply WhatsApp, or ChatSimplified to send brand-verified alerts and 2-way messages.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </RadioGroup>
          </FormControl>
        </Box>
      </AppCard>

      {/* Recipient Controls & Broadcast Preferences */}
      <Box sx={{ mt: 3 }}>
        <AppCard title="Multi-Recipient Notification Routing" subtitle="Configure which stakeholders receive real-time WhatsApp alerts when events occur in CRM.">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3, pt: 1 }}>
            
            {/* Agent Control */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Assigned Sales Agent
                </Typography>
                <Switch
                  checked={notifyAssignedAgent}
                  onChange={(e) => setNotifyAssignedAgent(e.target.checked)}
                  color="primary"
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
                Speed-to-lead alert sent directly to the assigned sales representative's WhatsApp with customer details, budget, and quick-action prompt.
              </Typography>
            </Box>

            {/* Admin Control */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Admin / Supervisor Copy
                </Typography>
                <Switch
                  checked={notifyAdmin}
                  onChange={(e) => setNotifyAdmin(e.target.checked)}
                  color="primary"
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
                Pipeline monitor copy sent to the workspace administrator or manager to ensure rapid agent response and zero missed leads.
              </Typography>
            </Box>

            {/* Customer Welcome Greeting */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Customer Welcome Greeting
                </Typography>
                <Switch
                  checked={notifyCustomerWelcome}
                  onChange={(e) => setNotifyCustomerWelcome(e.target.checked)}
                  color="primary"
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
                Automated greeting message sent to the newly captured prospect's WhatsApp acknowledging their inquiry and introducing the assigned agent.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ maxWidth: 420, width: '100%' }}>
              <TextField
                fullWidth
                size="small"
                label="Admin Phone Override (Optional)"
                placeholder="e.g. 918299670442"
                value={adminPhoneOverride}
                onChange={(e) => setAdminPhoneOverride(e.target.value)}
                helperText="Specify a dedicated supervisor WhatsApp number. If blank, uses admin user's account mobile."
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleSaveRecipients}
              disabled={savingRecipients}
              startIcon={savingRecipients ? <CircularProgress size={16} color="inherit" /> : <NotificationsActiveIcon />}
              sx={{
                backgroundColor: '#181620',
                color: 'white',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#2b2938' }
              }}
            >
              {savingRecipients ? 'Saving...' : 'Save Notification Preferences'}
            </Button>
          </Box>
        </AppCard>
      </Box>

      {/* Custom Provider Integrations List */}
      <Box sx={{ mt: 3 }}>
        <AppCard title="Custom WhatsApp Gateways" subtitle="Connect and authenticate with third-party WhatsApp Cloud providers.">
          <Box sx={{ height: 260, width: '100%' }}>
            <AppDataGrid onReload={loadConfig}
              height="100%"
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
            />
          </Box>
        </AppCard>
      </Box>

      {/* Multi-Scenario Message Templates Card */}
      <Box sx={{ mt: 3, mb: 4 }}>
        <AppCard title="Dynamic Notification Templates" subtitle="Personalize message templates for inbound leads, transfers, reminders, and won deals.">
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={templateTab}
              onChange={(_, val) => setTemplateTab(val)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="1. Inbound Lead Alert" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="2. Lead Reassigned / Transfer" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="3. Follow-Up Reminder" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="4. Deal Won Milestone" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="5. Customer Welcome" sx={{ textTransform: 'none', fontWeight: 600 }} />
            </Tabs>
          </Box>

          {/* Placeholder Tags Helper Bar */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: 1.5, mb: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1 }}>
              Available Merge Tags (Click to copy):
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

          {/* Tab Panels */}
          {templateTab === 0 && (
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Inbound Lead Alert Template (Sent on new lead capture)"
              value={incomingTemplate}
              onChange={(e) => setIncomingTemplate(e.target.value)}
              InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          )}

          {templateTab === 1 && (
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Lead Transfer / Reassign Template (Sent to newly assigned agent)"
              value={transferTemplate}
              onChange={(e) => setTransferTemplate(e.target.value)}
              InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          )}

          {templateTab === 2 && (
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Follow-Up & Reminder Due Template (Sent when task reminder is due)"
              value={taskReminderTemplate}
              onChange={(e) => setTaskReminderTemplate(e.target.value)}
              InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          )}

          {templateTab === 3 && (
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Deal Won Milestone Template (Sent when deal transitions to Won stage)"
              value={dealWonTemplate}
              onChange={(e) => setDealWonTemplate(e.target.value)}
              InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          )}

          {templateTab === 4 && (
            <TextField
              fullWidth
              multiline
              rows={7}
              label="Customer Welcome Greeting Template (Sent to prospect on capture)"
              value={customerWelcomeTemplate}
              onChange={(e) => setCustomerWelcomeTemplate(e.target.value)}
              InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={resetCurrentTemplate}
              sx={{ textTransform: 'none', color: 'text.secondary', borderColor: '#cbd5e1' }}
            >
              Reset Current Template to Default
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTemplates}
              disabled={savingTemplates}
              startIcon={savingTemplates ? <CircularProgress size={16} color="inherit" /> : <DescriptionIcon />}
              sx={{
                backgroundColor: '#181620',
                color: 'white',
                px: 3,
                py: 0.8,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#2b2938' }
              }}
            >
              {savingTemplates ? 'Saving...' : 'Save Scenario Templates'}
            </Button>
          </Box>
        </AppCard>
      </Box>

      {/* Delivery Audit Logs Dialog */}
      <Dialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            WhatsApp Notification Delivery Logs
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={loadLogs} size="small" disabled={logsLoading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setLogsDialogOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {logsLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 6, color: 'text.secondary' }}>
              <Typography variant="body1">No WhatsApp delivery logs recorded yet.</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>Messages dispatched via Universal or Custom gateways will appear here in real-time.</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <Box component="thead" sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Box component="tr">
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Timestamp</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Recipient</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Role / Type</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Event</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Gateway</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Status</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}>Message / Error</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {logs.map((log) => (
                    <Box component="tr" key={log._id} sx={{ borderBottom: '1px solid #f1f5f9', '&:hover': { bgcolor: '#f8fafc' } }}>
                      <Box component="td" sx={{ p: 1.5, fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.recipient_name || 'CRM User'}</Typography>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{log.recipient_phone}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Chip
                          size="small"
                          label={log.recipient_type?.toUpperCase() || 'AGENT'}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            bgcolor: log.recipient_type === 'admin' ? '#ede9fe' : log.recipient_type === 'customer' ? '#e0f2fe' : '#f1f5f9',
                            color: log.recipient_type === 'admin' ? '#6d28d9' : log.recipient_type === 'customer' ? '#0369a1' : '#475569',
                          }}
                        />
                      </Box>
                      <Box component="td" sx={{ p: 1.5, textTransform: 'capitalize', fontWeight: 500 }}>
                        {log.event_type ? log.event_type.replace('_', ' ') : 'Notification'}
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Chip
                          size="small"
                          label={log.is_universal ? 'Universal Gateway' : `Custom (${log.provider})`}
                          sx={{
                            fontSize: '0.7rem',
                            bgcolor: log.is_universal ? '#e0f2fe' : '#dcfce7',
                            color: log.is_universal ? '#0369a1' : '#15803d',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Chip
                          size="small"
                          label={log.status}
                          color={log.status === 'SUCCESS' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Box component="td" sx={{ p: 1.5, maxWidth: 300 }}>
                        {log.status === 'FAILED' ? (
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500, display: 'block' }}>
                            {log.error_message || 'Delivery failed'}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {log.message_body || 'Message sent successfully'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogsDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Close
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
