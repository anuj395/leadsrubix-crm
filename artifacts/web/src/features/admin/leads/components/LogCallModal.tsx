import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import EventNoteIcon from '@mui/icons-material/EventNote'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { type Contact } from '@/services/contactsService'

interface LogCallModalProps {
  open: boolean
  onClose: () => void
  contact: Contact
  onSuccess: () => void
}

export default function LogCallModal({ open, onClose, contact, onSuccess }: LogCallModalProps) {
  const { user } = useAppSelector(selectAuth)
  const [loading, setLoading] = useState(false)

  // Form states
  const [callType, setCallType] = useState('Outbound')
  const [callStatus, setCallStatus] = useState('Answered')
  const [durationMinutes, setDurationMinutes] = useState('2')
  const [notes, setNotes] = useState('')

  // Integrated Quick Callback Scheduler
  const [scheduleCallback, setScheduleCallback] = useState(false)
  const [callbackDateTime, setCallbackDateTime] = useState('')
  const [callbackReason, setCallbackReason] = useState('Customer Busy / Call Later')

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const getDefaultCallbackDateTime = () => {
    const d = new Date()
    const currentHour = d.getHours()
    // If during working hours (9 AM - 4:59 PM), default to 2 hours from now
    if (currentHour >= 9 && currentHour < 17) {
      d.setHours(d.getHours() + 2, 0, 0, 0)
    } else {
      // If late evening or early morning, default to next business morning at 11:00 AM
      d.setDate(d.getDate() + 1)
      d.setHours(11, 0, 0, 0)
    }
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  useEffect(() => {
    if (!open) return
    setCallType('Outbound')
    setCallStatus('Answered')
    setDurationMinutes('2')
    setNotes('')
    setScheduleCallback(false)
    setCallbackDateTime(getDefaultCallbackDateTime())
    setCallbackReason('Customer Busy / Call Later')
  }, [open])

  const handleStatusChange = (status: string) => {
    setCallStatus(status)
    if (status === 'Answered') {
      if (!durationMinutes || durationMinutes === '0') setDurationMinutes('2')
      setScheduleCallback(false)
    } else if (status === 'Wrong Number') {
      setDurationMinutes('0')
      setScheduleCallback(false)
    } else {
      // Unanswered outcomes: 'Busy', 'No Answer', 'Left Voicemail', 'Missed'
      // 1. Duration is strictly locked to 0 and hidden from screen
      setDurationMinutes('0')
      // 2. Callback scheduler is automatically presented directly
      setScheduleCallback(true)
      if (!callbackDateTime) {
        setCallbackDateTime(getDefaultCallbackDateTime())
      }
      if (status === 'Busy') {
        setCallbackReason('Customer Busy / Call Later')
      } else if (status === 'No Answer' || status === 'Missed') {
        setCallbackReason('Ringing / Not Picked')
      } else if (status === 'Left Voicemail') {
        setCallbackReason('Decision Maker Unavailable')
      } else {
        setCallbackReason('Customer Busy / Call Later')
      }
    }
  }

  const isUnanswered = ['Busy', 'No Answer', 'Left Voicemail', 'Missed'].includes(callStatus)
  const isAnswered = callStatus === 'Answered'
  const isWrongNumber = callStatus === 'Wrong Number'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact?._id || loading) return

    const requiresCallback = isUnanswered || (isAnswered && scheduleCallback)

    if (requiresCallback) {
      if (!callbackDateTime) {
        setToast({ open: true, msg: 'Please select a valid Callback Date & Time', sev: 'error' })
        return
      }
      const selectedDate = new Date(callbackDateTime)
      if (selectedDate.getTime() < Date.now() - 5 * 60 * 1000) {
        setToast({ open: true, msg: 'Callback date cannot be in the past', sev: 'error' })
        return
      }
    }

    if (isAnswered) {
      const parsedDur = parseInt(durationMinutes, 10)
      if (isNaN(parsedDur) || parsedDur < 1) {
        setToast({ open: true, msg: 'Please enter a valid call duration (minimum 1 min)', sev: 'error' })
        return
      }
    }

    setLoading(true)
    try {
      let lat: number | null = null
      let lng: number | null = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
        })
        lat = position.coords.latitude
        lng = position.coords.longitude
      } catch (e) {
        console.warn('Geolocation capture failed', e)
      }

      // If status is not Answered, ensure duration is strictly 0 seconds
      const effectiveMinutes = isAnswered ? Math.max(1, parseInt(durationMinutes, 10) || 1) : 0
      const durNum = effectiveMinutes * 60

      await api.post('call-logs/create', {
        contactId: contact._id,
        leadId: contact._id,
        customerName: contact.customerName || (contact as any).customer_name || 'Contact',
        contactNumber: contact.contactNumber || (contact as any).contact_no || '',
        stage: callStatus,
        type: callType,
        direction: callType,
        callTime: durNum,
        duration: durNum,
        notes: notes.trim(),
        details: notes.trim(),
        uid: (user as any)?.uid || (user as any)?.id || '',
        contactOwnerEmail: contact.contactOwnerEmail || (contact as any).contact_owner_email || user?.email || '',
        projectName: contact.projectName || (contact as any).project_name || '',
        location: contact.location || '',
        budget: contact.budget || '',
        source: contact.source || (contact as any).lead_source || '',
        latitude: lat,
        longitude: lng,
        createdAt: new Date(),
      })

      // Optionally record note in resourceNotes as well
      if (notes.trim()) {
        try {
          await api.post('resources/resourceNotes', {
            contactId: contact._id,
            note: `[Call Log - ${callType} / ${callStatus}]: ${notes.trim()}`,
            notes: `[Call Log - ${callType} / ${callStatus}]: ${notes.trim()}`,
            userName: user?.name || user?.email || 'Admin',
            userEmail: user?.email || '',
            createdBy: user?.name || user?.email || 'Admin'
          })
        } catch (nErr) {
          console.warn('Note copy failed:', nErr)
        }
      }

      // If callback is needed (mandatory for unanswered, or opted-in for answered)
      if (requiresCallback && callbackDateTime) {
        try {
          await api.post('tasks', {
            contactId: contact._id,
            taskType: 'Call Back',
            priority: 'Medium',
            dueDate: new Date(callbackDateTime),
            callbackReason: callbackReason,
            notes: `Follow-up scheduled from Call Log (${callStatus}): ${notes.trim() || 'Call Back requested'}`,
            assignedTo: user?.email || user?.name || '',
            status: 'PENDING'
          })
        } catch (taskErr) {
          console.error('Failed to create scheduled callback task:', taskErr)
        }

        // Synchronize contact stage to CALLBACK and record next follow up datetime
        try {
          await api.put(`contacts/${contact._id}`, {
            stage: 'CALLBACK',
            lastContactedAt: new Date(),
            nextFollowUpDateTime: new Date(callbackDateTime),
            nextFollowUpType: 'Call Back',
            callBackReason: callbackReason,
          })
        } catch (contactErr) {
          console.error('Failed to update contact callback stage:', contactErr)
        }
      } else if (isWrongNumber) {
        // Mark contact as UNQUALIFIED for wrong number
        try {
          await api.put(`contacts/${contact._id}`, {
            stage: 'UNQUALIFIED',
            lastContactedAt: new Date(),
            lostReason: 'Wrong Number',
          })
        } catch (contactErr) {
          console.error('Failed to update contact wrong number stage:', contactErr)
        }
      } else if (isAnswered) {
        try {
          await api.put(`contacts/${contact._id}`, {
            lastContactedAt: new Date(),
          })
        } catch (contactErr) {
          console.error('Failed to update contact lastContactedAt:', contactErr)
        }
      }

      setToast({ open: true, msg: 'Call Logged Successfully!', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 500)
    } catch (err) {
      console.error('Failed to log call:', err)
      setToast({ open: true, msg: 'Failed to log call', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneInTalkIcon color="primary" />
            Log Call Details
          </Box>
          <IconButton aria-label="close" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <form onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  select
                  size="small"
                  label="Call Type"
                  value={callType}
                  onChange={(e) => setCallType(e.target.value)}
                  fullWidth
                  required
                >
                  <MenuItem value="Outbound">Outbound (Outgoing)</MenuItem>
                  <MenuItem value="Inbound">Inbound (Incoming)</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Call Outcome / Status"
                  value={callStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  fullWidth
                  required
                >
                  <MenuItem value="Answered">Answered / Connected</MenuItem>
                  <MenuItem value="Busy">Busy</MenuItem>
                  <MenuItem value="No Answer">No Answer</MenuItem>
                  <MenuItem value="Left Voicemail">Left Voicemail</MenuItem>
                  <MenuItem value="Wrong Number">Wrong Number</MenuItem>
                  <MenuItem value="Missed">Missed</MenuItem>
                </TextField>
              </Box>

              {/* DURATION (MINUTES): STRICTLY CONDITIONAL ON ANSWERED STATUS */}
              {isAnswered && (
                <TextField
                  size="small"
                  label="Duration (Minutes)"
                  type="number"
                  inputProps={{ min: 1, max: 300 }}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  fullWidth
                  required
                  helperText="Approximate duration of the conversation (minimum 1 min)"
                />
              )}

              {/* UNANSWERED CALLS (Busy, No Answer, Left Voicemail, Missed): AUTO-EMBEDDED MANDATORY CALLBACK SCHEDULER */}
              {isUnanswered && (
                <Box
                  sx={{
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.18)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventNoteIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Schedule Mandatory Call Back Task
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      Auto-scheduled for {callStatus}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      size="small"
                      label="Callback Date & Time"
                      type="datetime-local"
                      value={callbackDateTime}
                      onChange={(e) => setCallbackDateTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      required
                      helperText="When to retry contacting this lead"
                    />
                    <TextField
                      select
                      size="small"
                      label="Callback Reason"
                      value={callbackReason}
                      onChange={(e) => setCallbackReason(e.target.value)}
                      fullWidth
                      required
                    >
                      <MenuItem value="Customer Busy / Call Later">Customer Busy / Call Later</MenuItem>
                      <MenuItem value="Ringing / Not Picked">Ringing / Not Picked</MenuItem>
                      <MenuItem value="Decision Maker Unavailable">Decision Maker Unavailable</MenuItem>
                      <MenuItem value="Price / Budget Discussion">Price / Budget Discussion</MenuItem>
                      <MenuItem value="Location / Layout Clarification">Location / Layout Clarification</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                  </Box>
                </Box>
              )}

              {/* WRONG NUMBER NOTIFICATION */}
              {isWrongNumber && (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  <strong>Wrong Number:</strong> Call duration will be logged as 0, and this contact will be marked as <strong>Unqualified</strong>. No follow-up will be scheduled.
                </Alert>
              )}

              {/* ANSWERED CALLS: OPTIONAL NEXT FOLLOW-UP TASK */}
              {isAnswered && (
                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={scheduleCallback}
                        onChange={(e) => setScheduleCallback(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <EventNoteIcon fontSize="small" color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Schedule a Next Follow-up / Appointment Task
                        </Typography>
                      </Box>
                    }
                  />

                  {scheduleCallback && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                      <TextField
                        size="small"
                        label="Follow-up Date & Time"
                        type="datetime-local"
                        value={callbackDateTime}
                        onChange={(e) => setCallbackDateTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        required={scheduleCallback}
                      />
                      <TextField
                        select
                        size="small"
                        label="Follow-up Purpose"
                        value={callbackReason}
                        onChange={(e) => setCallbackReason(e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="Price / Budget Discussion">Price / Budget Discussion</MenuItem>
                        <MenuItem value="Location / Layout Clarification">Location / Layout Clarification</MenuItem>
                        <MenuItem value="Customer Busy / Call Later">Follow-up Call</MenuItem>
                        <MenuItem value="Decision Maker Unavailable">Decision Maker Discussion</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Box>
                  )}
                </Box>
              )}

              <TextField
                size="small"
                label={isAnswered ? 'Call Discussion & Notes' : 'Remarks / Attempt Notes'}
                multiline
                rows={3}
                placeholder={
                  isAnswered
                    ? 'Enter summary of discussion, customer requirements, or remarks...'
                    : isWrongNumber
                    ? 'Enter details (e.g. number belongs to someone else)...'
                    : `Enter reason or remarks for ${callStatus.toLowerCase()} attempt...`
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
              />

              <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                <Button onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 600 }}>
                  {loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Log Call'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 1400 }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  )
}

