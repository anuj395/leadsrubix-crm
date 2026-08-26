import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import {
  getDistributionRules,
  deleteDistributionRule,
  type LeadDistributionRule,
} from '@/services/leadDistributionService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { resolveScreen } from '@/services/screenAdminService'
import { useAuth } from '@/hooks/useAuth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

export default function LeadDistributionListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('leadDistribution')
  const [items, setItems] = useState<LeadDistributionRule[]>([])
  const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const { confirmDelete } = useConfirm()

  const defaultHeaders = [
    { key: 'source', label: 'Source', visible: true, order: 1 },
    { key: 'project', label: 'Project', visible: true, order: 2 },
    { key: 'location', label: 'Location', visible: true, order: 3 },
    { key: 'propertyType', label: 'Property Type', visible: true, order: 4 },
    { key: 'budget', label: 'Budget', visible: true, order: 5 },
    { key: 'users', label: 'Assigned Users', visible: true, order: 6 },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      const activeOrg = isSuperAdmin ? selectedOrg : undefined
      const [rulesList, resolved] = await Promise.all([
        getDistributionRules(activeOrg).catch((err) => {
          console.warn('[LeadDistributionList] Failed to get rules:', err)
          return []
        }),
        resolveScreen({
          screen_key: 'leadDistribution',
          industry_code: isSuperAdmin ? selectedIndustry || 'temp0001' : undefined,
          role_key: isSuperAdmin ? 'admin' : undefined,
        }).catch((err) => {
          console.warn('[LeadDistributionList] Screen config fallback:', err)
          return null
        })
      ])
      setItems(rulesList || [])
      setDynamicHeaders(resolved?.table_headers?.length ? resolved.table_headers : defaultHeaders)
    } catch (e: any) {
      console.warn('[LeadDistributionList] loadData fallback:', e)
      setDynamicHeaders(defaultHeaders)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [selectedOrg, selectedIndustry])

  const indCode = String(isSuperAdmin ? selectedIndustry : (user?.industryId || '')).toLowerCase().trim();

  const labels = useMemo(() => {
    if (indCode === 'temp0002') {
      return {
        title: 'Order Routing',
        subtitle: 'Manage order routing rules and assignees.',
        addLogic: 'Add Routing Rule',
        deleteMsg: 'Are you sure you want to delete this Routing Logic?',
        deletedToast: 'Order Routing Deleted!!'
      };
    }
    if (indCode === 'temp0003') {
      return {
        title: 'Patient Triaging (Triage Rules)',
        subtitle: 'Manage patient triage rules and attending doctors / staff assignment.',
        addLogic: 'Add Triage Rule',
        deleteMsg: 'Are you sure you want to delete this Patient Triage Logic?',
        deletedToast: 'Triage Logic Deleted!!'
      };
    }
    if (indCode === 'temp0004') {
      return {
        title: 'Admissions Routing',
        subtitle: 'Manage admissions routing rules and counselor assignment.',
        addLogic: 'Add Routing Rule',
        deleteMsg: 'Are you sure you want to delete this Admissions Routing Logic?',
        deletedToast: 'Admissions Routing Deleted!!'
      };
    }
    if (indCode === 'temp0005') {
      return {
        title: 'Client Matching',
        subtitle: 'Manage client matching rules and advisor assignment.',
        addLogic: 'Add Matching Rule',
        deleteMsg: 'Are you sure you want to delete this Client Matching Logic?',
        deletedToast: 'Client Matching Deleted!!'
      };
    }
    if (indCode === 'temp0006') {
      return {
        title: 'Ticket Routing',
        subtitle: 'Manage ticket routing rules and tech support assignment.',
        addLogic: 'Add Routing Rule',
        deleteMsg: 'Are you sure you want to delete this Ticket Routing Logic?',
        deletedToast: 'Ticket Routing Deleted!!'
      };
    }
    if (indCode === 'temp0007') {
      return {
        title: 'Dealer Allocations',
        subtitle: 'Manage dealer allocation rules and manager assignment.',
        addLogic: 'Add Allocation Rule',
        deleteMsg: 'Are you sure you want to delete this Dealer Allocation Logic?',
        deletedToast: 'Dealer Allocation Deleted!!'
      };
    }
    return {
      title: 'Lead Distribution',
      subtitle: 'Manage lead distribution rules and assignees.',
      addLogic: 'Add Logic',
      deleteMsg: 'Are you sure you want to delete this Lead Distribution Logic?',
      deletedToast: 'Lead Distribution Deleted!!'
    };
  }, [indCode]);

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: labels.deleteMsg,
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteDistributionRule(id)
          setToast({ open: true, msg: labels.deletedToast, sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to delete distribution logic', sev: 'error' })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Build columns dynamically from headers configuration
  const columns = useMemo<GridColDef<LeadDistributionRule>[]>(() => {
    const activeHeaders = [...dynamicHeaders]
      .filter((h) => h.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const mappedCols: GridColDef<LeadDistributionRule>[] = activeHeaders.map((c) => {
      return {
        field: c.key,
        headerName: c.label,
        flex: c.key === 'users' ? 1.5 : 1.2,
        minWidth: c.key === 'users' ? 200 : 140,
        sortable: c.sortable !== false,
        renderCell: (p) => {
          const val = p.value
          if (c.key === 'users') {
            const list = p.row.users || []
            return list.map((u) => u.user_email).join(', ') || '—'
          }
          if (['project', 'location', 'budget', 'propertyType', 'property_type', 'projectName', 'project_name', 'locationName', 'location_name'].includes(c.key)) {
            if (Array.isArray(val) && val.length > 0) {
              const str = val.filter(Boolean).join(', ')
              return str || '—'
            }
            if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'All') {
              return String(val)
            }
            return '—'
          }
          if (c.key === 'distributionType' || c.key === 'distribution_type') {
            return <Box sx={{ color: 'primary.main', fontWeight: 600 }}>{val || 'Normal'}</Box>
          }
          if (c.key === 'source') {
            return <Box sx={{ fontWeight: 600 }}>{val || '—'}</Box>
          }
          return (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'All') ? String(val) : '—'
        }
      }
    })

    // Append actions column at the end
    if (can_edit || can_delete) {
      mappedCols.push({
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            {can_edit && (
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => navigate(`/lead-distribution/logic?id=${p.row._id}`)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can_delete && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDelete(p.row._id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      })
    }

    return mappedCols
  }, [dynamicHeaders, labels, can_edit, can_delete])

  const isAllowedRole = user?.role === 'admin' || user?.role === 'superAdmin'

  if (!isAllowedRole || (!permsLoading && !can_view)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied: Lead Distribution is restricted to Admin role only.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isSuperAdmin && (
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />
      )}
      <AppCard
        title={labels.title}
        subtitle={labels.subtitle}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        action={
          can_add ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lead-distribution/logic')}>
              {labels.addLogic}
            </Button>
          ) : undefined
        }
      >
        <Box sx={{ flex: 1, minHeight: 400 }}>
          <AppDataGrid
            rows={items}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            onReload={loadData}
          />
        </Box>
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.sev}
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
