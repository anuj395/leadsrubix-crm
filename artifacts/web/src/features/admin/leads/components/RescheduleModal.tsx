import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { listContacts, updateContact, type Contact } from '@/services/contactsService'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { api } from '@/services/api'

interface Booking {
  _id: string
  contactId: string
  notes: any[]
  attachments: any[]
  callLogs: any[]
  bookingDetails: any[]
}

interface RescheduleModalProps {
  open: boolean
  onClose: () => void
  contactId: string
  onSuccess: () => void
}

export default function RescheduleModal({ open, onClose, contactId, onSuccess }: RescheduleModalProps) {
  const { user } = useAppSelector(selectAuth)

  const [contact, setContact] = useState<Contact | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialValues, setInitialValues] = useState<Record<string, any>>({})

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  useEffect(() => {
    if (!open || !contactId) return
    setLoading(true)
    const loadContactData = async () => {
      try {
        const list = await listContacts()
        const match = list.find((c) => c._id === contactId)
        if (match) {
          setContact(match)
          
          const initVals: Record<string, any> = {}
          initVals.nextFollowUp = ''
          initVals.notes = ''
          
          setInitialValues(initVals)

          const bookingRes = await api.get('bookings', { params: { contactId: contactId } })
          const bookingsList = (bookingRes.data?.items ?? []) as Booking[]
          if (bookingsList.length > 0) {
            setBooking(bookingsList[0])
          }
        }
      } catch (e) {
        console.error('Failed to load contact data', e)
      } finally {
        setLoading(false)
      }
    }
    void loadContactData()
  }, [open, contactId])

  const handleSubmit = async (values: Record<string, any>) => {
    if (!contactId || !contact) return

    if (!values.nextFollowUp) {
      setToast({ open: true, msg: 'Select A Valid Date!!', sev: 'error' })
      return
    }

    const selectedDate = new Date(values.nextFollowUp)
    const now = new Date()
    if (selectedDate < now) {
      setToast({ open: true, msg: 'Select A Valid Date!!', sev: 'error' })
      return
    }

    setSaving(true)

    const contactFields: Record<string, any> = {}
    const taskFields: Record<string, any> = {}

    const taskKeys = ['nextFollowUp', 'notes']

    Object.entries(values).forEach(([k, v]) => {
      if (taskKeys.includes(k)) {
        taskFields[k] = v
      } else {
        contactFields[k] = v
      }
    })

    contactFields.nextFollowUpDateTime = new Date(values.nextFollowUp)

    let lat = null
    let lng = null
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      })
      lat = position.coords.latitude
      lng = position.coords.longitude
    } catch (err) {
      console.warn('Geolocation capture failed', err)
    }

    contactFields.latitude = lat
    contactFields.longitude = lng
    contactFields.modifiedAt = new Date()

    try {
      await updateContact(contactId, contactFields)

      const noteContent = String(taskFields.notes || '').trim()
      const newNotes = noteContent ? [
        ...(booking?.notes ?? []),
        { note: noteContent, created_at: new Date(), userEmail: user?.email || 'System' }
      ] : (booking?.notes ?? [])

      // Reschedule the latest/last task if it exists, otherwise add a new task
      const currentTasks = [...(booking?.bookingDetails ?? [])]
      if (currentTasks.length > 0) {
        const lastIdx = currentTasks.length - 1
        currentTasks[lastIdx] = {
          ...currentTasks[lastIdx],
          due_date: new Date(values.nextFollowUp)
        }
      } else {
        currentTasks.push({
          type: 'Call Back',
          due_date: new Date(values.nextFollowUp),
          status: 'PENDING'
        })
      }

      const bookingPayload = {
        notes: newNotes,
        bookingDetails: currentTasks
      }

      if (booking) {
        await api.put(`bookings/${booking._id}`, { ...booking, ...bookingPayload })
      } else {
        await api.post('bookings', {
          contactId: contactId,
          customerName: contact.customerName || 'N/A',
          contactNumber: contact.contactNumber || '',
          ...bookingPayload
        })
      }

      setToast({ open: true, msg: 'Task Rescheduled!', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setToast({ open: true, msg: 'Failed to reschedule task', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Reschedule Task
          <IconButton aria-label="close" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DynamicForm
              screen="reschedule"
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onCancel={onClose}
              submitLabel="Submit"
              readOnly={saving}
              singleColumn={true}
            />
          )}
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
