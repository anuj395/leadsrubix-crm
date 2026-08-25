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


interface CallbackModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSuccess: () => void;
}

export default function CallbackModal({ open, onClose, contactId, onSuccess }: CallbackModalProps) {
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
          initVals.callBackReason = match.callBackReason || match.call_back_reason || ''
          initVals.nextFollowUp = ''
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

    contactFields.stage = 'CALLBACK'
    contactFields.callBackReason = values.callBackReason || ''
    contactFields.nextFollowUpType = 'Call Back'
    contactFields.nextFollowUpDateTime = values.nextFollowUp ? new Date(values.nextFollowUp) : new Date()

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

      // 3. Save Note if exists
      const noteContent = String(taskFields.notes || '').trim()

      // 2. Create Task on separate endpoint
      await api.post('tasks', {
        contactId,
        type: 'Call Back',
        taskType: 'Call Back',
        task_type: 'Call Back',
        dueDate: taskFields.nextFollowUp ? new Date(taskFields.nextFollowUp) : new Date(),
        status: 'PENDING',
        callbackReason: values.callBackReason || '',
        customerName: contact.customerName || '',
        contactNumber: contact.contactNumber || (contact as any).contact_number || '',
        contact_number: contact.contactNumber || (contact as any).contact_number || '',
        createdBy: user?.email || 'System',
        latitude: lat,
        longitude: lng,
        stage: 'CALLBACK',
        contactOwnerEmail: contact.contactOwnerEmail || (contact as any).contact_owner_email || user?.email || '',
        projectName: contact.projectName || '',
        location: contact.location || '',
        budget: contact.budget || '',
        source: contact.source || '',
        notes: noteContent,
      })
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
      setToast({ open: true, msg: 'Failed to save callback details', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Call Back Details
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
              screen="callback"
              industryCode={String(contact?.industryId || contact?.industry_id || user?.industryId || 'temp0001')}
              organizationId={String(contact?.organizationId || contact?.organization_id || (user as any)?.organizationId || (user as any)?.organization_id || '')}
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
