import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { getApiTokens, createApiToken, updateApiToken, type ApiTokenConfig } from '@/services/apiTokensService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'

export default function SuperAdminApiFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const industryCode = searchParams.get('industry') || undefined
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<ApiTokenConfig | null>(null)
  const [initializing, setInitializing] = useState(!!id)
  
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    if (id) {
      const loadItem = async () => {
        try {
          const list = await getApiTokens()
          const match = list.find((i: any) => i._id === id || i.id === id)
          if (match) {
            setEditingItem(match)
          } else {
            setToast({ open: true, msg: 'API Connection not found', sev: 'error' })
          }
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to load credentials detail', sev: 'error' })
        } finally {
          setInitializing(false)
        }
      }
      void loadItem()
    }
  }, [id])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      if (id) {
        await updateApiToken(id, values)
        setToast({ open: true, msg: 'API Token updated successfully', sev: 'success' })
      } else {
        await createApiToken(values)
        setToast({ open: true, msg: 'API Token created successfully', sev: 'success' })
      }
      setTimeout(() => navigate('/configuration/api'), 1500)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title={id ? 'Edit API Connection' : 'Create API Connection'}
        subtitle="Manage inbound campaign integrations, API access keys, and lead router mappings."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/configuration/api')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            screen="configApi"
            industry_code={industryCode}
            role_key="admin"
            initialValues={editingItem ? (editingItem as any) : { organizationId: '', isActive: true }}
            onCancel={() => navigate('/configuration/api')}
            submitLabel={id ? 'Save' : 'Create'}
            onSubmit={handleSubmit}
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
