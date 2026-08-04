import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { AppCard } from '@/components/ui/AppCard'
import { useConfirm } from '@/components/common/ConfirmContext'
import { useAuth } from '@/hooks/useAuth'
import {
  getScreens,
  getScreenFields,
  createScreenField,
  updateScreenField,
  deleteScreenField,
  SCREEN_FIELD_TYPES,
  DROPDOWN_SOURCES,
  type Screen,
  type ScreenField,
  type ScreenFieldType,
  type DropdownSource,
} from '@/services/screenAdminService'

interface FormState {
  _id?: string
  fieldKey: string
  label: string
  type: ScreenFieldType
  options: string
  dropdownSource: DropdownSource
  dropdownApi: string
  isTableVisible: boolean
  isFormVisible: boolean
  isRequired: boolean
  sortable: boolean
  order: number
  isActive: boolean
}

const emptyForm: FormState = {
  fieldKey: '',
  label: '',
  type: 'text',
  options: '',
  dropdownSource: 'none',
  dropdownApi: '',
  isTableVisible: true,
  isFormVisible: true,
  isRequired: false,
  sortable: true,
  order: 0,
  isActive: true,
}

export default function AdminScreenFieldsPage() {
  const { user } = useAuth()
  const [screens, setScreens] = useState<Screen[]>([])
  const [screenId, setScreenId] = useState('')
  const [fields, setFields] = useState<ScreenField[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load screens under tenant scope once.
  useEffect(() => {
    void (async () => {
      try {
        const scrs = await getScreens()
        setScreens(scrs)
        if (scrs[0]) setScreenId(scrs[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screens', sev: 'error' })
      }
    })()
  }, [])

  // Reload fields whenever selected screenId changes.
  const refreshFields = async () => {
    if (!screenId) {
      setFields([])
      return
    }
    setLoading(true)
    try {
      setFields(await getScreenFields(screenId))
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load fields', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshFields()
  }, [screenId])

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (row: ScreenField) => {
    setForm({
      _id: row._id,
      fieldKey: row.fieldKey,
      label: row.label,
      type: row.type,
      options: (row.options || []).join('\n'),
      dropdownSource: row.dropdownSource || 'none',
      dropdownApi: row.dropdownApi || '',
      isTableVisible: row.isTableVisible,
      isFormVisible: row.isFormVisible,
      isRequired: row.isRequired,
      sortable: row.sortable,
      order: row.order ?? 0,
      isActive: row.isActive,
    })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!screenId) return
    if (!form.fieldKey.trim() || !form.label.trim()) {
      setToast({ open: true, msg: 'Field key and label are required', sev: 'error' })
      return
    }
    setSaving(true)
    try {
      const opts = form.options
        ? form.options
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

      const payload = {
        screenId,
        fieldKey: form.fieldKey,
        label: form.label,
        type: form.type,
        options: opts,
        dropdownSource: form.dropdownSource,
        dropdownApi: form.dropdownApi || undefined,
        isTableVisible: form.isTableVisible,
        isFormVisible: form.isFormVisible,
        isRequired: form.isRequired,
        sortable: form.sortable,
        order: form.order,
        isActive: form.isActive,
        organizationId: (user as any)?.organizationId || (user as any)?.organization_id,
        industryId: (user as any)?.industryId || (user as any)?.industry_id,
      }

      if (form._id) {
        await updateScreenField(form._id, payload)
      } else {
        await createScreenField(payload)
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Field configuration saved successfully', sev: 'success' })
      await refreshFields()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const { confirmDelete } = useConfirm()

  const remove = (row: ScreenField) => {
    confirmDelete({
      title: 'Confirm Field Deletion',
      message: `Delete screen field "${row.label}"? This change applies strictly to your organization.`,
      onConfirm: async () => {
        try {
          await deleteScreenField(row._id)
          setToast({ open: true, msg: 'Field deleted', sev: 'success' })
          await refreshFields()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      },
    })
  }

  const columns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      { field: 'fieldKey', headerName: 'Key', flex: 1, renderCell: (p) => <code>{p.value}</code> },
      { field: 'label', headerName: 'Label', flex: 1 },
      { field: 'type', headerName: 'Type', width: 120 },
      { field: 'order', headerName: 'Order', width: 80, type: 'number' },
      {
        field: 'isTableVisible',
        headerName: 'Table',
        width: 80,
        renderCell: (p) => <StatusBadge value={p.value ? 'Yes' : 'No'} />,
      },
      {
        field: 'isFormVisible',
        headerName: 'Form',
        width: 80,
        renderCell: (p) => <StatusBadge value={p.value ? 'Yes' : 'No'} />,
      },
      {
        field: 'isRequired',
        headerName: 'Req.',
        width: 80,
        renderCell: (p) => <StatusBadge value={p.value ? 'Yes' : 'No'} />,
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 90,
        renderCell: (p) => <StatusBadge value={p.value ? 'Active' : 'Inactive'} />,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        width: 110,
        renderCell: (p) => (
          <>
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => remove(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        ),
      },
    ],
    [openEdit, remove],
  )

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Organization Screen Fields"
        subtitle="Manage custom fields, visibility, and validations per screen for your organization."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!screenId}>
            Add Custom Field
          </Button>
        }
        fullHeight
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Select Screen"
              value={screenId}
              onChange={(e) => setScreenId(e.target.value)}
              sx={{ minWidth: 260 }}
              size="small"
            >
              {screens.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name} ({s.key})
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box sx={{ flexGrow: 1, height: 0 }}>
            <AppDataGrid
              height="100%"
              rows={fields}
              columns={columns}
              loading={loading}
              getRowId={(r) => r._id}
              onReload={refreshFields}
            />
          </Box>
        </Stack>
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form._id ? 'Edit Field' : 'New Custom Field'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Field Key"
                value={form.fieldKey}
                onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}
                disabled={!!form._id}
                fullWidth
                helperText="Identifier (e.g. mobileNumber)"
              />
              <TextField
                label="Label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Field Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ScreenFieldType })}
                fullWidth
              >
                {SCREEN_FIELD_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Order"
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                sx={{ width: 140 }}
              />
            </Stack>

            {form.type === 'select' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Dropdown Source"
                  value={form.dropdownSource}
                  onChange={(e) => setForm({ ...form, dropdownSource: e.target.value as DropdownSource })}
                  fullWidth
                >
                  {DROPDOWN_SOURCES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                {form.dropdownSource === 'api' && (
                  <TextField
                    label="API Path"
                    value={form.dropdownApi}
                    onChange={(e) => setForm({ ...form, dropdownApi: e.target.value })}
                    fullWidth
                    placeholder="/api/projects"
                  />
                )}
              </Stack>
            )}

            {form.type === 'select' && form.dropdownSource === 'none' && (
              <TextField
                label="Options (one per line)"
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            )}

            <Stack direction="row" spacing={3} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isTableVisible}
                    onChange={(e) => setForm({ ...form, isTableVisible: e.target.checked })}
                  />
                }
                label="Visible in Table"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isFormVisible}
                    onChange={(e) => setForm({ ...form, isFormVisible: e.target.checked })}
                  />
                }
                label="Visible in Form"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isRequired}
                    onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  />
                }
                label="Required"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save Field'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
