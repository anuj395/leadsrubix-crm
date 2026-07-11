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

interface NotesModalProps {
  open: boolean
  onClose: () => void
  contactId: string
  customerName?: string
  contactNumber?: string
  onSuccess: () => void
}

export default function NotesModal({ open, onClose, contactId, customerName = 'N/A', contactNumber = '', onSuccess }: NotesModalProps) {
  const { user } = useAppSelector(selectAuth)

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
    const loadBookingData = async () => {
      try {
        setInitialValues({ notes: '' })
        const bookingRes = await api.get('bookings', { params: { contactId: contactId } })
        const bookingsList = (bookingRes.data?.items ?? []) as Booking[]
        if (bookingsList.length > 0) {
          setBooking(bookingsList[0])
        }
      } catch (e) {
        console.error('Failed to load booking details', e)
      } finally {
        setLoading(false)
      }
    }
    void loadBookingData()
  }, [open, contactId])

  const handleSubmit = async (values: Record<string, any>) => {
    if (!contactId) return

    const noteText = String(values.notes || '').trim()
    if (!noteText) {
      setToast({ open: true, msg: 'Please Add Note!!', sev: 'error' })
      return
    }

    setSaving(true)

    try {
      const newNotes = [
        ...(booking?.notes ?? []),
        { note: noteText, created_at: new Date(), userEmail: user?.email || 'System' }
      ]

      const bookingPayload = {
        notes: newNotes
      }

      if (booking) {
        await api.put(`bookings/${booking._id}`, { ...booking, ...bookingPayload })
      } else {
        await api.post('bookings', {
          contactId: contactId,
          customerName: customerName,
          contactNumber: contactNumber,
          notes: newNotes,
          attachments: [],
          callLogs: [],
          bookingDetails: []
        })
      }

      setToast({ open: true, msg: 'Saved', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setToast({ open: true, msg: 'Try Again!!', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create New Note
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
              screen="notes"
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
