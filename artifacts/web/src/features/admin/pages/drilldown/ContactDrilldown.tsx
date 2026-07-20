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

interface Contact {
  _id: string
  customer_name?: string
  customerName?: string
  contact_no?: string
  contactNumber?: string
  email?: string
  emailId?: string
  stage?: string
  projectName?: string
  source?: string
  budget?: string
  location?: string
  createdAt?: string
  created_at?: string
  [key: string]: any
}

export default function ContactDrilldownPage() {
  const { user } = useAppSelector(selectAuth)
  const industryId = user?.industryId
  const location = useLocation()
  const navigate = useNavigate()

  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCounts, setTotalCounts] = useState(0)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [drilldownData, setDrilldownData] = useState<any>(null)

  // Load screen config using useTableConfig
  const { columns: dbColumns } = useTableConfig('contacts', industryId)

  // Resolve drilldown data payload
  useEffect(() => {
    if (location.state?.drilldownData) {
      setDrilldownData(location.state.drilldownData)
      localStorage.setItem('drilldownData', JSON.stringify(location.state.drilldownData))
    } else {
      const saved = localStorage.getItem('drilldownData')
      if (saved) {
        setDrilldownData(JSON.parse(saved))
      }
    }
  }, [location.state])

  const refresh = async () => {
    if (!drilldownData || !user?.id) return
    setLoading(true)
    try {
      const filters = { ...drilldownData.leadFilter }
      if (drilldownData.source === true) {
        filters['sourceStatus'] = [true]
      } else {
        filters['associateStatus'] = [true]
      }

      const { reporting_to, team, branch, ...objLeadUserFilterValues } = filters

      const apiData = {
        uid: drilldownData.source === true && drilldownData.role === false ? (user as any).uid || user.id : drilldownData.uid,
        organizationId: drilldownData.organizationId || drilldownData.organizationid,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        searchString: '',
        sort: { createdAt: -1 },
        taskFilter: drilldownData.taskFilter,
        leadUserFilter: { reporting_to, team, branch },
        leadFilter: drilldownData.source === true && drilldownData.role === false ? { ...objLeadUserFilterValues, "source": [drilldownData.uid] } : objLeadUserFilterValues,
        role: drilldownData.source === true && drilldownData.role === false ? true : drilldownData.role,
      }

      // Fetch records
      const res = await axiosInstance.post('/leads/drillDownSearch', apiData)
      setItems(res.data || [])

      // Fetch count
      const countRes = await axiosInstance.post('/leads/contacttotalcount', {
        uid: apiData.uid,
        leadUserFilter: apiData.leadUserFilter,
        leadFilter: apiData.leadFilter,
        taskFilter: apiData.taskFilter
      })
      setTotalCounts(countRes.data?.total || res.data.length || 0)
    } catch (err) {
      console.error('Failed to fetch contact drilldown search data', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [drilldownData, paginationModel.page, paginationModel.pageSize])

  const gridColumns = useMemo<GridColDef<Contact>[]>(() => {
    const dataCols = dbColumns.map((col): GridColDef<Contact> => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: unknown, row: Contact) => {
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
      valueGetter: (_v: unknown, row: Contact) => row.stage || row.status || '',
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
        return idx !== -1 ? idx + 1 + paginationModel.page * paginationModel.pageSize : ''
      }
    }

    return [sNoCol, ...dataCols]
  }, [dbColumns, items, paginationModel])

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Lead Drill Down Overview
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
          onRowClick={(params) => navigate(`/leads/contacts/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </AppCard>
    </Stack>
  )
}
