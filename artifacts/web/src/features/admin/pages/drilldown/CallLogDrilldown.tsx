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

interface CallLog {
  _id: string
  customerName?: string
  customer_name?: string
  contactNumber?: string
  contact_no?: string
  duration?: number | string
  stage?: string
  status?: string
  type?: string
  [key: string]: any
}

export default function CallLogDrilldownPage() {
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId
  const location = useLocation()
  const navigate = useNavigate()

  const [items, setItems] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCounts, setTotalCounts] = useState(0)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [callDrilldownData, setCallDrilldownData] = useState<any>(null)

  // Load screen config using useTableConfig
  const { columns: dbColumns } = useTableConfig('call-logs', industryId)

  // Resolve drilldown data payload
  useEffect(() => {
    if (location.state?.callDrilldownData) {
      setCallDrilldownData(location.state.callDrilldownData)
      localStorage.setItem('callDrilldownData', JSON.stringify(location.state.callDrilldownData))
    } else {
      const saved = localStorage.getItem('callDrilldownData')
      if (saved) {
        setCallDrilldownData(JSON.parse(saved))
      }
    }
  }, [location.state])

  const refresh = async () => {
    if (!callDrilldownData || !user?.id) return
    setLoading(true)
    try {
      const filters = { ...callDrilldownData.callFilter }
      let ownerEmailArr: any[] = []
      for (const [key, value] of Object.entries(callDrilldownData.leadFilter)) {
        ownerEmailArr = value as any[]
      }

      const apiData = {
        uid: callDrilldownData.uid,
        organizationId: callDrilldownData.organizationId || callDrilldownData.organizationid,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        searchString: '',
        sort: { createdAt: -1 },
        taskFilter: {},
        leadFilter: {},
        callFilter: callDrilldownData.role === true ? { ...filters, "contactOwnerEmail": ownerEmailArr } : filters,
        role: callDrilldownData.role,
      }

      // Fetch records
      const res = await axiosInstance.post('/call-logs/drillDownSearch', apiData)
      setItems(res.data || [])

      // Fetch count
      const countRes = await axiosInstance.post('/call-logs/callLogsDrillDownCount', apiData)
      setTotalCounts(countRes.data?.[0]?.total || res.data.length || 0)
    } catch (err) {
      console.error('Failed to fetch call log drilldown search data', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [callDrilldownData, paginationModel.page, paginationModel.pageSize])

  const gridColumns = useMemo<GridColDef<CallLog>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<CallLog> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: unknown, row: CallLog) => {
        const val = row[col.key] || row[col.key.replace(/_([a-z])/g, (_m, c) => c.toUpperCase())]
        return val === undefined ? '' : val
      },
      renderCell: (p) => {
        const v = p.value
        if (v == null || v === '') return <Box sx={{ color: 'text.secondary' }}>—</Box>
        if (col.type === 'date' || col.key === 'createdAt' || col.key.toLowerCase().includes('date')) {
          return new Date(v as string).toLocaleString()
        }
        if (
          col.type === 'badge' ||
          col.key.toLowerCase().includes('status') ||
          col.key.toLowerCase().includes('direction') ||
          col.key.toLowerCase() === 'stage'
        ) {
          return <StatusBadge value={v} />
        }
        return String(v)
      },
    }))

    const sNoCol: GridColDef<CallLog> = {
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
        Call Log Drill Down Overview
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
