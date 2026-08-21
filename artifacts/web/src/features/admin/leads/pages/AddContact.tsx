import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { createContact, updateContact, listContacts, type Contact } from '@/services/contactsService'

import { useActionPermission } from '@/hooks/useActionPermission'

function toFormValues(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy' || k === 'industryId' || k === 'roleId') continue
    if (v === null || v === undefined) continue
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v
  }
  return out
}

const AddContactPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const industryCode = searchParams.get('industry') || undefined
  const organizationId = searchParams.get('organization') || undefined

  const { can_add, can_edit, loading: permsLoading } = useActionPermission('contacts')

  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [initializing, setInitializing] = useState(!!id)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    if (id) {
      const loadItem = async () => {
        try {
          const list = await listContacts()
          const match = list.find((c) => c._id === id)
          if (match) {
            setEditingContact(match)
          } else {
            setToast({ open: true, msg: 'Contact not found', sev: 'error' })
          }
        } catch (e) {
          setToast({ open: true, msg: 'Failed to load contact details', sev: 'error' })
        } finally {
          setInitializing(false)
        }
      }
      void loadItem()
    }
  }, [id])

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      setLoading(true)
      if (id) {
        await updateContact(id, values)
        setToast({ open: true, msg: 'Contact updated successfully', sev: 'success' })
      } else {
        const payloadValues = {
          ...values,
          organizationId: organizationId || values.organizationId,
          organization_id: organizationId || values.organization_id,
        }
        await createContact(payloadValues)
        setToast({ open: true, msg: 'Contact created successfully', sev: 'success' })
      }
      setTimeout(() => navigate('/leads/contacts'), 1500)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save contact', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (initializing || permsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (id && !can_edit) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to edit contacts.
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/leads/contacts')}>
          Back to Contacts
        </Button>
      </Box>
    )
  }

  if (!id && !can_add) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to add new contacts.
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/leads/contacts')}>
          Back to Contacts
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: "100%", minWidth: 0 }}>
      <AppCard
        title={id ? "Edit Contact" : "Add New Contact"}
        subtitle="Manage client contacts. Fields and requirements are configured dynamically."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/leads/contacts')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            screen="contacts"
            industryCode={industryCode}
            organizationId={organizationId}
            initialValues={editingContact ? toFormValues(editingContact) : {
              organizationId: organizationId || '',
              organization_id: organizationId || '',
            }}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/leads/contacts')}
            submitLabel={id ? "Save Changes" : "Create Contact"}
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

export default AddContactPage
