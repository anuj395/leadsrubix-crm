import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
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

export default function ScreenFieldsPage() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [screenId, setScreenId] = useState<string>('')
  const [items, setItems] = useState<ScreenField[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load screens once.
  useEffect(() => {
    void (async () => {
      try {
        const list = await getScreens()
        setScreens(list)
        if (list[0]) setScreenId(list[0]._id)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screens', sev: 'error' })
      }
    })()
  }, [])

  // Load fields whenever the selected screen changes (race-safe).
  useEffect(() => {
    if (!screenId) {
      setItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const list = await getScreenFields(screenId)
        if (!cancelled) setItems(list)
      } catch (e: any) {
        if (!cancelled) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load fields', sev: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [screenId])

  const refresh = async () => {
    if (!screenId) return
    try {
      setItems(await getScreenFields(screenId))
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to refresh', sev: 'error' })
    }
  }

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (row: ScreenField) => {
    setForm({
      _id: row._id,
      fieldKey: row.fieldKey || row.field_key || '',
      label: row.label,
      type: row.type,
      options: (row.options || []).join(', '),
      dropdownSource: row.dropdownSource || row.dropdown_source || 'none',
      dropdownApi: row.dropdownApi || row.dropdown_api || '',
      isTableVisible: row.isTableVisible !== undefined ? row.isTableVisible : !!row.is_table_visible,
      isFormVisible: row.isFormVisible !== undefined ? row.isFormVisible : !!row.is_form_visible,
      isRequired: row.isRequired !== undefined ? row.isRequired : !!row.is_required,
      sortable: row.sortable,
      order: row.order,
      isActive: row.isActive,
    })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.fieldKey.trim() || !form.label.trim()) {
      setToast({ open: true, msg: 'Field key and label are required', sev: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        screenId,
        fieldKey: form.fieldKey,
        field_key: form.fieldKey,
        label: form.label,
        type: form.type,
        options: form.options
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        dropdownSource: form.dropdownSource,
        dropdown_source: form.dropdownSource,
        dropdownApi: form.dropdownSource === 'api' ? form.dropdownApi.trim() : '',
        dropdown_api: form.dropdownSource === 'api' ? form.dropdownApi.trim() : '',
        isTableVisible: form.isTableVisible,
        is_table_visible: form.isTableVisible,
        isFormVisible: form.isFormVisible,
        is_form_visible: form.isFormVisible,
        isRequired: form.isRequired,
        is_required: form.isRequired,
        sortable: form.sortable,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      }
      if (form._id) {
        await updateScreenField(form._id, payload)
      } else {
        await createScreenField(payload)
      }
      setDialogOpen(false)
      setToast({ open: true, msg: 'Saved', sev: 'success' })
      await refresh()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Save failed', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const { confirmDelete } = useConfirm()

  const remove = async (row: ScreenField) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Delete field "${row.label}"?\n\nThis also removes any per-(role × industry) permissions for it. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteScreenField(row._id)
          setToast({ open: true, msg: 'Deleted', sev: 'success' })
          await refresh()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Delete failed', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<ScreenField>[]>(
    () => [
      { field: 'fieldKey', headerName: 'Key', flex: 1, valueGetter: (_, row) => row.fieldKey || row.field_key, renderCell: (p) => <code>{p.value}</code> },
      { field: 'label', headerName: 'Label', flex: 1.2 },
      { field: 'order', headerName: 'Order', width: 90, type: 'number' },
      { field: 'type', headerName: 'Type', width: 110, renderCell: (p) => <StatusBadge value={p.value} hideDot /> },
      {
        field: 'isTableVisible',
        headerName: 'In Table',
        width: 100,
        valueGetter: (_, row) => (row.isTableVisible !== undefined ? row.isTableVisible : row.is_table_visible),
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'isFormVisible',
        headerName: 'In Form',
        width: 100,
        valueGetter: (_, row) => (row.isFormVisible !== undefined ? row.isFormVisible : row.is_form_visible),
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'isRequired',
        headerName: 'Required',
        width: 100,
        valueGetter: (_, row) => (row.isRequired !== undefined ? row.isRequired : row.is_required),
        renderCell: (p) => (p.value ? 'Yes' : '—'),
      },
      {
        field: 'dropdownSource',
        headerName: 'Source',
        flex: 1.5,
        valueGetter: (_, row) => {
          if (row.type !== 'select') return '—'
          const src = row.dropdownSource || row.dropdown_source
          const api = row.dropdownApi || row.dropdown_api
          if (src === 'api') return `api (${api})`
          if (src === 'static') return `static (${(row.options || []).length})`
          return 'none'
        },
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
        title="Screen Fields"
        subtitle="Master list of all fields available on each screen. Per-role/industry visibility is managed on the Screen Permissions page."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!screenId}>
            Add Field
          </Button>
        }
        fullHeight
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0, pt: 1.5 }}>
          <TextField
            select
            size="small"
            label="Screen"
            value={screenId}
            onChange={(e) => setScreenId(e.target.value)}
            sx={{ minWidth: 240 }}
            disabled={!screens.length}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 400,
                  },
                },
              },
            }}
          >
            {screens.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name} ({s.key})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !screenId ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Pick a screen to manage its fields.
          </Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No fields configured for this screen yet.
          </Typography>
        ) : (
          <AppDataGrid onReload={refresh}
            height="100%"
            rows={items}
            columns={gridColumns}
            loading={loading}
            getRowId={(r) => r._id}
            initialState={{
              sorting: {
                sortModel: [{ field: 'order', sort: 'asc' }],
              },
            }}
          />
        )}
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form._id ? 'Edit Field' : 'New Field'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Field Key"
              value={form.fieldKey}
              onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}
              helperText="Data key used by client code (e.g. customerName)"
              disabled={!!form._id}
              fullWidth
            />
            <TextField
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ScreenFieldType })}
              fullWidth
            >
              {SCREEN_FIELD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            {form.type === 'select' && (
              <>
                <TextField
                  select
                  label="Dropdown Source"
                  value={form.dropdownSource}
                  onChange={(e) => setForm({ ...form, dropdownSource: e.target.value as DropdownSource })}
                  helperText="Where the dropdown options come from"
                  fullWidth
                >
                  {DROPDOWN_SOURCES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
                {form.dropdownSource === 'static' && (
                  <TextField
                    label="Static Options"
                    value={form.options}
                    onChange={(e) => setForm({ ...form, options: e.target.value })}
                    helperText="Comma-separated values for the dropdown"
                    fullWidth
                  />
                )}
                {form.dropdownSource === 'api' && (
                  <TextField
                    label="Dropdown API URL"
                    value={form.dropdownApi}
                    onChange={(e) => setForm({ ...form, dropdownApi: e.target.value })}
                    helperText="e.g. /api/options/lead-types — must return [{value,label}] or {items:[...]}"
                    fullWidth
                  />
                )}
              </>
            )}
            <TextField
              label="Order"
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              fullWidth
            />
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={form.isTableVisible} onChange={(e) => setForm({ ...form, isTableVisible: e.target.checked })} />}
                label="Show in table"
              />
              <FormControlLabel
                control={<Switch checked={form.isFormVisible} onChange={(e) => setForm({ ...form, isFormVisible: e.target.checked })} />}
                label="Show in form"
              />
              <FormControlLabel
                control={<Switch checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />}
                label="Required"
              />
              <FormControlLabel
                control={<Switch checked={form.sortable} onChange={(e) => setForm({ ...form, sortable: e.target.checked })} />}
                label="Sortable"
              />
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                label="Active"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
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
