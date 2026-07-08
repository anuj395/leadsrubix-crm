import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import type { Project } from './ProjectsList'

export default function SuperAdminProjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const industryCode = searchParams.get('industry') || undefined
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<Project | null>(null)
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
          const res = await api.get('/resources/resourceProjects')
          const match = (res.data || []).find((i: any) => i.id === id)
          if (match) {
            setEditingItem(match)
          } else {
            setToast({ open: true, msg: 'Project not found', sev: 'error' })
          }
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to load project details', sev: 'error' })
        } finally {
          setInitializing(false)
        }
      }
      loadItem()
    }
  }, [id])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      if (id) {
        await api.put(`/resources/resourceProjects/${id}`, values)
        setToast({ open: true, msg: 'Project updated successfully', sev: 'success' })
      } else {
        await api.post('/resources/resourceProjects', values)
        setToast({ open: true, msg: 'Project created successfully', sev: 'success' })
      }
      setTimeout(() => navigate('/configuration/projects'), 1500)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save project', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title={id ? 'Edit Project' : 'Create Project'}
        subtitle="Manage master project details, walkthrough links, status, and RERA info."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/configuration/projects')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            screen="configProjects"
            industry_code={industryCode}
            role_key="admin"
            initialValues={editingItem ? (editingItem as any) : { organizationId: '', status: 'ACTIVE' }}
            onCancel={() => navigate('/configuration/projects')}
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
