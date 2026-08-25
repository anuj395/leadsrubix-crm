import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { useActionPermission } from '@/hooks/useActionPermission'
import type { Project } from './ProjectsList'

export default function ProjectFormPage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { can_add, can_edit, loading: permsLoading } = useActionPermission('configProjects')
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
        setToast({ open: true, msg: successMsg, sev: 'success' })
      } else {
        await api.post('/resources/resourceProjects', values)
        setToast({ open: true, msg: successMsg, sev: 'success' })
      }
      setTimeout(() => navigate('/configuration/projects'), 1500)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || failMsg, sev: 'error' })
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

  const indCode = String(user?.industryId || '').toLowerCase().trim();

  let formTitle = id ? 'Edit Product / Service' : 'Create Product / Service';
  let formSubtitle = 'Configure product name, categories, descriptions, catalog details, and other meta configurations.';
  let successMsg = id ? 'Product / Service updated successfully' : 'Product / Service created successfully';
  let failMsg = id ? 'Failed to save product / service' : 'Failed to create product / service';

  if (indCode === 'temp0002') {
    formTitle = id ? 'Edit Product' : 'Create Product';
    formSubtitle = 'Manage product details, catalogs, status, and supplier info.';
    successMsg = id ? 'Product updated successfully' : 'Product created successfully';
  } else if (indCode === 'temp0003') {
    formTitle = id ? 'Edit Specialty' : 'Create Specialty';
    formSubtitle = 'Manage specialty details, brochure links, status, and clinic info.';
    successMsg = id ? 'Specialty updated successfully' : 'Specialty created successfully';
  } else if (indCode === 'temp0004') {
    formTitle = id ? 'Edit Academic Program' : 'Create Academic Program';
    formSubtitle = 'Manage academic programs, course syllabus, status, and department info.';
    successMsg = id ? 'Academic Program updated successfully' : 'Academic Program created successfully';
  } else if (indCode === 'temp0005') {
    formTitle = id ? 'Edit Portfolio' : 'Create Portfolio';
    formSubtitle = 'Manage portfolio details, KFS documents, and advisory info.';
    successMsg = id ? 'Portfolio updated successfully' : 'Portfolio created successfully';
  } else if (indCode === 'temp0006') {
    formTitle = id ? 'Edit Service Line' : 'Create Service Line';
    formSubtitle = 'Manage service line details, SLAs, status, and SLA info.';
    successMsg = id ? 'Service Line updated successfully' : 'Service Line created successfully';
  } else if (indCode === 'temp0007') {
    formTitle = id ? 'Edit Product Category' : 'Create Product Category';
    formSubtitle = 'Manage product categories, plant details, status, and ISO info.';
    successMsg = id ? 'Product Category updated successfully' : 'Product Category created successfully';
  }

  if (!permsLoading) {
    if (id && !can_edit) {
      return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="error">
            Access Denied: You do not have permission to edit projects.
          </Alert>
        </Box>
      )
    }
    if (!id && !can_add) {
      return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="error">
            Access Denied: You do not have permission to add projects.
          </Alert>
        </Box>
      )
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title={formTitle}
        subtitle={formSubtitle}
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
            industry_code={user?.industryId}
            role_key="admin"
            initialValues={editingItem ? (editingItem as any) : {}}
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
