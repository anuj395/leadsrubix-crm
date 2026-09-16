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
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import CallIcon from '@mui/icons-material/Call'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import DomainIcon from '@mui/icons-material/Domain'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SettingsIcon from '@mui/icons-material/Settings'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RouterIcon from '@mui/icons-material/Router'
import HubIcon from '@mui/icons-material/Hub'

import { api } from '@/services/api'
import { AppCard } from '@/components/ui/AppCard'
import { useAppSelector } from '@/store/hooks'
import { listUsers, type AdminUser } from '@/services/usersAdminService'

export interface TelephonyChannel {
  _id: string
  id?: string
  organization_id?: string
  organizationId?: string
  industry_id?: string | null
  industryId?: string | null
  name: string
  provider: string
  provider_name?: string
  providerName?: string
  virtual_number?: string
  virtualNumber?: string
  api_key?: string
  apiKey?: string
  routing_mode?: string
  routingMode?: string
  default_agent_id?: string | null
  defaultAgentId?: string | null
  default_agent_name?: string
  defaultAgentName?: string
  default_agent_email?: string
  defaultAgentEmail?: string
  status: 'ACTIVE' | 'INACTIVE'
  total_calls?: number
  totalCalls?: number
  answered_calls?: number
  answeredCalls?: number
  missed_calls?: number
  missedCalls?: number
  last_call_at?: string | null
  lastCallAt?: string | null
  created_at?: string
  createdAt?: string
}

export interface ProviderCatalogItem {
  key: string
  name: string
  tagline: string
  defaultDid: string
  steps: string[]
  paramNotes: string
}

