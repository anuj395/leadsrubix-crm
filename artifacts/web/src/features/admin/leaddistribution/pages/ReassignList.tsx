import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import {
  getRotationRules,
  deleteRotationRule,
  type LeadRotationRule,
} from '@/services/leadDistributionService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { resolveScreen } from '@/services/screenAdminService'
import { useAuth } from '@/hooks/useAuth'

export default function ReassignListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<LeadRotationRule[]>([])
  const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const { confirmDelete } = useConfirm()

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesList, resolved] = await Promise.all([
        getRotationRules(),
        resolveScreen({
          screen_key: 'leadRotation',
          industry_code: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          role_key: user?.role === 'superAdmin' ? 'admin' : undefined,
        })
      ])
      setItems(rulesList)
      setDynamicHeaders(resolved?.table_headers || [])
    } catch (e: any) {
      setToast({ open: true, msg: 'Failed to load rotation rules or screen configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const indCode = String(user?.industryId || '').toLowerCase().trim();

  const labels = useMemo(() => {
    if (indCode === 'temp0002') {
      return {
        title: 'Order Reassignments',
        subtitle: 'Manage order rotation rules and reallocations.',
        addLogic: 'Add Rotation Rule',
        deleteMsg: 'Are you sure you want to delete this Rotation Logic?',
        deletedToast: 'Order Rotation Deleted!!'
      };
    }
    if (indCode === 'temp0003') {
      return {
        title: 'Patient Transfers (Reassignments)',
        subtitle: 'Manage patient transfer logic and timeout reassignments.',
        addLogic: 'Add Transfer Rule',
        deleteMsg: 'Are you sure you want to delete this Patient Transfer Logic?',
        deletedToast: 'Patient Transfer Logic Deleted!!'
      };
    }
    if (indCode === 'temp0004') {
      return {
        title: 'Counselor Transfers',
        subtitle: 'Manage student rotation parameters and counselor reassignments.',
        addLogic: 'Add Rotation Rule',
        deleteMsg: 'Are you sure you want to delete this Student Rotation Logic?',
        deletedToast: 'Counselor Transfer Logic Deleted!!'
      };
    }
    if (indCode === 'temp0005') {
      return {
        title: 'Advisor Reassignments',
        subtitle: 'Manage client rotation parameters and advisor reassignments.',
        addLogic: 'Add Rotation Rule',
        deleteMsg: 'Are you sure you want to delete this Advisor Rotation Logic?',
        deletedToast: 'Advisor Reassignment Logic Deleted!!'
      };
    }
    if (indCode === 'temp0006') {
      return {
        title: 'Ticket Reassignments',
        subtitle: 'Manage ticket rotation parameters and SLA reassignments.',
        addLogic: 'Add Rotation Rule',
        deleteMsg: 'Are you sure you want to delete this Ticket Rotation Logic?',
        deletedToast: 'Ticket Reassignment Logic Deleted!!'
      };
    }
    if (indCode === 'temp0007') {
      return {
        title: 'Dealer Reallocations',
        subtitle: 'Manage dealer rotation parameters and allocation transfers.',
        addLogic: 'Add Allocation Transfer Rule',
        deleteMsg: 'Are you sure you want to delete this Allocation Rotation Logic?',
        deletedToast: 'Dealer Reallocation Logic Deleted!!'
      };
    }
    return {
      title: 'Lead Distribution',
      subtitle: 'Manage lead rotation parameters and unattended reassignment logs.',
      addLogic: 'Add Logic',
      deleteMsg: 'Are you sure you want to delete this Lead Rotation Logic?',
      deletedToast: 'Lead Rotation Deleted!!'
    };
  }, [indCode]);

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: labels.deleteMsg,
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteRotationRule(id)
          setToast({ open: true, msg: labels.deletedToast, sev: 'success' })
          void loadData()
        } catch (e: any) {
          setToast({ open: true, msg: 'Failed to delete rotation logic', sev: 'error' })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Build columns dynamically from headers configuration
  const columns = useMemo<GridColDef<LeadRotationRule>[]>(() => {
    const activeHeaders = [...dynamicHeaders]
      .filter((h) => h.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const mappedCols: GridColDef<LeadRotationRule>[] = activeHeaders.map((c) => {
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
            return list.map((u) => u.user_email).join(', ')
          }
          if (c.key === 'project') {
            return val && val.length > 0 ? val.join(', ') : 'All'
          }
          if (c.key === 'rotationTime') {
            return val
          }
          if (c.key === 'source') {
            return <Box sx={{ fontWeight: 600 }}>{val}</Box>
          }
          return val ? String(val) : '—'
        }
      }
    })

    // Append actions column at the end
    mappedCols.push({
      field: '__actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    })

    return mappedCols
  }, [dynamicHeaders, labels])

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title={labels.title}
        subtitle={labels.subtitle}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/reassign/logic')}>
            {labels.addLogic}
          </Button>
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
