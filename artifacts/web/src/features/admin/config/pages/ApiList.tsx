import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getApiTokens, createApiToken, updateApiToken, deleteApiToken, type ApiTokenConfig } from '@/services/apiTokensService'
import { getResources } from '@/services/resourcesService'
import { resolveScreen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { useConfirm } from '@/components/common/ConfirmContext'

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1', label: '🇺🇸 United States (+1)' },
  { code: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
]

// Stale-while-revalidate frontend caches for instant loading
const tokensCache = { data: [] as ApiTokenConfig[], initialized: false }
const leadSourcesCache = { data: [] as any[], initialized: false }

export default function ApiListPage() {
  const [items, setItems] = useState<ApiTokenConfig[]>(tokensCache.data)
  const [leadSources, setLeadSources] = useState<any[]>(leadSourcesCache.data)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiTokenConfig | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    leadSourceId: '',
    source: '',
    countryCode: '+91',
    status: 'ACTIVE' as ApiTokenConfig['status'],
  })

  const loadData = async () => {
    try {
      if (!tokensCache.initialized || !leadSourcesCache.initialized) {
        setLoading(true)
      }
      
      const [tokens, sources, resolved] = await Promise.all([
        getApiTokens(),
        getResources('resourceLeadSources'),
        resolveScreen({ screen_key: 'configApi' })
      ])

      // Update cache
      tokensCache.data = tokens
      tokensCache.initialized = true
      leadSourcesCache.data = sources
      leadSourcesCache.initialized = true

      setItems(tokens)
      setLeadSources(sources)
      setResolvedScreen(resolved)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load configurations', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      leadSourceId: '',
      source: '',
      countryCode: '+91',
      status: 'ACTIVE',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (apiE: ApiTokenConfig) => {
    setEditing(apiE)
    setForm({
      leadSourceId: apiE.leadSourceId || '',
      source: apiE.source || '',
      countryCode: apiE.countryCode || apiE.country_code || '+91',
      status: apiE.status || 'ACTIVE',
    })
    setDialogOpen(true)
  }

  const { confirmDelete } = useConfirm()

  const handleDelete = async (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this API credentials? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteApiToken(id)
          setToast({ open: true, msg: 'API integration deleted successfully', sev: 'success' })
          loadData()
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message || 'Failed to delete config', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleSave = async () => {
    if (!form.source) {
      setToast({ open: true, msg: 'Source is required', sev: 'error' })
      return
    }

    try {
      setLoading(true)
      const payload = {
        ...form,
        organizationId: '', // Backend resolves Admin's organization ID automatically
      }

      if (editing) {
        await updateApiToken(editing.id, payload)
        setToast({ open: true, msg: 'API integration updated successfully', sev: 'success' })
      } else {
        await createApiToken(payload)
        setToast({ open: true, msg: 'API integration added successfully', sev: 'success' })
      }
      setDialogOpen(false)
      loadData()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setToast({ open: true, msg: 'API Key copied to clipboard!', sev: 'success' })
  }

  const handleSourceChange = (val: string) => {
    const matched = leadSources.find(s => s.id === val || String(s.name || s.value || s.leadSource || '') === val)
    const sourceName = matched ? String(matched.name || matched.value || matched.leadSource || '') : val
    const sourceId = matched ? String(matched.id || '') : ''
    setForm(prev => ({
      ...prev,
      leadSourceId: sourceId,
      source: sourceName
    }))
  }

  const columns = useMemo<GridColDef<ApiTokenConfig>[]>(() => {
    if (!resolvedScreen) return []

    const cols: GridColDef<ApiTokenConfig>[] = resolvedScreen.table_headers.map((header) => {
      const col: GridColDef<ApiTokenConfig> = {
        field: header.key as keyof ApiTokenConfig,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable,
      }

      if (header.key === 'organizationId' || header.key === 'organizationId') {
        col.field = 'organizationName' as any
        col.flex = 1.2
        col.minWidth = 180
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.row.organizationName || p.row.organizationName || p.value || <em>Global Default</em>}</Box>
      } else if (header.key === 'source') {
        col.flex = 1.2
        col.minWidth = 180
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.value || <em>Not Mapped</em>}</Box>
      } else if (header.key === 'status') {
        col.width = 120
        col.renderCell = (p) => <StatusBadge value={p.value === 'ACTIVE' ? 'Active' : 'Inactive'} />
      } else if (header.key === 'countryCode' || header.key === 'country_code') {
        col.width = 120
        col.renderCell = (p) => p.value || '+91'
      } else if (header.key === 'createdAt') {
        col.field = 'created_at' as any
        col.width = 180
        col.renderCell = (p) => p.value ? new Date(p.value as string).toLocaleString() : ''
      } else if (header.key === 'api_key') {
        col.flex = 1.2
        col.minWidth = 200
        col.renderCell = (p) => (
          <Stack direction="row" alignItems="center" spacing={1}>
            <code style={{ fontSize: '0.85rem' }}>{p.value as string}</code>
            <IconButton size="small" onClick={() => handleCopy(p.value as string)}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Stack>
        )
      }

      return col
    })

    cols.push({
      field: '__actions' as any,
      headerName: 'Actions',
      width: 100,
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
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    })

    return cols
  }, [resolvedScreen, items, leadSources])

  const renderField = (field: ResolvedFormField) => {
    if (field.key === 'organizationId' || field.key === 'organizationId') {
      return null
    }

    if (field.key === 'source') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.leadSourceId || form.source}
          onChange={(e) => handleSourceChange(e.target.value)}
          required={field.required}
        >
          {leadSources.map((src) => (
            <MenuItem key={src.id} value={src.id}>
              {String(src.name || src.value || src.leadSource || '')}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    if (field.key === 'countryCode' || field.key === 'country_code') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.countryCode}
          onChange={(e) => setForm(prev => ({ ...prev, countryCode: e.target.value }))}
          required={field.required}
        >
          {COUNTRY_CODES.map((item) => (
            <MenuItem key={item.code} value={item.code}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    if (field.key === 'status') {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.label}
          value={form.status}
          onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as ApiTokenConfig['status'] }))}
          required={field.required}
        >
          {(!field.options || field.options.length === 0 ? ['ACTIVE', 'INACTIVE'] : field.options).map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    return (
      <TextField
        key={field.key}
        fullWidth
        label={field.label}
        value={form[field.key as keyof typeof form] || ''}
        onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
        required={field.required}
      />
    )
  }

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
        title="API Integration Credentials"
        subtitle="Manage secure API connection credentials, country codes, and incoming webhook triggers."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Add API
          </Button>
        }
        fullHeight
      >
        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} />
        </Box>
      </AppCard>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle>
          {editing ? 'Edit API Connection' : 'Create API'}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              pt: 1
            }}
          >
            {(() => {
              const fields = resolvedScreen?.form_fields || []
              const renderedKeys = new Set<string>()

              return fields.map((field) => {
                if (renderedKeys.has(field.key)) return null

                if (field.key === 'source') {
                  const countryField = fields.find(f => f.key === 'countryCode' || f.key === 'country_code')
                  if (countryField) {
                    renderedKeys.add('countryCode')
                    renderedKeys.add('country_code')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(countryField)}
                      </Box>
                    )
                  }
                }

                return renderField(field)
              })
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Submit
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
