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
import { normalizeStage } from '@/utils/stageUtils'
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
      const stage = normalizeStage(it.stage || (it as any).lead_stage || (it as any).propertyStage)
      const isDeal = (it as any).converted_to_deal || (it as any).convertedToDeal || (it as any).is_converted || stage === 'WON'

      if (isDeal) {
        deals++
      } else if (stage === 'CALLBACK') {
        callback++
      } else if (stage === 'INTERESTED' || stage === 'QUALIFIED') {
        interested++
      } else if (stage === 'LOST') {
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
      const stage = normalizeStage(it.stage || (it as any).lead_stage || (it as any).propertyStage)
      const isDeal = (it as any).converted_to_deal || (it as any).convertedToDeal || (it as any).is_converted || stage === 'WON'

      // 1. Stage Tab Filter (100% matched to filterCounts)
      if (activeFilter === 'deals' && !isDeal) return false
      if (activeFilter === 'callback' && (isDeal || stage !== 'CALLBACK')) return false
      if (activeFilter === 'interested' && (isDeal || (stage !== 'INTERESTED' && stage !== 'QUALIFIED'))) return false
      if (activeFilter === 'lost' && (isDeal || stage !== 'LOST')) return false
      if (activeFilter === 'fresh' && (isDeal || stage !== 'FRESH')) return false

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
        if (stage !== 'CALLBACK') return false
      }
      if (presetFilter === 'unassigned') {
        const ownerEmail = it.contactOwnerEmail || (it as any).contact_owner_email
        const ownerId = (it as any).contactOwnerId || (it as any).contact_owner_id
        if (ownerEmail || ownerId) return false
      }

      return true
    })
  }, [items, activeFilter, presetFilter, user])

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
