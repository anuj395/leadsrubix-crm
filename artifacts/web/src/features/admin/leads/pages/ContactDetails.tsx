import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack'
import ImageIcon from '@mui/icons-material/Image'
import DescriptionIcon from '@mui/icons-material/Description'
import TransformIcon from '@mui/icons-material/Transform'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import LaunchIcon from '@mui/icons-material/Launch'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listContacts, type Contact } from '@/services/contactsService'
import { listDeals, createDeal, listPipelines, type Deal, type Pipeline, type Stage } from '@/services/dealsService'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { api } from '@/services/api'
import CallbackModal from '../components/CallbackModal'
import NotInterestedModal from '../components/NotInterestedModal'
import LostModal from '../components/LostModal'
import RescheduleModal from '../components/RescheduleModal'
import NotesModal from '../components/NotesModal'
import CreateTaskModal from '../components/CreateTaskModal'
import LogCallModal from '../components/LogCallModal'
import ConvertLeadModal from '../components/ConvertLeadModal'
import UnifiedActivityTimeline from '../components/UnifiedActivityTimeline'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'

interface Booking {
  _id: string
  contactId: string
  notes: any[]
  attachments: any[]
  callLogs: any[]
  bookingDetails: any[]
}

const formatCurrency = (val: number | undefined | null) => {
  if (val == null || isNaN(val)) return '₹0'
  return '₹' + Number(val).toLocaleString('en-IN')
}

