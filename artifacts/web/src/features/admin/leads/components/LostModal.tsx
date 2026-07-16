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

interface LostModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSuccess: () => void;
}

export default function LostModal({ open, onClose, contactId, onSuccess }: LostModalProps) {
  const { user } = useAppSelector(selectAuth)

  const [contact, setContact] = useState<Contact | null>(null)
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
          initVals.lostReason = match.lostReason || ''
          initVals.otherLostReason = match.otherLostReason || ''
          initVals.notes = ''
          
          setInitialValues(initVals)
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

    if (!values.lostReason) {
      setToast({ open: true, msg: 'Please Select Lost Reason', sev: 'error' })
      return
    }

    setSaving(true)

    const contactFields: Record<string, any> = {}
    const taskFields: Record<string, any> = {}

    const taskKeys = ['notes']

    Object.entries(values).forEach(([k, v]) => {
      if (taskKeys.includes(k)) {
        taskFields[k] = v
      } else {
        contactFields[k] = v
      }
    })

    contactFields.stage = 'LOST'
    contactFields.lostReason = values.lostReason || ''
    contactFields.otherLostReason = values.lostReason === 'Other' ? values.otherLostReason || '' : ''

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
      // 1. Update Contact stage
      await updateContact(contactId, contactFields)

      // 2. Update tasks associated with this contact
      const tasksRes = await api.get('tasks', { params: { contactId } })
      const allTasks = tasksRes.data?.items ?? []
      await Promise.all(allTasks.map((t: any) => {
        const nextStatus = t.status === 'PENDING' ? 'INACTIVE' : t.status
        return api.put(`tasks/${t._id}`, { ...t, status: nextStatus, stage: 'LOST' })
      }))

      // 3. Save Note if exists
      const noteContent = String(taskFields.notes || '').trim()
      if (noteContent) {
        await api.post('resources/resourceNotes', {
          contactId,
          note: noteContent,
          userEmail: user?.email || 'System'
        })
      }

      setToast({ open: true, msg: 'Lead Status Updated!!', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setToast({ open: true, msg: 'Failed to save details', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Lost Details
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
              screen="lost"
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