export function IvrPage() {
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.user)

  const [channels, setChannels] = useState<TelephonyChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [providersCatalog, setProvidersCatalog] = useState<ProviderCatalogItem[]>([])
  const [teamUsers, setTeamUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activeChannelForEdit, setActiveChannelForEdit] = useState<TelephonyChannel | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState('tata_smartflo')
  const [formVirtualNumber, setFormVirtualNumber] = useState('')
  const [formRoutingMode, setFormRoutingMode] = useState('AGENT_PHONE_MATCH')
  const [formDefaultAgentId, setFormDefaultAgentId] = useState('')
  const [savingChannel, setSavingChannel] = useState(false)

  // Copy helpers
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Multi-Industry contextual terminology
  const indCode = String(authUser?.industryId || '').toLowerCase().trim()
  const industryInfo = useMemo(() => {
    switch (indCode) {
      case 'temp0001':
        return { label: 'Property Buyer Calls', funnelNoun: 'Buyer Inquiries', industryName: 'Real Estate & Properties' }
      case 'temp0002':
        return { label: 'Student Admission Calls', funnelNoun: 'Admission Inquiries', industryName: 'Education & Academics' }
      case 'temp0003':
        return { label: 'Patient Inbound Calls', funnelNoun: 'Patient Inquiries', industryName: 'Healthcare & Clinic' }
      case 'temp0004':
        return { label: 'Financial Advisory Calls', funnelNoun: 'Client Inquiries', industryName: 'Financial Services' }
      case 'temp0005':
        return { label: 'Vehicle Service Calls', funnelNoun: 'Vehicle Inquiries', industryName: 'Automobile & Dealership' }
      case 'temp0006':
        return { label: 'Booking & Stay Calls', funnelNoun: 'Booking Inquiries', industryName: 'Hospitality & Travel' }
      default:
        return { label: 'Inbound Customer Calls', funnelNoun: 'Inbound Inquiries', industryName: 'Enterprise CRM' }
    }
  }, [indCode])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch channels & provider catalog in parallel
      const [resChannels, resProviders] = await Promise.all([
        api.get('/telephony/channels').catch(() => ({ data: { data: [] } })),
        api.get('/telephony/providers').catch(() => ({ data: { data: [] } })),
      ])

      const fetchedChannels: TelephonyChannel[] = Array.isArray(resChannels.data?.data)
        ? resChannels.data.data
        : Array.isArray(resChannels.data)
        ? resChannels.data
        : []

      const fetchedProviders: ProviderCatalogItem[] = Array.isArray(resProviders.data?.data)
        ? resProviders.data.data
        : []

      setChannels(fetchedChannels)
      setProvidersCatalog(fetchedProviders)

      if (fetchedChannels.length > 0) {
        setSelectedChannelId((prev) => prev || fetchedChannels[0]._id || (fetchedChannels[0] as any).id)
      }

      // 2. Fetch tenant organization's active team members for agent routing roster
      const usersRes = await listUsers(authUser?.industryId, true, authUser?.organizationId).catch(() => [] as AdminUser[])
      const activeMembers = (Array.isArray(usersRes) ? usersRes : []).filter((u) => u.isActive !== false)
      setTeamUsers(activeMembers)
    } catch (err: any) {
      console.warn('Failed to load Telephony data:', err)
      setToast({ open: true, msg: 'Failed to load Cloud Telephony configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [authUser?.organizationId, authUser?.industryId])

  // Resolve currently selected channel
  const selectedChannel = useMemo(() => {
    if (!channels.length) return null
    return channels.find((c) => (c._id || (c as any).id) === selectedChannelId) || channels[0]
  }, [channels, selectedChannelId])

  // Resolve provider info for selected channel
  const selectedProviderInfo = useMemo(() => {
    if (!selectedChannel) return providersCatalog[0] || null
    return (
      providersCatalog.find((p) => p.key === selectedChannel.provider) || {
        key: selectedChannel.provider,
        name: selectedChannel.provider_name || selectedChannel.providerName || 'Cloud Telephony',
        tagline: 'Direct cloud telephony webhook integration for inbound calls and Call Logs.',
        defaultDid: selectedChannel.virtual_number || '+91 80 4567 8900',
        steps: [
          'Log into your cloud telephony provider portal with your organization credentials.',
          'Navigate to Webhooks / Integration settings.',
          'Paste the Leads Rubix Webhook URL shown below with your channel token.',
          'Configure call event triggers to "Call Completed" and "Missed Call".',
          'Incoming calls automatically route to organization agents and triage in Inbound Inquiries.',
        ],
        paramNotes: 'Accepts standard JSON payloads with caller number, DID, agent extension, and recording URL.',
      }
    )
  }, [selectedChannel, providersCatalog])

  // Resolve representative agent details for dynamic payload
  const primaryAgent = useMemo(() => {
    return teamUsers[0] || null
  }, [teamUsers])

  const agentDisplayName = primaryAgent
    ? `${primaryAgent.firstName || ''} ${primaryAgent.lastName || ''}`.trim() || primaryAgent.name || primaryAgent.email
    : authUser?.name || 'Assigned Sales Agent'

  const agentPhone = useMemo(() => {
    if (!primaryAgent) return '+919876500001'
    const p =
      (primaryAgent as any).contact_number ||
      (primaryAgent as any).contactNumber ||
      (primaryAgent as any).phone ||
      (primaryAgent as any).mobile ||
      (primaryAgent as any).fields?.contact_number ||
      (primaryAgent as any).fields?.phone ||
      '+919876500001'
    return String(p)
  }, [primaryAgent])

  const baseUrl =
    typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://api1.leadsrubix.com'

  const channelApiKey = selectedChannel?.api_key || selectedChannel?.apiKey || 'YOUR_CHANNEL_TOKEN'
  const webhookUrl = `${baseUrl}/api/webhook/ivr?token=${channelApiKey}`

  // Dynamic sample payload tailored to active channel and provider
  const samplePayload = useMemo(() => {
    const provName = selectedChannel?.provider_name || selectedChannel?.providerName || selectedProviderInfo?.name || 'Cloud Telephony'
    const vDid = selectedChannel?.virtual_number || selectedChannel?.virtualNumber || '+918045678900'
    return {
      token: channelApiKey,
      customer_number: '+919876543210',
      customer_name: 'Inbound Caller',
      agent_phone: agentPhone,
      agent_name: agentDisplayName,
      virtual_number: vDid,
      duration: 45,
      call_status: 'Answered',
      recording_url: 'https://storage.cloud-telephony.com/recordings/call_sample.mp3',
      ivr_option: 'Inbound Sales',
      provider: provName,
      channel_id: selectedChannel?._id || '',
      notes: `Inbound Call via ${provName} (${selectedChannel?.name || 'Main Line'}) on DID ${vDid}`,
    }
  }, [channelApiKey, agentPhone, agentDisplayName, selectedChannel, selectedProviderInfo])

  const jsonSample = JSON.stringify(samplePayload, null, 2)

  // Simulation test call
  const handleTestCall = async (channel: TelephonyChannel) => {
    const chId = channel._id || (channel as any).id
    setTestingId(chId)
    try {
      const res = await api.post(`/telephony/channels/${chId}/test`)
      if (res.data?.success) {
        setToast({
          open: true,
          msg: `Simulation test call processed! Created Inbound Inquiry and CallLog for "${channel.name}".`,
          sev: 'success',
        })
        void loadData()
      } else {
        setToast({ open: true, msg: res.data?.message || 'Failed to simulate test call', sev: 'error' })
      }
    } catch (err: any) {
      setToast({
        open: true,
        msg: err?.response?.data?.message || err?.message || 'Failed to simulate test call',
        sev: 'error',
      })
    } finally {
      setTestingId(null)
    }
  }

  // Toggle channel status
  const handleToggleStatus = async (channel: TelephonyChannel) => {
    const newStatus = channel.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const chId = channel._id || (channel as any).id
    try {
      await api.put(`/telephony/channels/${chId}`, { status: newStatus })
      setChannels((prev) =>
        prev.map((c) => ((c._id || (c as any).id) === chId ? { ...c, status: newStatus } : c))
      )
      setToast({
        open: true,
        msg: `Channel "${channel.name}" set to ${newStatus}`,
        sev: 'success',
      })
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to update channel status', sev: 'error' })
    }
  }

  // Open Create Dialog
  const handleOpenCreateDialog = () => {
    setFormName('')
    setFormProvider('tata_smartflo')
    const prov = providersCatalog.find((p) => p.key === 'tata_smartflo')
    setFormVirtualNumber(prov?.defaultDid || '+91 80 4567 8900')
    setFormRoutingMode('AGENT_PHONE_MATCH')
    setFormDefaultAgentId('')
    setCreateDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEditDialog = (channel: TelephonyChannel) => {
    setActiveChannelForEdit(channel)
    setFormName(channel.name)
    setFormProvider(channel.provider)
    setFormVirtualNumber(channel.virtual_number || channel.virtualNumber || '')
    setFormRoutingMode(channel.routing_mode || channel.routingMode || 'AGENT_PHONE_MATCH')
    setFormDefaultAgentId(channel.default_agent_id || channel.defaultAgentId || '')
    setEditDialogOpen(true)
  }

  // Save new channel
  const handleSaveCreate = async () => {
    if (!formName.trim()) {
      setToast({ open: true, msg: 'Please enter a Channel Name', sev: 'error' })
      return
    }
    setSavingChannel(true)
    try {
      const res = await api.post('/telephony/channels', {
        name: formName.trim(),
        provider: formProvider,
        virtual_number: formVirtualNumber.trim(),
        routing_mode: formRoutingMode,
        default_agent_id: formDefaultAgentId || null,
      })
      if (res.data?.success) {
        setToast({ open: true, msg: `Telephony Channel "${formName}" created!`, sev: 'success' })
        setCreateDialogOpen(false)
        await loadData()
        if (res.data?.data?._id) {
          setSelectedChannelId(res.data.data._id)
        }
      } else {
        setToast({ open: true, msg: res.data?.message || 'Failed to create channel', sev: 'error' })
      }
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to create channel', sev: 'error' })
    } finally {
      setSavingChannel(false)
    }
  }

  // Save edit channel
  const handleSaveEdit = async () => {
    if (!activeChannelForEdit || !formName.trim()) return
    const chId = activeChannelForEdit._id || (activeChannelForEdit as any).id
    setSavingChannel(true)
    try {
      const res = await api.put(`/telephony/channels/${chId}`, {
        name: formName.trim(),
        provider: formProvider,
        virtual_number: formVirtualNumber.trim(),
        routing_mode: formRoutingMode,
        default_agent_id: formDefaultAgentId || null,
      })
      if (res.data?.success) {
        setToast({ open: true, msg: `Channel "${formName}" updated!`, sev: 'success' })
        setEditDialogOpen(false)
        await loadData()
      } else {
        setToast({ open: true, msg: res.data?.message || 'Failed to update channel', sev: 'error' })
      }
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to update channel', sev: 'error' })
    } finally {
      setSavingChannel(false)
    }
  }

  // Delete channel
  const handleDeleteChannel = async () => {
    if (!activeChannelForEdit) return
    const chId = activeChannelForEdit._id || (activeChannelForEdit as any).id
    try {
      await api.delete(`/telephony/channels/${chId}`)
      setToast({ open: true, msg: 'Channel deleted successfully', sev: 'success' })
      setDeleteDialogOpen(false)
      setActiveChannelForEdit(null)
      await loadData()
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to delete channel', sev: 'error' })
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedUrl(true)
    setToast({ open: true, msg: 'Channel Webhook URL copied to clipboard!', sev: 'success' })
    setTimeout(() => setCopiedUrl(false), 1500)
  }

  const handleCopyToken = () => {
    navigator.clipboard.writeText(channelApiKey)
    setCopiedToken(true)
    setToast({ open: true, msg: 'Channel API Token copied to clipboard!', sev: 'success' })
    setTimeout(() => setCopiedToken(false), 1500)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonSample)
    setCopiedJson(true)
    setToast({ open: true, msg: 'Sample payload copied to clipboard!', sev: 'success' })
    setTimeout(() => setCopiedJson(false), 1500)
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        pb: { xs: 8, sm: 10 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
        display: 'block',
      }}
    >
      {/* Breadcrumb Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <IconButton
          onClick={() => navigate('/integrations')}
          color="primary"
          sx={{
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
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
          Cloud Telephony & IVR Management
        </Typography>
      </Box>

      {/* Main Container Card */}
      <AppCard
        title="Cloud Telephony & IVR Management"
        subtitle={`Configure multiple cloud telephony lines, virtual IVR numbers, and provider webhooks. Inbound calls automatically route to organization agents and land in ${industryInfo.funnelNoun} (/leads/inquiries).`}
        sx={{ overflow: 'visible', flexShrink: 0 }}
        action={
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleOpenCreateDialog}
              startIcon={<AddIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                bgcolor: '#7C3AED',
                '&:hover': { bgcolor: '#6D28D9' },
                whiteSpace: 'nowrap',
              }}
            >
              Add New IVR Line
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate('/leads/inquiries')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              View Inquiries
            </Button>
            <Button
              variant="outlined"
              startIcon={<CallIcon />}
              onClick={() => navigate('/leads/call-logs')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              View Call Logs
            </Button>
          </Stack>
        }
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              Loading Cloud Telephony configurations...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            {/* Multi-Tenant & Industry Context Badges */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <Chip
                icon={<DomainIcon sx={{ fontSize: '0.85rem !important' }} />}
                label={`Organization: ${authUser?.organizationName || 'Default Workspace'} • ${industryInfo.industryName}`}
                size="small"
                variant="outlined"
                color="secondary"
                sx={{ fontWeight: 600, fontSize: '0.75rem', height: 26 }}
              />
              <Chip
                label="Multi-Tenant Scoped"
                size="small"
                sx={{ bgcolor: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', fontWeight: 700, fontSize: '0.72rem', height: 26 }}
              />
              <Chip
                label={`${channels.length} Configured Telephony Line${channels.length === 1 ? '' : 's'}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600, fontSize: '0.75rem', height: 26 }}
              />
            </Box>

            {/* Configured Telephony Channels Cards */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <RouterIcon sx={{ color: '#7C3AED', fontSize: 20 }} />
              Configured IVR Lines & Telephony Streams
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {channels.map((ch) => {
                const chId = ch._id || (ch as any).id
                const isSelected = chId === selectedChannelId
                const isTesting = testingId === chId
                const totalCalls = ch.total_calls ?? ch.totalCalls ?? 0
                const provName = ch.provider_name || ch.providerName || ch.provider

                return (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={chId}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: isSelected ? '#7C3AED' : 'divider',
                        borderWidth: isSelected ? 2 : 1,
                        bgcolor: isSelected
                          ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(124, 58, 237, 0.03)')
                          : 'background.paper',
                        boxShadow: isSelected ? '0 4px 20px rgba(124, 58, 237, 0.12)' : 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => setSelectedChannelId(chId)}
                    >
                      <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <Chip
                                label={provName}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(124, 58, 237, 0.1)',
                                  color: '#7C3AED',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                              {ch.status === 'ACTIVE' ? (
                                <Chip
                                  icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.75rem !important' }} />}
                                  label="Active"
                                  size="small"
                                  color="success"
                                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                />
                              ) : (
                                <Chip
                                  label="Inactive"
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: 'action.disabledBackground' }}
                                />
                              )}
                            </Stack>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {ch.name}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Edit Line Settings">
                              <IconButton size="small" onClick={() => handleOpenEditDialog(ch)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {channels.length > 1 && (
                              <Tooltip title="Delete Line">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setActiveChannelForEdit(ch)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Stack>

                        <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Virtual Pilot DID Number
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', mt: 0.25 }}>
                            {ch.virtual_number || ch.virtualNumber || 'Unassigned DID'}
                          </Typography>
                        </Box>

                        <Grid container spacing={1} sx={{ mb: 1 }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Total Inbound Calls</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalCalls}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Routing Strategy</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                              {ch.routing_mode === 'ROUND_ROBIN' ? 'Round Robin' : 'Agent Extension'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>

                      <Box
                        sx={{
                          p: 1.5,
                          px: 2.5,
                          borderTop: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          bgcolor: isSelected ? 'action.hover' : 'transparent',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={ch.status === 'ACTIVE'}
                              onChange={() => handleToggleStatus(ch)}
                              color="success"
                            />
                          }
                          label={<Typography variant="caption" sx={{ fontWeight: 600 }}>{ch.status === 'ACTIVE' ? 'Live' : 'Paused'}</Typography>}
                          sx={{ m: 0 }}
                        />

                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={isTesting || ch.status !== 'ACTIVE'}
                            onClick={() => handleTestCall(ch)}
                            startIcon={isTesting ? <CircularProgress size={12} color="inherit" /> : <PlayArrowIcon />}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                          >
                            {isTesting ? 'Calling...' : 'Test Call'}
                          </Button>
                          <Button
                            size="small"
                            variant={isSelected ? 'contained' : 'outlined'}
                            onClick={() => setSelectedChannelId(chId)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              ...(isSelected ? { bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } } : {}),
                            }}
                          >
                            {isSelected ? 'Configuring' : 'Select'}
                          </Button>
                        </Stack>
                      </Box>
                    </Card>
                  </Grid>
                )
              })}

              {/* Add New Line Prompt Card */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Box
                  onClick={handleOpenCreateDialog}
                  sx={{
                    height: '100%',
                    minHeight: 220,
                    borderRadius: 2.5,
                    border: '2px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    cursor: 'pointer',
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#7C3AED',
                      bgcolor: 'rgba(124, 58, 237, 0.04)',
                    },
                  }}
                >
                  <Avatar sx={{ bgcolor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', mb: 1.5, width: 44, height: 44 }}>
                    <AddIcon />
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Configure Another IVR Line
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5, maxWidth: 240 }}>
                    Add another cloud telephony number (Tata Smartflo, TeleCMI, Exotel, MyOperator, Custom PBX).
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Selected Channel Webhook & Configuration Details */}
            {selectedChannel && (
              <Box sx={{ mb: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2.5,
                    bgcolor: selectedChannel.status === 'ACTIVE' ? 'rgba(124, 58, 237, 0.04)' : 'action.hover',
                    borderColor: 'rgba(124, 58, 237, 0.25)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: 'rgba(124, 58, 237, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PhoneInTalkIcon sx={{ fontSize: 26, color: '#7C3AED' }} />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {selectedChannel.name} ({selectedChannel.provider_name || selectedChannel.providerName})
                        </Typography>
                        {selectedChannel.status === 'ACTIVE' ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Live Stream"
                            size="small"
                            color="success"
                            sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ) : (
                          <Chip
                            icon={<WarningAmberRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Paused"
                            size="small"
                            sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
                        Inbound callers on DID {selectedChannel.virtual_number || selectedChannel.virtualNumber || 'Pilot'} automatically create {industryInfo.funnelNoun} and record audio in Call Logs.
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={() => handleTestCall(selectedChannel)}
                      disabled={testingId === selectedChannel._id || selectedChannel.status !== 'ACTIVE'}
                      startIcon={testingId === selectedChannel._id ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                        borderColor: '#7C3AED',
                        color: '#7C3AED',
                        '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.08)', borderColor: '#6D28D9' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {testingId === selectedChannel._id ? 'Simulating...' : 'Send Test Call'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleCopyUrl}
                      startIcon={<ContentCopyIcon sx={{ fontSize: '0.9rem !important' }} />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                        bgcolor: '#1e293b',
                        color: '#fff',
                        '&:hover': { bgcolor: '#0f172a' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedUrl ? 'Copied' : 'Copy Webhook URL'}
                    </Button>
                  </Stack>
                </Paper>

                {/* Webhook Endpoint & Sample JSON Payload */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, height: '100%' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                        Dedicated Inbound Webhook Endpoint
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5, fontSize: '0.8125rem' }}>
                        Enter this webhook URL into your {selectedProviderInfo?.name || 'telephony'} settings or Passthru applet. Incoming calls to this line will trigger this endpoint.
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        label="Channel Webhook URL (HTTP POST)"
                        value={webhookUrl}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={handleCopyUrl} color="primary" edge="end" size="small">
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2.5 }}
                      />

                      <TextField
                        fullWidth
                        size="small"
                        label="Dedicated Channel Token"
                        value={channelApiKey}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={handleCopyToken} color="primary" edge="end" size="small">
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText="Use this token in request body ('token') or query string (?token=...) to authenticate incoming telephony events."
                      />
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: 2.5,
                        height: '100%',
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Sample {selectedProviderInfo?.name || 'Telephony'} Payload
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon sx={{ fontSize: '0.85rem !important' }} />}
                          onClick={handleCopyJson}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                        >
                          {copiedJson ? 'Copied' : 'Copy'}
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
                        Dynamically maps caller to active agent ({agentDisplayName}):
                      </Typography>

                      <Box
                        component="pre"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f172a' : '#1e293b'),
                          color: '#38bdf8',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          overflowX: 'auto',
                          maxHeight: 220,
                          m: 0,
                        }}
                      >
                        {jsonSample}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Provider Setup Guide */}
                <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: '#7C3AED' }}>
                    {selectedProviderInfo?.name} Setup Guide
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    {selectedProviderInfo?.tagline}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
                    {selectedProviderInfo?.steps?.map((step: string, idx: number) => (
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" key={idx}>
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: '#7C3AED',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {step}
                        </Typography>
                      </Stack>
                    ))}
                  </Box>

                  <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8125rem' }}>
                    <strong>Parameter Notes:</strong> {selectedProviderInfo?.paramNotes}
                  </Alert>
                </Paper>
              </Box>
            )}

            {/* Dynamic Organization Team Routing Roster */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PeopleAltOutlinedIcon sx={{ color: '#7C3AED' }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Organization Telephony Routing Roster
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Incoming calls matching agent contact numbers or extensions route to these active team members:
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={`${teamUsers.length} Active Agents`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              {teamUsers.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No active team users found for this organization. Calls will be distributed using the default lead distribution rules.
                </Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 280 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Agent Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Registered Phone / Extension</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Email</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Routing Readiness</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teamUsers.map((u) => {
                        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email
                        const userPhone =
                          (u as any).contact_number ||
                          (u as any).contactNumber ||
                          (u as any).phone ||
                          (u as any).mobile ||
                          (u as any).fields?.contact_number ||
                          (u as any).fields?.phone ||
                          ''
                        const hasPhone = Boolean(userPhone && String(userPhone).replace(/\D/g, '').length >= 10)

                        return (
                          <TableRow key={u._id || u.id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: '#7C3AED' }}>
                                  {fullName.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {fullName}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={u.role || 'Sales'}
                                size="small"
                                sx={{ textTransform: 'capitalize', height: 20, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {userPhone || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                {u.email}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {hasPhone ? (
                                <Chip
                                  icon={<CheckCircleOutlineIcon sx={{ fontSize: '0.75rem !important' }} />}
                                  label="Ready for Routing"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                />
                              ) : (
                                <Chip
                                  label="Missing Phone"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        )}
      </AppCard>

      {/* Add New IVR Line Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Configure New IVR Telephony Line</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Channel / Line Name"
              placeholder="e.g. Primary Sales Inbound, Customer Support DID"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Telephony Provider</InputLabel>
              <Select
                value={formProvider}
                label="Telephony Provider"
                onChange={(e) => {
                  const val = e.target.value
                  setFormProvider(val)
                  const prov = providersCatalog.find((p) => p.key === val)
                  if (prov?.defaultDid && !formVirtualNumber) {
                    setFormVirtualNumber(prov.defaultDid)
                  }
                }}
              >
                {providersCatalog.map((p) => (
                  <MenuItem key={p.key} value={p.key}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.tagline}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Virtual Pilot DID Number"
              placeholder="+91 80 4567 8900"
              value={formVirtualNumber}
              onChange={(e) => setFormVirtualNumber(e.target.value)}
              helperText="The virtual pilot number configured in your cloud telephony portal."
            />

            <FormControl fullWidth>
              <InputLabel>Routing Strategy</InputLabel>
              <Select
                value={formRoutingMode}
                label="Routing Strategy"
                onChange={(e) => setFormRoutingMode(e.target.value)}
              >
                <MenuItem value="AGENT_PHONE_MATCH">Match Agent Extension / Contact Number</MenuItem>
                <MenuItem value="ROUND_ROBIN">Round Robin (Distribute Evenly Among Team)</MenuItem>
                <MenuItem value="FALLBACK_RULES">Organization Lead Distribution Rules</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Fallback Default Agent (Optional)</InputLabel>
              <Select
                value={formDefaultAgentId}
                label="Fallback Default Agent (Optional)"
                onChange={(e) => setFormDefaultAgentId(e.target.value)}
              >
                <MenuItem value="">— Automatic Distribution —</MenuItem>
                {teamUsers.map((u) => (
                  <MenuItem key={u._id || u.id} value={u._id || u.id}>
                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email} ({u.role || 'Sales'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCreate}
            disabled={savingChannel || !formName.trim()}
            startIcon={savingChannel ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#7C3AED',
              '&:hover': { bgcolor: '#6D28D9' },
            }}
          >
            {savingChannel ? 'Creating...' : 'Create IVR Line'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit IVR Line Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit IVR Telephony Line</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Channel / Line Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Telephony Provider</InputLabel>
              <Select
                value={formProvider}
                label="Telephony Provider"
                onChange={(e) => setFormProvider(e.target.value)}
              >
                {providersCatalog.map((p) => (
                  <MenuItem key={p.key} value={p.key}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Virtual Pilot DID Number"
              value={formVirtualNumber}
              onChange={(e) => setFormVirtualNumber(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Routing Strategy</InputLabel>
              <Select
                value={formRoutingMode}
                label="Routing Strategy"
                onChange={(e) => setFormRoutingMode(e.target.value)}
              >
                <MenuItem value="AGENT_PHONE_MATCH">Match Agent Extension / Contact Number</MenuItem>
                <MenuItem value="ROUND_ROBIN">Round Robin (Distribute Evenly Among Team)</MenuItem>
                <MenuItem value="FALLBACK_RULES">Organization Lead Distribution Rules</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Fallback Default Agent</InputLabel>
              <Select
                value={formDefaultAgentId}
                label="Fallback Default Agent"
                onChange={(e) => setFormDefaultAgentId(e.target.value)}
              >
                <MenuItem value="">— Automatic Distribution —</MenuItem>
                {teamUsers.map((u) => (
                  <MenuItem key={u._id || u.id} value={u._id || u.id}>
                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email} ({u.role || 'Sales'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={savingChannel || !formName.trim()}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#7C3AED',
              '&:hover': { bgcolor: '#6D28D9' },
            }}
          >
            {savingChannel ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Delete Telephony Line</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{activeChannelForEdit?.name}</strong>? Incoming calls to this webhook token will no longer be processed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteChannel} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete Line
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default IvrPage

