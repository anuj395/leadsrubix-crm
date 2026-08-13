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

export default function InterestedDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAppSelector(selectAuth)

  const [contact, setContact] = useState<Contact | null>(null)
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
          const nameWords = String(match.customerName || '').split(' ')
          initVals.firstName = nameWords[0] || ''
          initVals.lastName = nameWords.slice(1).join(' ') || ''
          initVals.customerName = match.customerName || ''
          initVals.alternateNo = match.alternateNo || match.alternate_no || ''
          
          const contactFieldsList = ['location', 'projectName', 'budget', 'propertyType', 'propertyStage', 'propertySubType', 'source']
          contactFieldsList.forEach((key) => {
            initVals[key] = match[key] || ''
          })

          initVals.taskType = 'Call Back'
          initVals.nextFollowUp = ''
          initVals.notes = ''
          
          setInitialValues(initVals)
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
    setSaving(true)

    // Separate contact fields and task fields
    const contactFields: Record<string, any> = {}
    const taskFields: Record<string, any> = {}

    const taskKeys = ['taskType', 'nextFollowUp', 'notes']

    Object.entries(values).forEach(([k, v]) => {
      if (taskKeys.includes(k)) {
        taskFields[k] = v
      } else {
        contactFields[k] = v
      }
    })

    // If firstName/lastName are edited dynamically, construct customerName
    if (values.firstName !== undefined || values.lastName !== undefined) {
      const fName = String(values.firstName || '').trim()
      const lName = String(values.lastName || '').trim()
      contactFields.customerName = `${fName} ${lName}`.trim()
      delete contactFields.firstName
      delete contactFields.lastName
    }

    // Auto-update stage
    contactFields.stage = 'INTERESTED'
    
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

      // 3. Save Note in DB (resourceNotes inside resource_items)
      const noteContent = String(taskFields.notes || '').trim()

      // 2. Create Task in DB
      await api.post('tasks', {
        contactId: id,
        type: taskFields.taskType || 'Call Back',
        dueDate: taskFields.nextFollowUp ? new Date(taskFields.nextFollowUp) : new Date(),
        status: 'PENDING',
        customerName: contactFields.customerName || contact.customerName || '',
        createdBy: user?.email || 'System',
        latitude: lat,
        longitude: lng,
        stage: 'INTERESTED',
        contactOwnerEmail: contact.contactOwnerEmail || (contact as any).contact_owner_email || user?.email || '',
        projectName: contactFields.projectName || contact.projectName || '',
        location: contactFields.location || contact.location || '',
        budget: contactFields.budget || contact.budget || '',
        source: contactFields.source || contact.source || '',
        notes: noteContent,
      })
      if (noteContent) {
        await api.post('resources/resourceNotes', {
          contactId: id,
          note: noteContent,
          userEmail: user?.email || 'System'
        })
      }

      setToast({ open: true, msg: 'Lead updated to Interested and follow-up task created', sev: 'success' })
      setTimeout(() => navigate(`/leads/contacts/${id}`), 1500)
    } catch (err) {
      setToast({ open: true, msg: 'Failed to save interested details', sev: 'error' })
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
        title="Interested Lead Details"
        subtitle="Manage client preferences, follow-up, and alternate contact details."
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
            screen="interested"
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
