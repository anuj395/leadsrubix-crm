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
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getApiTokens, createApiToken, updateApiToken, deleteApiToken, type ApiTokenConfig } from '@/services/apiTokensService'
import { listOrganizationsPaged, type Organization } from '@/services/organizationsService'
import { getResources } from '@/services/resourcesService'
import { resolveScreen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'

// Stale-while-revalidate frontend caches for instant loading
const tokensCache = { data: [] as ApiTokenConfig[], initialized: false }
const organizationsCache = { data: [] as Organization[], initialized: false }

export default function ApiListPage() {
  const [items, setItems] = useState<ApiTokenConfig[]>(tokensCache.data)
  const [organizations, setOrganizations] = useState<Organization[]>(organizationsCache.data)
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiTokenConfig | null>(null)
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const loadData = async (targetIndustry?: string) => {
    try {
      if (!tokensCache.initialized || !organizationsCache.initialized) {
        setLoading(true)
      }
      
      let currentIndustries = industries
      if (currentIndustries.length === 0) {
        currentIndustries = await getIndustries(true)
        setIndustries(currentIndustries)
      }

      const activeIndustry = targetIndustry || selectedIndustry || currentIndustries[0]?.code || ''
      if (activeIndustry && selectedIndustry !== activeIndustry) {
        setSelectedIndustry(activeIndustry)
      }

      const [tokens, orgsData, resolved] = await Promise.all([
        getApiTokens(),
        listOrganizationsPaged({ page: 0, pageSize: 100 }),
        resolveScreen({ screen_key: 'configApi', industry_code: activeIndustry || undefined })
      ])

      // Update cache
      tokensCache.data = tokens
      tokensCache.initialized = true
      organizationsCache.data = orgsData.items
      organizationsCache.initialized = true

      setItems(tokens)
      setOrganizations(orgsData.items)
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
    setDialogOpen(true)
  }

  const openEditDialog = (apiE: ApiTokenConfig) => {
    setEditing(apiE)
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

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setToast({ open: true, msg: 'API Key copied to clipboard!', sev: 'success' })
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

      if (header.key === 'organizationId' || header.key === 'organization_id') {
        col.field = 'organization_name' as any
        col.flex = 1.2
        col.minWidth = 180
        col.renderCell = (p) => <Box sx={{ fontWeight: 600 }}>{p.row.organization_name || p.row.organizationName || p.value || <em>Global Default</em>}</Box>
      } else if (header.key === 'source') {
        col.width = 160
        col.renderCell = (p) => p.value || <em>Not Mapped</em>
      } else if (header.key === 'status') {
        col.width = 110
        col.renderCell = (p) => <StatusBadge value={p.value === 'ACTIVE' ? 'Active' : 'Inactive'} />
      } else if (header.key === 'countryCode' || header.key === 'country_code') {
        col.width = 100
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
  }, [resolvedScreen, items])

  const filteredItems = useMemo(() => {
    if (!selectedIndustry) return items
    const orgIds = new Set(organizations.filter(o => (o.industry_id || o.industryId) === selectedIndustry).map(o => String(o.organizationId || o.organization_id || o._id)))
    return items.filter(item => orgIds.has(String(item.organizationId || item.organization_id)))
  }, [items, organizations, selectedIndustry])

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
        subtitle="Manage incoming webhooks, country codes, and source triggers (Super Admin View)."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Add API
          </Button>
        }
        fullHeight
      >
        <Stack direction="row" spacing={2} sx={{ mb: 2, pt: 1 }}>
          <TextField
            select
            size="small"
            label="Select Industry"
            value={selectedIndustry}
            onChange={(e) => {
              setSelectedIndustry(e.target.value)
              void loadData(e.target.value)
            }}
            sx={{ minWidth: 240 }}
          >
            {industries.map((ind) => (
              <MenuItem key={ind.code} value={ind.code}>
                {ind.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <LinearProgress />
            </Box>
          )}
          <AppDataGrid height="100%" rows={filteredItems} columns={columns} getRowId={(r) => r.id} />
        </Box>
      </AppCard>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md"
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
          <DynamicForm
            screen="configApi"
            industry_code={selectedIndustry}
            role_key="admin"
            initialValues={editing ? (editing as any) : { organizationId: '', status: 'ACTIVE' }}
            onCancel={() => setDialogOpen(false)}
            submitLabel={editing ? 'Save' : 'Create'}
            onSubmit={async (values) => {
              try {
                if (editing) {
                  await updateApiToken(editing.id, values as any)
                  setToast({ open: true, msg: 'API integration updated successfully', sev: 'success' })
                } else {
                  await createApiToken(values as any)
                  setToast({ open: true, msg: 'API integration added successfully', sev: 'success' })
                }
                setDialogOpen(false)
                loadData()
              } catch (e: any) {
                setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save configuration', sev: 'error' })
              }
            }}
          />
        </DialogContent>
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
