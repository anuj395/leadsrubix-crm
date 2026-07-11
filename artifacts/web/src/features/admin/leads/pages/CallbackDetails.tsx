import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
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

export default function CallbackDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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
    if (!id) return
    const loadContactData = async () => {
      try {
        const list = await listContacts()
        const match = list.find((c) => c._id === id)
        if (match) {
          setContact(match)
          
          // Seed form initial values
          const initVals: Record<string, any> = {}
          initVals.callBackReason = match.callBackReason || match.call_back_reason || ''
          initVals.nextFollowUp = ''
          initVals.notes = ''
          
          setInitialValues(initVals)

          const bookingRes = await api.get('bookings', { params: { contactId: id } })
          const bookingsList = (bookingRes.data?.items ?? []) as Booking[]
          if (bookingsList.length > 0) {
            setBooking(bookingsList[0])
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
    void loadContactData()
  }, [id])

  const handleSubmit = async (values: Record<string, any>) => {
    if (!id || !contact) return

    // Validate: Task cannot be scheduled in the past
    if (values.nextFollowUp) {
      const selectedDate = new Date(values.nextFollowUp)
      const now = new Date()
      if (selectedDate < now) {
        setToast({ open: true, msg: 'Task Cannot be Schedule For Old Date & Time!', sev: 'error' })
        return
      }
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

    // Set callback details
    contactFields.stage = 'CALL BACK'
    contactFields.callBackReason = values.callBackReason || ''
    contactFields.nextFollowUpType = 'Call Back'
    contactFields.nextFollowUpDateTime = values.nextFollowUp ? new Date(values.nextFollowUp) : new Date()

    // Geolocation capture
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
    contactFields.stageChangeAt = new Date()

    try {
      // 1. Update Contact in DB
      await updateContact(id, contactFields)

      // 2. Update Booking in DB
      const noteContent = String(taskFields.notes || '').trim()
      const newNotes = noteContent ? [
        ...(booking?.notes ?? []),
        { note: noteContent, created_at: new Date(), userEmail: user?.email || 'System' }
      ] : (booking?.notes ?? [])

      const newTasks = [
        ...(booking?.bookingDetails ?? []),
        {
          type: 'Call Back',
          dueDate: taskFields.nextFollowUp ? new Date(taskFields.nextFollowUp) : new Date(),
          status: 'PENDING',
          callBackReason: values.callBackReason || ''
        }
      ]

      const bookingPayload = {
        notes: newNotes,
        bookingDetails: newTasks
      }

      if (booking) {
        await api.put(`bookings/${booking._id}`, { ...booking, ...bookingPayload })
      } else {
        await api.post('bookings', {
          contactId: id,
          customerName: contact.customerName || 'N/A',
          contactNumber: contact.contactNumber || '',
          ...bookingPayload
        })
      }

      setToast({ open: true, msg: 'Lead Status Updated!!', sev: 'success' })
      setTimeout(() => navigate(`/leads/contacts/${id}`), 1500)
    } catch (err) {
      setToast({ open: true, msg: 'Failed to save callback details', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loading

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title="Call Back Details"
        subtitle="Manage follow-up date and callback reasons."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/leads/contacts/${id}`)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            screen="callback"
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/leads/contacts/${id}`)}
            submitLabel="Submit"
            readOnly={saving}
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
