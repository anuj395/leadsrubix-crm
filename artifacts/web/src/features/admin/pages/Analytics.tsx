import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useTheme, alpha } from '@mui/material/styles'

import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import ClearAllOutlinedIcon from '@mui/icons-material/ClearAllOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'

import PeopleIcon from '@mui/icons-material/People'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import EventIcon from '@mui/icons-material/Event'

import { useAuth } from '@/hooks/useAuth'
import axiosInstance from '@/services/axiosInstance'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'

// Types matching backend payload
interface FeedbackRow {
  sNo: number
  associate: string
  total: number
  fresh: number
  callBack: number
  interested: number
  won: number
  notInterested: number
  lost: number
  completedVisits: number
  scheduledVisits: number
}

interface CallBackRow {
  sNo: number
  associate: string
  total: number
}

interface ChartItem {
  name: string
  value: number
}

interface CardMetrics {
  totalLeads: number
  fresh: number
  callBack: number
  interested: number
  closedWon: number
  notInterested: number
  closedLost: number
  completedVisits: number
  scheduledVisits: number
}

interface TaskRow {
  sNo: number
  associate: string
  total: number
  meeting: number
  callBack: number
  siteVisit: number
}

interface CallLogRow {
  sNo: number
  associate: string
  total: number
  duration0: number
  duration0_30: number
  duration31_60: number
  duration61_120: number
  durationAbove120: number
}

interface TrendItem {
  date: string
  calls: number
}

interface DashboardPayload {
  organizationsList: { code: string; name: string }[]
  cards: CardMetrics
  contacts: {
    feedbackSummary: FeedbackRow[]
    callBackReasons: CallBackRow[]
    chartData: ChartItem[]
  }
  tasks: {
    completedTasks: TaskRow[]
    completedChartData: ChartItem[]
    pendingTasks: TaskRow[]
    pendingChartData: ChartItem[]
  }
  callLogs: {
    callingTrends: TrendItem[]
    callLogSummary: CallLogRow[]
  }
}

