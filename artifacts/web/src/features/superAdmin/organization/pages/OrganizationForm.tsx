import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import {
  listOrganizationsPaged,
  createOrganization,
  updateOrganization,
  type Organization,
} from '@/services/organizationsService'

type FormValue = string | number | boolean | null

function toFormValues(row: Organization): Record<string, FormValue> {
  const out: Record<string, FormValue> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy') continue
    const camelKey = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    const snakeKey = k.replace(/([A-Z])/g, '_$1').toLowerCase()
    if (v === null) {
      out[camelKey] = null
      out[snakeKey] = null
      continue
    }
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[camelKey] = v as FormValue
      out[snakeKey] = v as FormValue
    }
  }
  return out
}

export default function OrganizationFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [editingItem, setEditingItem] = useState<Organization | null>(null)
  
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    void (async () => {
      try {
        const inds = await getIndustries(true)
        setIndustries(inds)

        if (id) {
          // Fetch organization to edit
          const res = await listOrganizationsPaged({ page: 0, pageSize: 1000 })
          const match = res.items.find((item) => item._id === id)
          if (match) {
            setEditingItem(match)
            const indCode = match.industryId || match.industryId || ''
            setSelectedIndustry(String(indCode))
          } else {
            setToast({ open: true, msg: 'Organization not found', sev: 'error' })
          }
        } else {
          const queryIndustry = searchParams.get('industry')
          if (queryIndustry) {
            setSelectedIndustry(queryIndustry)
          }
        }
      } catch (err: any) {
        setToast({ open: true, msg: err?.message || 'Failed to initialize', sev: 'error' })
      } finally {
        setInitializing(false)
      }
    })()
  }, [id, searchParams])

  const handleCancel = () => {
    navigate('/organization/list')
  }

  if (initializing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <AppCard
        title={id ? 'Edit Organization' : 'New Organization'}
        subtitle="Configure organization details and custom attributes."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            {!id && !selectedIndustry ? (
              <Box sx={{ maxWidth: 400, mx: 'auto', width: '100%', py: 4, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, color: 'text.secondary' }}>
                  Select your business industry to initialize the form:
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Select Industry"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  fullWidth
                >
                  {industries.map((ind) => (
                    <MenuItem key={ind.code} value={ind.code}>
                      {ind.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ) : (
              <Box>
                {!id && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 2, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 600 }}>
                      Industry: {industries.find(i => i.code === selectedIndustry)?.name || selectedIndustry}
                    </Typography>
                    <Button size="small" onClick={() => setSelectedIndustry('')}>
                      Change Industry
                    </Button>
                  </Box>
                )}

                <DynamicForm
                  screen="organization"
                  industryCode={selectedIndustry}
                  roleKey="admin"
                  initialValues={editingItem ? toFormValues(editingItem) : { industryId: selectedIndustry, industry_id: selectedIndustry }}
                  onCancel={handleCancel}
                  submitLabel={id ? 'Save' : 'Create'}
                  onSubmit={async (values) => {
                    setLoading(true)
                    try {
                      if (id) {
                        await updateOrganization(id, { fields: values })
                        setToast({ open: true, msg: 'Organization updated successfully', sev: 'success' })
                      } else {
                        await createOrganization({ fields: { ...values, industryId: selectedIndustry } })
                        setToast({ open: true, msg: 'Organization created successfully', sev: 'success' })
                      }
                      setTimeout(() => navigate('/organization/list'), 1000)
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { message?: string } } }
                      setToast({ open: true, msg: err?.response?.data?.message ?? 'Save failed', sev: 'error' })
                    } finally {
                      setLoading(false)
                    }
                  }}
                />
              </Box>
            )}
          </Paper>
        </Box>
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.sev}
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
