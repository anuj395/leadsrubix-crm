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

interface NotInterestedModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSuccess: () => void;
}

export default function NotInterestedModal({ open, onClose, contactId, onSuccess }: NotInterestedModalProps) {
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
          initVals.notIntReason = match.notIntReason || ''
          initVals.otherNotIntReason = match.otherNotIntReason || ''
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

    if (!values.notIntReason) {
      setToast({ open: true, msg: 'Please Select Not Interested Reason', sev: 'error' })
      return
    }

    if (values.notIntReason === 'Other' && !values.otherNotIntReason?.trim()) {
      setToast({ open: true, msg: 'Please enter the specific reason for Other', sev: 'error' })
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

    contactFields.stage = 'NOT INTERESTED'
    contactFields.notIntReason = values.notIntReason || ''
    contactFields.otherNotIntReason = values.notIntReason === 'Other' ? values.otherNotIntReason || '' : ''

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

      // 2. Update tasks associated with this contact - preserve data integrity, never wipe
      const tasksRes = await api.get('tasks', { params: { contactId } }).catch(() => ({ data: { items: [] } }))
      const allTasks = tasksRes.data?.items ?? []
      await Promise.all(allTasks.map((t: any) => {
        const nextStatus = t.status === 'PENDING' ? 'CANCELLED' : t.status
        return api.put(`tasks/${t._id}`, {
          ...t,
          status: nextStatus,
          stage: 'NOT INTERESTED',
          notes: (t.notes ? `${t.notes}\n` : '') + `[Lead Status: Not Interested - ${values.notIntReason || 'Disqualified'}]`
        }).catch(() => null)
      }))

      // 3. Save comprehensive audit note to contact timeline
      const noteContent = String(taskFields.notes || '').trim()
      const reasonLabel = values.notIntReason === 'Other' && values.otherNotIntReason ? values.otherNotIntReason : values.notIntReason
      const auditNote = `[Status: Not Interested - ${reasonLabel || 'Disqualified'}]${noteContent ? ` Details: ${noteContent}` : ''}`
      
      await api.post('resources/resourceNotes', {
        contactId,
        note: auditNote,
        notes: auditNote,
        stage: 'NOT INTERESTED',
        reason: reasonLabel || '',
        userName: user?.name || user?.email || 'Admin',
        userEmail: user?.email || '',
        createdBy: user?.name || user?.email || 'Admin'
      }).catch(err => console.warn('Failed to save audit note:', err))

      setToast({ open: true, msg: 'Lead marked as Not Interested with activity preserved!', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 800)
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
          Not Interested Details
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
              screen="notInterested"
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
