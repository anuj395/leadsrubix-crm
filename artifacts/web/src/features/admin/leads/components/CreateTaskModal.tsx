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
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { type Contact, updateContact } from '@/services/contactsService'

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  contact: Contact;
  tasksData: any[];
  onSuccess: () => void;
}

export default function CreateTaskModal({ open, onClose, contact, tasksData, onSuccess }: CreateTaskModalProps) {
  const { user } = useAppSelector(selectAuth)
  const [loading, setLoading] = useState(false)
  const [tasksListsData, setTasksListsData] = useState<any[]>([])
  
  // Local form states
  const [nextFollowUpType, setNextFollowUpType] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')
  const [noteText, setNoteText] = useState('')
  
  // Existing task status
  const [existingTaskStatus, setExistingTaskStatus] = useState(false)
  const [existingTaskSelected, setExistingTaskSelected] = useState('')

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  useEffect(() => {
    if (!open) return
    // Require closing existing task if there is a pending task that is not "Call Back"
    const sortedTasks = [...tasksData].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || a.dueDate || a.due_date || 0).getTime()
      const dateB = new Date(b.createdAt || b.created_at || b.dueDate || b.due_date || 0).getTime()
      return dateB - dateA
    })
    const latestTask = sortedTasks[0]
    if (latestTask && latestTask.status?.toUpperCase() === 'PENDING' && latestTask.type !== 'Call Back') {
      setExistingTaskStatus(true)
    } else {
      setExistingTaskStatus(false)
    }
    // Reset values to defaults/placeholders
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 1)
    defaultDate.setHours(10, 0, 0, 0)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const localIso = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`

    setNextFollowUpType('Call Back')
    setNextFollowUpDate(localIso)
    setNoteText('')
    setExistingTaskSelected('')
  }, [open, tasksData])

  // Fetch all tasks for this customer to evaluate unique meetings/site visits
  useEffect(() => {
    if (!open || !contact?._id) return
    const getTasks = async () => {
      try {
        const getTasksRes = await api.get('tasks', { params: { contactId: contact._id } })
        setTasksListsData(getTasksRes.data?.items ?? [])
      } catch (err) {
        console.error('Failed to fetch tasks:', err)
      }
    }
    void getTasks()
  }, [open, contact?._id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nextFollowUpType || nextFollowUpType === 'Select') {
      setToast({ open: true, msg: 'Select Next Follow Up Type!!', sev: 'error' })
      return
    }
    
    if (!nextFollowUpDate) {
      setToast({ open: true, msg: 'Enter A Valid Date!!', sev: 'error' })
      return
    }
    const selectedDate = new Date(nextFollowUpDate)
    if (selectedDate < new Date()) {
      setToast({ open: true, msg: 'Enter A Valid Date!!', sev: 'error' })
      return
    }

    if (existingTaskStatus && (!existingTaskSelected || existingTaskSelected === 'Select')) {
      setToast({ open: true, msg: 'Select Exisiting Task Status!!', sev: 'error' })
      return
    }

    setLoading(true)
    try {
      // Capture Geolocation
      let lat: number | null = null
      let lng: number | null = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        })
        lat = position.coords.latitude
        lng = position.coords.longitude
      } catch (e) {
        console.warn('Geolocation capture failed', e)
      }

      // 1. Add Note if entered (gracefully handled)
      if (noteText.trim()) {
        try {
          await api.post('resources/resourceNotes', {
            contactId: contact._id,
            note: noteText.trim(),
            userEmail: user?.email || '',
          })
        } catch (nErr) {
          console.warn('Note creation warning:', nErr)
        }
      }

      // 2. Resolve old task update if applicable
      try {
        const sortedTasks = [...tasksData].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || a.dueDate || a.due_date || 0).getTime()
          const dateB = new Date(b.createdAt || b.created_at || b.dueDate || b.due_date || 0).getTime()
          return dateB - dateA
        })
        const latestTask = sortedTasks[0]
        if (latestTask && latestTask.status?.toUpperCase() === 'PENDING') {
          const taskId = latestTask._id || latestTask.id
          const nextStatus = (existingTaskStatus && existingTaskSelected === 'Completed') ? 'COMPLETED' : 'CANCELLED'
          await api.put(`tasks/${taskId}`, {
            status: nextStatus,
            completedAt: nextStatus === 'COMPLETED' ? new Date() : undefined
          })

          // Run unique meeting/site visit checks
          if (existingTaskStatus && existingTaskSelected === 'Completed') {
            let unSiteVisit = false
            let unMeeting = false

            tasksListsData.filter((item: any) => item.type === "Meeting").forEach((list: any) => {
              if (list.uniqueMeeting === true) unMeeting = true
            })

            tasksListsData.filter((item: any) => item.type === "Site Visit").forEach((list: any) => {
              if (list.uniqueSiteVisit === true) unSiteVisit = true
            })

            if (!unSiteVisit && tasksListsData.filter((item: any) => item.type === "Site Visit").some((list: any) => list.status?.toUpperCase() === "PENDING")) {
              const pendingSiteVisits = tasksListsData.filter((item: any) => item.type === "Site Visit" && item.status?.toUpperCase() === "PENDING")
              await api.post('tasks/uniqueTaskTypeUpdate', {
                id: pendingSiteVisits[0]._id,
                unique_meeting: false,
                unique_site_visit: true
              })
            }

            if (!unMeeting && tasksListsData.filter((item: any) => item.type === "Meeting").some((list: any) => list.status?.toUpperCase() === "PENDING")) {
              const pendingMeetings = tasksListsData.filter((item: any) => item.type === "Meeting" && item.status?.toUpperCase() === "PENDING")
              await api.post('tasks/uniqueTaskTypeUpdate', {
                id: pendingMeetings[0]._id,
                unique_meeting: true,
                unique_site_visit: false
              })
            }
          }
        }
      } catch (tErr) {
        console.warn('Prior task status update warning:', tErr)
      }

      // 3. Create new follow-up task
      await api.post('tasks', {
        contactId: contact._id,
        type: nextFollowUpType,
        taskType: nextFollowUpType,
        task_type: nextFollowUpType,
        dueDate: new Date(nextFollowUpDate),
        status: 'PENDING',
        customerName: contact.customerName || (contact as any).customer_name || 'Contact',
        contactNumber: contact.contactNumber || (contact as any).contact_number || '',
        contact_number: contact.contactNumber || (contact as any).contact_number || '',
        createdBy: user?.email || 'System',
        stage: contact.stage || '',
        contactOwnerEmail: contact.contactOwnerEmail || (contact as any).contact_owner_email || user?.email || '',
        projectName: contact.projectName || (contact as any).project_name || '',
        location: contact.location || '',
        budget: contact.budget || '',
        source: contact.source || (contact as any).lead_source || '',
        notes: noteText.trim(),
        latitude: lat,
        longitude: lng,
      })

      // 4. Update contact with latest follow-up information
      try {
        await updateContact(contact._id, {
          nextFollowUpType: nextFollowUpType,
          nextFollowUpDateTime: new Date(nextFollowUpDate),
          modifiedAt: new Date(),
        })
      } catch (cErr) {
        console.warn('Contact follow-up sync warning:', cErr)
      }

      setToast({ open: true, msg: 'Task Created Successfully!!', sev: 'success' })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 500)
    } catch (err) {
      console.error('Failed to create task:', err)
      setToast({ open: true, msg: 'Failed to create task', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create New Task
          <IconButton aria-label="close" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <form onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              {existingTaskStatus && (
                <TextField
                  select
                  size="small"
                  label="Existing Task Status *"
                  value={existingTaskSelected}
                  onChange={(e) => setExistingTaskSelected(e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="" disabled>Existing Task Status *</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </TextField>
              )}

              <TextField
                select
                size="small"
                label="Next Follow Up Type *"
                value={nextFollowUpType}
                onChange={(e) => setNextFollowUpType(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="" disabled>Next Follow Up Type</MenuItem>
                <MenuItem value="Call Back">Call Back</MenuItem>
                <MenuItem value="Meeting">Meeting</MenuItem>
                <MenuItem value="Site Visit">Site Visit</MenuItem>
              </TextField>

              <TextField
                size="small"
                label="Next Follow Up Date & Time *"
                type="datetime-local"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />

              <TextField
                size="small"
                label="Note"
                multiline
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                fullWidth
              />

              <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Submit'}
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
