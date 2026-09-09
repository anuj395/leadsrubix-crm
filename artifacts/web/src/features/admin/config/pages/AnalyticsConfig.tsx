import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import ListItemIcon from '@mui/material/ListItemIcon'
import Chip from '@mui/material/Chip'
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
import { useTheme, alpha } from '@mui/material/styles'
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
  FeaturedPlayListOutlined as KpiIcon,
  RestartAlt as ResetIcon,
  AutoFixHigh as AutoFixHighIcon,
  ContentCopy as CopyAllIcon,
  CleaningServices as CleaningServicesIcon
} from '@mui/icons-material'

import axiosInstance from '@/services/axiosInstance'
import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_BASELINE_TABS, getIndustryBaselineTabs } from '@/features/common/analyticsDefaultBaseline'

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
  const [hasCustomOverride, setHasCustomOverride] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null)
  const [loadBaselineDialogOpen, setLoadBaselineDialogOpen] = useState(false)
  const [startFreshDialogOpen, setStartFreshDialogOpen] = useState(false)
  const [loadingBaseline, setLoadingBaseline] = useState(false)
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
  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`/analytics/configs?organizationId=${orgId}&industryId=${indId}`)
      const items = res.data?.items || []
      
      // 1. Look for organization-specific configuration
      const orgItem = items.find((i: any) => (i.organization_id || i.organizationId) === orgId)
      // 2. Fall back to global/industry default template configuration
      const templateItem = items.find((i: any) => !i.organization_id && !i.organizationId)
      const activeItem = orgItem || templateItem

      setHasCustomOverride(Boolean(orgItem))

      if (activeItem && activeItem.tabs?.length > 0) {
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
        setConfig({
          industry_id: indId,
          organization_id: orgId,
          organizationId: orgId,
          dashboard_key: 'default',
          tabs: getIndustryBaselineTabs(indId)
        })
      }
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to load organization configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchConfig()
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

      if (hasCustomOverride && config._id) {
        const res = await axiosInstance.put(`/analytics/configs/${config._id}`, payload)
        setConfig(res.data)
      } else {
        delete (payload as any)._id
        const res = await axiosInstance.post('/analytics/configs', payload)
        setConfig(res.data)
      }
      setHasCustomOverride(true)
      setToast({ open: true, msg: 'Organization layout saved successfully!', sev: 'success' })
    } catch (err: any) {
      setToast({ open: true, msg: err.response?.data?.message || 'Failed to save configuration', sev: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToBaseline = async () => {
    if (!config?._id) return
    setResetting(true)
    try {
      await axiosInstance.delete(`/analytics/configs/${config._id}`)
      setToast({ open: true, msg: 'Custom override removed. Restored to industry baseline template.', sev: 'success' })
      setResetDialogOpen(false)
      await fetchConfig()
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to reset configuration', sev: 'error' })
    } finally {
      setResetting(false)
    }
  }

  const handleStartFresh = () => {
    setConfig(prev => ({
      ...(prev || {
        organization_id: orgId,
        organizationId: orgId,
        industry_id: indId,
        industryId: indId,
        workspace_id: orgId ? 'ws_' + orgId : undefined,
        workspaceId: orgId ? 'ws_' + orgId : undefined,
        dashboard_key: 'default',
        tabs: []
      }),
      tabs: [
        {
          id: 0,
          label: 'Overview',
          sections: [
            {
              id: 'sec_1',
              title: 'Main Section',
              order: 0,
              is_active: true,
              widgets: []
            }
          ]
        }
      ]
    }))
    setStartFreshDialogOpen(false)
    setPresetMenuAnchor(null)
    setToast({ open: true, msg: 'Canvas cleared. You can now build fresh from scratch.', sev: 'success' })
  }

  const handleLoadBaselineDraft = async () => {
    setLoadingBaseline(true)
    try {
      const res = await axiosInstance.get(`/analytics/configs?organizationId=null&industryId=${indId}`)
      const items = res.data?.items || []
      const templateItem = items.find((i: any) => !i.organization_id && !i.organizationId) || items[0]
      const canonicalTabs = getIndustryBaselineTabs(indId)
      let normalizedTabs: TabConfig[] = []

      if (templateItem && templateItem.tabs?.length >= canonicalTabs.length) {
        normalizedTabs = (templateItem.tabs || []).map((t: any) => {
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
      } else {
        normalizedTabs = canonicalTabs
      }

      setConfig(prev => ({
        ...(prev || {
          organization_id: orgId,
          organizationId: orgId,
          industry_id: indId,
          industryId: indId,
          workspace_id: orgId ? 'ws_' + orgId : undefined,
          workspaceId: orgId ? 'ws_' + orgId : undefined,
          dashboard_key: 'default',
          tabs: []
        }),
        tabs: normalizedTabs
      }))
      setToast({ open: true, msg: 'Loaded industry baseline widgets into draft. Click "Deploy Configuration" to save.', sev: 'success' })
    } catch (err: any) {
      setConfig(prev => ({
        ...(prev || {
          organization_id: orgId,
          organizationId: orgId,
          industry_id: indId,
          industryId: indId,
          workspace_id: orgId ? 'ws_' + orgId : undefined,
          workspaceId: orgId ? 'ws_' + orgId : undefined,
          dashboard_key: 'default',
          tabs: []
        }),
        tabs: getIndustryBaselineTabs(indId)
      }))
      setToast({ open: true, msg: 'Loaded industry baseline template into draft.', sev: 'success' })
    } finally {
      setLoadingBaseline(false)
      setLoadBaselineDialogOpen(false)
      setPresetMenuAnchor(null)
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
        let widgets = [...(sec.widgets || [])]
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
          widgets: (sec.widgets || []).filter(w => w.id !== widgetId)
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
        const widgets = [...(sec.widgets || [])]
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
              Dashboard Layout Builder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Structure custom tabs, sections, KPI metrics, 3D visualizations, and table summaries for your enterprise.
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1.5} alignItems="center">
            {hasCustomOverride && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={() => setResetDialogOpen(true)}
                disabled={saving || resetting}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
              >
                {resetting ? 'Resetting...' : 'Reset to Baseline'}
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={saveConfig}
              disabled={saving || resetting}
              sx={{ borderRadius: '10px', px: 3, fontWeight: 700, textTransform: 'none' }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Deploy Configuration'}
            </Button>
          </Stack>
        </Stack>

        {/* Multi-Tenant Status Banner */}
        <Box sx={{ mt: 1, mb: 3 }}>
          {hasCustomOverride ? (
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                borderRadius: '12px',
                borderWidth: '1.5px',
                borderColor: theme.palette.primary.main,
                backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
                '& .MuiAlert-icon': { color: theme.palette.primary.main }
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    🟣 Custom Workspace Layout Active
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    Your organization is currently running a customized dashboard layout. Any edits made here or by Super Admin support take effect directly in your workspace.
                  </Typography>
                </Box>
                <Chip size="small" label="Custom Override Active" color="primary" sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
              </Stack>
            </Alert>
          ) : (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                borderRadius: '12px',
                borderWidth: '1.5px',
                borderColor: theme.palette.warning.main,
                backgroundColor: isDark ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.warning.main, 0.04),
                '& .MuiAlert-icon': { color: theme.palette.warning.main }
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚡ Inheriting Industry Baseline
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    Your workspace is currently inheriting the standard industry baseline template. Saving any modifications will fork and create an isolated custom layout for your organization.
                  </Typography>
                </Box>
                <Chip size="small" label="Inheriting Baseline" color="warning" sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
              </Stack>
            </Alert>
          )}
        </Box>

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
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  onClick={(e) => setPresetMenuAnchor(e.currentTarget)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
                >
                  Draft Presets
                </Button>
                <Menu
                  anchorEl={presetMenuAnchor}
                  open={Boolean(presetMenuAnchor)}
                  onClose={() => setPresetMenuAnchor(null)}
                  PaperProps={{ sx: { borderRadius: '14px', minWidth: 240, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } }}
                >
                  <MenuItem onClick={() => { setPresetMenuAnchor(null); setLoadBaselineDialogOpen(true); }}>
                    <ListItemIcon>
                      <CopyAllIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Build on Baseline Default"
                      secondary="Load standard KPI & chart widgets"
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                  <MenuItem onClick={() => { setPresetMenuAnchor(null); setStartFreshDialogOpen(true); }}>
                    <ListItemIcon>
                      <CleaningServicesIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Start Fresh (Blank Canvas)"
                      secondary="Clear all widgets for a bespoke layout"
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                </Menu>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenTabDialog()}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
                >
                  Add Tab
                </Button>
              </Stack>
            </Stack>

            {config?.tabs.length === 0 ? (
              <Box sx={{ py: 6, px: 3, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: '16px', backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  No dashboard tabs added yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                  Choose how you'd like to start building your organization's analytics layout:
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CopyAllIcon />}
                    onClick={() => setLoadBaselineDialogOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3 }}
                  >
                    Build on Baseline Default
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<CleaningServicesIcon />}
                    onClick={() => setStartFreshDialogOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 3 }}
                  >
                    Start Fresh (Blank Canvas)
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenTabDialog()}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Add Blank Tab
                  </Button>
                </Stack>
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
                                Widgets & Visualizations ({(sec.widgets || []).length})
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenWidgetDialog(tab.id, sec.id)}
                              >
                                Add Widget
                              </Button>
                            </Stack>

                            {(sec.widgets || []).length === 0 ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', py: 1 }}>
                                No widgets in this section. Click "Add Widget" to insert a KPI card, chart, or data table.
                              </Typography>
                            ) : (
                              <List disablePadding>
                                {(sec.widgets || []).map((w, wIdx) => (
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
                                      <IconButton size="small" onClick={() => moveWidget(tab.id, sec.id, wIdx, 'down')} disabled={wIdx === ((sec.widgets || []).length - 1)}>
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

      {/* Reset to Baseline Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'warning.main', pb: 1 }}>
          Reset to Industry Baseline?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove your organization's custom dashboard layout.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
            Your dashboard will immediately revert to inheriting the standard industry baseline template. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResetDialogOpen(false)} disabled={resetting} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleResetToBaseline}
            variant="contained"
            color="warning"
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : <ResetIcon />}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
          >
            {resetting ? 'Resetting...' : 'Confirm Reset to Baseline'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Industry Baseline Confirmation Dialog */}
      <Dialog
        open={loadBaselineDialogOpen}
        onClose={() => !loadingBaseline && setLoadBaselineDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main', pb: 1 }}>
          Build on Baseline Default?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will pre-populate your current draft with the standard industry baseline widgets (KPI metric cards, charts, and summary tables).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
            Any unsaved layout modifications currently on the canvas will be overwritten with the baseline layout. You can tweak and customize before clicking <strong>Deploy Configuration</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLoadBaselineDialogOpen(false)} disabled={loadingBaseline} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadBaselineDraft}
            variant="contained"
            color="primary"
            disabled={loadingBaseline}
            startIcon={loadingBaseline ? <CircularProgress size={16} color="inherit" /> : <CopyAllIcon />}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
          >
            {loadingBaseline ? 'Loading...' : 'Load Baseline Layout'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Fresh / Blank Canvas Confirmation Dialog */}
      <Dialog
        open={startFreshDialogOpen}
        onClose={() => setStartFreshDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'warning.main', pb: 1 }}>
          Start Fresh with Blank Canvas?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will clear all tabs, sections, and widgets from your draft, giving you a clean slate to build a bespoke dashboard layout from scratch.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
            This only affects your current editing draft. Changes will not go live until you click <strong>Deploy Configuration</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setStartFreshDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleStartFresh}
            variant="contained"
            color="warning"
            startIcon={<CleaningServicesIcon />}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
          >
            Confirm Start Fresh
          </Button>
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
