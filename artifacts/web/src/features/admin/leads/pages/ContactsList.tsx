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
import { SwapHoriz as SwapHorizIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listContacts, deleteContact, bulkImportContacts, type Contact } from '@/services/contactsService'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { selectAuth } from '@/features/auth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import { ChangeOwnerModal } from '../components/ChangeOwnerModal'
import { ImportContactModal } from '../components/ImportContactModal'

export default function ContactsListPage() {
  const { user } = useAppSelector(selectAuth)
  const isSuperAdmin = user?.role === 'superAdmin'
  const navigate = useNavigate()

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

  const handleImport = () => {
    setOpenImportModal(true)
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
        if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
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

    const emailIdx = dataCols.findIndex((col) => col.field === 'emailId')
    if (emailIdx !== -1) {
      dataCols.splice(emailIdx + 1, 0, stageCol)
    } else {
      dataCols.push(stageCol)
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
          width: 120,
          renderCell: (p) => (
            <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
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

  const [activeFilter, setActiveFilter] = useState<'all' | 'fresh' | 'callback' | 'interested' | 'deals' | 'lost'>('all')

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
    if (activeFilter === 'all') return items
    return items.filter((it) => {
      const st = String(it.stage || (it as any).lead_stage || (it as any).propertyStage || '').toUpperCase().trim()
      const isDeal = (it as any).converted_to_deal || (it as any).convertedToDeal || st.includes('DEAL') || st.includes('WON') || st.includes('BOOKED')
      if (activeFilter === 'deals') return isDeal
      if (activeFilter === 'callback') return st.includes('CALLBACK') || st.includes('RESCHEDULE') || st.includes('CALL_BACK')
      if (activeFilter === 'interested') return st.includes('INTEREST') && !st.includes('NOT')
      if (activeFilter === 'lost') return st.includes('LOST') || st.includes('NOT_INTEREST') || st.includes('NOT-INTEREST') || st.includes('REFUSED')
      if (activeFilter === 'fresh') return !isDeal && !st.includes('CALLBACK') && !st.includes('RESCHEDULE') && !st.includes('INTEREST') && !st.includes('LOST')
      return true
    })
  }, [items, activeFilter])

  const labels = useMemo(() => {
    if (indCode === 'temp0002') {
      return {
        contact: 'Inquiry',
        contacts: 'Customer Inquiries',
        lead: 'inquiry',
        leads: 'inquiries',
      };
    }
    if (indCode === 'temp0003') {
      return {
        contact: 'Patient Inquiry',
        contacts: 'Patient Inquiries & Leads',
        lead: 'patient inquiry',
        leads: 'patient inquiries',
      };
    }
    if (indCode === 'temp0004') {
      return {
        contact: 'Student Inquiry',
        contacts: 'Student Inquiries & Leads',
        lead: 'student inquiry',
        leads: 'student inquiries',
      };
    }
    if (indCode === 'temp0005') {
      return {
        contact: 'Investor Inquiry',
        contacts: 'Investor Inquiries & Leads',
        lead: 'investor inquiry',
        leads: 'investor inquiries',
      };
    }
    if (indCode === 'temp0006') {
      return {
        contact: 'Client Inquiry',
        contacts: 'Client Inquiries & Leads',
        lead: 'client inquiry',
        leads: 'client inquiries',
      };
    }
    if (indCode === 'temp0007') {
      return {
        contact: 'Distributor Inquiry',
        contacts: 'Distributor Inquiries & Leads',
        lead: 'distributor inquiry',
        leads: 'distributor inquiries',
      };
    }
    return {
      contact: 'Inquiry',
      contacts: 'Inquiries & Leads',
      lead: 'inquiry',
      leads: 'inquiries',
    };
  }, [indCode]);

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
        subtitle={`Track customer inquiries, fresh leads, and pipeline lifecycle with dynamic custom attributes.`}
        action={
          <Stack direction="row" spacing={1.5}>
            {selectedIds.length > 0 && (
              <>
                {can_edit && (
                  <Tooltip title={`Reassign selected ${labels.leads} to a different team member`}>
                    <Button
                      variant="outlined"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => setOpenOwnerModal(true)}
                    >
                      Change Owner ({selectedIds.length})
                    </Button>
                  </Tooltip>
                )}
                {can_delete && (
                  <Tooltip title={`Permanently delete the selected ${labels.lead} profiles`}>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleBulkDelete}
                    >
                      Delete ({selectedIds.length})
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            {can_add && (
              <Tooltip title={`Add a new ${labels.lead} to the database`}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/leads/contacts/new')}>
                  Add {labels.contact}
                </Button>
              </Tooltip>
            )}
          </Stack>
        }
        fullHeight
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5, flexShrink: 0 }}>
          <Tabs
            value={activeFilter}
            onChange={(_, val) => setActiveFilter(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab value="all" label={`All (${filterCounts.all})`} />
            <Tab
              value="fresh"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <span>Fresh Inquiries</span>
                  {filterCounts.fresh > 0 && (
                    <Chip size="small" label={filterCounts.fresh} color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Box>
              }
            />
            <Tab value="callback" label={`Callbacks (${filterCounts.callback})`} />
            <Tab value="interested" label={`Interested (${filterCounts.interested})`} />
            <Tab value="deals" label={`Deals / Converted (${filterCounts.deals})`} />
            <Tab value="lost" label={`Lost / Refused (${filterCounts.lost})`} />
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
