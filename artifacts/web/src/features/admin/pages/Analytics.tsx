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
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'

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
import { ThreeDDonutChart, ThreeDCylinderBarChart, ThreeDRoseChart, ThreeDAreaTrendChart } from '@/components/charts'

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
  showAnalytics?: boolean
  message?: string
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

export default function AnalyticsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isDark = theme.palette.mode === 'dark'

  // General State
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [dashboardConfig, setDashboardConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Filters State
  const [groupBy, setGroupBy] = useState<'team' | 'source' | 'teamWise'>('team')
  const [showDatePanel, setShowDatePanel] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Chart Interactive states
  const [hoveredTrend, setHoveredTrend] = useState<{ date: string; calls: number; x: number; y: number } | null>(null)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [hoveredTaskBar, setHoveredTaskBar] = useState<number | null>(null)
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<{ name: string; value: number; percentage: number; color: string } | null>(null)

  // Dynamic industry & tenant labels derived directly from dashboardConfig (Enterprise Multi-Tenant)
  const labels = useMemo(() => {
    let completedVisits = 'Completed Visits'
    let scheduledVisits = 'Scheduled Visits'
    let siteVisit = 'Site Visit'
    let meeting = 'Meeting'
    let visitsDesc = 'Visits'
    let tasksAndMeetingsTab = 'Tasks & Meetings'

    if (dashboardConfig?.tabs) {
      for (const tab of dashboardConfig.tabs) {
        if (tab.id === 1 && tab.label) {
          tasksAndMeetingsTab = tab.label
        }
        if (tab.sections) {
          for (const sec of tab.sections) {
            if (sec.widgets) {
              for (const w of sec.widgets) {
                if (w.data_key === 'cards.completedVisits' && w.title) {
                  completedVisits = w.title
                }
                if (w.data_key === 'cards.scheduledVisits' && w.title) {
                  scheduledVisits = w.title
                }
                if (w.columns && Array.isArray(w.columns)) {
                  const mv = w.columns.find((c: any) => c.key === 'meeting')
                  if (mv?.label) meeting = mv.label
                  const sv = w.columns.find((c: any) => c.key === 'siteVisit')
                  if (sv?.label) {
                    siteVisit = sv.label
                    visitsDesc = sv.label
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      completedVisits,
      scheduledVisits,
      siteVisit,
      meeting,
      visitsDesc,
      completedVisitsTooltip: `${completedVisits}:\nThe count of successfully completed\n${visitsDesc.toLowerCase()}.`,
      scheduledVisitsTooltip: `${scheduledVisits}:\n${visitsDesc} scheduled\nfor the future.`,
      tasksAndMeetingsTab,
    }
  }, [dashboardConfig]);

  const metricDescriptions = useMemo<Record<string, string>>(() => {
    return {
      'Total Leads': 'Total Leads:\nThe sum of all leads collected\nin the system.',
      'Fresh': 'Fresh Leads:\nNewly added leads that have\nnot yet been contacted.',
      'Call Back': 'Call Back:\nLeads scheduled for\na follow-up call.',
      'Interested': 'Interested Leads:\nLeads who have shown interest\nin your offer.',
      'Closed Won': 'Closed Won:\nSuccessfully converted leads\nwho completed a deal.',
      'Not Interested': 'Not Interested:\nLeads who have stated\nthey are not interested.',
      'Closed Lost': 'Closed Lost:\nLeads that have been marked\nas lost or inactive.',
      [labels.completedVisits]: labels.completedVisitsTooltip,
      [labels.scheduledVisits]: labels.scheduledVisitsTooltip,
    };
  }, [labels]);

  const handleCardClick = (label: string) => {
    const userAny = user as any
    const orgId = userAny?.organizationId || ''
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

    if (label === labels.completedVisits) {
      taskFilter.status = ['COMPLETED', 'Completed']
      taskFilter.taskType = [labels.siteVisit]
      const taskDrilldownData = {
        uid: targetUid,
        organizationId: orgId,
        taskFilter,
        leadFilter: {},
        source: isSource,
        role: roleFlag
      }
      navigate('/task-drilldown-data', { state: { taskDrilldownData, ts: Date.now() } })
    } else if (label === labels.scheduledVisits) {
      taskFilter.status = ['PENDING', 'Pending']
      taskFilter.taskType = [labels.siteVisit]
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
      if (label === 'Fresh') leadFilter.stage = ['FRESH', 'Fresh', 'fresh']
      else if (label === 'Call Back') leadFilter.stage = ['CALLBACK', 'CALL BACK', 'Call Back', 'callback', 'Call back']
      else if (label === 'Interested') leadFilter.stage = ['INTERESTED', 'Interested', 'interested']
      else if (label === 'Closed Won') leadFilter.stage = ['WON', 'CLOSED WON', 'Closed Won', 'won', 'Closed won']
      else if (label === 'Not Interested') leadFilter.stage = ['NOT INTERESTED', 'Not Interested', 'not interested', 'Not interested']
      else if (label === 'Closed Lost') leadFilter.stage = ['LOST', 'CLOSED LOST', 'Closed Lost', 'lost', 'Closed lost']

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

  // Fetch Dashboard data strictly for this organization
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      let url = `/analytics/dashboard?groupBy=${groupBy}`
      const wsId = (user as any)?.workspaceId || (user as any)?.workspace_id
      if (wsId) url += `&workspaceId=${wsId}`
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
      let configUrl = '/analytics/dashboard-config'
      const wsId = (user as any)?.workspaceId || (user as any)?.workspace_id
      if (wsId) configUrl += `?workspaceId=${wsId}`
      const res = await axiosInstance.get(configUrl)
      setDashboardConfig(res.data)
    } catch (err) {
      console.error('Failed to fetch dashboard config', err)
    }
  }

  useEffect(() => {
    void fetchDashboardData()
    void fetchDashboardConfig()
  }, [groupBy, startDate, endDate])

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setGroupBy('team')
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
      { label: labels.completedVisits, val: c.completedVisits, color: '#14B8A6', bg: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0.01) 100%)', icon: <EventAvailableIcon sx={{ fontSize: '1.4rem', color: '#14B8A6' }} /> }, // teal
      { label: labels.scheduledVisits, val: c.scheduledVisits, color: '#06B6D4', bg: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.01) 100%)', icon: <EventIcon sx={{ fontSize: '1.4rem', color: '#06B6D4' }} /> }, // cyan
    ]
  }, [data, dashboardConfig, labels])

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

      const translatedName = item.name === 'Site Visit' ? labels.siteVisit : (item.name === 'Meeting' ? labels.meeting : item.name);

      return {
        name: translatedName,
        value: item.value,
        percentage: Math.round(percentage),
        strokeDasharray,
        strokeDashoffset,
        color: colors[idx] || '#CCCCCC',
      }
    })
  }, [data?.tasks?.completedChartData, labels])

  // Download tables as CSV
  const downloadCSV = (type: string) => {
    if (!data) return
    let csvContent = 'data:text/csv;charset=utf-8,'
    let filename = 'report.csv'

    if (type === 'contacts_feedback') {
      csvContent += `S.No,Associate/Group,Total,Fresh,Call Back,Interested,Closed Won,Not Interested,Closed Lost,${labels.completedVisits},${labels.scheduledVisits}\n`
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
      csvContent += `S.No,Associate/Group,Total Completed,${labels.meeting},Call Back,${labels.siteVisit}\n`
      data.tasks.completedTasks.forEach(row => {
        csvContent += `${row.sNo},"${row.associate}",${row.total},${row.meeting},${row.callBack},${row.siteVisit}\n`
      })
      filename = 'tasks_completed_summary.csv'
    } else if (type === 'tasks_pending') {
      csvContent += `S.No,Associate/Group,Total Pending,${labels.meeting},Call Back,${labels.siteVisit}\n`
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
      const normalizedDataList = dataList.map((item: any) => ({
        name: item.name || item.associate || item.reason || item.title || 'Other',
        value: item.value !== undefined ? Number(item.value) : (item.total !== undefined ? Number(item.total) : 0),
        color: item.color
      }))

      if (w.type === 'TABLE') {
        const isWideTable = w.id === 'call_duration_table' || w.id === 'call_logs' || w.title?.toLowerCase().includes('call duration')
        return (
          <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320, gridColumn: isWideTable ? { xs: 'span 1', lg: 'span 2' } : 'auto' }}>
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

            <Box sx={{ overflowX: 'auto', width: '100%', flexGrow: 1 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 400 }}>
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
                      <td colSpan={(w.columns?.length || 0) + 1} style={{ textAlign: 'center', padding: '36px 0', color: theme.palette.text.secondary }}>
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
        const isConversion = w.id?.includes('conversion') || w.title?.toLowerCase().includes('conversion') || w.title?.toLowerCase().includes('lead status')
        const isCallback = w.id?.includes('callback') || w.title?.toLowerCase().includes('callback')
        const isCompletedTask = w.id?.includes('completed') || w.title?.toLowerCase().includes('completed')
        const isPendingTask = w.id?.includes('pending') || w.title?.toLowerCase().includes('pending')

        if (w.chart_type === 'rose' || isCompletedTask) {
          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <ThreeDRoseChart data={normalizedDataList} title={w.title} height={260} />
            </Card>
          )
        } else if (w.chart_type === 'donut' || isConversion) {
          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <ThreeDDonutChart
                data={normalizedDataList}
                title={w.title}
                height={260}
                colorPalette={isPendingTask ? 'pending' : 'conversion'}
                centerLabel={isConversion ? 'LEADS' : 'TOTAL'}
              />
            </Card>
          )
        } else if (w.chart_type === 'trend') {
          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', gridColumn: { xs: 'span 1', md: 'span 2' }, minHeight: 300 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <ThreeDAreaTrendChart data={normalizedDataList} title={w.title} height={240} />
            </Card>
          )
        } else {
          // 3D Isometric Cylinder Bar Chart with tailored theme
          const barColorTheme = isCallback ? 'sunset' : (isPendingTask ? 'amber' : 'multi')
          return (
            <Card key={w.id} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {w.title}
              </Typography>
              <ThreeDCylinderBarChart data={normalizedDataList} title={w.title} height={240} colorTheme={barColorTheme} />
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 2 }}>
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
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
            {user?.role === 'admin'
              ? 'Admin'
              : user?.role === 'leadManager'
              ? 'Lead Manager'
              : user?.role === 'teamLead'
              ? 'Team Lead'
              : user?.role === 'sales'
              ? 'Sales'
              : user?.role || 'Admin'}
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {user?.role === 'admin'
            ? 'Performance metrics and activities for your organization.'
            : user?.role === 'leadManager'
            ? 'Analytics for your assigned teams and direct reports.'
            : user?.role === 'teamLead'
            ? 'Activity and lead tracking for your team members.'
            : user?.role === 'sales'
            ? 'Your personal sales activities, calling trends, and outcomes.'
            : 'Performance metrics and activities for your organization.'}
        </Typography>
      </Box>

      {data?.showAnalytics === false ? (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '20px',
            border: '1px dashed',
            borderColor: theme.palette.divider,
            backgroundColor: isDark ? 'rgba(30,30,40,0.5)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
            mt: 3
          }}
        >
          <Box sx={{ maxWidth: 460, mx: 'auto' }}>
            <AssessmentOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Analytics Not Active
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analytics is currently not enabled for your organization. Please contact your Super Administrator to activate the analytics module.
            </Typography>
          </Box>
        </Card>
      ) : (
        <>
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
              {/* Left Controls: Grouping Selection */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
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
                  <Tab label={labels.tasksAndMeetingsTab} />
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
                          <th>{labels.completedVisits}</th>
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

                {/* 3D Cylinder Bar Chart: Lead Status Chart */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Lead Status Distribution
                  </Typography>
                  <ThreeDCylinderBarChart data={data.contacts.chartData} colorTheme="purple" height={240} />
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
                
                {/* 3D Polar Rose: Task types breakdown */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" align="left" sx={{ width: '100%', fontWeight: 700, mb: 1 }}>
                    Completed Task Types
                  </Typography>
                  <ThreeDRoseChart data={data.tasks.completedChartData} title="Tasks" height={260} />
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
                          <th>{labels.meeting}</th>
                          <th>Call Back</th>
                          <th>{labels.siteVisit}</th>
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
                          <th>{labels.meeting}</th>
                          <th>Call Back</th>
                          <th>{labels.siteVisit}</th>
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

                {/* 3D Cylinder Bar Chart: Pending Tasks Chart */}
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Pending Task Types
                  </Typography>
                  <ThreeDCylinderBarChart data={data.tasks.pendingChartData} colorTheme="amber" height={220} />
                </Card>
              </Box>
            </Stack>
          )}

          {/* ── TAB CONTENT: CALLING ANALYTICS ────────────────────────────────── */}
          {activeTab === 2 && (
            <Stack spacing={3}>
              
              {/* 3D Area Spline Trend Chart */}
              <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Calling Volume Trends
                </Typography>
                <ThreeDAreaTrendChart data={data.callLogs.callingTrends} height={240} />
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
        </>
      )}
    </Box>
  )
}
