import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import { useTheme, alpha, darken } from '@mui/material/styles'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Save as SaveIcon,
  Folder as TabIcon,
  ViewWeek as SectionIcon,
  DashboardCustomize as WidgetIcon,
  Visibility as ActiveIcon,
  VisibilityOff as InactiveIcon,
  InsertChartOutlined as ChartIcon,
  TableChartOutlined as TableIcon,
  FeaturedPlayListOutlined as KpiIcon
} from '@mui/icons-material'

import axiosInstance from '@/services/axiosInstance'

interface ColumnConfig {
  key: string
  label: string
}

interface WidgetConfig {
  id: string
  type: 'KPI' | 'CHART' | 'TABLE'
  title: string
  color?: string
  bg?: string
  icon?: string
  chart_type?: string
  data_key?: string
  columns?: ColumnConfig[]
}

interface SectionConfig {
  id: string
  title: string
  order: number
  is_active: boolean
  widgets: WidgetConfig[]
}

interface TabConfig {
  id: number
  label: string
  widgets?: WidgetConfig[]
  sections?: SectionConfig[]
}

interface AnalyticsConfig {
  _id?: string
  industry_id: string
  dashboard_key: string
  tabs: TabConfig[]
}

interface Industry {
  _id: string
  code: string
  name: string
}

