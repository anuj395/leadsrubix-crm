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
import { useAppSelector } from '@/store/hooks'
import { getScreens, resolveScreen, type Screen, type ResolvedScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { getResources, createResource, updateResource, deleteResource } from '@/services/resourcesService'
import { api } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmContext'
import { compressImage } from '@/utils/imageCompressor'
import { useActionPermission } from '@/hooks/useActionPermission'

export default function ResourcesPage() {
  const user = useAppSelector((s) => s.auth.user)
  const userIndustryCode = user?.industryId

  const [resourceScreens, setResourceScreens] = useState<Screen[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [selectedRowIds, setSelectedRowIds] = useState<any[]>([])

  const activeScreenKey = resourceScreens[activeTab]?.key || ''
  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission(activeScreenKey)

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
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [apiDropdownOptions, setApiDropdownOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({})

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

  const RESOURCE_SCREEN_TRANSLATIONS: Record<string, Record<string, string>> = {
    temp0001: {
      resourceCarousel: 'Carousel Banners',
      resourceLocations: 'Locations',
      resourcePropertyTypes: 'Property Types',
      resourcePropertyStages: 'Property Stages',
      resourcePropertySubTypes: 'Property Sub Types',
      resourceBudgets: 'Budgets',
      resourceLeadSources: 'Lead Sources',
      resourceTransferReasons: 'Transfer Reasons',
    },
    temp0002: {
      resourceCarousel: 'Carousel Banners',
      resourceLocations: 'Warehouses & Hubs',
      resourcePropertyTypes: 'Product Categories',
      resourcePropertyStages: 'Availability Stages',
      resourceBudgets: 'Price Ranges',
      resourceLeadSources: 'Customer Channels',
      resourceTransferReasons: 'Return Reasons',
    },
    temp0003: {
      resourceCarousel: 'Hospital Banners',
      resourceLocations: 'Clinics & Centers',
      resourcePropertyTypes: 'Departments',
      resourcePropertyStages: 'Clinical Wings',
      resourceBudgets: 'Treatment Budgets',
      resourceLeadSources: 'Patient Sources',
      resourceTransferReasons: 'Transfer Reasons',
    },
    temp0004: {
      resourceCarousel: 'Campus Banners',
      resourceLocations: 'Campuses & Branches',
      resourcePropertyTypes: 'Program Categories',
      resourcePropertyStages: 'Intake Batches',
      resourceBudgets: 'Course Fee Ranges',
      resourceLeadSources: 'Student Channels',
      resourceTransferReasons: 'Course Transfer Reasons',
    },
    temp0005: {
      resourceCarousel: 'Promo Banners',
      resourceLocations: 'Branch Offices',
      resourcePropertyTypes: 'Financial Products',
      resourcePropertyStages: 'Risk Profiles',
      resourceBudgets: 'Investment Amounts',
      resourceLeadSources: 'Client Sources',
      resourceTransferReasons: 'Advisor Reassign Reasons',
    },
    temp0006: {
      resourceCarousel: 'Case Study Banners',
      resourceLocations: 'Delivery Centers',
      resourcePropertyTypes: 'Domains & Tech Stacks',
      resourcePropertyStages: 'Implementation Stages',
      resourceBudgets: 'Project Budgets',
      resourceLeadSources: 'Lead Channels',
      resourceTransferReasons: 'Project Transfer Reasons',
    },
    temp0007: {
      resourceCarousel: 'Product Banners',
      resourceLocations: 'Manufacturing Plants',
      resourcePropertyTypes: 'Material Classes',
      resourcePropertyStages: 'Production Phases',
      resourceBudgets: 'Order Volumes',
      resourceLeadSources: 'Dealer Channels',
      resourceTransferReasons: 'Order Reassign Reasons',
    }
  }

  // Load screens on mount
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        const scrs = await getScreens()
        
        // Filter screens starting with resource
        let filtered = scrs.filter((s) => s.key.startsWith('resource') && s.isActive !== false)
        
        // Filter out Real Estate specific resource screens for non-RE industries
        const indCode = String(userIndustryCode || '').toLowerCase().trim();
        if (indCode !== 'temp0001' && indCode !== '') {
          const reSpecific = new Set([
            'resourcePropertySubTypes'
          ])
          filtered = filtered.filter((s) => !reSpecific.has(s.key))
        }

        // Apply dynamic translations to screen names
        const translated = filtered.map((s) => {
          const industryMap = RESOURCE_SCREEN_TRANSLATIONS[indCode] || {}
          return {
            ...s,
            name: industryMap[s.key] || s.name
          }
        })

        const orderMap: Record<string, number> = {
          'resourceCarousel': 10,
          'resourceLocations': 20,
          'resourcePropertyTypes': 30,
          'resourcePropertyStages': 40,
          'resourceBudgets': 50,
          'resourceLeadSources': 60,
          'resourceTransferReasons': 70,
          'resourcePropertySubTypes': 80,
        }
        const sorted = [...translated].sort((a, b) => (orderMap[a.key] || 999) - (orderMap[b.key] || 999))
        setResourceScreens(sorted)
      } catch (e: any) {
        setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to load screens', sev: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [userIndustryCode])

  // Load configuration and data for selected screen
  const activeScreen = resourceScreens[activeTab]
  useEffect(() => {
    setSelectedRowIds([])
    if (!activeScreen) {
      setResolvedScreen(null)
      setRows([])
      return
    }

    const cacheKey = activeScreen.key
    const cachedScreen = resolvedScreensCache[cacheKey]
    const cachedRows = resourceDataCache[cacheKey]

    if (cachedScreen && cachedRows) {
      setResolvedScreen(cachedScreen)
      setRows(cachedRows)
      
      // Fetch in background silently
      void (async () => {
        try {
          const [resolved, items] = await Promise.all([
            resolveScreen({ screen_key: activeScreen.key, industry_code: userIndustryCode }),
            getResources(activeScreen.key, undefined, userIndustryCode)
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
          resolveScreen({ screen_key: activeScreen.key, industry_code: userIndustryCode }),
          getResources(activeScreen.key, undefined, userIndustryCode)
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
  }, [activeScreen])

  // Resolve API-driven select options
  useEffect(() => {
    if (!resolvedScreen) return
    resolvedScreen.form_fields.forEach((field) => {
      if (field.type === 'select' && field.dropdown_source === 'api' && field.dropdown_api) {
        const isAbsolute = /^https?:\/\//i.test(field.dropdown_api)
        const path = isAbsolute
          ? field.dropdown_api
          : field.dropdown_api.replace(/^\/+/, '').replace(/^api\//, '')

        void (async () => {
          try {
            const res = await api.get(path)
            const raw = res.data?.items ?? res.data ?? []
            const list = Array.isArray(raw)
              ? raw
              : Array.isArray(raw.items)
                ? raw.items
                : []
            const options = list.map((entry: any) => {
              if (entry && typeof entry === 'object') {
                return {
                  value: String(entry.value ?? entry.id ?? entry.key ?? ''),
                  label: String(entry.label ?? entry.name ?? entry.value ?? ''),
                }
              }
              return { value: String(entry), label: String(entry) }
            })
            setApiDropdownOptions((prev) => ({ ...prev, [field.key]: options }))
          } catch (e) {
            console.error('Failed to load api option source', e)
          }
        })()
      }
    })
  }, [resolvedScreen])

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
          const typesList = await getResources('resourcePropertyTypes', undefined, userIndustryCode)
          masterPropertyTypes = typesList.map((t: any) => String(t.propertyType ?? '').trim().toLowerCase())

          const subTypesList = await getResources('resourcePropertySubTypes', undefined, userIndustryCode)
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
          const created = await createResource(activeScreen.key, payload)
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
        setResourceDataCache((prev) => ({ ...prev, [activeScreen.key]: nextRows }))
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
          setResourceDataCache((prev) => ({ ...prev, [activeScreen.key]: nextRows }))
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
          setResourceDataCache((prev) => ({ ...prev, [activeScreen.key]: nextRows }))
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
    if (!resolvedScreen) return
    const initial: Record<string, any> = {}
    resolvedScreen.form_fields.forEach((f) => {
      initial[f.key] = f.type === 'checkbox' ? false : ''
    })
    setFormValues(initial)
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: any) => {
    if (!resolvedScreen) return
    const values: Record<string, any> = {}
    resolvedScreen.form_fields.forEach((f) => {
      values[f.key] = item[f.key] !== undefined ? item[f.key] : (f.type === 'checkbox' ? false : '')
    })
    setFormValues(values)
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!activeScreen || !resolvedScreen) return

    // Trim and check required fields
    for (const field of resolvedScreen.form_fields) {
      const val = formValues[field.key]
      if (field.required && (!val || (typeof val === 'string' && !val.trim()))) {
        setToast({ open: true, msg: `${field.label} is required`, sev: 'error' })
        return
      }
    }

    const uniqueKeys = resolvedScreen.form_fields
      .map(f => f.key)
      .filter(k => k === 'value' || k === 'locationName' || k === 'leadSourceId' || k === 'propertyType' || k === 'property_sub_type' || k === 'reason' || k === 'stage')
    
    const checkKeys = uniqueKeys.length > 0 ? uniqueKeys : (resolvedScreen.form_fields[0] ? [resolvedScreen.form_fields[0].key] : [])

    if (checkKeys.length > 0) {
      const isDuplicate = rows.some((row) => {
        if (editingItem && (row.id === editingItem.id || row._id === editingItem.id)) {
          return false
        }
        if (activeScreen.key === 'resourcePropertySubTypes') {
          return checkKeys.every((key) => {
            const rowVal = String(row[key] ?? '').trim().toLowerCase()
            const newVal = String(formValues[key] ?? '').trim().toLowerCase()
            return rowVal && newVal && rowVal === newVal
          })
        }
        return checkKeys.some((key) => {
          const rowVal = String(row[key] ?? '').trim().toLowerCase()
          const newVal = String(formValues[key] ?? '').trim().toLowerCase()
          return rowVal && newVal && rowVal === newVal
        })
      })

      if (isDuplicate) {
        setToast({ open: true, msg: 'This item already exists.', sev: 'error' })
        return
      }
    }

    try {
      const cacheKey = activeScreen.key
      if (editingItem) {
        const updated = await updateResource(activeScreen.key, editingItem.id, formValues)
        const nextRows = rows.map((r) => r.id === editingItem.id ? updated : r)
        setRows(nextRows)
        setResourceDataCache((prev) => ({ ...prev, [cacheKey]: nextRows }))
        setToast({ open: true, msg: 'Updated successfully!', sev: 'success' })
      } else {
        const created = await createResource(activeScreen.key, formValues)
        const nextRows = [created, ...rows]
        setRows(nextRows)
        setResourceDataCache((prev) => ({ ...prev, [cacheKey]: nextRows }))
        setToast({ open: true, msg: 'Created successfully!', sev: 'success' })
      }
      setDialogOpen(false)
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message ?? 'Failed to save resource', sev: 'error' })
    }
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
    if (can_edit || can_delete) {
      cols.push({
        field: 'actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        disableExport: true,
        renderCell: (p: any) => (
          <Stack direction="row" spacing={0.5}>
            {can_edit && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => openEdit(p.row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can_delete && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDeleteItem(p.id as string)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )
      })
    }

    return cols
  }, [resolvedScreen, rows, can_edit, can_delete])

  const renderField = (field: ResolvedFormField) => {
    if (field.key === 'url' || field.key === 'image' || field.type === 'avatar') {
      return (
        <Box key={field.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
          </Typography>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'action.hover',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.selected',
              },
            }}
            onClick={() => document.getElementById(`file-input-${field.key}`)?.click()}
          >
            <input
              type="file"
              id={`file-input-${field.key}`}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  compressImage(file).then((base64) => {
                    if (!base64) return
                    setFormValues((prev) => {
                      const next: Record<string, any> = { ...prev, [field.key]: base64 }
                      if (prev.hasOwnProperty('image_name')) {
                        next['image_name'] = file.name
                      }
                      return next
                    })
                  })
                }
              }}
            />
            {formValues[field.key] ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src={formValues[field.key]}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 120,
                    borderRadius: 1.5,
                    objectFit: 'contain',
                    boxShadow: 2,
                  }}
                />
                <Button size="small" variant="outlined" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Change Image
                </Button>
              </Box>
            ) : (
              <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <UploadIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Click to upload image
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <FormControlLabel
          key={field.key}
          control={
            <Checkbox
              checked={!!formValues[field.key]}
              onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
            />
          }
          label={field.label}
        />
      )
    }

    if (field.type === 'select') {
      const options = field.dropdown_source === 'static'
        ? (field.options || []).map((o: any) => ({ value: o, label: o }))
        : (apiDropdownOptions[field.key] || [])

      return (
        <TextField
          key={field.key}
          fullWidth
          select
          label={field.label}
          value={formValues[field.key] || ''}
          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
          required={field.required}
        >
          {options.map((opt: any) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
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
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        multiline={field.type === 'textarea'}
        rows={field.type === 'textarea' ? 3 : 1}
        value={formValues[field.key] || ''}
        onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        required={field.required}
      />
    )
  }

  const indCode = String(userIndustryCode || '').toLowerCase().trim();

  let pageTitle = 'Resources';
  let pageSubtitle = 'Manage system lookup values and banners.';
  if (indCode === 'temp0003') {
    pageTitle = 'Doctors & Staff';
    pageSubtitle = 'Manage clinical lookup values, hospitals list, and banners.';
  } else if (indCode === 'temp0002') {
    pageTitle = 'E-Commerce Resources';
    pageSubtitle = 'Manage product attributes, catalog categories, and promotional banners.';
  } else if (indCode === 'temp0004') {
    pageTitle = 'Academic Resources';
    pageSubtitle = 'Manage academy categories, campuses, and academic banners.';
  } else if (indCode === 'temp0005') {
    pageTitle = 'Advisory Resources';
    pageSubtitle = 'Manage advisor lookup values, offices list, and banners.';
  } else if (indCode === 'temp0006') {
    pageTitle = 'Project Resources';
    pageSubtitle = 'Manage project categories, SLA rules, and banner resources.';
  } else if (indCode === 'temp0007') {
    pageTitle = 'Manufacturing Catalog';
    pageSubtitle = 'Manage plant catalogs, distributor groups, and media resources.';
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
      
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{pageTitle}</Typography>
        <Typography variant="body2" color="text.secondary">{pageSubtitle}</Typography>
      </Box>

      {resourceScreens.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No resource screens have been configured for your industry. Please contact your Super Admin.
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
                    {activeScreen?.key !== 'resourceCarousel' && can_add && (
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
                                const cacheKey = `${activeScreen.key}_${userOrganizationId || 'default'}_${userIndustryCode || 'default'}`
                                const [resolved, items] = await Promise.all([
                                  resolveScreen({ screen_key: activeScreen.key, industry_code: userIndustryCode }),
                                  getResources(activeScreen.key, undefined, userIndustryCode)
                                ])
                                setResolvedScreensCache(prev => ({ ...prev, [cacheKey]: resolved }))
                                setResourceDataCache(prev => ({ ...prev, [cacheKey]: items }))
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

              if (!permsLoading && !can_view) {
                return (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                      Access Denied: You do not have permission to view {resolvedScreen.screen.name}.
                    </Alert>
                  </Box>
                )
              }

              return (
                <AppCard 
                  title={activeScreen.name || resolvedScreen.screen.name} 
                  subtitle={activeScreen.description || `Manage ${activeScreen.name || resolvedScreen.screen.name} lookup items.`}
                  action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {can_delete && selectedRowIds.length > 0 && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleBulkDelete}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Delete Selected ({selectedRowIds.length})
                        </Button>
                      )}
                      {can_add && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add</Button>
                      )}
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
                      checkboxSelection={can_delete}
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
        maxWidth="lg"
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px',
          }
        }}
      >
        <DialogTitle>
          {editingItem ? 'Edit' : 'Add'} {resolvedScreen?.screen.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {(() => {
              const fields = resolvedScreen?.form_fields || []
              const renderedKeys = new Set<string>()

              return fields.map((field) => {
                if (renderedKeys.has(field.key)) return null

                // Group value and country_code side-by-side (2fr 1fr)
                if (field.key === 'value') {
                  const countryCodeField = fields.find(f => f.key === 'countryCode' || f.key === 'country_code')
                  if (countryCodeField) {
                    renderedKeys.add('countryCode')
                    renderedKeys.add('country_code')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(countryCodeField)}
                      </Box>
                    )
                  }

                  // Group value and color side-by-side (2fr 1fr)
                  const colorField = fields.find(f => f.key === 'color')
                  if (colorField) {
                    renderedKeys.add('color')
                    return (
                      <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                        {renderField(field)}
                        {renderField(colorField)}
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
          <Button onClick={handleSave} variant="contained">Save</Button>
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
