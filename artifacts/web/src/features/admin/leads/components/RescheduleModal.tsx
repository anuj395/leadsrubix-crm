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

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSuccess: () => void;
}

export default function RescheduleModal({ open, onClose, contactId, onSuccess }: RescheduleModalProps) {
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
      // 1. Update Contact properties
      await updateContact(contactId, contactFields)

      // 3. Save Note if exists
      const noteContent = String(taskFields.notes || '').trim()

      // 2. Fetch and Reschedule tasks
      const tasksRes = await api.get('tasks', { params: { contactId } })
      const tasksList = (tasksRes.data?.items ?? [])
      const pendingTasks = tasksList.filter((t: any) => t.status === 'PENDING')
      if (pendingTasks.length > 0) {
        pendingTasks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        const latest = pendingTasks[0]
        await api.put(`tasks/${latest._id}`, {
          ...latest,
          dueDate: new Date(values.nextFollowUp),
          notes: noteContent || latest.notes || ''
        })
      } else {
        await api.post('tasks', {
          contactId,
          type: 'Call Back',
          taskType: 'Call Back',
          task_type: 'Call Back',
          dueDate: new Date(values.nextFollowUp),
          status: 'PENDING',
          customerName: contact.customerName || '',
          contactNumber: contact.contactNumber || (contact as any).contact_number || '',
          contact_number: contact.contactNumber || (contact as any).contact_number || '',
          createdBy: user?.email || 'System',
          latitude: lat,
          longitude: lng,
          stage: contact.stage || '',
          contactOwnerEmail: contact.contactOwnerEmail || (contact as any).contact_owner_email || user?.email || '',
          projectName: contact.projectName || '',
          location: contact.location || '',
          budget: contact.budget || '',
          source: contact.source || '',
          notes: noteContent,
        })
      }
      if (noteContent) {
        await api.post('resources/resourceNotes', {
          contactId,
          note: noteContent,
          userEmail: user?.email || 'System'
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
