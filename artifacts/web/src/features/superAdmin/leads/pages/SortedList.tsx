import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Rating from '@mui/material/Rating'
import Typography from '@mui/material/Typography'
import StarIcon from '@mui/icons-material/Star'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { listContacts, type Contact } from '@/services/contactsService'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface SortedLead extends Contact {
  priorityScore: number
  priorityLabel: 'High' | 'Medium' | 'Low'
}

export default function SortedListPage() {
  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listContacts()
      setItems(list)
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const sortedLeads = useMemo<SortedLead[]>(() => {
    return items.map((item) => {
      // Calculate dynamic priority score for demonstration
      let score = 3 // default medium
      if (item.lead_type === 'Inbound') score += 1
      if (item.status === 'Active') score += 1
      if (item.status === 'Inactive') score -= 1

      const label = (score >= 4 ? 'High' : score <= 2 ? 'Low' : 'Medium') as 'High' | 'Medium' | 'Low'
      return {
        ...item,
        priorityScore: score,
        priorityLabel: label,
      }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
  }, [items])

  const columns = useMemo<GridColDef<SortedLead>[]>(() => [
    {
      field: 'customer_name',
      headerName: 'Lead Name',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'priorityLabel',
      headerName: 'Priority',
      width: 130,
      renderCell: (params) => <StatusBadge value={params.value} />,
    },
    {
      field: 'priorityScore',
      headerName: 'Interest Rating',
      width: 160,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Rating
            value={params.value as number}
            readOnly
            max={5}
            emptyIcon={<StarIcon style={{ opacity: 0.25 }} fontSize="inherit" />}
          />
        </Box>
      ),
    },
    { field: 'email', headerName: 'Email Address', flex: 1.2, minWidth: 160 },
    { field: 'contact_no', headerName: 'Phone', flex: 1, minWidth: 130 },
    {
      field: 'lead_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => <StatusBadge value={params.value} />,
    },
    { field: 'project', headerName: 'Interested Project', flex: 1, minWidth: 140 },
    {
      field: 'status',
      headerName: 'Lead Status',
      width: 120,
      renderCell: (params) => <StatusBadge value={params.value || 'Pending'} />,
    },
  ], [])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppCard
        title="Sorted Leads List"
        subtitle="Leads automatically sorted and prioritized based on active interest and inbound conversion rules."
        fullHeight
      >
        <AppDataGrid onReload={refresh}
          height="100%"
          rows={sortedLeads}
          columns={columns}
          loading={loading}
          getRowId={(r) => r._id}
        />
      </AppCard>
    </Box>
  )
}
