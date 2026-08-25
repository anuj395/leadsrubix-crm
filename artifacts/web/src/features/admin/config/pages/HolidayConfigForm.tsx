import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'
import { useActionPermission } from '@/hooks/useActionPermission'
import type { Holiday } from './HolidayConfig'

const inputSx = {
  width: '100%',
}

const HOLIDAY_TYPES = ['National', 'State', 'Company Holiday']

export default function HolidayConfigFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { can_add, can_edit, loading: permsLoading } = useActionPermission('holidays')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(!!id)
  
  const [form, setForm] = useState({
    name: '',
    date: '',
    dayOfWeek: 'Monday',
    type: 'National' as Holiday['type'],
    description: '',
  })

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    if (id) {
      const loadItem = async () => {
        try {
          const res = await api.get('/holidays')
          const match = (res.data?.items || []).find((i: any) => i.id === id)
          if (match) {
            setForm({
              name: match.name,
              date: match.date,
              dayOfWeek: match.dayOfWeek,
              type: match.type,
              description: match.description || '',
            })
          } else {
            setToast({ open: true, msg: 'Holiday not found', sev: 'error' })
          }
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to load holiday details', sev: 'error' })
        } finally {
          setInitializing(false)
        }
      }
      void loadItem()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.date) {
      setToast({ open: true, msg: 'Name and Date are required', sev: 'error' })
      return
    }

    try {
      setLoading(true)
      if (id) {
        await api.put(`/holidays/${id}`, form)
        setToast({ open: true, msg: 'Holiday updated successfully', sev: 'success' })
      } else {
        await api.post('/holidays', form)
        setToast({ open: true, msg: 'Holiday added successfully', sev: 'success' })
      }
      setTimeout(() => navigate('/configuration/holiday-config'), 1500)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save holiday', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Precompute day of week when date changes
  const handleDateChange = (dateVal: string) => {
    if (!dateVal) {
      setForm({ ...form, date: '', dayOfWeek: '' })
      return
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = days[new Date(dateVal).getDay()]
    setForm({ ...form, date: dateVal, dayOfWeek: dayName })
  }

  if (initializing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!permsLoading) {
    if (id && !can_edit) {
      return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="error">
            Access Denied: You do not have permission to edit holidays.
          </Alert>
        </Box>
      )
    }
    if (!id && !can_add) {
      return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="error">
            Access Denied: You do not have permission to add holidays.
          </Alert>
        </Box>
      )
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
      <AppCard
        title={id ? 'Edit Holiday' : 'Create Holiday'}
        subtitle="Manage holiday details, category types, dates and remarks."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/configuration/holiday-config')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Box sx={{ mt: 2 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    size="small"
                    label="Holiday Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    sx={inputSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    size="small"
                    label="Holiday Type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    required
                    sx={inputSx}
                  >
                    {HOLIDAY_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    size="small"
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={form.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                    sx={inputSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    size="small"
                    label="Day of Week"
                    value={form.dayOfWeek}
                    disabled
                    sx={inputSx}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    size="small"
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    sx={inputSx}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={() => navigate('/configuration/holiday-config')} variant="outlined" color="secondary" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                      Save Holiday
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
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
