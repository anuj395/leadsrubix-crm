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

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    if (!open) return
    setCallType('Outbound')
    setCallStatus('Answered')
    setDurationMinutes('2')
    setNotes('')
  }, [open])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact?._id) return

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

      const durNum = Math.max(0, parseInt(durationMinutes, 10) || 0) * 60

      await api.post('call-logs/create', {
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
                  label="Call Type *"
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
                  label="Call Outcome / Status *"
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value)}
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

              <TextField
                size="small"
                label="Duration (Minutes)"
                type="number"
                inputProps={{ min: 0, max: 300 }}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                fullWidth
                helperText="Approximate duration of the conversation"
              />

              <TextField
                size="small"
                label="Call Discussion & Notes"
                multiline
                rows={4}
                placeholder="Enter summary of discussion, customer requirements, or remarks..."
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
