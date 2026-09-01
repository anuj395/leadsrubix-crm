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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import MenuItem from '@mui/material/MenuItem'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import api from '@/services/axiosInstance'

export interface PricingPlan {
  id: string
  name: string
  organizationId?: string | null
  industryId?: string | null
  description: string
  licensesCost: number
  trialPeriodLicenses: number
  gracePeriodDays: number
  trialPeriodDays: number
}

export default function LicensesPage() {
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
  } = useSuperAdminScope(true)

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

  // Form state without artificial hardcoded fallbacks
  const [form, setForm] = useState<{
    name: string
    industryId: string
    organizationId: string
    licensesCost: number | ''
    trialPeriodLicenses: number | ''
    gracePeriodDays: number | ''
    trialPeriodDays: number | ''
  }>({
    name: '',
    industryId: '',
    organizationId: '',
    licensesCost: '',
    trialPeriodLicenses: '',
    gracePeriodDays: '',
    trialPeriodDays: '',
  })

  const refreshPlans = async () => {
    setLoading(true)
    try {
      const res = await api.get('/pricing-plans', {
        params: {
          industryId: selectedIndustry !== 'all' ? selectedIndustry : undefined,
          organizationId: selectedOrg !== 'all' ? selectedOrg : undefined,
        },
      })
      // Sort plans by creation date (oldest first) so Plan names stay stable
      const sorted = (res.data || []).sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const mapped = sorted.map((p: any, idx: number) => ({
        id: p._id,
        name: p.name || `Plan ${idx + 1}`,
        organizationId: p.organization_id || p.organizationId || null,
        industryId: p.industry_id || p.industryId || null,
        description: p.description || '',
        licensesCost: Number(p.licenses_cost ?? p.licensesCost ?? 0),
        trialPeriodLicenses: Number(p.trial_period_licenses ?? p.trialPeriodLicenses ?? 0),
        gracePeriodDays: Number(p.grace_period_days ?? p.gracePeriodDays ?? 0),
        trialPeriodDays: Number(p.trial_period_days ?? p.trialPeriodDays ?? 0),
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
  }, [selectedIndustry, selectedOrg])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      name: `Plan ${items.length + 1}`,
      industryId: selectedIndustry !== 'all' ? selectedIndustry : '',
      organizationId: selectedOrg !== 'all' ? selectedOrg : '',
      licensesCost: '',
      trialPeriodLicenses: '',
      gracePeriodDays: '',
      trialPeriodDays: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (plan: PricingPlan) => {
    setEditing(plan)
    setForm({
      name: plan.name || '',
      industryId: plan.industryId || '',
      organizationId: plan.organizationId || '',
      licensesCost: plan.licensesCost,
      trialPeriodLicenses: plan.trialPeriodLicenses,
      gracePeriodDays: plan.gracePeriodDays,
      trialPeriodDays: plan.trialPeriodDays,
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
      const payload = {
        name: form.name.trim() || `Plan ${items.length + 1}`,
        industryId: form.industryId || null,
        organizationId: form.organizationId || null,
        licensesCost: form.licensesCost === '' ? 0 : Number(form.licensesCost),
        trialPeriodLicenses: form.trialPeriodLicenses === '' ? 0 : Number(form.trialPeriodLicenses),
        gracePeriodDays: form.gracePeriodDays === '' ? 0 : Number(form.gracePeriodDays),
        trialPeriodDays: form.trialPeriodDays === '' ? 0 : Number(form.trialPeriodDays),
      }

      if (editing) {
        await api.put(`/pricing-plans/${editing.id}`, payload)
        setToast({ open: true, msg: 'Pricing plan updated successfully', sev: 'success' })
      } else {
        await api.post('/pricing-plans', payload)
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
        minWidth: 140,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'industryId',
        headerName: 'Industry Scope',
        width: 160,
        renderCell: (p) => {
          if (!p.value) return 'Global (All)'
          const ind = industries.find((i) => i.code === p.value || i._id === p.value || (i as any).industry_id === p.value)
          return ind ? ind.name : p.value
        },
      },
      {
        field: 'organizationId',
        headerName: 'Organization Scope',
        width: 180,
        renderCell: (p) => {
          if (!p.value) return 'Global (All)'
          const org = filteredOrgs.find((o) => o.code === p.value || (o as any)._id === p.value || (o as any).organization_id === p.value || (o as any).organizationId === p.value)
          return org ? org.name : p.value
        },
      },
      {
        field: 'licensesCost',
        headerName: 'Licenses Cost',
        width: 150,
        renderCell: (p) => (p.value !== undefined && p.value !== null ? `₹${Number(p.value).toLocaleString('en-IN')}` : '—'),
      },
      {
        field: 'trialPeriodLicenses',
        headerName: 'Trial Period Licenses',
        width: 180,
        renderCell: (p) => `${p.value ?? 0}`,
      },
      {
        field: 'gracePeriodDays',
        headerName: 'Grace Period (Days)',
        width: 170,
        renderCell: (p) => `${p.value ?? 0}`,
      },
      {
        field: 'trialPeriodDays',
        headerName: 'Trial Period (Days)',
        width: 170,
        renderCell: (p) => `${p.value ?? 0}`,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [items, industries, filteredOrgs],
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
      <SuperAdminScopeSelector
        isSuperAdmin={true}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        filteredOrgs={filteredOrgs}
        selectedOrg={selectedOrg}
        setSelectedOrg={setSelectedOrg}
      />

      <AppCard
        title="Tenant License Costs Manager"
        subtitle="Manage available pricing tiers, billing cycle rules, and feature flags for client industries."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
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
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                label="Plan Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Plan 1, Growth Tier, Enterprise Plan"
              />
            </Box>
            <Box>
              <TextField
                select
                fullWidth
                label="Industry Scope"
                value={form.industryId}
                onChange={(e) => setForm({ ...form, industryId: e.target.value })}
                helperText="Leave empty for Global (All Industries)"
              >
                <MenuItem value="">
                  <em>Global (All Industries)</em>
                </MenuItem>
                {industries.filter((i) => i.code !== 'all').map((ind) => (
                  <MenuItem key={ind._id || ind.code} value={ind.code}>
                    {ind.name} ({ind.code})
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <TextField
                select
                fullWidth
                label="Organization Scope"
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                helperText="Leave empty for Global (All Organizations)"
              >
                <MenuItem value="">
                  <em>Global (All Organizations)</em>
                </MenuItem>
                {filteredOrgs.filter((o) => o.code !== 'all').map((org) => (
                  <MenuItem key={org.code || (org as any)._id} value={org.code || (org as any)._id}>
                    {org.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Licenses Cost"
                placeholder="Enter license cost (e.g. 500)"
                value={form.licensesCost}
                onChange={(e) => setForm({ ...form, licensesCost: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Number of Licenses(trial period)"
                placeholder="Enter trial licenses (e.g. 10)"
                value={form.trialPeriodLicenses}
                onChange={(e) => setForm({ ...form, trialPeriodLicenses: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                type="number"
                label="Grace Period (Days)"
                placeholder="Enter grace period in days (e.g. 7)"
                value={form.gracePeriodDays}
                onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                required
                helperText="Allowed duration extension before account suspension"
              />
            </Box>
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                type="number"
                label="Trial Period (Days)"
                placeholder="Enter trial period in days (e.g. 7)"
                value={form.trialPeriodDays}
                onChange={(e) => setForm({ ...form, trialPeriodDays: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
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
