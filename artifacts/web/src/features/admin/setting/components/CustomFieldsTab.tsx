import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { api } from '@/services/api'

interface CustomField {
  id: string
  _id?: string
  module: string
  fieldKey: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'boolean'
  required: boolean
  options: string[]
  isActive: boolean
}

export function CustomFieldsTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState<CustomField[]>([])
  const [moduleFilter, setModuleFilter] = useState<'leads' | 'contacts' | 'deals'>('leads')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [form, setForm] = useState({
    label: '',
    type: 'text' as CustomField['type'],
    required: false,
    optionsStr: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchFields = async () => {
    setLoading(true)
    try {
      const res = await api.get('custom-fields', { params: { module: moduleFilter } })
      setFields(res.data?.items || [])
    } catch (err: any) {
      showToast(err?.message || 'Failed to fetch custom fields', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFields()
  }, [moduleFilter])

  const handleOpenAdd = () => {
    setEditingField(null)
    setForm({ label: '', type: 'text', required: false, optionsStr: '' })
    setDialogOpen(true)
  }

  const handleOpenEdit = (field: CustomField) => {
    setEditingField(field)
    setForm({
      label: field.label,
      type: field.type,
      required: field.required,
      optionsStr: (field.options || []).join(', '),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) {
      showToast('Field label is required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        module: moduleFilter,
        label: form.label.trim(),
        type: form.type,
        required: form.required,
        options: form.optionsStr ? form.optionsStr.split(',').map((s) => s.trim()).filter(Boolean) : [],
      }

      if (editingField) {
        await api.put(`custom-fields/${editingField.id || editingField._id}`, payload)
        showToast('Custom field updated successfully')
      } else {
        await api.post('custom-fields', payload)
        showToast('Custom field created successfully')
      }
      setDialogOpen(false)
      fetchFields()
    } catch (err: any) {
      showToast(err?.message || 'Failed to save custom field', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`custom-fields/${id}`)
      showToast('Custom field deleted')
      fetchFields()
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete field', 'error')
    }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Dynamic Custom Fields Builder
          </Typography>
          <TextField
            select
            size="small"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as any)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="leads">Leads</MenuItem>
            <MenuItem value="contacts">Contacts</MenuItem>
            <MenuItem value="deals">Deals</MenuItem>
          </TextField>
        </Stack>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ fontWeight: 600 }}>
          Add Custom Field
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Field Label</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>System Key</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Options / Values</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No custom fields defined for {moduleFilter}. Click "Add Custom Field" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((f) => (
                  <TableRow key={f.id || f._id}>
                    <TableCell sx={{ fontWeight: 600 }}>{f.label}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main' }}>{f.fieldKey}</TableCell>
                    <TableCell>
                      <Chip label={f.type.toUpperCase()} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>{f.required ? <Chip label="Yes" color="error" size="small" /> : 'No'}</TableCell>
                    <TableCell>{(f.options || []).join(', ') || '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenEdit(f)} sx={{ mr: 1 }}>
                        Edit
                      </Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(f.id || (f._id as string))}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog: Add/Edit Custom Field */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Field Label"
              fullWidth
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Preferred Contact Time"
            />

            <TextField
              select
              label="Data Type"
              fullWidth
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}
            >
              <MenuItem value="text">Text Input</MenuItem>
              <MenuItem value="number">Numeric Number</MenuItem>
              <MenuItem value="select">Dropdown Select</MenuItem>
              <MenuItem value="date">Calendar Date</MenuItem>
              <MenuItem value="boolean">Yes / No Checkbox</MenuItem>
            </TextField>

            {form.type === 'select' && (
              <TextField
                label="Dropdown Options (Comma Separated)"
                fullWidth
                multiline
                rows={2}
                value={form.optionsStr}
                onChange={(e) => setForm((p) => ({ ...p, optionsStr: e.target.value }))}
                placeholder="Morning, Afternoon, Evening, Night"
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={form.required}
                  onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
                />
              }
              label="Mark as Required Field"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Field'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
