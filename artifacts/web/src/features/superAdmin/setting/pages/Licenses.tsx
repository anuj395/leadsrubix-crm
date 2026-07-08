import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import api from '@/services/axiosInstance'

export interface PricingPlan {
  id: string
  name: string
  costPerUser: number
  billingCycle: string
  maxLeads: string
  integrationsCount: string
  status: string
  description: string
  licensesCost: number
  trialPeriodLicenses: number
  gracePeriodDays: number
  trialPeriodDays: number
}

export default function LicensesPage() {
  const [items, setItems] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PricingPlan | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    licensesCost: 1000,
    trialPeriodLicenses: 20,
    gracePeriodDays: 7,
    trialPeriodDays: 30,
  })

  const refreshPlans = async () => {
    setLoading(true)
    try {
      const res = await api.get('/pricing-plans')
      // Sort plans by creation date (oldest first) so Plan names stay stable
      const sorted = (res.data || []).sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const mapped = sorted.map((p: any, idx: number) => ({
        id: p._id,
        name: `Plan ${idx + 1}`,
        costPerUser: 0,
        billingCycle: 'Monthly',
        maxLeads: '—',
        integrationsCount: '—',
        status: 'Active',
        description: '',
        licensesCost: p.licensesCost,
        trialPeriodLicenses: p.trialPeriodLicenses,
        gracePeriodDays: p.gracePeriodDays !== undefined ? p.gracePeriodDays : 7,
        trialPeriodDays: p.trialPeriodDays !== undefined ? p.trialPeriodDays : 30,
      }))
      setItems(mapped)
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to load plans',
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshPlans()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      licensesCost: 1000,
      trialPeriodLicenses: 20,
      gracePeriodDays: 7,
      trialPeriodDays: 30,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (plan: PricingPlan) => {
    setEditing(plan)
    setForm({
      licensesCost: plan.licensesCost ?? 1000,
      trialPeriodLicenses: plan.trialPeriodLicenses ?? 20,
      gracePeriodDays: plan.gracePeriodDays ?? 7,
      trialPeriodDays: plan.trialPeriodDays ?? 30,
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/pricing-plans/${id}`)
      setToast({ open: true, msg: 'Pricing plan deleted successfully', sev: 'success' })
      void refreshPlans()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to delete pricing plan',
        sev: 'error',
      })
    }
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/pricing-plans/${editing.id}`, {
          licensesCost: form.licensesCost,
          trialPeriodLicenses: form.trialPeriodLicenses,
          gracePeriodDays: form.gracePeriodDays,
          trialPeriodDays: form.trialPeriodDays,
        })
        setToast({ open: true, msg: 'Pricing plan updated successfully', sev: 'success' })
      } else {
        await api.post('/pricing-plans', {
          licensesCost: form.licensesCost,
          trialPeriodLicenses: form.trialPeriodLicenses,
          gracePeriodDays: form.gracePeriodDays,
          trialPeriodDays: form.trialPeriodDays,
        })
        setToast({ open: true, msg: 'Pricing plan added successfully', sev: 'success' })
      }
      setDialogOpen(false)
      void refreshPlans()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to save pricing plan',
        sev: 'error',
      })
    }
  }

  const columns = useMemo<GridColDef<PricingPlan>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Plan Name',
        flex: 1.2,
        minWidth: 150,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'licensesCost',
        headerName: 'Licenses Cost',
        width: 180,
        renderCell: (p) => `${p.value ?? ''}`,
      },
      {
        field: 'trialPeriodLicenses',
        headerName: 'Trial Period Licenses',
        width: 220,
        renderCell: (p) => `${p.value ?? ''}`,
      },
      {
        field: 'gracePeriodDays',
        headerName: 'Grace Period (Days)',
        width: 180,
        renderCell: (p) => `${p.value ?? ''}`,
      },
      {
        field: 'trialPeriodDays',
        headerName: 'Trial Period (Days)',
        width: 180,
        renderCell: (p) => `${p.value ?? ''}`,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [items],
  )

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppCard
        title="Tenant License Costs Manager"
        subtitle="Manage available pricing tiers, billing cycle rules, and feature flags for client industries."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
            disabled={items.length >= 1}
          >
            Add Plan
          </Button>
        }
        fullHeight
      >
        <AppDataGrid onReload={refreshPlans} height="100%" rows={items} columns={columns} getRowId={(r) => r.id} loading={loading} />
      </AppCard>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px',
          },
        }}
      >
        <DialogTitle>{editing ? 'Edit Plan Config' : 'Add New Pricing Plan'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Licenses Cost"
                value={form.licensesCost}
                onChange={(e) => setForm({ ...form, licensesCost: parseInt(e.target.value) || 0 })}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Number of Licenses(trial period)"
                value={form.trialPeriodLicenses}
                onChange={(e) => setForm({ ...form, trialPeriodLicenses: parseInt(e.target.value) || 0 })}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                type="number"
                label="Grace Period (Days)"
                value={form.gracePeriodDays}
                onChange={(e) => setForm({ ...form, gracePeriodDays: parseInt(e.target.value) || 0 })}
                required
                helperText="Allowed duration extension before account suspension"
              />
            </Box>
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                type="number"
                label="Trial Period (Days)"
                value={form.trialPeriodDays}
                onChange={(e) => setForm({ ...form, trialPeriodDays: parseInt(e.target.value) || 0 })}
                required
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this pricing plan? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deletingId) {
                handleDelete(deletingId)
              }
              setDeleteConfirmOpen(false)
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
