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
import { resolveScreen, type ResolvedTableHeader } from '@/services/screenAdminService'
import { useAppSelector } from '@/store/hooks'
import { useConfirm } from '@/components/common/ConfirmContext'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface Task {
  _id: string
  industryId?: string | null
  createdBy?: string | null
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
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Task[]>([])
  const [columns, setColumns] = useState<ResolvedTableHeader[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const { confirmDelete } = useConfirm()
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const [listRes, resolved] = await Promise.all([
        api.get('tasks'),
        resolveScreen({
          screenKey: 'tasks',
          industryCode: user?.role === 'superAdmin' ? 'temp0001' : undefined,
          roleKey: user?.role === 'superAdmin' ? 'admin' : undefined,
        }),
      ])
      const rawItems = listRes.data?.items ?? []
      const processed = rawItems.map((task: any) => {
        const dueDateVal = task.dueDate || task.due_date || task.nextFollowUp
        const statusVal = String(task.status || 'PENDING').toUpperCase()
        if (statusVal === 'PENDING' && dueDateVal && new Date(dueDateVal) < new Date()) {
          return { ...task, status: 'OVERDUE' }
        }
        return task
      })
      setItems(processed)
      setColumns(resolved.table_headers)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to load tasks', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    const sorted = [...columns].sort((a, b) => a.order - b.order)
    const dataCols = sorted.map((c): GridColDef<Task> => ({
      field: c.key,
      headerName: c.label,
      flex: 1,
      minWidth: 140,
      sortable: c.sortable !== false,
      valueGetter: (_v: unknown, row: Task) => (row as Record<string, unknown>)[c.key],
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (c.type === 'date' || c.key === 'createdAt' || c.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          c.type === 'badge' ||
          c.key.toLowerCase().includes('status') ||
          c.key.toLowerCase().includes('priority') ||
          c.key.toLowerCase() === 'lead_type'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const actionsCol: GridColDef<Task> = {
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditingTask(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                confirmDelete({
                  title: 'Confirm Deletion',
                  message: 'Are you sure you want to delete this task? This action cannot be undone.',
                  onConfirm: async () => {
                    try {
                      await api.delete(`tasks/${params.row._id || params.row.id}`)
                      setToast({ open: true, msg: 'Task deleted successfully', sev: 'success' })
                      await refresh()
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { message?: string } } }
                      setToast({ open: true, msg: err?.response?.data?.message ?? 'Failed to delete task', sev: 'error' })
                    }
                  }
                })
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }

    return [sNoCol, ...dataCols, actionsCol]
  }, [columns, items])

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (columns.length > 0) {
      const model: Record<string, boolean> = {}
      columns.forEach((col) => {
        model[col.key] = col.visible !== false
      })
      setColumnVisibilityModel(model)
    }
  }, [columns])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Tasks List"
        subtitle="Dynamic lead follow-up tasks list driven by the Screen Configuration system."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Task
          </Button>
        }
        fullHeight
      >
        <AppDataGrid onReload={refresh}
          height="100%"
          rows={items}
          columns={gridColumns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
          loading={loading}
          getRowId={(r) => r._id}
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
              await api.post('tasks', values)
              setDialogOpen(false)
              setToast({ open: true, msg: 'Task created successfully', sev: 'success' })
              await refresh()
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
                  await api.put(`tasks/${editingTask._id || editingTask.id}`, values)
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