export default function AnalyticsConfigPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('')
  const [config, setConfig] = useState<AnalyticsConfig | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Dialog states for Tab CRUD
  const [tabDialogOpen, setTabDialogOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<TabConfig | null>(null)
  const [tabLabel, setTabLabel] = useState('')

  // Dialog states for Section CRUD
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null)
  const [activeTabIdForSection, setActiveTabIdForSection] = useState<number | null>(null)
  const [sectionForm, setSectionForm] = useState({
    id: '',
    title: '',
    is_active: true
  })

  // Dialog states for Widget CRUD
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  const [activeTabIdForWidget, setActiveTabIdForWidget] = useState<number | null>(null)
  const [activeSectionIdForWidget, setActiveSectionIdForWidget] = useState<string | null>(null)
  
  const [widgetForm, setWidgetForm] = useState({
    id: '',
    type: 'KPI' as 'KPI' | 'CHART' | 'TABLE',
    title: '',
    color: '',
    bg: '',
    icon: '',
    chart_type: 'donut',
    data_key: '',
    columnsText: ''
  })

  // Load industries
  useEffect(() => {
    ;(async () => {
      try {
        const res = await axiosInstance.get('/industries')
        setIndustries(res.data?.items ?? [])
      } catch (err: any) {
        setToast({ open: true, msg: 'Failed to fetch industries', sev: 'error' })
      }
    })()
  }, [])

  // Load configuration when selected industry changes
  useEffect(() => {
    if (!selectedIndustryId) {
      setConfig(null)
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const res = await axiosInstance.get(`/analytics/configs?industryId=${selectedIndustryId}`)
        if (res.data?.items?.length > 0) {
          const fetched = res.data.items[0] as AnalyticsConfig
          const normalizedTabs = fetched.tabs.map(t => {
            if (!t.sections) {
              return {
                ...t,
                sections: [
                  {
                    id: 'default_section',
                    title: 'General Section',
                    order: 0,
                    is_active: true,
                    widgets: t.widgets || []
                  }
                ],
                widgets: []
              }
            }
            return t
          })
          setConfig({ ...fetched, tabs: normalizedTabs })
        } else {
          setConfig({
            industry_id: selectedIndustryId,
            dashboard_key: 'default',
            tabs: []
          })
        }
      } catch (err: any) {
        setToast({ open: true, msg: 'Failed to load configuration', sev: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedIndustryId])

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      if (config._id) {
        await axiosInstance.put(`/analytics/configs/${config._id}`, config)
      } else {
        const res = await axiosInstance.post('/analytics/configs', config)
        setConfig(res.data)
      }
      setToast({ open: true, msg: 'Layout config saved successfully', sev: 'success' })
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to save configuration', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Tab Operations
  const handleOpenTabDialog = (tab?: TabConfig) => {
    if (tab) {
      setEditingTab(tab)
      setTabLabel(tab.label)
    } else {
      setEditingTab(null)
      setTabLabel('')
    }
    setTabDialogOpen(true)
  }

  const handleSaveTab = () => {
    if (!config) return
    if (!tabLabel.trim()) return

    let updatedTabs = [...config.tabs]
    if (editingTab !== null) {
      updatedTabs = updatedTabs.map(t => t.id === editingTab.id ? { ...t, label: tabLabel } : t)
    } else {
      const nextId = updatedTabs.length > 0 ? Math.max(...updatedTabs.map(t => t.id)) + 1 : 0
      updatedTabs.push({
        id: nextId,
        label: tabLabel,
        sections: []
      })
    }

    setConfig({ ...config, tabs: updatedTabs })
    setTabDialogOpen(false)
  }

  const handleDeleteTab = (tabId: number) => {
    if (!config) return
    setConfig({
      ...config,
      tabs: config.tabs.filter(t => t.id !== tabId)
    })
  }

  const moveTab = (index: number, direction: 'up' | 'down') => {
    if (!config) return
    const newTabs = [...config.tabs]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newTabs.length) return
    const temp = newTabs[index]
    newTabs[index] = newTabs[targetIdx]
    newTabs[targetIdx] = temp
    setConfig({ ...config, tabs: newTabs })
  }

  // Section Operations
  const handleOpenSectionDialog = (tabId: number, sec?: SectionConfig) => {
    setActiveTabIdForSection(tabId)
    if (sec) {
      setEditingSection(sec)
      setSectionForm({
        id: sec.id,
        title: sec.title,
        is_active: sec.is_active
      })
    } else {
      setEditingSection(null)
      setSectionForm({
        id: '',
        title: '',
        is_active: true
      })
    }
    setSectionDialogOpen(true)
  }

  const handleSaveSection = () => {
    if (!config || activeTabIdForSection === null) return
    if (!sectionForm.id.trim() || !sectionForm.title.trim()) return

    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== activeTabIdForSection) return tab
      const currentSections = tab.sections || []
      let updatedSections = [...currentSections]

      if (editingSection !== null) {
        updatedSections = updatedSections.map(s => s.id === editingSection.id ? { ...s, title: sectionForm.title, is_active: sectionForm.is_active } : s)
      } else {
        updatedSections.push({
          id: sectionForm.id.trim(),
          title: sectionForm.title.trim(),
          order: currentSections.length,
          is_active: sectionForm.is_active,
          widgets: []
        })
      }

      return { ...tab, sections: updatedSections }
    })

    setConfig({ ...config, tabs: updatedTabs })
    setSectionDialogOpen(false)
  }

  const handleDeleteSection = (tabId: number, secId: string) => {
    if (!config) return
    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== tabId) return tab
      return {
        ...tab,
        sections: (tab.sections || []).filter(s => s.id !== secId)
      }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  const moveSection = (tabId: number, index: number, direction: 'up' | 'down') => {
    if (!config) return
    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== tabId) return tab
      const newSections = [...(tab.sections || [])]
      const targetIdx = direction === 'up' ? index - 1 : index + 1
      if (targetIdx < 0 || targetIdx >= newSections.length) return tab
      const temp = newSections[index]
      newSections[index] = newSections[targetIdx]
      newSections[targetIdx] = temp
      newSections.forEach((s, idx) => { s.order = idx })
      return { ...tab, sections: newSections }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  // Widget Operations
  const handleOpenWidgetDialog = (tabId: number, secId: string, widget?: WidgetConfig) => {
    setActiveTabIdForWidget(tabId)
    setActiveSectionIdForWidget(secId)
    if (widget) {
      setEditingWidget(widget)
      const colsStr = widget.columns?.map(c => `${c.key}:${c.label}`).join('\n') || ''
      setWidgetForm({
        id: widget.id,
        type: widget.type,
        title: widget.title,
        color: widget.color || '',
        bg: widget.bg || '',
        icon: widget.icon || '',
        chart_type: widget.chart_type || 'donut',
        data_key: widget.data_key || '',
        columnsText: colsStr
      })
    } else {
      setEditingWidget(null)
      setWidgetForm({
        id: '',
        type: 'KPI',
        title: '',
        color: '',
        bg: '',
        icon: '',
        chart_type: 'donut',
        data_key: '',
        columnsText: ''
      })
    }
    setWidgetDialogOpen(true)
  }

  const handleSaveWidget = () => {
    if (!config || activeTabIdForWidget === null || activeSectionIdForWidget === null) return
    if (!widgetForm.id.trim() || !widgetForm.title.trim()) return

    const cols: ColumnConfig[] = widgetForm.columnsText
      .split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const [k, l] = line.split(':')
        return { key: k.trim(), label: l.trim() }
      })

    const widgetPayload: WidgetConfig = {
      id: widgetForm.id.trim(),
      type: widgetForm.type,
      title: widgetForm.title.trim(),
      color: widgetForm.color.trim() || undefined,
      bg: widgetForm.bg.trim() || undefined,
      icon: widgetForm.icon.trim() || undefined,
      chart_type: widgetForm.type === 'CHART' ? widgetForm.chart_type : undefined,
      data_key: widgetForm.data_key.trim() || undefined,
      columns: widgetForm.type === 'TABLE' ? cols : undefined
    }

    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== activeTabIdForWidget) return tab
      const updatedSections = (tab.sections || []).map(sec => {
        if (sec.id !== activeSectionIdForWidget) return sec
        let updatedWidgets = [...sec.widgets]
        if (editingWidget !== null) {
          updatedWidgets = updatedWidgets.map(w => w.id === editingWidget.id ? widgetPayload : w)
        } else {
          updatedWidgets.push(widgetPayload)
        }
        return { ...sec, widgets: updatedWidgets }
      })
      return { ...tab, sections: updatedSections }
    })

    setConfig({ ...config, tabs: updatedTabs })
    setWidgetDialogOpen(false)
  }

  const handleDeleteWidget = (tabId: number, secId: string, widgetId: string) => {
    if (!config) return
    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== tabId) return tab
      const updatedSections = (tab.sections || []).map(sec => {
        if (sec.id !== secId) return sec
        return {
          ...sec,
          widgets: sec.widgets.filter(w => w.id !== widgetId)
        }
      })
      return { ...tab, sections: updatedSections }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  const moveWidget = (tabId: number, secId: string, index: number, direction: 'up' | 'down') => {
    if (!config) return
    const updatedTabs = config.tabs.map(tab => {
      if (tab.id !== tabId) return tab
      const updatedSections = (tab.sections || []).map(sec => {
        if (sec.id !== secId) return sec
        const newWidgets = [...sec.widgets]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= newWidgets.length) return sec
        const temp = newWidgets[index]
        newWidgets[index] = newWidgets[targetIdx]
        newWidgets[targetIdx] = temp
        return { ...sec, widgets: newWidgets }
      })
      return { ...tab, sections: updatedSections }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  return (
    <Box
      sx={{
        p: 4,
        height: '100%',
        overflowY: 'auto',
        backgroundColor: isDark ? 'background.default' : 'grey.50'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: '24px',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(30, 30, 45, 0.6)' : '#ffffff',
          backdropFilter: 'blur(12px)',
          boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.2)' : '0 12px 30px rgba(0,0,0,0.02)'
        }}
      >
        {/* Header Section */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Analytics Dashboard Architect
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Independently structure and configure analytics tabs, dynamic sections, charts, KPI widgets, and custom grid views.
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={saveConfig}
            disabled={!selectedIndustryId || saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Deploy Configuration'}
          </Button>
        </Stack>

        {/* Industry Selector Grid */}
        <Box
          sx={{
            p: 3,
            borderRadius: '16px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
            Scope Context Selection
          </Typography>
          <TextField
            select
            size="small"
            label="Industry Domain Template"
            value={selectedIndustryId}
            onChange={(e) => setSelectedIndustryId(e.target.value)}
            sx={{ minWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          >
            {industries.map(ind => (
              <MenuItem key={ind._id} value={ind._id}>
                {ind.name} (Code: {ind.code})
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Divider sx={{ my: 4 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress color="secondary" size={48} />
          </Box>
        ) : !selectedIndustryId ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Select a target industry domain template context above to load layout configs.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Tabs List Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Layout Tabs
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenTabDialog()}
              >
                Add Tab
              </Button>
            </Stack>

            {config?.tabs.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: '16px' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  No dashboard tabs added. Add a tab to host sections.
                </Typography>
              </Box>
            ) : (
              config?.tabs.map((tab, tIdx) => (
                <Card
                  key={tab.id}
                  sx={{
                    mb: 4,
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)'
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    
                    {/* Tab Header Controls */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <TabIcon sx={{ color: 'primary.main', fontSize: '1.75rem' }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Tab {tIdx + 1}: {tab.label}
                        </Typography>
                        <Tooltip title="Rename Tab">
                          <IconButton size="small" onClick={() => handleOpenTabDialog(tab)} color="primary">
                            <EditIcon sx={{ fontSize: '1.2rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Tab">
                          <IconButton size="small" onClick={() => handleDeleteTab(tab.id)} color="error">
                            <DeleteIcon sx={{ fontSize: '1.2rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton size="small" disabled={tIdx === 0} onClick={() => moveTab(tIdx, 'up')}>
                          <UpIcon />
                        </IconButton>
                        <IconButton size="small" disabled={tIdx === config.tabs.length - 1} onClick={() => moveTab(tIdx, 'down')}>
                          <DownIcon />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    {/* Section Header inside Tab */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        Dashboard Sections ({tab.sections?.length || 0})
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenSectionDialog(tab.id)}
                      >
                        Create Section
                      </Button>
                    </Stack>

                    {(!tab.sections || tab.sections.length === 0) ? (
                      <Box sx={{ py: 4, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)', border: '1px dashed', borderColor: 'divider', borderRadius: '12px' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No sections configured. Create a section to group related widgets.
                        </Typography>
                      </Box>
                    ) : (
                      tab.sections.map((sec, sIdx) => (
                        <Paper
                          elevation={0}
                          key={sec.id}
                          sx={{
                            mb: 3,
                            p: 3,
                            borderRadius: '16px',
                            border: '1px solid',
                            borderColor: 'divider',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : '#ffffff',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                            borderLeft: `4px solid ${sec.is_active ? theme.palette.secondary.main : theme.palette.error.main}`
                          }}
                        >
                          {/* Section Settings Header */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <SectionIcon sx={{ color: 'secondary.main', fontSize: '1.4rem' }} />
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {sec.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontFamily: 'monospace' }}>
                                [{sec.id}]
                              </Typography>
                              
                              <Tooltip title={sec.is_active ? 'Active Section' : 'Disabled Section'}>
                                {sec.is_active ? (
                                  <ActiveIcon color="success" sx={{ fontSize: '1rem', ml: 1 }} />
                                ) : (
                                  <InactiveIcon color="error" sx={{ fontSize: '1rem', ml: 1 }} />
                                )}
                              </Tooltip>

                              <IconButton size="small" onClick={() => handleOpenSectionDialog(tab.id, sec)} color="primary">
                                <EditIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteSection(tab.id, sec.id)} color="error">
                                <DeleteIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Stack>

                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" disabled={sIdx === 0} onClick={() => moveSection(tab.id, sIdx, 'up')}>
                                <UpIcon sx={{ fontSize: '1.1rem' }} />
                              </IconButton>
                              <IconButton size="small" disabled={sIdx === tab.sections!.length - 1} onClick={() => moveSection(tab.id, sIdx, 'down')}>
                                <DownIcon sx={{ fontSize: '1.1rem' }} />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Divider sx={{ mb: 2 }} />

                          {/* Widgets List Header */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Section Widgets
                            </Typography>
                            <Button
                              variant="text"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenWidgetDialog(tab.id, sec.id)}
                            >
                              Add Widget
                            </Button>
                          </Stack>

                          {sec.widgets.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)', border: '1px dashed', borderColor: 'divider', borderRadius: '10px' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Empty Section. Click 'Add Widget' to place components inside.
                              </Typography>
                            </Box>
                          ) : (
                            <Grid container spacing={2}>
                              {sec.widgets.map((widget, wIdx) => {
                                const isKpi = widget.type === 'KPI'
                                const isChart = widget.type === 'CHART'
                                
                                return (
                                  <Grid size={{ xs: 12, md: isKpi ? 4 : 6 }} key={widget.id}>
                                    <Paper
                                      variant="outlined"
                                      sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.005)',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: `4px solid ${isKpi ? (widget.color || theme.palette.secondary.main) : isChart ? theme.palette.secondary.main : theme.palette.primary.main}`,
                                        '&:hover': {
                                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.02)',
                                          borderColor: isKpi ? (widget.color || theme.palette.secondary.main) : 'divider'
                                        },
                                        transition: 'all 200ms ease'
                                      }}
                                    >
                                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                          {isKpi ? (
                                            <KpiIcon sx={{ color: widget.color || 'primary.main', fontSize: '1.2rem' }} />
                                          ) : isChart ? (
                                            <ChartIcon sx={{ color: 'secondary.main', fontSize: '1.2rem' }} />
                                          ) : (
                                            <TableIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                                          )}
                                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                            {widget.title}
                                          </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={0.25}>
                                          <IconButton size="small" disabled={wIdx === 0} onClick={() => moveWidget(tab.id, sec.id, wIdx, 'up')}>
                                            <UpIcon sx={{ fontSize: '0.85rem' }} />
                                          </IconButton>
                                          <IconButton size="small" disabled={wIdx === sec.widgets.length - 1} onClick={() => moveWidget(tab.id, sec.id, wIdx, 'down')}>
                                            <DownIcon sx={{ fontSize: '0.85rem' }} />
                                          </IconButton>
                                          <IconButton size="small" onClick={() => handleOpenWidgetDialog(tab.id, sec.id, widget)} color="primary">
                                            <EditIcon sx={{ fontSize: '0.85rem' }} />
                                          </IconButton>
                                          <IconButton size="small" onClick={() => handleDeleteWidget(tab.id, sec.id, widget.id)} color="error">
                                            <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                                          </IconButton>
                                        </Stack>
                                      </Stack>

                                      <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                                          ID: <code>{widget.id}</code>
                                        </Typography>
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
                                          Data Target: <code>{widget.data_key || '—'}</code>
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  </Grid>
                                )
                              })}
                            </Grid>
                          )}
                        </Paper>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}
      </Paper>

      {/* Tab Creator/Editor Dialog */}
      <Dialog
        open={tabDialogOpen}
        onClose={() => setTabDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingTab ? 'Rename Tab' : 'Create Tab'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Tab Display Label"
            type="text"
            fullWidth
            variant="outlined"
            value={tabLabel}
            onChange={(e) => setTabLabel(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTabDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleSaveTab} variant="contained" sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Section Creator/Editor Dialog */}
      <Dialog
        open={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingSection ? 'Modify Section Settings' : 'Create Section'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              label="Section Key ID (Unique)"
              type="text"
              fullWidth
              variant="outlined"
              value={sectionForm.id}
              onChange={(e) => setSectionForm({ ...sectionForm, id: e.target.value })}
              disabled={editingSection !== null}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              margin="dense"
              label="Section Header Title"
              type="text"
              fullWidth
              variant="outlined"
              value={sectionForm.title}
              onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={sectionForm.is_active}
                  onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })}
                />
              }
              label="Enable and Show Section"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSectionDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleSaveSection} variant="contained" sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>Save Section</Button>
        </DialogActions>
      </Dialog>

      {/* Widget Creator/Editor Dialog */}
      <Dialog
        open={widgetDialogOpen}
        onClose={() => setWidgetDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingWidget ? 'Configure Widget Properties' : 'Assemble Widget'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1.5 }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="dense"
                label="Widget Key ID"
                type="text"
                fullWidth
                variant="outlined"
                value={widgetForm.id}
                onChange={(e) => setWidgetForm({ ...widgetForm, id: e.target.value })}
                disabled={editingWidget !== null}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                margin="dense"
                label="Widget Type Classification"
                fullWidth
                variant="outlined"
                value={widgetForm.type}
                onChange={(e) => setWidgetForm({ ...widgetForm, type: e.target.value as any })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              >
                <MenuItem value="KPI">KPI Metric Card</MenuItem>
                <MenuItem value="CHART">Chart / Trend Visualizer</MenuItem>
                <MenuItem value="TABLE">Data Grid / Table View</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                margin="dense"
                label="Widget Display Title"
                type="text"
                fullWidth
                variant="outlined"
                value={widgetForm.title}
                onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="dense"
                label="Metrics Data Path Key"
                type="text"
                fullWidth
                variant="outlined"
                value={widgetForm.data_key}
                onChange={(e) => setWidgetForm({ ...widgetForm, data_key: e.target.value })}
                placeholder="e.g. cards.totalLeads"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>

            {widgetForm.type === 'KPI' && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    label="Accent Color (Hex)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={widgetForm.color}
                    onChange={(e) => setWidgetForm({ ...widgetForm, color: e.target.value })}
                    placeholder="#F43F5E"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    label="Background Color (RGBA/Hex)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={widgetForm.bg}
                    onChange={(e) => setWidgetForm({ ...widgetForm, bg: e.target.value })}
                    placeholder="rgba(244,63,94,0.06)"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    label="Icon Material Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={widgetForm.icon}
                    onChange={(e) => setWidgetForm({ ...widgetForm, icon: e.target.value })}
                    placeholder="PeopleIcon"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
              </>
            )}

            {widgetForm.type === 'CHART' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  margin="dense"
                  label="Chart Rendering Style"
                  fullWidth
                  variant="outlined"
                  value={widgetForm.chart_type}
                  onChange={(e) => setWidgetForm({ ...widgetForm, chart_type: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                >
                  <MenuItem value="donut">Donut Chart</MenuItem>
                  <MenuItem value="trend">Trend Line Chart</MenuItem>
                </TextField>
              </Grid>
            )}

            {widgetForm.type === 'TABLE' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  margin="dense"
                  label="Table Columns Definition"
                  type="text"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={widgetForm.columnsText}
                  onChange={(e) => setWidgetForm({ ...widgetForm, columnsText: e.target.value })}
                  placeholder="key:Column Label (one per line)&#10;associate:Associate&#10;total:Total Leads"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setWidgetDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleSaveWidget} variant="contained" sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>Save Widget</Button>
        </DialogActions>
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
