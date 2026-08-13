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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import { useTheme } from '@mui/material/styles'
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
import { useAuth } from '@/hooks/useAuth'

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
  industry_id?: string
  organization_id?: string
  organizationId?: string
  dashboard_key: string
  tabs: TabConfig[]
}

export default function AdminAnalyticsConfigPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { user } = useAuth()

  const orgId = (user as any)?.organizationId || (user as any)?.organization_id || ''
  const indId = (user as any)?.industryId || (user as any)?.industry_id || 'temp0001'

  const [config, setConfig] = useState<AnalyticsConfig | null>(null)
  const [loading, setLoading] = useState(true)
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

  // Load organization-specific layout configuration
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await axiosInstance.get('/analytics/configs')
        const items = res.data?.items || []
        
        // 1. Look for organization-specific configuration
        const orgItem = items.find((i: any) => (i.organization_id || i.organizationId) === orgId)
        // 2. Fall back to global/industry default template configuration
        const templateItem = items.find((i: any) => !i.organization_id && !i.organizationId)
        const activeItem = orgItem || templateItem

        if (activeItem) {
          const isOwnOrg = !!orgItem
          const normalizedTabs = (activeItem.tabs || []).map((t: any) => {
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
          setConfig({
            ...activeItem,
            _id: isOwnOrg ? activeItem._id : undefined,
            organization_id: orgId,
            organizationId: orgId,
            industry_id: indId,
            tabs: normalizedTabs
          })
        } else {
          // Fallback empty layout if no template found
          setConfig({
            industry_id: indId,
            organization_id: orgId,
            dashboard_key: 'default',
            tabs: []
          })
        }
      } catch (err: any) {
        setToast({ open: true, msg: 'Failed to load organization configuration', sev: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [orgId, indId])

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const payload = {
        ...config,
        industry_id: indId,
        organization_id: orgId || undefined,
        organizationId: orgId || undefined
      }

      if (config._id) {
        const res = await axiosInstance.put(`/analytics/configs/${config._id}`, payload)
        setConfig(res.data)
      } else {
        const res = await axiosInstance.post('/analytics/configs', payload)
        setConfig(res.data)
      }
      setToast({ open: true, msg: 'Organization layout saved successfully!', sev: 'success' })
    } catch (err: any) {
      setToast({ open: true, msg: err.response?.data?.message || 'Failed to save configuration', sev: 'error' })
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
        id: `sec_${Date.now()}`,
        title: '',
        is_active: true
      })
    }
    setSectionDialogOpen(true)
  }

  const handleSaveSection = () => {
    if (!config || activeTabIdForSection === null) return
    if (!sectionForm.title.trim()) return

    const updatedTabs = config.tabs.map(t => {
      if (t.id !== activeTabIdForSection) return t
      let sections = [...(t.sections || [])]
      if (editingSection) {
        sections = sections.map(s => s.id === editingSection.id ? {
          ...s,
          title: sectionForm.title,
          is_active: sectionForm.is_active
        } : s)
      } else {
        sections.push({
          id: sectionForm.id || `sec_${Date.now()}`,
          title: sectionForm.title,
          order: sections.length,
          is_active: sectionForm.is_active,
          widgets: []
        })
      }
      return { ...t, sections }
    })

    setConfig({ ...config, tabs: updatedTabs })
    setSectionDialogOpen(false)
  }

  const handleDeleteSection = (tabId: number, sectionId: string) => {
    if (!config) return
    const updatedTabs = config.tabs.map(t => {
      if (t.id !== tabId) return t
      return {
        ...t,
        sections: (t.sections || []).filter(s => s.id !== sectionId)
      }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  const toggleSectionActive = (tabId: number, sectionId: string) => {
    if (!config) return
    const updatedTabs = config.tabs.map(t => {
      if (t.id !== tabId) return t
      return {
        ...t,
        sections: (t.sections || []).map(s => s.id === sectionId ? { ...s, is_active: !s.is_active } : s)
      }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  const moveSection = (tabId: number, index: number, direction: 'up' | 'down') => {
    if (!config) return
    const updatedTabs = config.tabs.map(t => {
      if (t.id !== tabId) return t
      const sections = [...(t.sections || [])]
      const targetIdx = direction === 'up' ? index - 1 : index + 1
      if (targetIdx < 0 || targetIdx >= sections.length) return t
      const temp = sections[index]
      sections[index] = sections[targetIdx]
      sections[targetIdx] = temp
      return { ...t, sections }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  // Widget Operations
  const handleOpenWidgetDialog = (tabId: number, sectionId: string, widget?: WidgetConfig) => {
    setActiveTabIdForWidget(tabId)
    setActiveSectionIdForWidget(sectionId)
    if (widget) {
      setEditingWidget(widget)
      setWidgetForm({
        id: widget.id,
        type: widget.type,
        title: widget.title,
        color: widget.color || '',
        bg: widget.bg || '',
        icon: widget.icon || '',
        chart_type: widget.chart_type || 'donut',
        data_key: widget.data_key || '',
        columnsText: widget.columns ? widget.columns.map(c => `${c.key}:${c.label}`).join(', ') : ''
      })
    } else {
      setEditingWidget(null)
      setWidgetForm({
        id: `w_${Date.now()}`,
        type: 'KPI',
        title: '',
        color: 'primary.main',
        bg: '',
        icon: 'analytics',
        chart_type: 'donut',
        data_key: '',
        columnsText: ''
      })
    }
    setWidgetDialogOpen(true)
  }

  const handleSaveWidget = () => {
    if (!config || activeTabIdForWidget === null || !activeSectionIdForWidget) return
    if (!widgetForm.title.trim()) return

    let parsedCols: ColumnConfig[] | undefined = undefined
    if (widgetForm.type === 'TABLE' && widgetForm.columnsText.trim()) {
      parsedCols = widgetForm.columnsText.split(',').map(part => {
        const [k, v] = part.split(':')
        return { key: k?.trim() || '', label: v?.trim() || k?.trim() || '' }
      }).filter(c => c.key)
    }

    const newWidget: WidgetConfig = {
      id: widgetForm.id || `w_${Date.now()}`,
      type: widgetForm.type,
      title: widgetForm.title,
      color: widgetForm.color || undefined,
      bg: widgetForm.bg || undefined,
      icon: widgetForm.icon || undefined,
      chart_type: widgetForm.type === 'CHART' ? widgetForm.chart_type : undefined,
      data_key: widgetForm.data_key || undefined,
      columns: parsedCols
    }

    const updatedTabs = config.tabs.map(t => {
      if (t.id !== activeTabIdForWidget) return t
      const updatedSections = (t.sections || []).map(sec => {
        if (sec.id !== activeSectionIdForWidget) return sec
        let widgets = [...sec.widgets]
        if (editingWidget) {
          widgets = widgets.map(w => w.id === editingWidget.id ? newWidget : w)
        } else {
          widgets.push(newWidget)
        }
        return { ...sec, widgets }
      })
      return { ...t, sections: updatedSections }
    })

    setConfig({ ...config, tabs: updatedTabs })
    setWidgetDialogOpen(false)
  }

  const handleDeleteWidget = (tabId: number, sectionId: string, widgetId: string) => {
    if (!config) return
    const updatedTabs = config.tabs.map(t => {
      if (t.id !== tabId) return t
      const updatedSections = (t.sections || []).map(sec => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          widgets: sec.widgets.filter(w => w.id !== widgetId)
        }
      })
      return { ...t, sections: updatedSections }
    })
    setConfig({ ...config, tabs: updatedTabs })
  }

  const moveWidget = (tabId: number, sectionId: string, index: number, direction: 'up' | 'down') => {
    if (!config) return
    const updatedTabs = config.tabs.map(t => {
      if (t.id !== tabId) return t
      const updatedSections = (t.sections || []).map(sec => {
        if (sec.id !== sectionId) return sec
        const widgets = [...sec.widgets]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= widgets.length) return sec
        const temp = widgets[index]
        widgets[index] = widgets[targetIdx]
        widgets[targetIdx] = temp
        return { ...sec, widgets }
      })
      return { ...t, sections: updatedSections }
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
              Organization Analytics Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Customize and structure your organization's analytics tabs, sections, KPI cards, charts, and table summaries.
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={saveConfig}
            disabled={saving}
            sx={{ borderRadius: '12px', px: 3, py: 1.2, fontWeight: 700 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Deploy Configuration'}
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress color="secondary" size={48} />
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
                sx={{ borderRadius: '10px' }}
              >
                Add Tab
              </Button>
            </Stack>

            {config?.tabs.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: '16px' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  No dashboard tabs configured. Add a tab to customize your organization's analytics layout.
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
                    {/* Tab Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <TabIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Tab {tIdx + 1}: {tab.label}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => moveTab(tIdx, 'up')} disabled={tIdx === 0}>
                          <UpIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => moveTab(tIdx, 'down')} disabled={tIdx === (config.tabs.length - 1)}>
                          <DownIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleOpenTabDialog(tab)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteTab(tab.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    {/* Sections Container */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Sections in "{tab.label}"
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenSectionDialog(tab.id)}
                      >
                        Add Section
                      </Button>
                    </Stack>

                    {(!tab.sections || tab.sections.length === 0) ? (
                      <Box sx={{ py: 3, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                        <Typography variant="body2" color="text.secondary">
                          No sections created yet for this tab.
                        </Typography>
                      </Box>
                    ) : (
                      tab.sections.map((sec, sIdx) => (
                        <Paper
                          key={sec.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            mb: 2.5,
                            borderRadius: '16px',
                            border: '1px solid',
                            borderColor: sec.is_active ? 'divider' : 'action.disabledBackground',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                            opacity: sec.is_active ? 1 : 0.6
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <SectionIcon color="secondary" fontSize="small" />
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {sec.title}
                              </Typography>
                              {!sec.is_active && (
                                <Tooltip title="Inactive Section">
                                  <InactiveIcon color="disabled" fontSize="small" />
                                </Tooltip>
                              )}
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconButton size="small" onClick={() => moveSection(tab.id, sIdx, 'up')} disabled={sIdx === 0}>
                                <UpIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => moveSection(tab.id, sIdx, 'down')} disabled={sIdx === (tab.sections!.length - 1)}>
                                <DownIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color={sec.is_active ? 'success' : 'default'} onClick={() => toggleSectionActive(tab.id, sec.id)}>
                                {sec.is_active ? <ActiveIcon fontSize="small" /> : <InactiveIcon fontSize="small" />}
                              </IconButton>
                              <IconButton size="small" color="primary" onClick={() => handleOpenSectionDialog(tab.id, sec)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteSection(tab.id, sec.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>

                          {/* Widgets in Section */}
                          <Box sx={{ pl: 2, borderLeft: '2px dashed', borderColor: 'divider', ml: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                Widgets & Visualizations ({sec.widgets.length})
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenWidgetDialog(tab.id, sec.id)}
                              >
                                Add Widget
                              </Button>
                            </Stack>

                            {sec.widgets.length === 0 ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', py: 1 }}>
                                No widgets in this section. Click "Add Widget" to insert a KPI card, chart, or data table.
                              </Typography>
                            ) : (
                              <List disablePadding>
                                {sec.widgets.map((w, wIdx) => (
                                  <ListItem
                                    key={w.id}
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      mb: 1,
                                      borderRadius: '10px',
                                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                                      border: '1px solid',
                                      borderColor: 'divider'
                                    }}
                                  >
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mr: 2 }}>
                                      {w.type === 'KPI' && <KpiIcon color="info" fontSize="small" />}
                                      {w.type === 'CHART' && <ChartIcon color="warning" fontSize="small" />}
                                      {w.type === 'TABLE' && <TableIcon color="success" fontSize="small" />}
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        [{w.type}] {w.title}
                                      </Typography>
                                      {w.data_key && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                          ({w.data_key})
                                        </Typography>
                                      )}
                                    </Stack>

                                    <ListItemSecondaryAction>
                                      <IconButton size="small" onClick={() => moveWidget(tab.id, sec.id, wIdx, 'up')} disabled={wIdx === 0}>
                                        <UpIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton size="small" onClick={() => moveWidget(tab.id, sec.id, wIdx, 'down')} disabled={wIdx === (sec.widgets.length - 1)}>
                                        <DownIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton size="small" color="primary" onClick={() => handleOpenWidgetDialog(tab.id, sec.id, w)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton size="small" color="error" onClick={() => handleDeleteWidget(tab.id, sec.id, w.id)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            )}
                          </Box>
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

      {/* Tab CRUD Dialog */}
      <Dialog open={tabDialogOpen} onClose={() => setTabDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTab ? 'Edit Tab' : 'Add New Tab'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tab Label"
            fullWidth
            value={tabLabel}
            onChange={(e) => setTabLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTabDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTab}>Save Tab</Button>
        </DialogActions>
      </Dialog>

      {/* Section CRUD Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingSection ? 'Edit Section' : 'Add New Section'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Section Title"
              fullWidth
              value={sectionForm.title}
              onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={sectionForm.is_active}
                  onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })}
                />
              }
              label="Active Section"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSection}>Save Section</Button>
        </DialogActions>
      </Dialog>

      {/* Widget CRUD Dialog */}
      <Dialog open={widgetDialogOpen} onClose={() => setWidgetDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingWidget ? 'Edit Widget' : 'Add New Widget'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              label="Widget Type"
              value={widgetForm.type}
              onChange={(e) => setWidgetForm({ ...widgetForm, type: e.target.value as any })}
              fullWidth
            >
              <MenuItem value="KPI">KPI Summary Card</MenuItem>
              <MenuItem value="CHART">Chart / Graph</MenuItem>
              <MenuItem value="TABLE">Data Table</MenuItem>
            </TextField>

            <TextField
              label="Widget Title"
              value={widgetForm.title}
              onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })}
              fullWidth
            />

            <TextField
              label="Data Source Key"
              value={widgetForm.data_key}
              onChange={(e) => setWidgetForm({ ...widgetForm, data_key: e.target.value })}
              placeholder="e.g. cards.totalLeads, contacts.chartData, tasks.pendingTasks"
              fullWidth
            />

            {widgetForm.type === 'CHART' && (
              <TextField
                select
                label="Chart Type"
                value={widgetForm.chart_type}
                onChange={(e) => setWidgetForm({ ...widgetForm, chart_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="donut">Donut Chart</MenuItem>
                <MenuItem value="trend">Trend Line / Area</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
              </TextField>
            )}

            {widgetForm.type === 'TABLE' && (
              <TextField
                label="Columns (key:Label comma separated)"
                value={widgetForm.columnsText}
                onChange={(e) => setWidgetForm({ ...widgetForm, columnsText: e.target.value })}
                placeholder="associate:Associate/Group, total:Total, meeting:Meeting"
                fullWidth
                multiline
                rows={2}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setWidgetDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveWidget}>Save Widget</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.sev} onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
