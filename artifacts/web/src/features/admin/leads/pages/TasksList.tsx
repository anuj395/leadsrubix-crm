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

export default function TasksListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId

  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  // Load screen config using useTableConfig
  const { columns: dbColumns, loading: configLoading, error: configError } =
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
      valueGetter: (_v: unknown, row: Task) => (row as Record<string, unknown>)[col.key],
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

    const actionsCol: GridColDef<Task> = {
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
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditingTask(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }

    return [sNoCol, ...dataCols, actionsCol]
  }, [dbColumns])

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
        title="Tasks"
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
          onRowClick={(params) => {
            const stage = String(params.row.stage || '').toUpperCase()
            if (stage === 'INTERESTED' || stage === 'CALLBACK' || stage === 'CALL BACK') {
              if (params.row.contactId) {
                navigate(`/leads/contacts/${params.row.contactId}`)
              }
            }
          }}
        />
      </AppCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Task</DialogTitle>
        <DialogContent dividers>
          <DynamicForm
            screen="tasks"
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
