import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import MenuItem from '@mui/material/MenuItem'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack'
import ImageIcon from '@mui/icons-material/Image'
import DescriptionIcon from '@mui/icons-material/Description'
import CallIcon from '@mui/icons-material/Call'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listContacts, updateContact, type Contact } from '@/services/contactsService'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { api } from '@/services/api'
import CallbackModal from '../components/CallbackModal'
import NotInterestedModal from '../components/NotInterestedModal'
import LostModal from '../components/LostModal'
import RescheduleModal from '../components/RescheduleModal'

interface Booking {
  _id: string
  contactId: string
  notes: any[]
  attachments: any[]
  callLogs: any[]
  bookingDetails: any[] // tasks
}

export default function ContactDetailsPage() {
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [contact, setContact] = useState<Contact | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  // Dialog controls
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const [taskOpen, setTaskOpen] = useState(false)
  const [taskType, setTaskType] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  const [attachOpen, setAttachOpen] = useState(false)
  const [attachName, setAttachName] = useState('')
  const [attachUrl, setAttachUrl] = useState('')
  const [attachType, setAttachType] = useState('file')

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
      const contactsList = await listContacts()
      const match = contactsList.find((c) => c._id === id)
      if (match) {
        setContact(match)

        const bookingRes = await api.get('bookings', { params: { contactId: id } })
        const bookingsList = (bookingRes.data?.items ?? []) as Booking[]
        if (bookingsList.length > 0) {
          setBooking(bookingsList[0])
        } else {
          setBooking(null)
        }
      } else {
        setToast({ open: true, msg: 'Contact not found', sev: 'error' })
      }
    } catch (e) {
      setToast({ open: true, msg: 'Failed to load details', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [id])

  const handleStageChange = async (newStage: string) => {
    if (!contact) return
    try {
      setLoading(true)
      await updateContact(contact._id, { stage: newStage })
      setToast({ open: true, msg: `Stage updated to ${newStage}`, sev: 'success' })
      await loadData()
    } catch (err) {
      setToast({ open: true, msg: 'Failed to update lead stage', sev: 'error' })
      setLoading(false)
    }
  }

  const saveBookingUpdate = async (updatedFields: Partial<Booking>) => {
    if (!contact) return
    try {
      setLoading(true)
      if (booking) {
        await api.put(`bookings/${booking._id}`, { ...booking, ...updatedFields })
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

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    const newNote = {
      note: noteText,
      created_at: new Date(),
      userEmail: user?.email || 'System'
    }
    const currentNotes = booking?.notes ?? []
    await saveBookingUpdate({ notes: [...currentNotes, newNote] })
    setNoteOpen(false)
    setNoteText('')
  }

  const handleAddTask = async () => {
    if (!taskType.trim() || !taskDueDate) return
    const newTask = {
      type: taskType,
      due_date: new Date(taskDueDate),
      status: 'PENDING'
    }
    const currentTasks = booking?.bookingDetails ?? []
    await saveBookingUpdate({ bookingDetails: [...currentTasks, newTask] })
    setTaskOpen(false)
    setTaskType('')
    setTaskDueDate('')
  }

  const handleAddAttachment = async () => {
    if (!attachName.trim() || !attachUrl.trim()) return
    const newAttachment = {
      name: attachName,
      url: attachUrl,
      type: attachType,
      created_at: new Date()
    }
    const currentAttachments = booking?.attachments ?? []
    await saveBookingUpdate({ attachments: [...currentAttachments, newAttachment] })
    setAttachOpen(false)
    setAttachName('')
    setAttachUrl('')
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/leads/contacts')} sx={{ mt: 2 }}>
          Back to Contacts
        </Button>
      </Box>
    )
  }

  const currentStage = String(contact.stage || 'FRESH').toUpperCase()

  // Dynamic fields list minus basic info keys
  const detailsFields = dbColumns.filter(
    (col) => !['customerName', 'contactNumber', 'emailId'].includes(col.key)
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        fullHeight
        title={String(contact.customerName || 'Contact Details')}
        subtitle={String(contact.emailId || 'No Email Address')}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/leads/contacts')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            
            {/* Stage Action Buttons */}
            {currentStage === 'FRESH' && (
              <>
                <Button variant="contained" color="success" size="small" onClick={() => navigate(`/leads/contacts/${contact._id}/interested`)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Interested</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setCallbackOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Call Back</Button>
                <Button variant="contained" color="error" size="small" onClick={() => setNotInterestedOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Not Interested</Button>
              </>
            )}
            {currentStage === 'CALL BACK' && (
              <>
                <Button variant="contained" color="success" size="small" onClick={() => navigate(`/leads/contacts/${contact._id}/interested`)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Interested</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setCallbackOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Re-Callback</Button>
                <Button variant="contained" color="error" size="small" onClick={() => setNotInterestedOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Not Interested</Button>
              </>
            )}
            {currentStage === 'INTERESTED' && (
              <>
                <Button variant="contained" color="success" size="small" onClick={() => handleStageChange('WON')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Won</Button>
                <Button variant="contained" color="error" size="small" onClick={() => setLostOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Lost</Button>
                <Button variant="contained" color="warning" size="small" onClick={() => setRescheduleOpen(true)} sx={{ textTransform: 'none', fontWeight: 'bold', color: '#fff' }}>Re-Schedule</Button>
                <Button variant="contained" color="secondary" size="small" onClick={() => { setTaskType(''); setTaskOpen(true); }} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Create</Button>
              </>
            )}
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate(`/leads/contacts/${contact._id}/edit`)}
              sx={{ textTransform: 'none' }}
            >
              Edit Details
            </Button>
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
                backgroundColor: 'var(--primary-main)',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }
            }}
          >
            <Tab label="Profile Information" />
            <Tab label="Notes & Attachments" />
            <Tab label="Activity & Tasks" />
          </Tabs>
        </Box>

        {/* Scrollable Tab Content Container */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
          {/* Tab 0: Profile Information (Basic & Lead Details + Metadata) */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Left Column - Form detail cards */}
              <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Basic Information Section */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Basic Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Customer Name</Typography>
                      <Typography variant="body1" fontWeight={500}>{String(contact.customerName || '—')}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Lead Stage</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusBadge value={currentStage} />
                      </Box>
                    </Grid>
                    {!!contact.contactNumber && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Contact Number</Typography>
                        <Typography variant="body1">{String(contact.contactNumber)}</Typography>
                      </Grid>
                    )}
                    {!!contact.emailId && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Email Address</Typography>
                        <Typography variant="body1">{String(contact.emailId)}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>

                {/* Lead Details Section */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Lead Details</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {detailsFields.map((col) => {
                      const val = contact[col.key]
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={col.key}>
                          <Typography variant="caption" color="text.secondary" display="block">{col.label}</Typography>
                          <Typography variant="body1">{val == null || val === '' ? '—' : String(val)}</Typography>
                        </Grid>
                      )
                    })}
                    {detailsFields.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No dynamic custom fields configured.</Typography>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Right Column - Metadata card */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>System Metadata</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Created By</Typography>
                      <Typography variant="body2">{String(contact.createdBy || 'API Lead Webhook')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Created At</Typography>
                      <Typography variant="body2">{contact.createdAt ? new Date(contact.createdAt as any).toLocaleString() : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Last Modified At</Typography>
                      <Typography variant="body2">{contact.modifiedAt ? new Date(contact.modifiedAt as any).toLocaleString() : '—'}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Notes & Attachments */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              {/* Left Side: Notes list */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 400 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Notes History</Typography>
                    <IconButton size="small" onClick={() => setNoteOpen(true)} color="primary">
                      <AddCircleOutlineIcon />
                    </IconButton>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowY: 'auto', maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    {(booking?.notes ?? []).map((n: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="caption" fontWeight="bold" color="primary">{String(n.userEmail)}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(n.created_at).toLocaleDateString()}</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{String(n.note)}</Typography>
                      </Paper>
                    ))}
                    {(booking?.notes ?? []).length === 0 && (
                      <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>No Notes recorded yet.</Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Right Side: Attachments upload */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 400 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Resource Attachments</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => { setAttachOpen(true); setAttachType('video'); }}>
                        <VideoCameraBackIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => { setAttachOpen(true); setAttachType('photo'); }}>
                        <ImageIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => { setAttachOpen(true); setAttachType('file'); }}>
                        <DescriptionIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowY: 'auto', maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                    {(booking?.attachments ?? []).map((a: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {a.type === 'video' && <VideoCameraBackIcon fontSize="small" />}
                          {a.type === 'photo' && <ImageIcon fontSize="small" />}
                          {a.type === 'file' && <DescriptionIcon fontSize="small" />}
                          <Typography variant="body2" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{String(a.name)}</Typography>
                        </Box>
                        <Button href={String(a.url)} target="_blank" size="small" variant="outlined" sx={{ textTransform: 'none' }}>View</Button>
                      </Paper>
                    ))}
                    {(booking?.attachments ?? []).length === 0 && (
                      <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>No Attachments uploaded yet.</Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tab 2: Activity & Tasks */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              {/* Left Column: Follow-up Tasks */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Follow-up Tasks</Typography>
                    <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setTaskOpen(true)}>Add Task</Button>
                  </Stack>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tasks</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(booking?.bookingDetails ?? []).map((t: any, i: number) => {
                          const taskDate = new Date(t.due_date)
                          return (
                            <TableRow key={i}>
                              <TableCell>{String(t.type)}</TableCell>
                              <TableCell>{taskDate.toLocaleDateString()}</TableCell>
                              <TableCell>{taskDate.toLocaleTimeString()}</TableCell>
                              <TableCell><StatusBadge value={String(t.status)} /></TableCell>
                            </TableRow>
                          )
                        })}
                        {(booking?.bookingDetails ?? []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>No tasks recorded</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Right Column: Call History Logs */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 300 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Call History Logs</Typography>
                  <Divider />
                  <Box sx={{ overflowY: 'auto', maxHeight: 350, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(booking?.callLogs ?? []).map((c: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CallIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="caption" display="block" color="text.secondary">{new Date(c.created_at).toLocaleDateString()}</Typography>
                            <Typography variant="body2" fontWeight="bold">{String(c.duration ?? '0s')}</Typography>
                          </Box>
                        </Box>
                        <StatusBadge value={String(c.status ?? 'Answered')} />
                      </Paper>
                    ))}
                    {(booking?.callLogs ?? []).length === 0 && (
                      <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 4 }}>No Call Logs</Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </AppCard>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Note</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Note Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Follow-up Task</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Task Type (e.g. Call Back, Site Visit)"
              type="text"
              fullWidth
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            />
            <TextField
              label="Due Date & Time"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Attachment Dialog */}
      <Dialog open={attachOpen} onClose={() => setAttachOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Attachment Resource</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Attachment Name"
              type="text"
              fullWidth
              value={attachName}
              onChange={(e) => setAttachName(e.target.value)}
            />
            <TextField
              label="Resource URL"
              type="url"
              fullWidth
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
            />
            <TextField
              select
              label="Resource Type"
              fullWidth
              SelectProps={{ native: true }}
              value={attachType}
              onChange={(e) => setAttachType(e.target.value)}
            >
              <option value="file">File Document</option>
              <option value="photo">Photo Image</option>
              <option value="video">Video Recording</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachOpen(false)}>Cancel</Button>
          <Button onClick={handleAddAttachment} variant="contained">Save</Button>
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
