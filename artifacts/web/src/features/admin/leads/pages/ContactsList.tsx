import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Collapse from '@mui/material/Collapse'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import {
  SwapHoriz as SwapHorizIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  FileDownload as FileDownloadIcon,
  FilterList as FilterListIcon,
  FilterListOff as FilterListOffIcon,
  CalendarMonth as CalendarMonthIcon,
  Repeat as RepeatIcon,
  Star as StarIcon,
  Alarm as AlarmIcon,
  PhoneCallback as PhoneCallbackIcon,
  PersonOff as PersonOffIcon
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listContacts, deleteContact, type Contact } from '@/services/contactsService'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { selectAuth } from '@/features/auth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import { ChangeOwnerModal } from '../components/ChangeOwnerModal'
import { ImportContactModal } from '../components/ImportContactModal'
import { api } from '@/services/api'

export default function ContactsListPage() {
  const { user } = useAppSelector(selectAuth)
  const isSuperAdmin = user?.role === 'superAdmin'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
    loadingScope
  } = useSuperAdminScope(isSuperAdmin)

  const effectiveIndustryId = isSuperAdmin ? selectedIndustry : (user?.industryId || undefined)
  const effectiveOrgId = isSuperAdmin ? selectedOrg : ((user as any)?.organizationId || (user as any)?.organization_id || '')
  const industryId = effectiveIndustryId || user?.industryId

  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('contacts')

  const [items, setItems] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [openOwnerModal, setOpenOwnerModal] = useState(false)
  const [openImportModal, setOpenImportModal] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  // Status Tabs Filter & Preset Filter Pills
  const [activeFilter, setActiveFilter] = useState<'all' | 'fresh' | 'callback' | 'interested' | 'deals' | 'lost'>('all')
  const [presetFilter, setPresetFilter] = useState<'all' | 'my_leads' | 'due_today' | 'callbacks' | 'unassigned'>('all')

  // Multi-faceted Collapsible Filter Bar
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterSource, setFilterSource] = useState('ALL')
  const [filterProject, setFilterProject] = useState('ALL')
  const [filterOwner, setFilterOwner] = useState('ALL')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Date-Range Export Center Modal (Absorbs SortedList)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exporting, setExporting] = useState(false)

  // Auto-open export dialog if ?export=true
  useEffect(() => {
    if (searchParams.get('export') === 'true') {
      setExportModalOpen(true)
    }
  }, [searchParams])

  // Load screen config using useTableConfig
  const { columns: dbColumns, loading: configLoading, error: configError, screenName } =
    useTableConfig('contacts', industryId)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listContacts({
        industryId: effectiveIndustryId,
        organizationId: effectiveOrgId
      })
      setItems(list)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load contacts', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [effectiveIndustryId, effectiveOrgId])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Contact) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete contact: ${String(row.customer_name ?? row.name ?? row._id)}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteContact(row._id)
          setToast({ open: true, msg: 'Contact deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } }
          setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete contact', sev: 'error' })
        }
      }
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    confirmDelete({
      title: 'Confirm Bulk Deletion',
      message: `Are you sure you want to delete the ${selectedIds.length} selected contacts? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true)
        try {
          await Promise.all(selectedIds.map((id) => deleteContact(id)))
          setToast({ open: true, msg: `${selectedIds.length} contacts deleted successfully`, sev: 'success' })
          setSelectedIds([])
          await refresh()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } }
          setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete contacts', sev: 'error' })
          await refresh()
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleCopyLeads = (leadsToCopy?: Contact[]) => {
    const list = leadsToCopy || items.filter(it => selectedIds.includes(it._id))
    if (list.length === 0) return

    const text = list.map((l, idx) => {
      const name = l.customerName || (l as any).customer_name || (l as any).name || 'Unnamed'
      const phone = l.contactNumber || (l as any).contact_no || (l as any).phone || '-'
      const proj = l.projectName || (l as any).project_name || (l as any).propertyType || '-'
      const source = l.source || (l as any).lead_source || 'Direct'
      return `${idx + 1}. ${name} | 📞 ${phone} | 🏢 ${proj} | 🌐 ${source}`
    }).join('\n')

    navigator.clipboard.writeText(text)
    setToast({ open: true, msg: `📋 ${list.length} lead details copied to clipboard!`, sev: 'success' })
  }

  const handleImport = () => {
    setOpenImportModal(true)
  }

  // Handle Export Center Download (.xlsx)
  const handleExportByDate = async () => {
    if (!exportStartDate || !exportEndDate) {
      setToast({ open: true, msg: 'Please select both start and end dates', sev: 'error' })
      return
    }
    setExporting(true)
    try {
      const startUTC = new Date(`${exportStartDate}T00:00:00+05:30`).toISOString()
      const endUTC = new Date(`${exportEndDate}T23:59:59.999+05:30`).toISOString()
      const res = await api.post(
        'contacts/masterSortSearch',
        {
          startDate: startUTC,
          endDate: endUTC,
          industryId: effectiveIndustryId,
          organizationId: effectiveOrgId,
          sort: { created_at: '-1' },
          filter: { transfer_status: [false] }
        },
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${labels.contacts.replace(/\s+/g, '_')}_${exportStartDate}_to_${exportEndDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToast({ open: true, msg: 'Excel report downloaded successfully!', sev: 'success' })
      setExportModalOpen(false)
    } catch (err: any) {
      setToast({ open: true, msg: err?.message || 'Failed to export report', sev: 'error' })
    } finally {
      setExporting(false)
    }
  }

  // Extract dynamic distinct options for filters
  const distinctSources = useMemo(() => {
    const s = new Set<string>()
    items.forEach((it) => {
      const src = it.source || (it as any).lead_source
      if (src && String(src).trim()) s.add(String(src).trim())
    })
    return Array.from(s).sort()
  }, [items])

  const distinctProjects = useMemo(() => {
    const p = new Set<string>()
    items.forEach((it) => {
      const proj = it.projectName || (it as any).project_name || (it as any).propertyType
      if (proj && String(proj).trim()) p.add(String(proj).trim())
    })
    return Array.from(p).sort()
  }, [items])

  const distinctOwners = useMemo(() => {
    const o = new Set<string>()
    items.forEach((it) => {
      const owner = it.contactOwnerEmail || (it as any).contact_owner_email || (it as any).ownerName
      if (owner && String(owner).trim()) o.add(String(owner).trim())
    })
    return Array.from(o).sort()
  }, [items])

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0
    if (filterSource !== 'ALL') count++
    if (filterProject !== 'ALL') count++
    if (filterOwner !== 'ALL') count++
    if (filterStartDate) count++
    if (filterEndDate) count++
    return count
  }, [filterSource, filterProject, filterOwner, filterStartDate, filterEndDate])

  const handleClearFilters = () => {
    setFilterSource('ALL')
    setFilterProject('ALL')
    setFilterOwner('ALL')
    setFilterStartDate('')
    setFilterEndDate('')
    setPresetFilter('all')
    setActiveFilter('all')
  }

  const gridColumns = useMemo<GridColDef<Contact>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<Contact> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      sortable: col.sortable !== false,
      valueGetter: (_v: unknown, row: Contact) => (row as Record<string, unknown>)[col.key],
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (col.key === 'customerName' || col.key === 'customer_name' || col.key === 'name') {
          const inqCount = (p.row as any).inquiryCount || ((p.row as any).inquiries && (p.row as any).inquiries.length) || 1
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{String(v)}</Typography>
              {inqCount > 1 && (
                <Tooltip title={`Repeat Customer: ${inqCount} inquiries recorded across lifetime`}>
                  <Chip
                    icon={<RepeatIcon style={{ fontSize: 13 }} />}
                    size="small"
                    label={`${inqCount} Inquiries`}
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                </Tooltip>
              )}
            </Stack>
          )
        }

        if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date')) {
          try {
            return new Date(v as string).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            })
          } catch {
            return String(v)
          }
        }
        if (
          col.type === 'badge' ||
          col.key.toLowerCase().includes('status') ||
          col.key.toLowerCase().includes('priority') ||
          col.key.toLowerCase() === 'lead_type'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const stageCol: GridColDef<Contact> = {
      field: 'stage',
      headerName: 'Stage',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: unknown, row: Contact) => row.stage,
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        return <StatusBadge value={v} />
      }
    }

    const createdAtCol: GridColDef<Contact> = {
      field: 'createdAt',
      headerName: 'Punch Date & Time',
      flex: 1,
      minWidth: 170,
      valueGetter: (_v: unknown, row: Contact) => row.createdAt || (row as any).created_at,
      renderCell: (p) => {
        const v = p.value
        if (!v) return <Box sx={{ color: 'text.secondary' }}>—</Box>
        try {
          return new Date(v as string).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          })
        } catch (e) {
          return String(v)
        }
      }
    }

    const nextFollowUpCol: GridColDef<Contact> = {
      field: 'nextFollowUpDateTime',
      headerName: 'Scheduled Callback',
      flex: 1,
      minWidth: 170,
      valueGetter: (_v: unknown, row: Contact) => (row as any).nextFollowUpDateTime || (row as any).next_follow_up_date_time,
      renderCell: (p) => {
        const v = p.value
        if (!v) return <Box sx={{ color: 'text.secondary' }}>—</Box>
        try {
          return new Date(v as string).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          })
        } catch (e) {
          return String(v)
        }
      }
    }

    const emailIdx = dataCols.findIndex((col) => col.field === 'emailId')
    if (emailIdx !== -1) {
      dataCols.splice(emailIdx + 1, 0, stageCol, createdAtCol, nextFollowUpCol)
    } else {
      dataCols.push(stageCol, createdAtCol, nextFollowUpCol)
    }

    const sNoCol: GridColDef<Contact> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      valueGetter: (_v, row) => {
        const idx = items.findIndex((item) => item._id === row._id)
        return idx !== -1 ? idx + 1 : ''
      }
    }

    const showActions = can_edit || can_delete
    const actionsCol: GridColDef<Contact> | null = showActions
      ? {
          field: '__actions__',
          headerName: 'Actions',
          sortable: false,
          filterable: false,
          disableColumnMenu: true,
          align: 'right',
          headerAlign: 'right',
          width: 140,
          renderCell: (p) => (
            <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
              <Tooltip title="Copy Lead Details">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopyLeads([p.row]); }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {can_edit && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/leads/contacts/${p.row._id}/edit`); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {can_delete && (
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(p.row); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          ),
        }
      : null

    return [sNoCol, ...dataCols, ...(actionsCol ? [actionsCol] : [])]
  }, [dbColumns, items, can_edit, can_delete])

  const indCode = String(industryId || '').toLowerCase().trim();

  const filterCounts = useMemo(() => {
    let fresh = 0
    let callback = 0
    let interested = 0
    let deals = 0
    let lost = 0

    items.forEach((it) => {
      const st = String(it.stage || (it as any).lead_stage || (it as any).propertyStage || '').toUpperCase().trim()
      const isDeal = (it as any).converted_to_deal || (it as any).convertedToDeal || st.includes('DEAL') || st.includes('WON') || st.includes('BOOKED')
      if (isDeal) {
        deals++
      } else if (st.includes('CALLBACK') || st.includes('RESCHEDULE') || st.includes('CALL_BACK')) {
        callback++
      } else if (st.includes('INTEREST') && !st.includes('NOT')) {
        interested++
      } else if (st.includes('LOST') || st.includes('NOT_INTEREST') || st.includes('NOT-INTEREST') || st.includes('REFUSED')) {
        lost++
      } else {
        fresh++
      }
    })

    return {
      all: items.length,
      fresh,
      callback,
      interested,
      deals,
      lost,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    return items.filter((it) => {
      const st = String(it.stage || (it as any).lead_stage || (it as any).propertyStage || '').toUpperCase().trim()
      const isDeal = (it as any).converted_to_deal || (it as any).convertedToDeal || (it as any).is_converted || st.includes('DEAL') || st.includes('WON') || st.includes('BOOKED')

      // 1. Stage Tab Filter
      if (activeFilter === 'deals' && !isDeal) return false
      if (activeFilter === 'callback' && !(st.includes('CALLBACK') || st.includes('RESCHEDULE') || st.includes('CALL_BACK'))) return false
      if (activeFilter === 'interested' && !(st.includes('INTEREST') && !st.includes('NOT'))) return false
      if (activeFilter === 'lost' && !(st.includes('LOST') || st.includes('NOT_INTEREST') || st.includes('NOT-INTEREST') || st.includes('REFUSED'))) return false
      if (activeFilter === 'fresh' && (isDeal || st.includes('CALLBACK') || st.includes('RESCHEDULE') || st.includes('INTEREST') || st.includes('LOST'))) return false

      // 2. 1-Click Preset Filter Pills
      if (presetFilter === 'my_leads') {
        const ownerEmail = String(it.contactOwnerEmail || (it as any).contact_owner_email || '').toLowerCase()
        const myEmail = String(user?.email || '').toLowerCase()
        if (ownerEmail !== myEmail && (it as any).createdBy !== user?.id) return false
      }
      if (presetFilter === 'due_today') {
        const followUp = (it as any).nextFollowUpDateTime || (it as any).next_follow_up_date_time
        if (!followUp) return false
        const fDateStr = new Date(followUp).toISOString().split('T')[0]
        if (fDateStr !== todayStr) return false
      }
      if (presetFilter === 'callbacks') {
        if (!(st.includes('CALLBACK') || st.includes('CALL_BACK'))) return false
      }
      if (presetFilter === 'unassigned') {
        const ownerEmail = it.contactOwnerEmail || (it as any).contact_owner_email
        const ownerId = (it as any).contactOwnerId || (it as any).contact_owner_id
        if (ownerEmail || ownerId) return false
      }

      // 3. Multi-Faceted Dynamic Filters
      if (filterSource !== 'ALL') {
        const src = it.source || (it as any).lead_source
        if (src !== filterSource) return false
      }
      if (filterProject !== 'ALL') {
        const proj = it.projectName || (it as any).project_name || (it as any).propertyType
        if (proj !== filterProject) return false
      }
      if (filterOwner !== 'ALL') {
        const owner = it.contactOwnerEmail || (it as any).contact_owner_email || (it as any).ownerName
        if (owner !== filterOwner) return false
      }
      if (filterStartDate) {
        const cDate = it.createdAt || (it as any).created_at
        if (cDate && new Date(cDate) < new Date(`${filterStartDate}T00:00:00`)) return false
      }
      if (filterEndDate) {
        const cDate = it.createdAt || (it as any).created_at
        if (cDate && new Date(cDate) > new Date(`${filterEndDate}T23:59:59`)) return false
      }

      return true
    })
  }, [items, activeFilter, presetFilter, filterSource, filterProject, filterOwner, filterStartDate, filterEndDate, user])

  const labels = useMemo(() => {
    if (indCode === 'temp0002') {
      return {
        contact: 'Customer',
        contacts: 'Customers & Leads',
        lead: 'customer',
        leads: 'customers',
      }
    }
    if (indCode === 'temp0003') {
      return {
        contact: 'Patient',
        contacts: 'Patients & Inquiries',
        lead: 'patient',
        leads: 'patients',
      }
    }
    if (indCode === 'temp0004') {
      return {
        contact: 'Student',
        contacts: 'Students & Applicants',
        lead: 'student',
        leads: 'students',
      }
    }
    if (indCode === 'temp0005') {
      return {
        contact: 'Applicant',
        contacts: 'Applicants & Borrowers',
        lead: 'applicant',
        leads: 'applicants',
      }
    }
    if (indCode === 'temp0006') {
      return {
        contact: 'Account',
        contacts: 'Accounts & Contacts',
        lead: 'account',
        leads: 'accounts',
      }
    }
    if (indCode === 'temp0007') {
      return {
        contact: 'Prospect',
        contacts: 'Prospects & Dealers',
        lead: 'prospect',
        leads: 'prospects',
      }
    }
    return {
      contact: 'Lead',
      contacts: 'Leads & Contacts',
      lead: 'lead',
      leads: 'leads',
    }
  }, [indCode])

  if (!permsLoading && !can_view) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to view {labels.contacts}.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {configError && (
        <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }}>
          {configError}
        </Alert>
      )}
      {!configLoading && dbColumns.length === 0 && (
        <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }}>
          No columns resolved for this screen config.
        </Alert>
      )}

      <SuperAdminScopeSelector
        isSuperAdmin={isSuperAdmin}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        filteredOrgs={filteredOrgs}
        selectedOrg={selectedOrg}
        setSelectedOrg={setSelectedOrg}
      />

      <AppCard
        title={screenName || labels.contacts}
        subtitle="Manage verified customers, track multiple inquiries over time, and drive pipeline conversions."
        action={
          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" flexWrap="wrap" sx={{ gap: { xs: 0.75, sm: 1 } }}>
            {selectedIds.length > 0 && (
              <>
                <Tooltip title={`Copy details of ${selectedIds.length} selected ${labels.leads}`}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => handleCopyLeads()}
                    sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, fontSize: '0.8rem' }}
                  >
                    Copy ({selectedIds.length})
                  </Button>
                </Tooltip>
                {can_edit && (
                  <Tooltip title={`Reassign selected ${labels.leads} to a different team member`}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => setOpenOwnerModal(true)}
                      sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, fontSize: '0.8rem' }}
                    >
                      Reassign ({selectedIds.length})
                    </Button>
                  </Tooltip>
                )}
                {can_delete && (
                  <Tooltip title={`Permanently delete the selected ${labels.lead} profiles`}>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleBulkDelete}
                      sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, fontSize: '0.8rem' }}
                    >
                      Delete ({selectedIds.length})
                    </Button>
                  </Tooltip>
                )}
              </>
            )}

            {/* Filter Toggle Button with active count badge */}
            <Button
              variant={showAdvancedFilters || activeAdvancedFilterCount > 0 ? "contained" : "outlined"}
              color={activeAdvancedFilterCount > 0 ? "primary" : "inherit"}
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, fontSize: '0.8rem' }}
            >
              Filters{activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ''}
            </Button>

            {/* Export Center Button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => setExportModalOpen(true)}
              sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, fontSize: '0.8rem' }}
            >
              Export<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>&nbsp;Center</Box>
            </Button>

            {can_add && (
              <Tooltip title={`Add a new ${labels.lead} to the database`}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/leads/contacts/new')}
                  sx={{ textTransform: 'none', fontWeight: 700, px: { xs: 1.25, sm: 1.75 }, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                >
                  Add {labels.contact}
                </Button>
              </Tooltip>
            )}
          </Stack>
        }
        fullHeight
      >
        {/* Collapsible Multi-Faceted Dynamic Filter Bar */}
        <Collapse in={showAdvancedFilters}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={filterSource}
                    label="Source"
                    onChange={(e) => setFilterSource(e.target.value)}
                  >
                    <MenuItem value="ALL">All Sources</MenuItem>
                    {distinctSources.map((src) => (
                      <MenuItem key={src} value={src}>{src}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Project / Category</InputLabel>
                  <Select
                    value={filterProject}
                    label="Project / Category"
                    onChange={(e) => setFilterProject(e.target.value)}
                  >
                    <MenuItem value="ALL">All Projects</MenuItem>
                    {distinctProjects.map((proj) => (
                      <MenuItem key={proj} value={proj}>{proj}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assigned Owner</InputLabel>
                  <Select
                    value={filterOwner}
                    label="Assigned Owner"
                    onChange={(e) => setFilterOwner(e.target.value)}
                  >
                    <MenuItem value="ALL">All Owners</MenuItem>
                    {distinctOwners.map((owner) => (
                      <MenuItem key={owner} value={owner}>{owner}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  InputLabelProps={{ shrink: true }}
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  InputLabelProps={{ shrink: true }}
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </Grid>

              {activeAdvancedFilterCount > 0 && (
                <Grid item xs={12} md={0.5}>
                  <Tooltip title="Reset all filters">
                    <IconButton size="small" onClick={handleClearFilters} color="error">
                      <FilterListOffIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Collapse>

        {/* 1-Click Preset Filter Pills */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label="All Contacts"
            variant={presetFilter === 'all' ? 'filled' : 'outlined'}
            color={presetFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setPresetFilter('all')}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip
            size="small"
            icon={<StarIcon style={{ fontSize: 14 }} />}
            label="My Active Leads"
            variant={presetFilter === 'my_leads' ? 'filled' : 'outlined'}
            color={presetFilter === 'my_leads' ? 'primary' : 'default'}
            onClick={() => setPresetFilter('my_leads')}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip
            size="small"
            icon={<AlarmIcon style={{ fontSize: 14 }} />}
            label="Follow-ups Due Today"
            variant={presetFilter === 'due_today' ? 'filled' : 'outlined'}
            color={presetFilter === 'due_today' ? 'warning' : 'default'}
            onClick={() => setPresetFilter('due_today')}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip
            size="small"
            icon={<PhoneCallbackIcon style={{ fontSize: 14 }} />}
            label="Pending Callbacks"
            variant={presetFilter === 'callbacks' ? 'filled' : 'outlined'}
            color={presetFilter === 'callbacks' ? 'info' : 'default'}
            onClick={() => setPresetFilter('callbacks')}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip
            size="small"
            icon={<PersonOffIcon style={{ fontSize: 14 }} />}
            label="Unassigned Pool"
            variant={presetFilter === 'unassigned' ? 'filled' : 'outlined'}
            color={presetFilter === 'unassigned' ? 'secondary' : 'default'}
            onClick={() => setPresetFilter('unassigned')}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
        </Stack>

        {/* Status Lifecycle Strip Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5, flexShrink: 0 }}>
          <Tabs
            value={activeFilter}
            onChange={(_, val) => setActiveFilter(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.5,
                px: { xs: 1.25, sm: 2 },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.78rem', sm: '0.85rem' },
              },
              '& .MuiTabs-scrollButtons': {
                '&.Mui-disabled': { opacity: 0.3 },
              },
            }}
          >
            <Tab value="all" label={`All (${filterCounts.all})`} />
            <Tab value="fresh" label={`Fresh Inbound (${filterCounts.fresh})`} />
            <Tab value="callback" label={`Callbacks (${filterCounts.callback})`} />
            <Tab value="interested" label={`Interested (${filterCounts.interested})`} />
            <Tab value="deals" label={`Deals / Converted (${filterCounts.deals})`} />
            <Tab value="lost" label={`Lost / Archived (${filterCounts.lost})`} />
          </Tabs>
        </Box>

        <AppDataGrid
          height="100%"
          rows={filteredItems}
          columns={gridColumns}
          loading={loading || configLoading}
          getRowId={(r) => r._id}
          onReload={refresh}
          onImport={can_add ? handleImport : undefined}
          onRowClick={can_edit ? (params) => navigate(`/leads/contacts/${params.row._id}`) : undefined}
          checkboxSelection={can_edit || can_delete}
          rowSelectionModel={selectedIds}
          onRowSelectionModelChange={(newModel) => setSelectedIds(newModel as string[])}
          sx={{
            cursor: can_edit ? 'pointer' : 'default',
            '& .MuiDataGrid-row': {
              cursor: can_edit ? 'pointer' : 'default'
            },
            '& .MuiDataGrid-row:hover': {
              cursor: can_edit ? 'pointer' : 'default'
            }
          }}
        />
      </AppCard>

      {/* Date-Range Export Dialog (Absorbs SortedList) */}
      <Dialog open={exportModalOpen} onClose={() => setExportModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          Export {labels.contacts} by Date Range
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Select the date range to download a comprehensive Excel (.xlsx) spreadsheet of all {labels.leads} matching your criteria.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setExportModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
            disabled={exporting || !exportStartDate || !exportEndDate}
            onClick={handleExportByDate}
          >
            {exporting ? 'Generating Excel...' : 'Download Excel (.xlsx)'}
          </Button>
        </DialogActions>
      </Dialog>

      <ChangeOwnerModal
        open={openOwnerModal}
        onClose={() => setOpenOwnerModal(false)}
        selectedIds={selectedIds}
        onSuccess={() => {
          setToast({ open: true, msg: `${labels.contact} owner updated successfully`, sev: 'success' })
          setSelectedIds([])
          void refresh()
        }}
      />

      <ImportContactModal
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
        onSuccess={() => {
          setToast({ open: true, msg: `${labels.contacts} imported successfully`, sev: 'success' })
          void refresh()
        }}
      />

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
