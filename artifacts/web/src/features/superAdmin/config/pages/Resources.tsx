import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import {
  type GridColDef,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter
} from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import { getScreens, resolveScreen, type Screen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { getResources, createResource, updateResource, deleteResource } from '@/services/resourcesService'
import { listOrganizationsPaged, type Organization } from '@/services/organizationsService'
import { api } from '@/services/api'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { useConfirm } from '@/components/common/ConfirmContext'

export default function ResourcesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustryState, setSelectedIndustryState] = useState<string>('')
  const [resourceScreens, setResourceScreens] = useState<Screen[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [selectedRowIds, setSelectedRowIds] = useState<any[]>([])

  // Resolved configurations for active tab
  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Caching mechanism for screen resolutions and resource list rows
  const [resolvedScreensCache, setResolvedScreensCache] = useState<Record<string, ResolvedScreen>>({})
  const [resourceDataCache, setResourceDataCache] = useState<Record<string, any[]>>({})

  // Modals & Forms State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)

  // Import Summary State
  const [importSummaryOpen, setImportSummaryOpen] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    total: number
    success: number
    failed: number
    fileName: string
    failedRecords: Array<{ record: any; reason: string }>
  } | null>(null)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Load organizations and screens on mount
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        const [orgsData, scrs, inds] = await Promise.all([
          listOrganizationsPaged({ page: 0, pageSize: 100 }),
          getScreens(),
          getIndustries(true)
        ])
        setOrganizations(orgsData.items)
        setIndustries(inds)
        if (inds[0]) {
          setSelectedIndustryState(inds[0].code)
        }
        
        // Filter screens starting with resource_
        const filtered = scrs.filter((s) => s.key.startsWith('resource') && s.isActive)
        const orderMap: Record<string, number> = {
          'resourceCarousel': 10,
          'resourceLocations': 20,
          'resourceBudgets': 30,
          'resourceLeadSources': 40,
          'resourceTransferReasons': 50,
          'resourcePropertyStages': 60,
          'resourcePropertyTypes': 70,
          'resourcePropertySubTypes': 80,
        }
        const sorted = [...filtered].sort((a, b) => (orderMap[a.key] || 999) - (orderMap[b.key] || 999))
        setResourceScreens(sorted)

        setSelectedOrgId('null')
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load initial data', sev: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Load configuration and data for selected screen / organization
  const activeScreen = resourceScreens[activeTab]
  const activeOrg = organizations.find((o) => (o.organizationId || o.organizationId) === selectedOrgId)
  const selectedIndustry = activeOrg?.industryId || selectedIndustryState || 'temp0001'

  useEffect(() => {
    setSelectedRowIds([])
    if (!activeScreen || !selectedOrgId) {
      setResolvedScreen(null)
      setRows([])
      return
    }

    const cacheKey = `${activeScreen.key}_${selectedOrgId}`
    const cachedScreen = resolvedScreensCache[cacheKey]
    const cachedRows = resourceDataCache[cacheKey]

    if (cachedScreen && cachedRows) {
      setResolvedScreen(cachedScreen)
      setRows(cachedRows)
      
      // Fetch in background silently
      void (async () => {
        try {
          const [resolved, items] = await Promise.all([
            resolveScreen({ screen_key: activeScreen.key, industry_code: selectedIndustry }),
            getResources(activeScreen.key, selectedOrgId, selectedIndustry)
          ])
          setResolvedScreensCache(prev => ({ ...prev, [cacheKey]: resolved }))
          setResourceDataCache(prev => ({ ...prev, [cacheKey]: items }))
          setResolvedScreen(resolved)
          setRows(items)
        } catch (e) {
          console.error('Failed background sync', e)
        }
      })()
      return
    }

    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        const [resolved, items] = await Promise.all([
          resolveScreen({ screen_key: activeScreen.key, industry_code: selectedIndustry }),
          getResources(activeScreen.key, selectedOrgId, selectedIndustry)
        ])
        if (cancelled) return
        
        // Save to cache
        setResolvedScreensCache(prev => ({ ...prev, [cacheKey]: resolved }))
        setResourceDataCache(prev => ({ ...prev, [cacheKey]: items }))
        
        setResolvedScreen(resolved)
        setRows(items)
      } catch (e: any) {
        if (!cancelled) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load resource data', sev: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeScreen, selectedOrgId, selectedIndustry])



  const handleExport = () => {
    if (!resolvedScreen || rows.length === 0) return
    const headers = resolvedScreen.table_headers.map(h => h.label)
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(",")].concat(rows.map(row => resolvedScreen.table_headers.map(h => `"${row[h.key] ?? ''}"`).join(","))).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeScreen.key}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ open: true, msg: 'Exported successfully!', sev: 'success' })
  }

  const handleImport = () => {
    document.getElementById('resource-csv-importer')?.click()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeScreen || !resolvedScreen) return

    const fileName = file.name
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
      if (lines.length < 2) {
        setToast({ open: true, msg: 'CSV file is empty or missing data rows.', sev: 'error' })
        return
      }

      const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim())
      const headerToKey: Record<string, string> = {}
      resolvedScreen.form_fields.forEach(f => {
        headerToKey[f.label.toLowerCase()] = f.key
        headerToKey[f.key.toLowerCase()] = f.key
      })

      const parsedPayloads: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i]
        const values: string[] = []
        let insideQuote = false
        let currentValue = ''
        for (let charIdx = 0; charIdx < currentLine.length; charIdx++) {
          const char = currentLine[charIdx]
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote
          } else if (char === ',' && !insideQuote) {
            values.push(currentValue.trim())
            currentValue = ''
          } else {
            currentValue += char
          }
        }
        values.push(currentValue.trim())

        const payload: Record<string, any> = {}
        headers.forEach((header, index) => {
          const key = headerToKey[header.toLowerCase()]
          if (key && index < values.length) {
            let val = values[index].replace(/^["']|["']$/g, '').trim()
            const fieldDef = resolvedScreen.form_fields.find(f => f.key === key)
            if (fieldDef?.type === 'checkbox') {
              payload[key] = val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes'
            } else {
              payload[key] = val
            }
          }
        })

        if (Object.keys(payload).length > 0) {
          parsedPayloads.push(payload)
        }
      }

      if (parsedPayloads.length === 0) {
        setToast({ open: true, msg: 'No importable rows found in CSV.', sev: 'error' })
        return
      }

      const createdItems: any[] = []
      const failedRecords: Array<{ record: any; reason: string }> = []

      setLoading(true)
      // Unique key resolver for duplicate checking
      const uniqueKeys = resolvedScreen.form_fields
        .map(f => f.key)
        .filter(k => k === 'value' || k === 'locationName' || k === 'leadSourceId' || k === 'propertyType' || k === 'property_sub_type' || k === 'reason' || k === 'stage')
      
      const checkKeys = uniqueKeys.length > 0 ? uniqueKeys : (resolvedScreen.form_fields[0] ? [resolvedScreen.form_fields[0].key] : [])

      // Keep track of imported values in the current batch to prevent intra-CSV duplicates
      const currentBatchValues = new Set<string>()

      let masterPropertyTypes: string[] = []
      let masterPropertySubTypes: Array<{ propertyType: string; propertySubType: string }> = []

      if (activeScreen.key === 'resourcePropertySubTypes') {
        try {
          const typesList = await getResources('resourcePropertyTypes', selectedOrgId, selectedIndustry)
          masterPropertyTypes = typesList.map((t: any) => String(t.propertyType ?? '').trim().toLowerCase())

          const subTypesList = await getResources('resourcePropertySubTypes', selectedOrgId, selectedIndustry)
          masterPropertySubTypes = subTypesList.map((s: any) => ({
            propertyType: String(s.propertyType ?? '').trim().toLowerCase(),
            propertySubType: String(s.propertySubType ?? '').trim().toLowerCase()
          }))
        } catch (err) {
          console.error('Failed to fetch master data', err)
        }
      }

      setLoading(true)
      for (const payload of parsedPayloads) {
        // 1. Required fields check
        let missingFields: string[] = []
        for (const field of resolvedScreen.form_fields) {
          const val = payload[field.key]
          if (field.required && (!val || (typeof val === 'string' && !val.trim()))) {
            missingFields.push(field.label)
          }
        }

        if (missingFields.length > 0) {
          failedRecords.push({
            record: payload,
            reason: `Missing required field(s): ${missingFields.join(', ')}`
          })
          continue
        }

        // 2. Intra-CSV & Existing rows duplicate check
        if (checkKeys.length > 0) {
          let hasDuplicate = false
          let duplicateReason = ''

          if (activeScreen.key === 'resourcePropertySubTypes') {
            const csvPropType = String(payload.propertyType ?? '').trim().toLowerCase()
            const csvPropSubType = String(payload.propertySubType ?? '').trim().toLowerCase()

            if (!masterPropertyTypes.includes(csvPropType)) {
              failedRecords.push({
                record: payload,
                reason: 'Property Type does not exist in master data'
              })
              continue
            }

            const existingMapping = masterPropertySubTypes.find(m => m.propertySubType === csvPropSubType)
            if (existingMapping && existingMapping.propertyType !== csvPropType) {
              failedRecords.push({
                record: payload,
                reason: 'Property Sub Type belongs to a different Property Type'
              })
              continue
            }

            const existsInDB = masterPropertySubTypes.some(m => m.propertyType === csvPropType && m.propertySubType === csvPropSubType)
            if (existsInDB) {
              failedRecords.push({
                record: payload,
                reason: 'Record already exists in the database'
              })
              continue
            }

            const batchKey = `${csvPropType}::${csvPropSubType}`
            if (currentBatchValues.has(batchKey)) {
              failedRecords.push({
                record: payload,
                reason: 'Duplicate record found in the CSV file.'
              })
              continue
            } else {
              currentBatchValues.add(batchKey)
            }
          } else {
            for (const key of checkKeys) {
              const newVal = String(payload[key] ?? '').trim().toLowerCase()
              if (!newVal) continue

              const batchKey = `${key}:${newVal}`
              if (currentBatchValues.has(batchKey)) {
                hasDuplicate = true
                duplicateReason = 'Duplicate record found in the CSV file'
                break
              }

              const existsInDB = rows.some((row) => {
                const rowVal = String(row[key] ?? '').trim().toLowerCase()
                return rowVal === newVal
              })

              if (existsInDB) {
                hasDuplicate = true
                duplicateReason = 'Record already exists in the database'
                break
              }
            }

            if (!hasDuplicate) {
              checkKeys.forEach((key) => {
                const newVal = String(payload[key] ?? '').trim().toLowerCase()
                if (newVal) {
                  currentBatchValues.add(`${key}:${newVal}`)
                }
              })
            }
          }

          if (hasDuplicate) {
            failedRecords.push({
              record: payload,
              reason: duplicateReason
            })
            continue
          }
        }

        try {
          const created = await createResource(activeScreen.key, payload, selectedOrgId, selectedIndustry)
          createdItems.push(created)
        } catch (err: any) {
          failedRecords.push({
            record: payload,
            reason: err?.response?.data?.message ?? err?.message ?? 'Failed to save record'
          })
        }
      }

      if (createdItems.length > 0) {
        const nextRows = [...createdItems, ...rows]
        setRows(nextRows)
        setResourceDataCache((prev) => ({ ...prev, [`${activeScreen.key}_${selectedOrgId}`]: nextRows }))
      }

      setImportSummary({
        total: parsedPayloads.length,
        success: createdItems.length,
        failed: failedRecords.length,
        fileName,
        failedRecords
      })
      setImportSummaryOpen(true)
      setLoading(false)
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const downloadFailedRecords = () => {
    if (!resolvedScreen || !importSummary || importSummary.failedRecords.length === 0) return

    const headers = resolvedScreen.form_fields.map(f => f.label)
    const keys = resolvedScreen.form_fields.map(f => f.key)
    headers.push('Failure Reason')

    const csvRows = [
      headers.join(','),
      ...importSummary.failedRecords.map(item => {
        const rowValues = keys.map(k => {
          const val = item.record[k] !== undefined ? String(item.record[k]) : ''
          return `"${val.replace(/"/g, '""')}"`
        })
        rowValues.push(`"${item.reason.replace(/"/g, '""')}"`)
        return rowValues.join(',')
      })
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `failed_import_${importSummary.fileName}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const { confirmDelete } = useConfirm()

  const handleDeleteItem = async (id: string) => {
    if (!activeScreen) return
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteResource(activeScreen.key, id)
          const nextRows = rows.filter((r) => r.id !== id)
          setRows(nextRows)
          setResourceDataCache((prev) => ({ ...prev, [`${activeScreen.key}_${selectedOrgId}`]: nextRows }))
          setToast({ open: true, msg: 'Deleted successfully!', sev: 'success' })
          setSelectedRowIds((prev) => prev.filter((item) => item !== id))
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to delete item', sev: 'error' })
        }
      }
    })
  }

  const handleBulkDelete = async () => {
    if (!activeScreen || selectedRowIds.length === 0) return
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete ${selectedRowIds.length} selected item(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true)
        try {
          for (const id of selectedRowIds) {
            await deleteResource(activeScreen.key, String(id))
          }
          const nextRows = rows.filter((r) => !selectedRowIds.includes(r.id))
          setRows(nextRows)
          setResourceDataCache((prev) => ({ ...prev, [`${activeScreen.key}_${selectedOrgId}`]: nextRows }))
          setToast({ open: true, msg: 'Selected items deleted successfully!', sev: 'success' })
          setSelectedRowIds([])
        } catch (e: any) {
          setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to delete some items', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const openAdd = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: any) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  // Dynamic columns for AppDataGrid
  const gridColumns = useMemo<GridColDef[]>(() => {
    if (!resolvedScreen) return []

    const cols: GridColDef[] = resolvedScreen.table_headers.map((header) => {
      const col: GridColDef = {
        field: header.key,
        headerName: header.label,
        flex: 1,
        minWidth: 120,
        sortable: header.sortable,
      }

      if (header.type === 'image') {
        col.renderCell = (p) => p.value ? <Box component="img" src={p.value} sx={{ width: 60, height: 36, borderRadius: 0.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider', my: 'auto' }} /> : '-'
        col.width = 100
        col.flex = 0
      } else if (header.type === 'avatar') {
        col.renderCell = (p) => <Avatar src={p.value} variant="rounded" sx={{ width: 36, height: 36 }} />
        col.width = 80
        col.flex = 0
      } else if (header.type === 'checkbox') {
        col.renderCell = (p) => <Checkbox checked={!!p.value} disabled />
        col.width = 100
        col.flex = 0
      } else if (header.type === 'badge') {
        col.renderCell = (p) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: String(p.value).startsWith('#') ? p.value : '#22c55e' }} />
            {p.value}
          </Box>
        )
      } else if (header.type === 'date') {
        col.renderCell = (p) => p.value ? new Date(p.value as string).toLocaleDateString() : ''
      }

      return col
    })

    // Action column placed at the end
    cols.push({
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      disableExport: true,
      renderCell: (p: any) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDeleteItem(p.id as string)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    })

    return cols
  }, [resolvedScreen, rows])



  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
      
      {/* Industry Selector & Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Resources Management</Typography>
          <Typography variant="body2" color="text.secondary">Configure and load lookup resources dynamically per industry.</Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Select Industry"
          value={selectedIndustryState}
          onChange={(e) => setSelectedIndustryState(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {industries.map((ind) => (
            <MenuItem key={ind.code} value={ind.code}>
              {ind.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {resourceScreens.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No resource screens found. Create screens prefixed with <code>resource</code> in screen management.
        </Alert>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, val) => setActiveTab(val)} 
              variant="scrollable" 
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                }
              }}
            >
              {resourceScreens.map((s) => (
                <Tab key={s._id} label={s.name} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {activeScreen && resolvedScreen && (() => {
              const CustomToolbar = () => (
                <GridToolbarContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <GridToolbarColumnsButton />
                    <GridToolbarFilterButton />
                    <GridToolbarDensitySelector />
                    {activeScreen?.key !== 'resourceCarousel' && <GridToolbarExport />}
                    {activeScreen?.key !== 'resourceCarousel' && (
                      <Button
                        color="primary"
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={handleImport}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          minHeight: 0,
                          minWidth: 0,
                          padding: '4px 5px',
                        }}
                      >
                        Import
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <GridToolbarQuickFilter />
                    <Tooltip title="Reload Table">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          if (activeScreen) {
                            setResolvedScreen(null)
                            setRows([])
                            void (async () => {
                              try {
                                setLoading(true)
                                const [resolved, items] = await Promise.all([
                                  resolveScreen({ screen_key: activeScreen.key }),
                                  getResources(activeScreen.key)
                                ])
                                setResolvedScreensCache(prev => ({ ...prev, [activeScreen.key]: resolved }))
                                setResourceDataCache(prev => ({ ...prev, [activeScreen.key]: items }))
                                setResolvedScreen(resolved)
                                setRows(items)
                              } catch (e) {
                                console.error('Failed to reload', e)
                              } finally {
                                setLoading(false)
                              }
                            })()
                          }
                        }}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </GridToolbarContainer>
              )

              return (
                <AppCard 
                  title={resolvedScreen.screen.name} 
                  subtitle={activeScreen.description || `Manage ${resolvedScreen.screen.name} lookup items.`}
                  action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {selectedRowIds.length > 0 && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleBulkDelete}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Delete Selected ({selectedRowIds.length})
                        </Button>
                      )}
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add</Button>
                    </Box>
                  }
                  fullHeight
                >
                  <Box sx={{ flexGrow: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                    {loading && (
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                        <LinearProgress />
                      </Box>
                    )}
                    <AppDataGrid 
                      height="100%" 
                    rows={rows} 
                      columns={gridColumns} 
                      getRowId={(r) => r.id}
                      checkboxSelection
                      rowSelectionModel={selectedRowIds}
                      onRowSelectionModelChange={(newSelection) => setSelectedRowIds([...newSelection])}
                      slots={{ toolbar: CustomToolbar }}
                    />
                  </Box>
                </AppCard>
              )
            })()}
          </Box>
        </>
      )}

      {/* Dynamic Popups for Adding/Editing */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        fullWidth 
        maxWidth="md"
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle>
          {editingItem ? 'Edit' : 'Add'} {resolvedScreen?.screen.name}
        </DialogTitle>
        <DialogContent dividers>
          {activeScreen && (
            <DynamicForm
              screen={activeScreen.key}
              industry_code={selectedIndustry}
              role_key="admin"
              initialValues={editingItem ? editingItem : {}}
              onCancel={() => setDialogOpen(false)}
              submitLabel={editingItem ? 'Save' : 'Create'}
              onSubmit={async (values) => {
                try {
                  if (editingItem) {
                    await updateResource(activeScreen.key, editingItem.id, values as any, selectedIndustry)
                    setToast({ open: true, msg: 'Item updated successfully', sev: 'success' })
                  } else {
                    await createResource(activeScreen.key, values as any, selectedOrgId, selectedIndustry)
                    setToast({ open: true, msg: 'Item created successfully', sev: 'success' })
                  }
                  setDialogOpen(false)
                  const items = await getResources(activeScreen.key, selectedOrgId, selectedIndustry)
                  setRows(items)
                } catch (e: any) {
                  setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save resource', sev: 'error' })
                }
              }}
            />
          )}
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

      {/* Import Summary Dialog */}
      <Dialog
        open={importSummaryOpen}
        onClose={() => setImportSummaryOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Import Summary</DialogTitle>
        <DialogContent>
          {importSummary && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  File Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {importSummary.fileName}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: '8px', textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {importSummary.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                    Total
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'success.light', color: 'success.contrastText', p: 1.5, borderRadius: '8px', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {importSummary.success}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                    Success
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: importSummary.failed > 0 ? 'error.light' : 'action.hover', color: importSummary.failed > 0 ? 'error.contrastText' : 'text.secondary', p: 1.5, borderRadius: '8px', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {importSummary.failed}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                    Failed
                  </Typography>
                </Box>
              </Box>

              {importSummary.failed > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={downloadFailedRecords}
                  sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  Download Failed Records
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportSummaryOpen(false)} variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <input
        type="file"
        id="resource-csv-importer"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </Box>
  )
}
