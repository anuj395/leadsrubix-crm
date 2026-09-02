import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import type { GridColDef } from '@mui/x-data-grid'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTableConfig } from '@/hooks/useTableConfig'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import axiosInstance from '@/services/axiosInstance'

interface Task {
  _id: string
  customerName?: string
  customer_name?: string
  contactNumber?: string
  contact_no?: string
  dueDate?: string
  due_date?: string
  status?: string
  type?: string
  taskType?: string
  [key: string]: any
}

export default function TaskDrilldownPage() {
  const { user } = useAppSelector(selectAuth)
  const location = useLocation()
  const navigate = useNavigate()

  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCounts, setTotalCounts] = useState(0)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [taskDrilldownData, setTaskDrilldownData] = useState<any>(null)

  const industryId = taskDrilldownData?.industryId || user?.industryId

  // Load screen config using useTableConfig
  const { columns: dbColumns } = useTableConfig('tasks', industryId)

  // Resolve drilldown data payload
  useEffect(() => {
    if (location.state?.taskDrilldownData) {
      setTaskDrilldownData(location.state.taskDrilldownData)
      localStorage.setItem('taskDrilldownData', JSON.stringify(location.state.taskDrilldownData))
    } else {
      const saved = localStorage.getItem('taskDrilldownData')
      if (saved) {
        setTaskDrilldownData(JSON.parse(saved))
      }
    }
  }, [location.state])

  const refresh = async () => {
    if (!taskDrilldownData || !user?.id) return
    setLoading(true)
    try {
      const filters = { ...taskDrilldownData.taskFilter }
      const { createdAt, ...leadFilterObject } = taskDrilldownData.leadFilter

      const apiData = {
        uid: taskDrilldownData.source === true && taskDrilldownData.role === false ? (user as any).uid || user.id : taskDrilldownData.uid,
        organizationId: taskDrilldownData.organizationId || taskDrilldownData.organizationid,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        searchString: '',
        sort: { createdAt: -1 },
        taskFilter: taskDrilldownData.source === true && taskDrilldownData.role === false ? { ...filters, createdAt, "source": [taskDrilldownData.uid] } : { ...filters, createdAt },
        leadFilter: leadFilterObject,
        role: taskDrilldownData.source === true && taskDrilldownData.role === false ? true : taskDrilldownData.role,
      }

      // Fetch records
      const res = await axiosInstance.post('/tasks/drillDownSearch', apiData)
      setItems(res.data || [])

      // Fetch count
      const countRes = await axiosInstance.post('/tasks/drillDownCount', {
        uid: apiData.uid,
        organizationId: apiData.organizationId,
        taskFilter: apiData.taskFilter,
        leadFilter: apiData.leadFilter,
        role: apiData.role
      })
      setTotalCounts(countRes.data?.[0]?.total || res.data.length || 0)
    } catch (err) {
      console.error('Failed to fetch task drilldown search data', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [taskDrilldownData, paginationModel.page, paginationModel.pageSize])

  const taskTitle = useMemo(() => {
    const tt = taskDrilldownData?.taskFilter?.taskType
    if (Array.isArray(tt) && tt.length > 0) return tt[0]
    if (typeof tt === 'string') return tt
    const st = taskDrilldownData?.taskFilter?.status
    if (Array.isArray(st) && st.length > 0) return st[0]
    if (typeof st === 'string') return st
    return ''
  }, [taskDrilldownData])

  const gridColumns = useMemo<GridColDef<Task>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<Task> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: unknown, row: Task) => {
        if (!row) return ''
        if (row[col.key] !== undefined && row[col.key] !== null) return row[col.key]
        const camel = col.key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
        if (row[camel] !== undefined && row[camel] !== null) return row[camel]
        const snake = col.key.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (row[snake] !== undefined && row[snake] !== null) return row[snake]
        return ''
      },
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('due')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          col.type === 'badge' ||
          col.key.toLowerCase().includes('status') ||
          col.key.toLowerCase().includes('priority') ||
          col.key.toLowerCase() === 'stage'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const sNoCol: GridColDef<Task> = {
      field: 'sNo',
      headerName: 'S. No.',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      valueGetter: (_v, row) => {
        const idx = items.findIndex((item) => item._id === row._id)
        return idx !== -1 ? idx + 1 + paginationModel.page * paginationModel.pageSize : ''
      }
    }

    return [sNoCol, ...dataCols]
  }, [dbColumns, items, paginationModel])

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Task Drill Down Overview {taskTitle ? `— ${taskTitle}` : ''}
      </Typography>
      <AppCard title="">
        <AppDataGrid
          rows={items}
          columns={gridColumns}
          loading={loading}
          getRowId={(row) => row._id || String(Math.random())}
          paginationMode="server"
          rowCount={totalCounts}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowClick={(params) => {
            const clickedRow = items.find((item) => item._id === params.id)
            if (clickedRow?.contactId || clickedRow?.leadId) {
              navigate(`/leads/contacts/${clickedRow.contactId || clickedRow.leadId}`)
            }
          }}
          sx={{ cursor: 'pointer' }}
        />
      </AppCard>
    </Stack>
  )
}