const metricDescriptions: Record<string, string> = {
  'Total Leads': 'Total Leads:\nThe sum of all leads collected\nin the system.',
  'Fresh': 'Fresh Leads:\nNewly added leads that have\nnot yet been contacted.',
  'Call Back': 'Call Back:\nLeads scheduled for\na follow-up call.',
  'Interested': 'Interested Leads:\nLeads who have shown interest\nin your project or offer.',
  'Closed Won': 'Closed Won:\nSuccessfully converted leads\nwho completed a deal.',
  'Not Interested': 'Not Interested:\nLeads who have stated\nthey are not interested.',
  'Closed Lost': 'Closed Lost:\nLeads that have been marked\nas lost or inactive.',
  'Completed Visits': 'Completed Visits:\nThe count of successfully finished\ncustomer property visits.',
  'Scheduled Visits': 'Scheduled Visits:\nProperty visits scheduled\nfor the future.',
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const isDark = theme.palette.mode === 'dark'

  const handleCardClick = (label: string) => {
    if (isSuperAdmin) return
    const userAny = user as any
    const orgId = isSuperAdmin && selectedOrg !== 'all' ? selectedOrg : userAny?.organizationId || ''
    const targetUid = userAny?.uid || userAny?.id || ''
    const isSource = groupBy === 'source'
    const roleFlag = userAny?.role !== 'sales' && userAny?.role !== 'associate'

    const leadFilter: Record<string, any> = {}
    const taskFilter: Record<string, any> = {}

    if (startDate) {
      leadFilter.createdAt = { startDate: startDate }
      taskFilter.createdAt = { startDate: startDate }
    }
    if (endDate) {
      if (!leadFilter.createdAt) leadFilter.createdAt = {}
      if (!taskFilter.createdAt) taskFilter.createdAt = {}
      leadFilter.createdAt.endDate = endDate
      taskFilter.createdAt.endDate = endDate
    }

    if (label === 'Completed Visits') {
      taskFilter.status = ['COMPLETED', 'Completed']
      taskFilter.taskType = ['Site Visit']
      const taskDrilldownData = {
        uid: targetUid,
        organizationId: orgId,
        taskFilter,
        leadFilter: {},
        source: isSource,
        role: roleFlag
      }
      navigate('/task-drilldown-data', { state: { taskDrilldownData, ts: Date.now() } })
    } else if (label === 'Scheduled Visits') {
      taskFilter.status = ['PENDING', 'Pending']
      taskFilter.taskType = ['Site Visit']
      const taskDrilldownData = {
        uid: targetUid,
        organizationId: orgId,
        taskFilter,
        leadFilter: {},
        source: isSource,
        role: roleFlag
      }
      navigate('/task-drilldown-data', { state: { taskDrilldownData, ts: Date.now() } })
    } else {
      if (label === 'Fresh') leadFilter.stage = ['FRESH']
      else if (label === 'Call Back') leadFilter.stage = ['CALLBACK', 'CALL BACK']
      else if (label === 'Interested') leadFilter.stage = ['INTERESTED']
      else if (label === 'Closed Won') leadFilter.stage = ['WON', 'CLOSED WON']
      else if (label === 'Not Interested') leadFilter.stage = ['NOT INTERESTED']
      else if (label === 'Closed Lost') leadFilter.stage = ['LOST', 'CLOSED LOST']

      const drilldownData = {
        uid: targetUid,
        organizationId: orgId,
        leadFilter,
        taskFilter: {},
        source: isSource,
        role: roleFlag
      }
      navigate('/drilldown-data', { state: { drilldownData, ts: Date.now() } })
    }
  }

  // General State
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [dashboardConfig, setDashboardConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Filters State
  const [groupBy, setGroupBy] = useState<'team' | 'source' | 'teamWise'>('team')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [showDatePanel, setShowDatePanel] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Chart Interactive states
  const [hoveredTrend, setHoveredTrend] = useState<{ date: string; calls: number; x: number; y: number } | null>(null)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [hoveredTaskBar, setHoveredTaskBar] = useState<number | null>(null)
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<{ name: string; value: number; percentage: number; color: string } | null>(null)

  // Fetch Dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      let url = `/analytics/dashboard?groupBy=${groupBy}`
      if (isSuperAdmin) {
        if (selectedIndustry) url += `&industryId=${selectedIndustry}`
        if (selectedOrg) url += `&organizationId=${selectedOrg}`
      }
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`

      const res = await axiosInstance.get<DashboardPayload>(url)
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardConfig = async () => {
    try {
      let url = `/analytics/dashboard-config`
      if (isSuperAdmin) {
        const queryParams = []
        if (selectedIndustry) queryParams.push(`industryId=${selectedIndustry}`)
        if (selectedOrg) queryParams.push(`organizationId=${selectedOrg}`)
        if (queryParams.length > 0) {
          url += `?${queryParams.join('&')}`
        }
      }
      const res = await axiosInstance.get(url)
      setDashboardConfig(res.data)
    } catch (err) {
      console.error('Failed to fetch dashboard config', err)
    }
  }

  // Fetch industries on mount (if user is superAdmin)
  useEffect(() => {
    if (isSuperAdmin) {
      getIndustries(true)
        .then((list) => {
          setIndustries(list)
          if (list.length > 0) {
            setSelectedIndustry(list[0].code || '')
          }
        })
        .catch((err) => console.error('Failed to load industries', err))
    }
  }, [isSuperAdmin])

  const filteredOrgs = useMemo(() => {
    if (!data?.organizationsList) return []
    if (!selectedIndustry) return data.organizationsList
    return data.organizationsList.filter(org => {
      const orgIndId = String((org as any).industryId || '').toLowerCase()
      const selIndId = String(selectedIndustry).toLowerCase()
      return orgIndId === selIndId
    })
  }, [data?.organizationsList, selectedIndustry])

  // Automatically select the first organization for Super Admin when filteredOrgs changes
  useEffect(() => {
    if (isSuperAdmin && filteredOrgs.length > 0) {
      const isValid = filteredOrgs.some(org => org.code === selectedOrg)
      if (!isValid || !selectedOrg) {
        setSelectedOrg(filteredOrgs[0].code)
      }
    } else if (isSuperAdmin) {
      setSelectedOrg('')
    }
  }, [filteredOrgs, isSuperAdmin, selectedOrg])

  useEffect(() => {
    void fetchDashboardData()
    void fetchDashboardConfig()
  }, [groupBy, selectedIndustry, selectedOrg, startDate, endDate])

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setGroupBy('team')
    if (isSuperAdmin && industries.length > 0) {
      setSelectedIndustry(industries[0].code || '')
    }
    setSelectedOrg(isSuperAdmin && filteredOrgs.length > 0 ? filteredOrgs[0].code : '')
    setShowDatePanel(false)
  }

  // Pre-configured preset filters
  const applyPresetFilter = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    // Format to YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    setStartDate(formatDate(start))
    setEndDate(formatDate(end))
    setShowDatePanel(true)
  }

  // Detect currently active date range preset
  const activePreset = useMemo(() => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 7) return 7
    if (diffDays === 30) return 30
    return null
  }, [startDate, endDate])

  // Card configuration
  const cardConfigs = useMemo(() => {
    if (!data?.cards) return []

    if (dashboardConfig?.tabs) {
      const tab0 = dashboardConfig.tabs.find((t: any) => t.id === 0)
      if (tab0) {
        const kpis = tab0.widgets.filter((w: any) => w.type === 'KPI')
        if (kpis.length > 0) {
          return kpis.map((w: any) => {
            const path = w.data_key.split('.')
            let val = data as any
            for (const key of path) {
              val = val?.[key]
            }

            let iconNode = <PeopleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            if (w.icon === 'AssignmentIcon') iconNode = <AssignmentIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'PhoneCallbackIcon') iconNode = <PhoneCallbackIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'ThumbUpIcon') iconNode = <ThumbUpIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'CheckCircleIcon') iconNode = <CheckCircleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'CancelIcon') iconNode = <CancelIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'TrendingDownIcon') iconNode = <TrendingDownIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'EventAvailableIcon') iconNode = <EventAvailableIcon sx={{ fontSize: '1.4rem', color: w.color }} />
            else if (w.icon === 'EventIcon') iconNode = <EventIcon sx={{ fontSize: '1.4rem', color: w.color }} />

            return {
              label: w.title,
              val: val !== undefined ? val : 0,
              color: w.color || '#EC4899',
              bg: `linear-gradient(135deg, ${alpha(w.color || '#EC4899', 0.06)} 0%, ${alpha(w.color || '#EC4899', 0.01)} 100%)`,
              icon: iconNode
            }
          })
        }
      }
    }

    const c = data.cards
    return [
      { label: 'Total Leads', val: c.totalLeads, color: '#F43F5E', bg: 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, rgba(244,63,94,0.01) 100%)', icon: <PeopleIcon sx={{ fontSize: '1.4rem', color: '#F43F5E' }} /> }, // rose
      { label: 'Fresh', val: c.fresh, color: '#EC4899', bg: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(236,72,153,0.01) 100%)', icon: <AssignmentIcon sx={{ fontSize: '1.4rem', color: '#EC4899' }} /> }, // pink
      { label: 'Call Back', val: c.callBack, color: '#3B82F6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.01) 100%)', icon: <PhoneCallbackIcon sx={{ fontSize: '1.4rem', color: '#3B82F6' }} /> }, // blue
      { label: 'Interested', val: c.interested, color: '#EAB308', bg: 'linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(234,179,8,0.01) 100%)', icon: <ThumbUpIcon sx={{ fontSize: '1.4rem', color: '#EAB308' }} /> }, // yellow
      { label: 'Closed Won', val: c.closedWon, color: '#10B981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.01) 100%)', icon: <CheckCircleIcon sx={{ fontSize: '1.4rem', color: '#10B981' }} /> }, // green
      { label: 'Not Interested', val: c.notInterested, color: '#8B5CF6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0.01) 100%)', icon: <CancelIcon sx={{ fontSize: '1.4rem', color: '#8B5CF6' }} /> }, // purple
      { label: 'Closed Lost', val: c.closedLost, color: '#F97316', bg: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(249,115,22,0.01) 100%)', icon: <TrendingDownIcon sx={{ fontSize: '1.4rem', color: '#F97316' }} /> }, // orange
      { label: 'Completed Visits', val: c.completedVisits, color: '#14B8A6', bg: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0.01) 100%)', icon: <EventAvailableIcon sx={{ fontSize: '1.4rem', color: '#14B8A6' }} /> }, // teal
      { label: 'Scheduled Visits', val: c.scheduledVisits, color: '#06B6D4', bg: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.01) 100%)', icon: <EventIcon sx={{ fontSize: '1.4rem', color: '#06B6D4' }} /> }, // cyan
    ]
  }, [data, dashboardConfig])

  // Key Metrics Overview section lookup
  const keyMetricsSection = useMemo(() => {
    if (!dashboardConfig?.tabs) return null
    for (const t of dashboardConfig.tabs) {
      if (t.sections) {
        const found = t.sections.find((s: any) => s.title === 'Key Metrics Overview')
        if (found) return found
      }
    }
    return null
  }, [dashboardConfig])

  // Custom SVG Curved Trend Area configurations
  const trendLineConfig = useMemo(() => {
    if (!data?.callLogs?.callingTrends?.length) return null
    const trends = data.callLogs.callingTrends

    const width = 800
    const height = 180
    const paddingLeft = 40
    const paddingRight = 40
    const paddingTop = 20
    const paddingBottom = 20

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : chartWidth
    const maxVal = Math.max(...trends.map(t => t.calls), 2)

    const points = trends.map((item, idx) => {
      const x = paddingLeft + idx * stepX
      const h = maxVal > 0 ? (item.calls / maxVal) * chartHeight : 0
      const y = height - paddingBottom - h
      return { x, y, date: item.date, calls: item.calls }
    })

    // Construct curved line path using cubic spline helper points
    let linePath = ''
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const cpX1 = points[i].x + stepX / 3
        const cpY1 = points[i].y
        const cpX2 = points[i + 1].x - stepX / 3
        const cpY2 = points[i + 1].y
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i + 1].x} ${points[i + 1].y}`
      }
    }

    // Area path (closed at the bottom)
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : ''

    return { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, chartWidth, chartHeight, points, linePath, areaPath, maxVal }
  }, [data?.callLogs?.callingTrends])

  // Custom SVG Donut slice calculation
  const completedDonutSlices = useMemo(() => {
    if (!data?.tasks?.completedChartData) return []
    const chart = data.tasks.completedChartData
    const totalVal = chart.reduce((sum, item) => sum + item.value, 0)
    if (totalVal === 0) return []

    let accumulatedPercentage = 0
    const colors = ['#10B981', '#3B82F6', '#06B6D4'] // green, blue, cyan

    return chart.map((item, idx) => {
      const percentage = (item.value / totalVal) * 100
      const strokeDasharray = `${(percentage / 100) * 376.99} 376.99`
      const strokeDashoffset = `${- (accumulatedPercentage / 100) * 376.99}`
      accumulatedPercentage += percentage

      return {
        name: item.name,
        value: item.value,
        percentage: Math.round(percentage),
        strokeDasharray,
        strokeDashoffset,
        color: colors[idx] || '#CCCCCC',
      }
    })
  }, [data?.tasks?.completedChartData])

  // Download tables as CSV
  const downloadCSV = (type: string) => {
    if (!data) return
    let csvContent = 'data:text/csv;charset=utf-8,'
    let filename = 'report.csv'

    if (type === 'contacts_feedback') {
      csvContent += 'S.No,Associate/Group,Total,Fresh,Call Back,Interested,Closed Won,Not Interested,Closed Lost,Completed Visits,Scheduled Visits\n'
      data.contacts.feedbackSummary.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total},${row.fresh},${row.callBack},${row.interested},${row.won},${row.notInterested},${row.lost},${row.completedVisits},${row.scheduledVisits}\n`
      })
      filename = 'contacts_feedback_summary.csv'
    } else if (type === 'contacts_callback') {
      csvContent += 'S.No,Associate/Group,Total Call Backs\n'
      data.contacts.callBackReasons.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total}\n`
      })
      filename = 'callback_reasons_summary.csv'
    } else if (type === 'tasks_completed') {
      csvContent += 'S.No,Associate/Group,Total Completed,Meeting,Call Back,Site Visit\n'
      data.tasks.completedTasks.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total},${row.meeting},${row.callBack},${row.siteVisit}\n`
      })
      filename = 'tasks_completed_summary.csv'
    } else if (type === 'tasks_pending') {
      csvContent += 'S.No,Associate/Group,Total Pending,Meeting,Call Back,Site Visit\n'
      data.tasks.pendingTasks.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total},${row.meeting},${row.callBack},${row.siteVisit}\n`
      })
      filename = 'tasks_pending_summary.csv'
    } else if (type === 'call_logs') {
      csvContent += 'S.No,Associate/Group,Total Calls,0 Sec,0-30 Sec,31-60 Sec,61-120 Sec,>120 Sec\n'
      data.callLogs.callLogSummary.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total},${row.duration0},${row.duration0_30},${row.duration31_60},${row.duration61_120},${row.durationAbove120}\n`
      })
      filename = 'call_logs_summary.csv'
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderDynamicWidgets = () => {
    if (!dashboardConfig?.tabs) return null
    const tab = dashboardConfig.tabs.find((t: any) => t.id === activeTab)
    if (!tab) return null

    const renderWidget = (w: any) => {
      const path = w.data_key.split('.')
      let dataList = data as any
      for (const key of path) {
        dataList = dataList?.[key]
      }
      if (!Array.isArray(dataList)) dataList = []

      if (w.type === 'TABLE') {
        return (
          <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <Tooltip title="Download CSV">
                <IconButton size="small" onClick={() => downloadCSV(w.id)} sx={{ color: 'text.secondary' }}>
                  <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 500 }}>
                <thead>
                  <Box component="tr" sx={{ 
                    borderBottom: '1.5px solid', 
                    borderColor: 'divider', 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    '& th': { 
                      py: 1.5, 
                      px: 2, 
                      fontWeight: 700, 
                      fontSize: '0.78rem', 
                      color: 'text.secondary', 
                      textTransform: 'uppercase', 
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap'
                    } 
                  }}>
                    <th>S.No</th>
                    {w.columns?.map((col: any) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </Box>
                </thead>
                <tbody>
                  {dataList.length > 0 ? (
                    dataList.map((r: any, idx: number) => (
                      <Box
                        component="tr"
                        key={idx}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                          '& td': { 
                            py: 1.4, 
                            px: 2, 
                            fontSize: '0.8125rem', 
                            color: 'text.primary',
                            whiteSpace: 'nowrap'
                          }
                        }}
                      >
                        <td>{idx + 1}</td>
                        {w.columns?.map((col: any) => (
                          <td key={col.key} style={col.key === 'associate' ? { fontWeight: 600 } : col.key === 'total' ? { fontWeight: 700 } : {}}>
                            {r[col.key]}
                          </td>
                        ))}
                      </Box>
                    ))
                  ) : (
                    <Box component="tr">
                      <td colSpan={(w.columns?.length || 0) + 1} style={{ textAlign: 'center', padding: '20px', color: theme.palette.text.secondary }}>
                        No data available
                      </td>
                    </Box>
                  )}
                </tbody>
              </Box>
            </Box>
          </Card>
        )
      } else if (w.type === 'CHART') {
        if (w.chart_type === 'donut') {
          const totalVal = dataList.reduce((sum: number, item: any) => sum + item.value, 0)
          let accumulatedPercentage = 0
          const colors = ['#10B981', '#3B82F6', '#06B6D4', '#8B5CF6', '#F97316']
          const slices = dataList.map((item: any, idx: number) => {
            const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0
            const strokeDasharray = `${(percentage / 100) * 376.99} 376.99`
            const strokeDashoffset = `${- (accumulatedPercentage / 100) * 376.99}`
            accumulatedPercentage += percentage
            return {
              name: item.name,
              value: item.value,
              percentage: Math.round(percentage),
              strokeDasharray,
              strokeDashoffset,
              color: colors[idx] || '#CCCCCC'
            }
          })

          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
                {w.title}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', gap: 4, flexGrow: 1 }}>
                {totalVal > 0 ? (
                  <Box sx={{ position: 'relative', width: 160, height: 160 }}>
                    <svg width="100%" height="100%" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="80" cy="80" r="60" fill="transparent" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} strokeWidth="16" />
                      {slices.map((slice: any, idx: number) => (
                        <circle
                          key={idx}
                          cx="80"
                          cy="80"
                          r="60"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="16"
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                          onMouseEnter={() => setHoveredDonutSlice(slice)}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        />
                      ))}
                    </svg>
                    <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                        {hoveredDonutSlice ? hoveredDonutSlice.value : totalVal}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
                        {hoveredDonutSlice ? hoveredDonutSlice.name : 'Total'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                    No chart data
                  </Box>
                )}

                <Stack spacing={1.5} sx={{ minWidth: 140 }}>
                  {slices.map((slice: any, idx: number) => (
                    <Stack key={idx} direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: slice.color }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {slice.name}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {slice.percentage}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Card>
          )
        } else if (w.chart_type === 'trend') {
          const trends = dataList
          const width = 800
          const height = 180
          const paddingLeft = 40
          const paddingRight = 40
          const paddingTop = 20
          const paddingBottom = 20

          const chartWidth = width - paddingLeft - paddingRight
          const chartHeight = height - paddingTop - paddingBottom

          const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : chartWidth
          const maxVal = Math.max(...trends.map((t: any) => t.calls || t.value || 0), 2)

          const points = trends.map((t: any, idx: number) => {
            const x = paddingLeft + idx * stepX
            const val = t.calls || t.value || 0
            const y = paddingTop + chartHeight - (val / maxVal) * chartHeight
            return { x, y, date: t.date || t.name, calls: val }
          })

          const linePath = points.map((pt: any, idx: number) => 
            `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
          ).join(' ')

          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', gridColumn: 'span 2' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <Box sx={{ position: 'relative', width: '100%', height: 180, mt: 3 }}>
                {points.length > 0 ? (
                  <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="3" />
                    {points.map((pt: any, idx: number) => (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#ffffff"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                          onMouseEnter={() => setHoveredTrend({ date: pt.date, calls: pt.calls, x: pt.x, y: pt.y - 10 })}
                          onMouseLeave={() => setHoveredTrend(null)}
                        />
                      </g>
                    ))}
                  </svg>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                    No call data found for this range
                  </Box>
                )}
              </Box>
            </Card>
          )
        }
      }
      return null
    }

    if (tab.sections && tab.sections.length > 0) {
      return (
        <Stack spacing={4}>
          {tab.sections.filter((s: any) => s.is_active !== false && s.title !== 'Key Metrics Overview').map((sec: any) => {
            const secKPIs = sec.widgets.filter((w: any) => w.type === 'KPI')
            const secLayoutWidgets = sec.widgets.filter((w: any) => w.type !== 'KPI')

            return (
              <Box key={sec.id}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 2, display: 'block', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  {sec.title}
                </Typography>

                {secKPIs.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(5, 1fr)',
                        lg: `repeat(${Math.min(9, secKPIs.length)}, 1fr)`,
                      },
                      gap: 1.25,
                      mb: 2.5
                    }}
                  >
                    {secKPIs.map((w: any) => {
                      const path = w.data_key.split('.')
                      let val = data as any
                      for (const key of path) {
                        val = val?.[key]
                      }
                      
                      let iconNode = <PeopleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      if (w.icon === 'AssignmentIcon') iconNode = <AssignmentIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'PhoneCallbackIcon') iconNode = <PhoneCallbackIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'ThumbUpIcon') iconNode = <ThumbUpIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'CheckCircleIcon') iconNode = <CheckCircleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'CancelIcon') iconNode = <CancelIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'TrendingDownIcon') iconNode = <TrendingDownIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'EventAvailableIcon') iconNode = <EventAvailableIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                      else if (w.icon === 'EventIcon') iconNode = <EventIcon sx={{ fontSize: '1.4rem', color: w.color }} />

                      const cardPayload = {
                        label: w.title,
                        val: val !== undefined ? val : 0,
                        color: w.color || '#EC4899',
                        bg: `linear-gradient(135deg, ${alpha(w.color || '#EC4899', 0.06)} 0%, ${alpha(w.color || '#EC4899', 0.01)} 100%)`,
                        icon: iconNode
                      }

                      return (
                        <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{metricDescriptions[cardPayload.label] || cardPayload.label}</Box>} placement="top" key={w.id}>
                          <Card
                            onClick={w.id === 'totalLeads' ? undefined : () => handleCardClick(w.title)}
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              border: '1px solid',
                              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,17,23,0.06)',
                              background: isDark ? 'rgba(13, 17, 39, 0.45)' : 'rgba(255, 255, 255, 0.70)',
                              borderLeft: `3px solid ${cardPayload.color}`,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: 80,
                              cursor: w.id === 'totalLeads' ? 'default' : 'pointer',
                              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': w.id === 'totalLeads' ? {} : {
                                transform: 'translateY(-2px)',
                                boxShadow: isDark
                                  ? `0 4px 20px ${alpha(cardPayload.color, 0.2)}`
                                  : `0 4px 16px ${alpha(cardPayload.color, 0.1)}`,
                                borderColor: alpha(cardPayload.color, 0.5),
                              }
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {cardPayload.label}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85, transform: 'scale(0.85)' }}>
                                {cardPayload.icon}
                              </Box>
                            </Stack>
                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: 'text.primary', fontSize: '1.25rem', letterSpacing: -0.5 }}>
                              {cardPayload.val}
                            </Typography>
                          </Card>
                        </Tooltip>
                      )
                    })}
                  </Box>
                )}

                {secLayoutWidgets.length > 0 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5, mb: 2 }}>
                    {secLayoutWidgets.map((w: any) => renderWidget(w))}
                  </Box>
                )}
              </Box>
            )
          })}
        </Stack>
      )
    }

    const flatKPIs = tab.widgets?.filter((w: any) => w.type === 'KPI') || []
    const flatLayoutWidgets = tab.widgets?.filter((w: any) => w.type !== 'KPI') || []

    return (
      <Stack spacing={3}>
        {flatKPIs.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(5, 1fr)',
                lg: `repeat(${Math.min(9, flatKPIs.length)}, 1fr)`,
              },
              gap: 1.25,
            }}
          >
            {flatKPIs.map((w: any) => {
              const path = w.data_key.split('.')
              let val = data as any
              for (const key of path) {
                val = val?.[key]
              }

              let iconNode = <PeopleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              if (w.icon === 'AssignmentIcon') iconNode = <AssignmentIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'PhoneCallbackIcon') iconNode = <PhoneCallbackIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'ThumbUpIcon') iconNode = <ThumbUpIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'CheckCircleIcon') iconNode = <CheckCircleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'CancelIcon') iconNode = <CancelIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'TrendingDownIcon') iconNode = <TrendingDownIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'EventAvailableIcon') iconNode = <EventAvailableIcon sx={{ fontSize: '1.4rem', color: w.color }} />
              else if (w.icon === 'EventIcon') iconNode = <EventIcon sx={{ fontSize: '1.4rem', color: w.color }} />

              const cardPayload = {
                label: w.title,
                val: val !== undefined ? val : 0,
                color: w.color || '#EC4899',
                bg: `linear-gradient(135deg, ${alpha(w.color || '#EC4899', 0.06)} 0%, ${alpha(w.color || '#EC4899', 0.01)} 100%)`,
                icon: iconNode
              }

              return (
                <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{metricDescriptions[cardPayload.label] || cardPayload.label}</Box>} placement="top" key={w.id}>
                  <Card
                    onClick={w.id === 'totalLeads' ? undefined : () => handleCardClick(w.title)}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,17,23,0.06)',
                      background: isDark ? 'rgba(13, 17, 39, 0.45)' : 'rgba(255, 255, 255, 0.70)',
                      borderLeft: `3px solid ${cardPayload.color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 80,
                      cursor: w.id === 'totalLeads' ? 'default' : 'pointer',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': w.id === 'totalLeads' ? {} : {
                        transform: 'translateY(-2px)',
                        boxShadow: isDark
                          ? `0 4px 20px ${alpha(cardPayload.color, 0.2)}`
                          : `0 4px 16px ${alpha(cardPayload.color, 0.1)}`,
                        borderColor: alpha(cardPayload.color, 0.5),
                      }
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {cardPayload.label}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85, transform: 'scale(0.85)' }}>
                        {cardPayload.icon}
                      </Box>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: 'text.primary', fontSize: '1.25rem', letterSpacing: -0.5 }}>
                      {cardPayload.val}
                    </Typography>
                  </Card>
                </Tooltip>
              )
            })}
          </Box>
        )}

        {flatLayoutWidgets.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5 }}>
            {flatLayoutWidgets.map((w: any) => renderWidget(w))}
          </Box>
        )}
      </Stack>
    )
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5, md: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.5, md: 2.5 },
        overflowY: 'auto',
        backgroundColor: theme.palette.background.default
      }}
    >
      {/* ── DASHBOARD TITLE & SUBTITLE ────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
            Analytics Overview
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: isDark ? 'rgba(79, 106, 245, 0.15)' : 'rgba(79, 106, 245, 0.08)',
              color: 'secondary.main',
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
            }}
          >
            {user?.role === 'superAdmin'
              ? 'Super Admin'
              : user?.role === 'admin'
              ? 'Admin'
              : user?.role === 'leadManager'
              ? 'Lead Manager'
              : user?.role === 'teamLead'
              ? 'Team Lead'
              : user?.role === 'sales'
              ? 'Sales'
              : user?.role || 'User'}
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {user?.role === 'superAdmin'
            ? 'Global platform analytics across all registered organizations.'
            : user?.role === 'admin'
            ? 'Performance metrics and activities for your organization.'
            : user?.role === 'leadManager'
            ? 'Analytics for your assigned teams and direct reports.'
            : user?.role === 'teamLead'
            ? 'Activity and lead tracking for your team members.'
            : user?.role === 'sales'
            ? 'Your personal sales activities, calling trends, and outcomes.'
            : 'Track leads performance, team activities, and call duration analytics.'}
        </Typography>
      </Box>

      {/* ── TOP CONTROL BAR (Unified inline dashboard filters) ─────────────────── */}
      <Card
        sx={{
          p: 2,
          borderRadius: '16px',
          boxShadow: '0 4px 30px rgba(0,0,0,0.03)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          backgroundColor: isDark ? 'rgba(30,30,40,0.7)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          flexShrink: 0
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          {/* Left Controls: Org Dropdown + Grouping Selection */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            {isSuperAdmin && industries.length > 0 && (
              <TextField
                select
                size="small"
                label="Industry"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                {industries.map((ind) => (
                  <MenuItem key={ind._id} value={ind.code}>
                    {ind.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {isSuperAdmin && filteredOrgs.length > 0 && (
              <TextField
                select
                size="small"
                label="Organization"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                {filteredOrgs.map((org) => (
                  <MenuItem key={org.code} value={org.code}>
                    {org.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {user?.role !== 'sales' ? (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  p: 0.5,
                  borderRadius: '10px',
                  width: 'fit-content'
                }}
              >
                {(['team', 'source', 'teamWise'] as const).map(mode => (
                  <Button
                    key={mode}
                    size="small"
                    variant={groupBy === mode ? 'contained' : 'text'}
                    onClick={() => setGroupBy(mode)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 0.5,
                      boxShadow: groupBy === mode ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
                      backgroundColor: groupBy === mode ? theme.palette.secondary.main : 'transparent',
                      color: groupBy === mode ? '#ffffff' : theme.palette.text.secondary,
                      '&:hover': {
                        backgroundColor: groupBy === mode ? theme.palette.secondary.dark : 'rgba(0,0,0,0.04)'
                      }
                    }}
                  >
                    {mode === 'team' ? 'Associate' : mode === 'source' ? 'Source' : 'Team'}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Personal Analytics Mode
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Right Controls: Presets + Date Pickers + Reset */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            flexWrap="wrap"
          >
            {/* Range Presets */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                p: 0.5,
                borderRadius: '10px'
              }}
            >
              <Button
                size="small"
                variant={activePreset === 7 ? 'contained' : 'text'}
                color={activePreset === 7 ? 'secondary' : 'inherit'}
                onClick={() => applyPresetFilter(7)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  px: 1.5,
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                7 Days
              </Button>
              <Button
                size="small"
                variant={activePreset === 30 ? 'contained' : 'text'}
                color={activePreset === 30 ? 'secondary' : 'inherit'}
                onClick={() => applyPresetFilter(30)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  px: 1.5,
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                30 Days
              </Button>
            </Stack>

            {/* Date Inputs Inline */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                size="small"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>to</Typography>
              <TextField
                type="date"
                size="small"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Stack>
            
            <Button
              size="small"
              variant="outlined"
              startIcon={<ClearAllOutlinedIcon />}
              onClick={handleClearFilters}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.primary',
                px: 1.75,
                height: 38
              }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Card>

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 15, flexGrow: 1 }}>
          <CircularProgress color="secondary" size={48} />
        </Box>
      ) : !data ? (
        <Alert severity="error">Failed to load Analytics data. Please check connection.</Alert>
      ) : (
        <>
          {/* Key Metrics Overview rendered at the top level for Super Admin */}
          {keyMetricsSection && (
            <Box sx={{ flexShrink: 0, mb: 3 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Key Metrics Overview
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(5, 1fr)',
                    lg: `repeat(${Math.min(9, keyMetricsSection.widgets.length)}, 1fr)`,
                  },
                  gap: 1.25,
                }}
              >
                {keyMetricsSection.widgets.map((w: any) => {
                  const path = w.data_key.split('.')
                  let val = data as any
                  for (const key of path) {
                    val = val?.[key]
                  }

                  let iconNode = <PeopleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  if (w.icon === 'AssignmentIcon') iconNode = <AssignmentIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'PhoneCallbackIcon') iconNode = <PhoneCallbackIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'ThumbUpIcon') iconNode = <ThumbUpIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'CheckCircleIcon') iconNode = <CheckCircleIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'CancelIcon') iconNode = <CancelIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'TrendingDownIcon') iconNode = <TrendingDownIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'EventAvailableIcon') iconNode = <EventAvailableIcon sx={{ fontSize: '1.4rem', color: w.color }} />
                  else if (w.icon === 'EventIcon') iconNode = <EventIcon sx={{ fontSize: '1.4rem', color: w.color }} />

                  const cardPayload = {
                    label: w.title,
                    val: val !== undefined ? val : 0,
                    color: w.color || '#EC4899',
                    bg: `linear-gradient(135deg, ${alpha(w.color || '#EC4899', 0.06)} 0%, ${alpha(w.color || '#EC4899', 0.01)} 100%)`,
                    icon: iconNode
                  }

                  return (
                    <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{metricDescriptions[cardPayload.label] || cardPayload.label}</Box>} placement="top" key={w.id}>
                      <Card
                        onClick={w.id === 'totalLeads' ? undefined : () => handleCardClick(w.title)}
                        sx={{
                          p: 1.5,
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,17,23,0.06)',
                          background: isDark ? 'rgba(13, 17, 39, 0.45)' : 'rgba(255, 255, 255, 0.70)',
                          borderLeft: `3px solid ${cardPayload.color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 80,
                          cursor: w.id === 'totalLeads' ? 'default' : 'pointer',
                          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': w.id === 'totalLeads' ? {} : {
                            transform: 'translateY(-2px)',
                            boxShadow: isDark
                              ? `0 4px 20px ${alpha(cardPayload.color, 0.2)}`
                              : `0 4px 16px ${alpha(cardPayload.color, 0.1)}`,
                            borderColor: alpha(cardPayload.color, 0.5),
                          }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {cardPayload.label}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85, transform: 'scale(0.85)' }}>
                            {cardPayload.icon}
                          </Box>
                        </Stack>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: 'text.primary', fontSize: '1.25rem', letterSpacing: -0.5 }}>
                          {cardPayload.val}
                        </Typography>
                      </Card>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ── KPI METRICS CARDS GRID (Compact & Branded) ───── */}
          {!dashboardConfig?.tabs && (
            <Box sx={{ flexShrink: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Workspace Performance Metrics
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(5, 1fr)',
                    lg: 'repeat(9, 1fr)',
                  },
                  gap: 1.25,
                }}
              >
                {cardConfigs.map((c: any) => {
                  const isTotalLeads = c.label === 'Total Leads'
                  return (
                    <Card
                      key={c.label}
                      onClick={isTotalLeads ? undefined : () => handleCardClick(c.label)}
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,17,23,0.06)',
                        background: isDark ? 'rgba(13, 17, 39, 0.45)' : 'rgba(255, 255, 255, 0.70)',
                        borderLeft: `3px solid ${c.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 80,
                        cursor: isTotalLeads ? 'default' : 'pointer',
                        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': isTotalLeads ? {} : {
                          transform: 'translateY(-2px)',
                          boxShadow: isDark
                            ? `0 4px 20px ${alpha(c.color, 0.2)}`
                            : `0 4px 16px ${alpha(c.color, 0.1)}`,
                          borderColor: alpha(c.color, 0.5),
                        }
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {c.label}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85, transform: 'scale(0.85)' }}>
                          {c.icon}
                        </Box>
                      </Stack>
                      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: 'text.primary', fontSize: '1.25rem', letterSpacing: -0.5 }}>
                        {c.val}
                      </Typography>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ── TABS BAR (sleek custom styling) ───────────────────────────────── */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1, flexShrink: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              textColor="secondary"
              indicatorColor="secondary"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  minWidth: 120,
                  px: 2,
                  pb: 1.5,
                  color: 'text.secondary',
                  transition: 'color 180ms ease',
                  '&.Mui-selected': {
                    color: 'secondary.main'
                  }
                }
              }}
            >
              {dashboardConfig?.tabs ? (
                dashboardConfig.tabs.map((tab: any) => (
                  <Tab key={tab.id} label={tab.label} />
                ))
              ) : (
                <>
                  <Tab label="Contacts Overview" />
                  <Tab label="Tasks & Meetings" />
                  <Tab label="Calling Analytics" />
                </>
              )}
            </Tabs>
          </Box>

          {/* ── TAB CONTENT: CONTACTS OVERVIEW ────────────────────────────────── */}
          {dashboardConfig?.tabs ? (
            renderDynamicWidgets()
          ) : (
            <>
              {activeTab === 0 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5 }}>
                
                {/* Table: Feedback Summary */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Leads Feedback Breakdown
                    </Typography>
                    <Tooltip title="Download CSV">
                      <IconButton size="small" onClick={() => downloadCSV('contacts_feedback')} sx={{ color: 'text.secondary' }}>
                        <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Box sx={{ overflowX: 'auto', width: '100%' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
                      <thead>
                        <Box component="tr" sx={{ 
                          borderBottom: '1.5px solid', 
                          borderColor: 'divider', 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          '& th': { 
                            py: 1.5, 
                            px: 2, 
                            fontWeight: 700, 
                            fontSize: '0.78rem', 
                            color: 'text.secondary', 
                            textTransform: 'uppercase', 
                            letterSpacing: 0.5,
                            whiteSpace: 'nowrap'
                          } 
                        }}>
                          <th>S.No</th>
                          <th>{groupBy === 'team' ? 'Associate' : groupBy === 'source' ? 'Source' : 'Team'}</th>
                          <th>Total</th>
                          <th>Fresh</th>
                          <th>Call Back</th>
                          <th>Interested</th>
                          <th>Won</th>
                          <th>Not Interested</th>
                          <th>Lost</th>
                          <th>Completed Visits</th>
                        </Box>
                      </thead>
                      <tbody>
                        {data.contacts.feedbackSummary.length > 0 ? (
                          data.contacts.feedbackSummary.map((r, i) => (
                            <Box
                              component="tr"
                              key={r.associate}
                              sx={{
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                                '& td': { 
                                  py: 1.4, 
                                  px: 2, 
                                  fontSize: '0.8125rem', 
                                  color: 'text.primary',
                                  whiteSpace: 'nowrap'
                                }
                              }}
                            >
                              <td>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{r.associate}</td>
                              <td style={{ fontWeight: 700 }}>{r.total}</td>
                              <td>{r.fresh}</td>
                              <td>{r.callBack}</td>
                              <td>{r.interested}</td>
                              <td style={{ color: '#10B981', fontWeight: 600 }}>{r.won}</td>
                              <td>{r.notInterested}</td>
                              <td>{r.lost}</td>
                              <td>{r.completedVisits}</td>
                            </Box>
                          ))
                        ) : (
                          <Box component="tr">
                            <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: theme.palette.text.disabled }}>
                              No contact records found.
                            </td>
                          </Box>
                        )}
                      </tbody>
                    </Box>
                  </Box>
                </Card>

                {/* SVG Bar Chart: Lead Status Chart */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
                    Lead Status Distribution
                  </Typography>

                  <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                    {data.cards.totalLeads > 0 ? (
                      <svg width="100%" height="220" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet">
                        {/* Define linear gradients and glows for the bars */}
                        <defs>
                          <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.4" />
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A78BFA" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                          <linearGradient id="greenBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="100%" stopColor="#10B981" />
                          </linearGradient>
                          <linearGradient id="yellowBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FBBF24" />
                            <stop offset="100%" stopColor="#EAB308" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="40" y1="30" x2="280" y2="30" stroke={theme.palette.divider} strokeWidth="0.8" strokeDasharray="3,3" />
                        <line x1="40" y1="90" x2="280" y2="90" stroke={theme.palette.divider} strokeWidth="0.8" strokeDasharray="3,3" />
                        <line x1="40" y1="150" x2="280" y2="150" stroke={theme.palette.divider} strokeWidth="0.8" />

                        {/* Y Labels */}
                        <text x="18" y="34" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">Max</text>
                        <text x="18" y="94" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">Mid</text>
                        <text x="18" y="154" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">0</text>

                        {/* Bars rendering */}
                        {(() => {
                          const items = data.contacts.chartData
                          const maxVal = Math.max(...items.map(i => i.value), 2)
                          const colors = ['url(#purpleBarGrad)', 'url(#greenBarGrad)', 'url(#yellowBarGrad)']

                          return items.map((item, idx) => {
                            const barWidth = 32
                            const spacing = 65
                            const x = 60 + idx * (barWidth + spacing)
                            const h = maxVal > 0 ? (item.value / maxVal) * 120 : 0
                            const y = 150 - h

                            return (
                              <g
                                key={item.name}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredBar(idx)}
                                onMouseLeave={() => setHoveredBar(null)}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={h}
                                  rx="5"
                                  fill={colors[idx]}
                                  opacity={hoveredBar === idx ? 1 : 0.85}
                                  filter={hoveredBar === idx ? 'url(#barGlow)' : 'none'}
                                  style={{ transition: 'all 200ms ease' }}
                                />
                                {/* Value Label */}
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 8}
                                  fill={theme.palette.text.primary}
                                  fontSize="9.5"
                                  fontWeight="700"
                                  textAnchor="middle"
                                >
                                  {item.value}
                                </text>
                                {/* Axis label */}
                                <text
                                  x={x + barWidth / 2}
                                  y="168"
                                  fill={theme.palette.text.secondary}
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="middle"
                                >
                                  {item.name}
                                </text>
                              </g>
                            )
                          })
                        })()}
                      </svg>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No contacts to display in chart.</Typography>
                    )}
                  </Box>
                </Card>
              </Box>

              {/* Call Back Reason Summary Table */}
              <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Call Back Reasons Overview
                  </Typography>
                  <Tooltip title="Download CSV">
                    <IconButton size="small" onClick={() => downloadCSV('contacts_callback')} sx={{ color: 'text.secondary' }}>
                      <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Box sx={{ overflowX: 'auto', width: '100%' }}>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <Box component="tr" sx={{ 
                        borderBottom: '1.5px solid', 
                        borderColor: 'divider',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        '& th': { 
                          py: 1.5, 
                          px: 2, 
                          fontWeight: 700, 
                          fontSize: '0.78rem', 
                          color: 'text.secondary', 
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        } 
                      }}>
                        <th>S.No</th>
                        <th>{groupBy === 'team' ? 'Associate' : groupBy === 'source' ? 'Source' : 'Team'}</th>
                        <th style={{ textAlign: 'right', paddingRight: '16px' }}>Total Call Backs</th>
                      </Box>
                    </thead>
                    <tbody>
                      {data.contacts.callBackReasons.length > 0 ? (
                        data.contacts.callBackReasons.map((r, i) => (
                          <Box
                            component="tr"
                            key={r.associate}
                            sx={{
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                              '& td': { 
                                py: 1.4, 
                                px: 2, 
                                fontSize: '0.8125rem', 
                                color: 'text.primary',
                                whiteSpace: 'nowrap'
                              }
                            }}
                          >
                            <td>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{r.associate}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, paddingRight: '16px' }}>{r.total}</td>
                          </Box>
                        ))
                      ) : (
                        <Box component="tr">
                          <td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: theme.palette.text.disabled, fontSize: '0.8125rem' }}>
                            No call backs registered.
                          </td>
                        </Box>
                      )}
                    </tbody>
                  </Box>
                </Box>
              </Card>
            </Stack>
          )}

          {/* ── TAB CONTENT: TASKS & SITE VISITS ──────────────────────────────── */}
          {activeTab === 1 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, gap: 2.5 }}>
                
                {/* SVG Concentric Donut: Task types breakdown */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="subtitle1" align="left" sx={{ width: '100%', fontWeight: 700, mb: 3 }}>
                    Completed Task Types
                  </Typography>

                  <Box sx={{ position: 'relative', width: 160, height: 160, mb: 3 }}>
                    {completedDonutSlices.length > 0 ? (
                      <>
                        <svg width="160" height="160" viewBox="0 0 160 160">
                          {completedDonutSlices.map((slice) => (
                            <circle
                              key={slice.name}
                              cx="80"
                              cy="80"
                              r="60"
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth={hoveredDonutSlice?.name === slice.name ? "19" : "15"}
                              strokeDasharray={slice.strokeDasharray}
                              strokeDashoffset={slice.strokeDashoffset}
                              transform="rotate(-90 80 80)"
                              style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
                              onMouseEnter={() => setHoveredDonutSlice(slice)}
                              onMouseLeave={() => setHoveredDonutSlice(null)}
                            />
                          ))}
                        </svg>
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: hoveredDonutSlice ? hoveredDonutSlice.color : 'text.primary' }}>
                            {hoveredDonutSlice ? `${hoveredDonutSlice.value}` : (data.cards.completedVisits + data.cards.scheduledVisits > 0 ? `${data.cards.completedVisits + data.cards.scheduledVisits}` : '0')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>
                            {hoveredDonutSlice ? hoveredDonutSlice.name : 'Total Tasks'}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">No task stats to show.</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Legends */}
                  <Stack direction="row" flexWrap="wrap" spacing={2} justifyContent="center" sx={{ width: '100%', mt: 1 }}>
                    {completedDonutSlices.map((slice) => (
                      <Stack key={slice.name} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: slice.color }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {slice.name} ({slice.percentage}%)
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Card>

                {/* Table: Completed Tasks */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Completed Task Summary
                    </Typography>
                    <Tooltip title="Download CSV">
                      <IconButton size="small" onClick={() => downloadCSV('tasks_completed')} sx={{ color: 'text.secondary' }}>
                        <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Box sx={{ overflowX: 'auto', width: '100%' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <Box component="tr" sx={{ 
                          borderBottom: '1.5px solid', 
                          borderColor: 'divider',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          '& th': { 
                            py: 1.5, 
                            px: 2, 
                            fontWeight: 700, 
                            fontSize: '0.78rem', 
                            color: 'text.secondary', 
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                          } 
                        }}>
                          <th>S.No</th>
                          <th>{groupBy === 'team' ? 'Associate' : groupBy === 'source' ? 'Source' : 'Team'}</th>
                          <th>Total</th>
                          <th>Meeting</th>
                          <th>Call Back</th>
                          <th>Site Visit</th>
                        </Box>
                      </thead>
                      <tbody>
                        {data.tasks.completedTasks.length > 0 ? (
                          data.tasks.completedTasks.map((r, i) => (
                            <Box
                              component="tr"
                              key={r.associate}
                              sx={{
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                                '& td': { 
                                  py: 1.4, 
                                  px: 2, 
                                  fontSize: '0.8125rem', 
                                  color: 'text.primary',
                                  whiteSpace: 'nowrap'
                                }
                              }}
                            >
                              <td>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{r.associate}</td>
                              <td style={{ fontWeight: 700 }}>{r.total}</td>
                              <td>{r.meeting}</td>
                              <td>{r.callBack}</td>
                              <td>{r.siteVisit}</td>
                            </Box>
                          ))
                        ) : (
                          <Box component="tr">
                            <td colSpan={6} style={{ textAlign: 'center', padding: '20px 0', color: theme.palette.text.disabled, fontSize: '0.8125rem' }}>
                              No completed tasks found.
                            </td>
                          </Box>
                        )}
                      </tbody>
                    </Box>
                  </Box>
                </Card>
              </Box>

              {/* Table: Pending Tasks */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5 }}>
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Pending Tasks Breakdown
                    </Typography>
                    <Tooltip title="Download CSV">
                      <IconButton size="small" onClick={() => downloadCSV('tasks_pending')} sx={{ color: 'text.secondary' }}>
                        <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Box sx={{ overflowX: 'auto', width: '100%' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <Box component="tr" sx={{ 
                          borderBottom: '1.5px solid', 
                          borderColor: 'divider',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          '& th': { 
                            py: 1.5, 
                            px: 2, 
                            fontWeight: 700, 
                            fontSize: '0.78rem', 
                            color: 'text.secondary', 
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                          } 
                        }}>
                          <th>S.No</th>
                          <th>{groupBy === 'team' ? 'Associate' : groupBy === 'source' ? 'Source' : 'Team'}</th>
                          <th>Total</th>
                          <th>Meeting</th>
                          <th>Call Back</th>
                          <th>Site Visit</th>
                        </Box>
                      </thead>
                      <tbody>
                        {data.tasks.pendingTasks.length > 0 ? (
                          data.tasks.pendingTasks.map((r, i) => (
                            <Box
                              component="tr"
                              key={r.associate}
                              sx={{
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                                '& td': { 
                                  py: 1.4, 
                                  px: 2, 
                                  fontSize: '0.8125rem', 
                                  color: 'text.primary',
                                  whiteSpace: 'nowrap'
                                }
                              }}
                            >
                              <td>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{r.associate}</td>
                              <td style={{ fontWeight: 700 }}>{r.total}</td>
                              <td>{r.meeting}</td>
                              <td>{r.callBack}</td>
                              <td>{r.siteVisit}</td>
                            </Box>
                          ))
                        ) : (
                          <Box component="tr">
                            <td colSpan={6} style={{ textAlign: 'center', padding: '20px 0', color: theme.palette.text.disabled, fontSize: '0.8125rem' }}>
                              No pending tasks.
                            </td>
                          </Box>
                        )}
                      </tbody>
                    </Box>
                  </Box>
                </Card>

                {/* SVG Bar Chart: Pending Tasks Chart */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    Pending Task Types
                  </Typography>

                  <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                    {data.tasks.pendingChartData.some((c) => c.value > 0) ? (
                      <svg width="100%" height="150" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
                        {/* Define linear gradients and glows for pending task chart */}
                        <defs>
                          <filter id="taskGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.35" />
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <linearGradient id="pendingTealGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="pendingBlueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60A5FA" />
                            <stop offset="100%" stopColor="#2563EB" />
                          </linearGradient>
                          <linearGradient id="pendingCyanGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22D3EE" />
                            <stop offset="100%" stopColor="#0891B2" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="30" y1="15" x2="190" y2="15" stroke={theme.palette.divider} strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="30" y1="55" x2="190" y2="55" stroke={theme.palette.divider} strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="30" y1="95" x2="190" y2="95" stroke={theme.palette.divider} strokeWidth="0.5" />

                        {/* Bars rendering */}
                        {(() => {
                          const items = data.tasks.pendingChartData
                          const maxVal = Math.max(...items.map(i => i.value), 2)
                          const colors = ['url(#pendingTealGrad)', 'url(#pendingBlueGrad)', 'url(#pendingCyanGrad)']

                          return items.map((item, idx) => {
                            const barWidth = 20
                            const spacing = 26
                            const x = 36 + idx * (barWidth + spacing)
                            const h = maxVal > 0 ? (item.value / maxVal) * 80 : 0
                            const y = 95 - h

                            return (
                              <g
                                key={item.name}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredTaskBar(idx)}
                                onMouseLeave={() => setHoveredTaskBar(null)}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={h}
                                  rx="3"
                                  fill={colors[idx]}
                                  opacity={hoveredTaskBar === idx ? 1 : 0.85}
                                  filter={hoveredTaskBar === idx ? 'url(#taskGlow)' : 'none'}
                                  style={{ transition: 'all 200ms ease' }}
                                />
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 5}
                                  fill={theme.palette.text.primary}
                                  fontSize="9"
                                  fontWeight="700"
                                  textAnchor="middle"
                                >
                                  {item.value}
                                </text>
                                <text
                                  x={x + barWidth / 2}
                                  y="110"
                                  fill={theme.palette.text.secondary}
                                  fontSize="7.5"
                                  fontWeight="600"
                                  textAnchor="middle"
                                >
                                  {item.name}
                                </text>
                              </g>
                            )
                          })
                        })()}
                      </svg>
                    ) : (
                      <Typography variant="caption" color="text.disabled">No Pending Tasks</Typography>
                    )}
                  </Box>
                </Card>
              </Box>
            </Stack>
          )}

          {/* ── TAB CONTENT: CALLING ANALYTICS ────────────────────────────────── */}
          {activeTab === 2 && (
            <Stack spacing={3}>
              
              {/* Curve Line SVG Chart: Calling Trend Summary */}
              <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
                  Calling Volume Trends
                </Typography>

                <Box sx={{ width: '100%', position: 'relative', overflowX: 'auto', minHeight: 200 }}>
                  {trendLineConfig ? (
                    <Box sx={{ width: '100%', position: 'relative', minWidth: 600 }}>
                      <svg width="100%" height="180" viewBox="0 0 800 180" preserveAspectRatio="none">
                        
                        {/* Grid lines */}
                        <line x1="40" y1="20" x2="760" y2="20" stroke={theme.palette.divider} strokeWidth="0.8" strokeDasharray="3,3" />
                        <line x1="40" y1="65" x2="760" y2="65" stroke={theme.palette.divider} strokeWidth="0.8" strokeDasharray="3,3" />
                        <line x1="40" y1="110" x2="760" y2="110" stroke={theme.palette.divider} strokeWidth="0.8" strokeDasharray="3,3" />
                        <line x1="40" y1="155" x2="760" y2="155" stroke={theme.palette.divider} strokeWidth="0.8" />

                        {/* Y axis labels */}
                        <text x="20" y="24" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">Max</text>
                        <text x="20" y="88" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">Mid</text>
                        <text x="20" y="159" fill={theme.palette.text.secondary} fontSize="8.5" textAnchor="middle">0</text>

                        {/* Linear area gradient */}
                        <defs>
                          <linearGradient id="curvedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.palette.secondary.main} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={theme.palette.secondary.main} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Area Path */}
                        <path d={trendLineConfig.areaPath} fill="url(#curvedAreaGradient)" />

                        {/* Line Path */}
                        <path d={trendLineConfig.linePath} fill="none" stroke={theme.palette.secondary.main} strokeWidth="2.5" />

                        {/* Node Dots & Hovers */}
                        {trendLineConfig.points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredTrend?.x === p.x ? "6" : "4.5"}
                              fill={p.calls > 0 ? theme.palette.secondary.main : theme.palette.background.paper}
                              stroke={theme.palette.secondary.main}
                              strokeWidth="2.5"
                              style={{ cursor: 'pointer', transition: 'r 150ms ease' }}
                              onMouseEnter={() => setHoveredTrend({ date: p.date, calls: p.calls, x: p.x, y: p.y })}
                              onMouseLeave={() => setHoveredTrend(null)}
                            />
                            {/* Date underneath */}
                            <text x={p.x} y="172" fill={theme.palette.text.secondary} fontSize="8" textAnchor="middle" fontWeight="600">
                              {p.date}
                            </text>
                            {/* Static call badge above points */}
                            {p.calls > 0 && (
                              <g>
                                <rect x={p.x - 8} y={p.y - 20} width="16" height="11" rx="2" fill={theme.palette.secondary.main} />
                                <text x={p.x} y={p.y - 12} fill="#FFFFFF" fontSize="7.5" fontWeight="800" textAnchor="middle">{p.calls}</text>
                              </g>
                            )}
                          </g>
                        ))}
                      </svg>

                      {/* Interactive Hover Tooltip */}
                      {hoveredTrend && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: hoveredTrend.x - 55,
                            top: hoveredTrend.y - 65,
                            backgroundColor: theme.palette.background.paper,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '8px',
                            p: 1,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}
                        >
                          <Typography variant="caption" display="block" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {hoveredTrend.date}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 800 }}>
                            Calls: {hoveredTrend.calls}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No trend coordinates available.</Typography>
                  )}
                </Box>
              </Card>

              {/* Table: Call Log duration Summary */}
              <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Call Duration Summary
                  </Typography>
                  <Tooltip title="Download CSV">
                    <IconButton size="small" onClick={() => downloadCSV('call_logs')} sx={{ color: 'text.secondary' }}>
                      <DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Box sx={{ overflowX: 'auto', width: '100%' }}>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                    <thead>
                      <Box component="tr" sx={{ 
                        borderBottom: '1.5px solid', 
                        borderColor: 'divider',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        '& th': { 
                          py: 1.5, 
                          px: 2, 
                          fontWeight: 700, 
                          fontSize: '0.78rem', 
                          color: 'text.secondary', 
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        } 
                      }}>
                        <th>S.No</th>
                        <th>{groupBy === 'team' ? 'Associate' : groupBy === 'source' ? 'Source' : 'Team'}</th>
                        <th>Total Calls</th>
                        <th>0 Sec</th>
                        <th>0-30 Sec</th>
                        <th>31-60 Sec</th>
                        <th>61-120 Sec</th>
                        <th>&gt;120 Sec</th>
                      </Box>
                    </thead>
                    <tbody>
                      {data.callLogs.callLogSummary.length > 0 ? (
                        data.callLogs.callLogSummary.map((r, i) => (
                          <Box
                            component="tr"
                            key={r.associate}
                            sx={{
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                              '& td': { 
                                py: 1.4, 
                                px: 2, 
                                fontSize: '0.8125rem', 
                                color: 'text.primary',
                                whiteSpace: 'nowrap'
                              }
                            }}
                          >
                            <td>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{r.associate}</td>
                            <td style={{ fontWeight: 700 }}>{r.total}</td>
                            <td>{r.duration0}</td>
                            <td>{r.duration0_30}</td>
                            <td>{r.duration31_60}</td>
                            <td>{r.duration61_120}</td>
                            <td style={{ color: theme.palette.secondary.main, fontWeight: 600 }}>{r.durationAbove120}</td>
                          </Box>
                        ))
                      ) : (
                        <Box component="tr">
                          <td colSpan={8} style={{ textAlign: 'center', padding: '30px 0', color: theme.palette.text.disabled, fontSize: '0.8125rem' }}>
                            No logged calls records found.
                          </td>
                        </Box>
                      )}
                    </tbody>
                  </Box>
                </Box>
              </Card>
            </Stack>
          )}
            </>
          )}
        </>
      )}
    </Box>
  )
}
