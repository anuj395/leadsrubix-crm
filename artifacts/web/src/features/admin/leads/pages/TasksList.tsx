import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { api } from '@/services/api'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { selectAuth } from '@/features/auth'
import { useActionPermission } from '@/hooks/useActionPermission'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface Task {
  _id: string
  createdAt?: string
  updatedAt?: string
  [k: string]: unknown
}

function toFormValues(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy' || k === 'industryId' || k === 'roleId') continue
    if (v === null || v === undefined) continue
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v
  }
  return out
}

function getTaskFieldValue(row: Record<string, any>, key: string): any {
  if (!row || !key) return undefined
  if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]

  const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
  if (row[camelKey] !== undefined && row[camelKey] !== null && row[camelKey] !== '') return row[camelKey]

  const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
  if (row[snakeKey] !== undefined && row[snakeKey] !== null && row[snakeKey] !== '') return row[snakeKey]

  // Dynamic Aliases across screens & industries
  const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (norm.includes('type')) {
    return row.task_type || row.taskType || row.type
  }
  if (norm.includes('contactnumber') || norm.includes('phone') || norm.includes('mobile')) {
    return row.contact_number || row.contactNumber || row.phone || row.mobile
  }
  if (norm.includes('customername') || norm.includes('clientname') || norm.includes('name')) {
    return row.customer_name || row.customerName || row.name || row.clientName
  }
  if (norm.includes('owner') || norm.includes('assigned') || norm.includes('email')) {
    return row.contact_owner_email || row.contactOwnerEmail || row.owner_email || row.ownerEmail || row.assignedTo || row.assigned_to || row.createdBy
  }
  if (norm.includes('due') || norm.includes('followup')) {
    return row.due_date || row.dueDate || row.next_follow_up || row.nextFollowUp
  }
  if (norm.includes('project')) {
    return row.project_name || row.projectName
  }
  return undefined
}

export default function TasksListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId

  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('tasks')

  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  // Load screen config using useTableConfig
  const { columns: dbColumns, loading: configLoading, error: configError, screenName } =
    useTableConfig('tasks', industryId)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.get('tasks')
      const rawItems = res.data?.items ?? []
      const processed = rawItems.map((task: any) => {
        const dueDateVal = task.dueDate || task.due_date || task.nextFollowUp
        const statusVal = String(task.status || 'PENDING').toUpperCase()
        if (statusVal === 'PENDING' && dueDateVal && new Date(dueDateVal) < new Date()) {
          return { ...task, status: 'OVERDUE' }
        }
        return task
      })
      setItems(processed)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load tasks', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Task) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`tasks/${row._id}`)
          setToast({ open: true, msg: 'Task deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } }
          setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete task', sev: 'error' })
        }
      }
    })
  }

  const gridColumns = useMemo<GridColDef<Task>[]>(() => {
    const sNoCol: GridColDef<Task> = {
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

    const dataCols = dbColumns.map((col): GridColDef<Task> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      sortable: col.sortable !== false,
      valueGetter: (_v: unknown, row: Task) => getTaskFieldValue(row as Record<string, any>, col.key),
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

    const showActions = can_edit || can_delete
    const actionsCol: GridColDef<Task> | null = showActions
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
                  <IconButton size="small" onClick={() => setEditingTask(p.row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {can_delete && (
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => handleDelete(p.row)}>
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

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (dbColumns.length > 0) {
      const model: Record<string, boolean> = {}
      dbColumns.forEach((col) => {
        model[col.key] = col.visible !== false
      })
      setColumnVisibilityModel(model)
    }
  }, [dbColumns])

  if (!permsLoading && !can_view) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to view Tasks.
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

      <AppCard
        title={screenName || 'Tasks'}
        subtitle="Dynamic lead follow-up tasks list driven by the Screen Configuration system."
        fullHeight
      >
        <AppDataGrid
          height="100%"
          rows={items}
          columns={gridColumns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
          loading={loading || configLoading}
          getRowId={(r) => r._id}
          onReload={refresh}
          onRowClick={can_edit ? (params) => {
            const stage = String(params.row.stage || '').toUpperCase()
            if (stage === 'INTERESTED' || stage === 'CALLBACK' || stage === 'CALL BACK') {
              if (params.row.contactId) {
                navigate(`/leads/contacts/${params.row.contactId}`)
              }
            }
          } : undefined}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Task</DialogTitle>
        <DialogContent dividers>
          <DynamicForm
            screen="tasks"
            industryCode={String(user?.industryId || 'temp0001')}
            organizationId={String((user as any)?.organizationId || (user as any)?.organization_id || '')}
            onCancel={() => setDialogOpen(false)}
            submitLabel="Create"
            onSubmit={async (values) => {
              try {
                await api.post('tasks', values)
                setDialogOpen(false)
                setToast({ open: true, msg: 'Task created successfully', sev: 'success' })
                await refresh()
              } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } }
                setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to create task', sev: 'error' })
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingTask)} onClose={() => setEditingTask(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent dividers>
          {editingTask && (
            <DynamicForm
              screen="tasks"
              industryCode={String(user?.industryId || 'temp0001')}
              organizationId={String((user as any)?.organizationId || (user as any)?.organization_id || '')}
              initialValues={toFormValues(editingTask)}
              onCancel={() => setEditingTask(null)}
              submitLabel="Save Changes"
              onSubmit={async (values) => {
                try {
                  await api.put(`tasks/${editingTask._id}`, values)
                  setEditingTask(null)
                  setToast({ open: true, msg: 'Task updated successfully', sev: 'success' })
                  await refresh()
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } }
                  setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to update task', sev: 'error' })
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
    </Box>
  )
}