export default function ContactDetailsPage() {
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [contact, setContact] = useState<Contact | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const { can_edit, can_add } = useActionPermission('contacts')
  const [tasks, setTasks] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  // Dialog controls
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [dealModalOpen, setDealModalOpen] = useState(false)

  // Deal Form State for Contact
  const [dealForm, setDealForm] = useState<Record<string, any>>({
    title: '',
    amount: '',
    pipelineId: '',
    stage: '',
    stageId: '',
    contactName: '',
    ownerName: '',
    expectedCloseDate: '',
    notes: ''
  })
  const [savingDeal, setSavingDeal] = useState(false)

  const [attachOpen, setAttachOpen] = useState(false)
  const [attachName, setAttachName] = useState('')
  const [attachUrl, setAttachUrl] = useState('')
  const [attachType, setAttachType] = useState<'photo' | 'video' | 'file'>('photo')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [uploadingAttach, setUploadingAttach] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!attachName) {
        setAttachName(file.name)
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFileBase64(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddAttachment = async () => {
    if (!selectedFile && !attachUrl.trim()) {
      setToast({ open: true, msg: 'Please select a file to upload or enter a URL', sev: 'error' })
      return
    }

    try {
      setUploadingAttach(true)
      const payload: any = {
        name: attachName.trim() || selectedFile?.name || 'Attachment',
        type: attachType,
      }

      if (fileBase64) {
        payload.base64Data = fileBase64
      } else if (attachUrl.trim()) {
        payload.url = attachUrl.trim()
      }

      await api.post(`contacts/${id}/attachments`, payload)
      setToast({ open: true, msg: 'Attachment uploaded successfully!', sev: 'success' })
      setAttachOpen(false)
      setAttachName('')
      setAttachUrl('')
      setSelectedFile(null)
      setFileBase64(null)
      await loadData()
    } catch (err: any) {
      console.error('Failed to add attachment', err)
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to upload attachment', sev: 'error' })
    } finally {
      setUploadingAttach(false)
    }
  }

  const handleDeleteAttachment = async (attachId: string) => {
    try {
      await api.delete(`contacts/${id}/attachments/${attachId}`)
      setToast({ open: true, msg: 'Attachment deleted successfully', sev: 'success' })
      await loadData()
    } catch (err: any) {
      console.error('Failed to delete attachment', err)
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to delete attachment', sev: 'error' })
    }
  }

  const [callbackOpen, setCallbackOpen] = useState(false)
  const [notInterestedOpen, setNotInterestedOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const { columns: dbColumns, loading: configLoading } = useTableConfig('contacts', industryId)

  const loadData = async () => {
    if (!id) return
    try {
      const [singleRes, contactsList] = await Promise.all([
        api.get(`contacts/${id}`).catch(() => null),
        listContacts().catch(() => [])
      ])
      const match = singleRes?.data?.item || singleRes?.data || contactsList.find((c) => c._id === id)
      if (match) {
        setContact(match)

        const [bookingRes, tasksRes, notesRes, dealsList, pipesList, callsRes] = await Promise.all([
          api.get('bookings', { params: { contactId: id } }).catch(() => ({ data: { items: [] } })),
          api.get('tasks', { params: { contactId: id, contact_id: id, pageSize: 200 } }).catch(() => ({ data: { items: [] } })),
          api.get('resources/notes', { params: { contactId: id } }).catch(() => ({ data: { items: [] } })),
          listDeals({ contactId: id }).catch(() => [] as Deal[]),
          listPipelines().catch(() => [] as Pipeline[]),
          api.get('call-logs', { params: { contactId: id } }).catch(() => ({ data: { items: [] } }))
        ])

        if (bookingRes.data?.items?.length) {
          setBooking(bookingRes.data.items[0])
        } else {
          setBooking(null)
        }

        if (tasksRes.data?.items || Array.isArray(tasksRes.data)) {
          const tItems = tasksRes.data?.items || (Array.isArray(tasksRes.data) ? tasksRes.data : [])
          const matchTasks = tItems.filter((t: any) => String(t.contact_id || t.contactId || '') === String(id))
          setTasks(matchTasks)
        } else {
          setTasks([])
        }

        if (notesRes.data?.items || Array.isArray(notesRes.data)) {
          const notesArr = Array.isArray(notesRes.data) ? notesRes.data : notesRes.data.items
          const matchNotes = notesArr.filter((n: any) => String(n.contact_id || n.contactId || '') === String(id))
          setNotes(matchNotes)
        } else {
          setNotes([])
        }

        // Call logs from booking or direct API
        const directCalls = callsRes.data?.items || (Array.isArray(callsRes.data) ? callsRes.data : [])
        const matchPhone = String(match.contactNumber || match.contact_number || match.phone || '').trim()
        const matchDirectCalls = directCalls.filter((c: any) => {
          const cCId = String(c.contact_id || c.contactId || '')
          const cPhone = String(c.phone || c.contactNumber || c.contact_number || '').trim()
          return cCId === String(id) || (matchPhone && cPhone === matchPhone)
        })
        const bookingCalls = bookingRes.data?.items?.[0]?.callLogs || []
        const mergedCalls = [...matchDirectCalls, ...bookingCalls]
        const uniqueCalls = mergedCalls.filter((v, i, a) => a.findIndex(t => (t._id || t.id) === (v._id || v.id)) === i)
        setCalls(uniqueCalls)

        const matchDeals = (dealsList || []).filter((d: any) => String(d.contactId || d.contact_id || '') === String(id))
        setDeals(matchDeals)
        setPipelines(pipesList)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [id])

  // Calculated Deals Statistics for this contact
  const dealMetrics = useMemo(() => {
    let totalVal = 0
    let wonVal = 0
    deals.forEach((d) => {
      const amt = Number(d.amount || 0)
      totalVal += amt
      const st = String(d.stage || d.stageId || d.stage_id || '').toUpperCase()
      if (st.includes('WON') || st.includes('BOOKED')) {
        wonVal += amt
      }
    })
    return {
      count: deals.length,
      totalVal,
      wonVal
    }
  }, [deals])

  const [resolvedDealsScreen, setResolvedDealsScreen] = useState<ResolvedScreen | null>(null)

  useEffect(() => {
    if (!contact) return
    const orgId = (contact.organization_id || contact.organizationId || (user as any)?.organizationId || (user as any)?.organization_id) as string | undefined
    const indId = (contact.industry_id || contact.industryId || user?.industryId) as string | undefined
    void resolveScreen({
      screenKey: 'deals',
      industryCode: indId,
      organizationId: orgId,
    }).then(res => setResolvedDealsScreen(res)).catch(() => setResolvedDealsScreen(null))
  }, [contact, user?.industryId, (user as any)?.organizationId, (user as any)?.organization_id])

  const handleOpenAddDeal = () => {
    const customerName = contact?.customerName || contact?.customer_name || 'Client'
    const defaultPipe = pipelines.find(p => p.isDefault || p.is_default) || pipelines[0]
    const defaultPipeId = String(defaultPipe?._id || defaultPipe?.id || '')
    const firstStage = defaultPipe?.stages?.[0]
    const firstStageId = String(firstStage?.stageId || firstStage?.stage_id || firstStage?.name || 'New Enquiry')

    setDealForm({
      title: `${customerName} - Opportunity`,
      amount: contact?.budget ? String(contact.budget).replace(/[^0-9]/g, '') : '500000',
      pipelineId: defaultPipeId,
      stage: firstStageId,
      stageId: firstStageId,
      probability: firstStage?.probability ?? 10,
      contactName: customerName,
      ownerName: user?.name || user?.email || '',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    })
    setDealModalOpen(true)
  }

  const handleSaveContactDeal = async (values?: Record<string, any>) => {
    const formVals = values || dealForm
    const titleVal = String(formVals.title || formVals.name || '').trim()
    if (!contact || !titleVal) {
      setToast({ open: true, msg: 'Please provide Deal Title', sev: 'error' })
      return
    }

    try {
      setSavingDeal(true)
      const selectedPipe = pipelines.find(p => (p._id || p.id) === (formVals.pipelineId || dealForm.pipelineId)) || pipelines[0]
      const stageVal = formVals.stage || formVals.stageId || dealForm.stageId
      const selectedStageObj = selectedPipe?.stages?.find(s => (s.stageId || s.stage_id || s.name) === stageVal) || selectedPipe?.stages?.[0]

      const orgId = (contact.organization_id || contact.organizationId || (user as any)?.organizationId || (user as any)?.organization_id) as string
      const indId = (contact.industry_id || contact.industryId || user?.industryId || 'temp0001') as string

      const payload = {
        ...formVals,
        title: titleVal,
        name: titleVal,
        amount: Number(formVals.amount || dealForm.amount || 0),
        pipelineId: formVals.pipelineId || (selectedPipe?._id || selectedPipe?.id),
        pipeline_id: formVals.pipelineId || (selectedPipe?._id || selectedPipe?.id),
        stageId: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage_id: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage: selectedStageObj?.name || stageVal || 'New Enquiry',
        probability: typeof formVals.probability === 'number' ? formVals.probability : (selectedStageObj?.probability ?? 10),
        expectedCloseDate: formVals.expectedCloseDate || dealForm.expectedCloseDate,
        expected_close_date: formVals.expectedCloseDate || dealForm.expectedCloseDate,
        contactId: contact._id,
        contact_id: contact._id,
        contactName: String(contact.customerName || contact.customer_name || ''),
        contactPhone: String(contact.contactNumber || contact.contact_number || ''),
        contactEmail: String(contact.emailId || contact.email_id || ''),
        organizationId: orgId,
        organization_id: orgId,
        industryId: indId,
        industry_id: indId,
        ownerId: user?.id,
        ownerName: formVals.ownerName || user?.name || user?.email,
        ownerEmail: user?.email,
        notes: formVals.notes || dealForm.notes || ''
      }

      await createDeal(payload)
      setToast({ open: true, msg: 'Deal created and linked to contact successfully!', sev: 'success' })
      setDealModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to create deal', sev: 'error' })
    } finally {
      setSavingDeal(false)
    }
  }

  const saveBookingUpdate = async (updatedFields: Partial<Booking>) => {
    if (!contact) return
    try {
      setLoading(true)
      if (booking?._id) {
        await api.put(`bookings/${booking._id}`, updatedFields)
      } else {
        await api.post('bookings', {
          contactId: contact._id,
          customerName: contact.customerName || 'N/A',
          contactNumber: contact.contactNumber || '',
          ...updatedFields
        })
      }
      setToast({ open: true, msg: 'Saved successfully', sev: 'success' })
      await loadData()
    } catch (err) {
      setToast({ open: true, msg: 'Failed to save updates', sev: 'error' })
      setLoading(false)
    }
  }



  if (loading || configLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!contact) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Contact not found</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/leads/contacts')}>
          Back to Inquiries & Leads
        </Button>
      </Box>
    )
  }

  const currentStage = String(contact.stage || 'FRESH').toUpperCase()
  const normalizedStage = currentStage.trim().replace(/_/g, ' ')

  const isFresh = ['FRESH', 'NEW', 'CONNECTED'].includes(normalizedStage)
  const isCallback = ['CALLBACK', 'CALL BACK', 'RE-CALL BACK'].includes(normalizedStage)
  const isInterested = ['INTERESTED', 'MEETING', 'SITE VISIT', 'FOLLOW UP'].includes(normalizedStage)
  const isClosedLost = ['NOT INTERESTED', 'NOTINTERESTED', 'LOST', 'DROP', 'CLOSED LOST', 'JUNK'].includes(normalizedStage)
  const isConverted = Boolean(contact.is_converted || contact.isConverted)

  const detailsFields = dbColumns.filter(
    (col) => !['customerName', 'contactNumber', 'emailId'].includes(col.key)
  )

  const activePipeForForm = pipelines.find(p => (p._id || p.id) === dealForm.pipelineId) || pipelines[0]
  const activeStagesForForm: Stage[] = activePipeForForm?.stages || []

  // Customer initials for avatar
  const customerNameStr = String(contact.customerName || 'Contact')
  const customerInitials = customerNameStr
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        fullHeight
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Back to Inquiries & Leads">
              <IconButton
                onClick={() => navigate('/leads/contacts')}
                sx={{
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  '&:hover': { bgcolor: 'action.selected' }
                }}
                size="small"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Avatar
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                width: 44,
                height: 44,
                fontSize: '1.1rem',
                borderRadius: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              {customerInitials}
            </Avatar>

            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'capitalize', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {customerNameStr}
                </Typography>
                <StatusBadge value={currentStage} />
                {isConverted && (
                  <Chip
                    label="Converted to Deal"
                    color="success"
                    icon={<CheckCircleIcon />}
                    size="small"
                    sx={{ fontWeight: 600, height: 24 }}
                  />
                )}
              </Stack>
            </Box>
          </Box>
        }
        subtitle={
          <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" sx={{ mt: 1, color: 'text.secondary', pl: { xs: 0, sm: 7.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PhoneIcon sx={{ fontSize: '1rem', color: 'primary.main', opacity: 0.85 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {contact.contactNumber ? String(contact.contactNumber) : 'No Phone'}
              </Typography>
            </Box>
            {Boolean(contact.emailId) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <EmailIcon sx={{ fontSize: '1rem', color: 'primary.main', opacity: 0.85 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {String(contact.emailId)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FingerprintIcon sx={{ fontSize: '1rem', color: 'text.secondary', opacity: 0.7 }} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                ID: {String(contact._id || id || '')}
              </Typography>
            </Box>
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} alignItems="center">
            {/* Stage Quick Action Buttons */}
            {can_edit && isFresh && (
              <Stack direction="row" spacing={0.75}>
                <Button variant="contained" color="success" size="small" onClick={() => navigate(`/leads/contacts/${contact._id}/interested`)} sx={{ textTransform: 'none', fontWeight: 600 }}>Interested</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setCallbackOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Call Back</Button>
                <Button variant="contained" color="error" size="small" onClick={() => setNotInterestedOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Not Interested</Button>
              </Stack>
            )}
            {can_edit && isCallback && (
              <Stack direction="row" spacing={0.75}>
                <Button variant="contained" color="success" size="small" onClick={() => navigate(`/leads/contacts/${contact._id}/interested`)} sx={{ textTransform: 'none', fontWeight: 600 }}>Interested</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setCallbackOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Re-Call Back</Button>
                <Button variant="contained" color="error" size="small" onClick={() => setNotInterestedOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Not Interested</Button>
              </Stack>
            )}
            {can_edit && isInterested && (
              <Stack direction="row" spacing={0.75}>
                <Button variant="contained" color="error" size="small" onClick={() => setLostOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Lost</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setRescheduleOpen(true)} sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}>Re-Schedule</Button>
                <Button variant="contained" color="primary" size="small" onClick={() => setTaskOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>Create Task</Button>
              </Stack>
            )}

            {!isClosedLost && (
              <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', display: { xs: 'none', sm: 'block' } }} />
            )}

            {/* Primary Action: Convert to Deal (if qualified/interested and not converted) OR + New Deal (if converted) */}
            {!isClosedLost && (
              !isConverted ? (
                isInterested && can_edit && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<TransformIcon />}
                    onClick={() => setConvertOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Convert to Deal
                  </Button>
                )
              ) : (
                can_add && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<HandshakeOutlinedIcon />}
                    onClick={handleOpenAddDeal}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    + New Deal
                  </Button>
                )
              )
            )}

            {/* Edit Contact Button (Hidden if lead is Lost or Not Interested) */}
            {can_edit && !isClosedLost && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/leads/contacts/${contact._id}/edit`)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Edit Contact
              </Button>
            )}
          </Stack>
        }
      >
        {/* Sticky tabs bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val: number) => setActiveTab(val)}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }
            }}
          >
            <Tab label="Activity & Timeline" />
            <Tab label="Profile Information" />
            <Tab label={`Deals & Pipeline (${deals.length})`} />
            <Tab label={`Notes & Attachments (${notes.length + ((contact as any)?.attachments?.length || 0)})`} />
          </Tabs>
        </Box>

        {/* Scrollable Tab Content Container */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
          {/* Tab 0: Unified Activity Timeline */}
          {activeTab === 0 && (
            <Box sx={{ width: '100%', py: 1 }}>
              <UnifiedActivityTimeline
                calls={calls}
                tasks={tasks}
                notes={notes}
                deals={deals}
                onOpenCallModal={() => setLogCallOpen(true)}
                onOpenTaskModal={() => setTaskOpen(true)}
                onOpenNoteModal={() => setNoteOpen(true)}
                onOpenDealModal={handleOpenAddDeal}
                canAdd={can_add || can_edit}
              />
            </Box>
          )}

          {/* Tab 1: Profile Information */}
          {activeTab === 1 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2.5fr 1fr' }, gap: 3, width: '100%', py: 1 }}>
              {/* Left Column - Form detail cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Basic Information Section */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Basic Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Customer Name</Typography>
                      <Typography variant="body1" fontWeight={500}>{customerNameStr}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Lead Stage</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusBadge value={currentStage} />
                      </Box>
                    </Box>
                    {!!contact.contactNumber && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Contact Number</Typography>
                        <Typography variant="body1">{String(contact.contactNumber)}</Typography>
                      </Box>
                    )}
                    {!!contact.emailId && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Email Address</Typography>
                        <Typography variant="body1">{String(contact.emailId)}</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* Lead Details Section */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Lead Details</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                    {detailsFields.map((col) => {
                      const getFieldValue = (obj: any, key: string) => {
                        if (!obj || !key) return undefined
                        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key]
                        const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
                        if (obj[camelKey] !== undefined && obj[camelKey] !== null && obj[camelKey] !== '') return obj[camelKey]
                        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
                        if (obj[snakeKey] !== undefined && obj[snakeKey] !== null && obj[snakeKey] !== '') return obj[snakeKey]
                        return undefined
                      }
                      const val = getFieldValue(contact, col.key)
                      return (
                        <Box key={col.key}>
                          <Typography variant="caption" color="text.secondary" display="block">{col.label}</Typography>
                          <Typography variant="body1">{val == null || val === '' ? '—' : String(val)}</Typography>
                        </Box>
                      )
                    })}
                    {detailsFields.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No dynamic custom fields configured.</Typography>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Right Column - Metadata card */}
              <Box>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>System Metadata</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Created By</Typography>
                      <Typography variant="body2">
                        {String(
                          contact.createdByName ||
                          contact.contactOwnerEmail ||
                          (contact.createdBy && !/^[0-9a-fA-F]{24}$/.test(String(contact.createdBy)) ? contact.createdBy : '') ||
                          user?.name ||
                          user?.email ||
                          'System'
                        )}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Created At</Typography>
                      <Typography variant="body2">{contact.createdAt ? new Date(contact.createdAt as any).toLocaleString() : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Last Modified At</Typography>
                      <Typography variant="body2">{contact.modifiedAt ? new Date(contact.modifiedAt as any).toLocaleString() : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Record ID</Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mt: 0.25 }}>
                        {contact._id}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          )}

          {/* Tab 2: Deals & Pipeline */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', py: 1 }}>
              {/* Deals List Table & Actions */}
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <HandshakeOutlinedIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Sales Deals for {customerNameStr}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LaunchIcon />}
                      onClick={() => navigate('/leads/deals-list')}
                      sx={{ textTransform: 'none' }}
                    >
                      Open Deals Pipeline
                    </Button>
                  </Stack>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {deals.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <HandshakeOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                    <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                      No Deals Created Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                      Revenue and pipeline stages for this contact will be displayed here once a deal is created.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Deal Title</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Deal Value</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Probability</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Expected Close</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Owner</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deals.map((deal) => {
                          const dealId = String(deal._id || deal.id)
                          const prob = Number(deal.probability || 0)
                          return (
                            <TableRow key={dealId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate('/leads/deals-list')}>
                              <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {deal.title || deal.name || 'Untitled Deal'}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                {formatCurrency(deal.amount)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={deal.stage || deal.stageId || 'New'}
                                  color={String(deal.stage).toUpperCase().includes('WON') ? 'success' : 'primary'}
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 120 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={prob}
                                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 28 }}>
                                    {prob}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {deal.expectedCloseDate || deal.expected_close_date ? new Date(deal.expectedCloseDate || deal.expected_close_date as any).toLocaleDateString() : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {deal.ownerName || deal.owner_name || deal.ownerEmail || '—'}
                                </Typography>
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

          {/* Tab 3: Notes & Attachments */}
          {activeTab === 3 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, width: '100%', py: 1 }}>
              {/* Left Side: Notes list */}
              <Box>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 450, borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Notes History</Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setNoteOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      + Add Note
                    </Button>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    {(notes ?? []).map((n: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="caption" fontWeight="bold" color="primary">{String(n.userEmail || n.user_email || 'System')}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(n.createdAt || n.created_at || new Date()).toLocaleDateString()}</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{String(n.note || n.notes || '')}</Typography>
                      </Paper>
                    ))}
                    {(notes ?? []).length === 0 && (
                      <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>No Notes recorded yet. Click "+ Add Note" to create one.</Typography>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Right Side: Attachments upload */}
              <Box>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 450, borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Resource Attachments</Typography>
                    <Stack direction="row" spacing={0.75}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ImageIcon />}
                        onClick={() => { setAttachOpen(true); setAttachType('photo'); setSelectedFile(null); setFileBase64(null); setAttachName(''); setAttachUrl(''); }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Photo
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VideoCameraBackIcon />}
                        onClick={() => { setAttachOpen(true); setAttachType('video'); setSelectedFile(null); setFileBase64(null); setAttachName(''); setAttachUrl(''); }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Video
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DescriptionIcon />}
                        onClick={() => { setAttachOpen(true); setAttachType('file'); setSelectedFile(null); setFileBase64(null); setAttachName(''); setAttachUrl(''); }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Document
                      </Button>
                    </Stack>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                    {((contact as any)?.attachments ?? []).map((a: any, i: number) => {
                      const attachId = a._id || a.id || String(i)
                      const isPhoto = a.type === 'photo'
                      const isVideo = a.type === 'video'
                      return (
                        <Paper key={attachId} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 1 }}>
                          <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: isPhoto ? 'success.light' : isVideo ? 'secondary.light' : 'primary.light', color: '#fff' }}>
                              {isVideo && <VideoCameraBackIcon fontSize="small" />}
                              {isPhoto && <ImageIcon fontSize="small" />}
                              {!isVideo && !isPhoto && <DescriptionIcon fontSize="small" />}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: { xs: 140, sm: 220 } }}>
                                {String(a.name || 'Attachment')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.size ? `${(a.size / 1024 / 1024).toFixed(2)} MB • ` : ''}
                                {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : 'Uploaded'}
                              </Typography>
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button
                              href={String(a.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              variant="outlined"
                              startIcon={<OpenInNewIcon fontSize="small" />}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              View
                            </Button>
                            {can_edit && (
                              <Tooltip title="Delete Attachment">
                                <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(attachId)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Paper>
                      )
                    })}
                    {((contact as any)?.attachments ?? []).length === 0 && (
                      <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <CloudUploadIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">No Attachments uploaded yet.</Typography>
                        <Typography variant="caption" color="text.disabled">Click Photo, Video, or Document above to upload.</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>
          )}
        </Box>
      </AppCard>

      {/* Add Deal Dialog for this Contact */}
      <Dialog open={dealModalOpen} onClose={() => setDealModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HandshakeOutlinedIcon color="primary" />
          Create {resolvedDealsScreen?.name || resolvedDealsScreen?.screen?.name || 'Deal'} for {String(contact.customerName || 'Contact')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <DynamicForm
              screen="deals"
              industryCode={String(contact.industryId || contact.industry_id || user?.industryId || 'temp0001')}
              organizationId={String(contact.organizationId || (user as any)?.organizationId || (user as any)?.organization_id || '')}
              customOptions={{
                stage: activeStagesForForm.map((s) => ({
                  value: s.stageId || s.stage_id || s.name,
                  label: `${s.name} (${s.probability}%)`,
                })),
              }}
              initialValues={dealForm}
              onSubmit={handleSaveContactDeal}
              onCancel={() => setDealModalOpen(false)}
              submitLabel="Create Deal"
            />
          </Box>
        </DialogContent>
      </Dialog>

      <ConvertLeadModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        contact={contact}
        onSuccess={() => {
          setToast({ open: true, msg: 'Lead converted to Account & Deal successfully!', sev: 'success' })
          void loadData()
        }}
      />

      <NotesModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        contactId={contact?._id || ''}
        customerName={contact?.customerName ? String(contact.customerName) : undefined}
        contactNumber={contact?.contactNumber ? String(contact.contactNumber) : undefined}
        onSuccess={loadData}
      />

      <CreateTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        contact={contact}
        tasksData={tasks}
        onSuccess={loadData}
      />

      <LogCallModal
        open={logCallOpen}
        onClose={() => setLogCallOpen(false)}
        contact={contact}
        onSuccess={loadData}
      />

      {/* Attachment Dialog */}
      <Dialog open={attachOpen} onClose={() => !uploadingAttach && setAttachOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon color="primary" />
          Upload {attachType === 'photo' ? 'Photo' : attachType === 'video' ? 'Video' : 'Document'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* File Upload Zone */}
            <Box
              sx={{
                border: '2px dashed',
                borderColor: selectedFile ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: selectedFile ? 'action.selected' : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
              }}
              component="label"
            >
              <input
                type="file"
                hidden
                accept={
                  attachType === 'photo'
                    ? 'image/*'
                    : attachType === 'video'
                    ? 'video/*'
                    : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
                }
                onChange={handleFileChange}
              />
              <CloudUploadIcon sx={{ fontSize: 40, color: selectedFile ? 'primary.main' : 'text.secondary', mb: 1 }} />
              {selectedFile ? (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="primary.main">{selectedFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Click or Drag file to select</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {attachType === 'photo' ? 'Supports JPG, PNG, WEBP, GIF' : attachType === 'video' ? 'Supports MP4, MOV, WEBM' : 'Supports PDF, Word, Excel, CSV'}
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              label="Attachment Title / Name"
              type="text"
              fullWidth
              size="small"
              value={attachName}
              onChange={(e) => setAttachName(e.target.value)}
              placeholder="e.g. Site Visit Photos, ID Proof, Agreement"
            />

            <Divider>
              <Typography variant="caption" color="text.secondary">OR ENTER EXTERNAL URL</Typography>
            </Divider>

            <TextField
              label="Resource URL (Optional)"
              type="url"
              fullWidth
              size="small"
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
              placeholder="https://..."
              disabled={Boolean(selectedFile)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAttachOpen(false)} disabled={uploadingAttach} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleAddAttachment}
            variant="contained"
            disabled={uploadingAttach || (!selectedFile && !attachUrl.trim())}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            {uploadingAttach ? <CircularProgress size={20} color="inherit" /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <CallbackModal
        open={callbackOpen}
        onClose={() => setCallbackOpen(false)}
        contactId={contact._id}
        onSuccess={loadData}
      />

      <NotInterestedModal
        open={notInterestedOpen}
        onClose={() => setNotInterestedOpen(false)}
        contactId={contact._id}
        onSuccess={loadData}
      />

      <LostModal
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        contactId={contact._id}
        onSuccess={loadData}
      />

      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        contactId={contact._id}
        onSuccess={loadData}
      />

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
