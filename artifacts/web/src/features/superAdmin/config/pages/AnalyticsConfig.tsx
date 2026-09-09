import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import ListItemIcon from '@mui/material/ListItemIcon'
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
import Chip from '@mui/material/Chip'
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
  FeaturedPlayListOutlined as KpiIcon,
  RestartAlt as ResetIcon,
  AutoFixHigh as AutoFixHighIcon,
  ContentCopy as CopyAllIcon,
  CleaningServices as CleaningServicesIcon
} from '@mui/icons-material'

import axiosInstance from '@/services/axiosInstance'
import { useAuth } from '@/hooks/useAuth'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
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
  industry_id: string
  dashboard_key: string
  tabs: TabConfig[]
  organization_id?: string
  organizationId?: string
  workspace_id?: string
  workspaceId?: string
}

interface Industry {
  _id: string
  code: string
  name: string
}

export default function AnalyticsConfigPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const {
    industries,
    selectedIndustry: selectedIndustryId,
    setSelectedIndustry: setSelectedIndustryId,
    filteredOrgs,
    selectedOrg: selectedOrgId,
    setSelectedOrg: setSelectedOrgId
  } = useSuperAdminScope(isSuperAdmin, { allowGlobal: true })

  const [config, setConfig] = useState<AnalyticsConfig | null>(null)
  
  const [loading, setLoading] = useState(false)
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

  // Determine whether the currently loaded config is an active custom organization override
  const isOrgOverride = Boolean(
    selectedOrgId &&
    config?._id &&
    ((config.organization_id && config.organization_id === selectedOrgId) ||
     (config.organizationId && config.organizationId === selectedOrgId))
  )

  const selectedOrgDoc = filteredOrgs.find(o => o.code === selectedOrgId)
  const selectedIndustryDoc = industries.find(i => i.code === selectedIndustryId || i._id === selectedIndustryId)

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

  // Fetch configuration helper
  const fetchConfig = async () => {
    if (!selectedIndustryId) {
      setConfig(null)
      return
    }
    setLoading(true)
    try {
      let url = `/analytics/configs?industryId=${selectedIndustryId}`
      if (selectedOrgId) {
        url += `&organizationId=${selectedOrgId}`
      } else {
        url += `&organizationId=null`
      }
      const res = await axiosInstance.get(url)
      if (res.data?.items?.length > 0 && res.data.items[0].tabs?.length > 0) {
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
        // Automatically inherit/fallback to master baseline schema
        setConfig({
          industry_id: selectedIndustryId,
          industryId: selectedIndustryId,
          organization_id: selectedOrgId || undefined,
          organizationId: selectedOrgId || undefined,
          workspace_id: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          workspaceId: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          dashboard_key: 'default',
          tabs: getIndustryBaselineTabs(selectedIndustryId)
        })
      }
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to load configuration', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Load configuration when selected industry or organization changes
  useEffect(() => {
    void fetchConfig()
  }, [selectedIndustryId, selectedOrgId])

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const payload: any = {
        ...config,
        industry_id: selectedIndustryId,
        industryId: selectedIndustryId,
        organization_id: selectedOrgId || undefined,
        organizationId: selectedOrgId || undefined,
        workspace_id: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
        workspaceId: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
      }

      if (selectedOrgId) {
        // If an isolated custom override already exists in the database, update it; otherwise create a new override
        if (isOrgOverride && config._id) {
          await axiosInstance.put(`/analytics/configs/${config._id}`, payload)
        } else {
          delete payload._id
          const res = await axiosInstance.post('/analytics/configs', payload)
          setConfig(res.data)
        }
      } else {
        // Global Baseline Template Mode
        if (config._id) {
          await axiosInstance.put(`/analytics/configs/${config._id}`, payload)
        } else {
          delete payload._id
          const res = await axiosInstance.post('/analytics/configs', payload)
          setConfig(res.data)
        }
      }
      setToast({ open: true, msg: 'Layout configuration deployed successfully', sev: 'success' })
    } catch (err: any) {
      setToast({ open: true, msg: 'Failed to save configuration', sev: 'error' })
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
        industry_id: selectedIndustryId,
        industryId: selectedIndustryId,
        organization_id: selectedOrgId || undefined,
        organizationId: selectedOrgId || undefined,
        workspace_id: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
        workspaceId: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
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
    if (!selectedIndustryId) return
    setLoadingBaseline(true)
    try {
      const res = await axiosInstance.get(`/analytics/configs?industryId=${selectedIndustryId}&organizationId=null`)
      const canonicalTabs = getIndustryBaselineTabs(selectedIndustryId)
      let normalizedTabs: TabConfig[] = []
      if (res.data?.items?.length > 0 && res.data.items[0].tabs?.length >= canonicalTabs.length) {
        const fetched = res.data.items[0] as AnalyticsConfig
        normalizedTabs = (fetched.tabs || []).map(t => {
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
          industry_id: selectedIndustryId,
          industryId: selectedIndustryId,
          organization_id: selectedOrgId || undefined,
          organizationId: selectedOrgId || undefined,
          workspace_id: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          workspaceId: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          dashboard_key: 'default',
          tabs: []
        }),
        tabs: normalizedTabs
      }))
      setToast({ open: true, msg: 'Loaded industry baseline widgets into draft. Click "Deploy Configuration" to save.', sev: 'success' })
    } catch (err: any) {
      setConfig(prev => ({
        ...(prev || {
          industry_id: selectedIndustryId,
          industryId: selectedIndustryId,
          organization_id: selectedOrgId || undefined,
          organizationId: selectedOrgId || undefined,
          workspace_id: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          workspaceId: selectedOrgId ? 'ws_' + selectedOrgId : undefined,
          dashboard_key: 'default',
          tabs: []
        }),
        tabs: getIndustryBaselineTabs(selectedIndustryId)
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
        let updatedWidgets = [...(sec.widgets || [])]
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
          widgets: (sec.widgets || []).filter(w => w.id !== widgetId)
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
        const newWidgets = [...(sec.widgets || [])]
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
              Dashboard Layout Builder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Structure custom tabs, sections, KPI metrics, 3D visualizations, and table summaries across organizations.
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isOrgOverride && (
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
              disabled={!selectedIndustryId || saving || resetting}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Deploy Configuration'}
            </Button>
          </Stack>
        </Stack>

        {/* Scope Context Selection */}
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustryId}
          setSelectedIndustry={setSelectedIndustryId}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrgId}
          setSelectedOrg={setSelectedOrgId}
          allowGlobal={true}
        />

        {/* Managed Service & Multi-Tenant Isolation Status Banner */}
        {selectedIndustryId && (
          <Box sx={{ mt: 1, mb: 2 }}>
            {selectedOrgId ? (
              isOrgOverride ? (
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
                        🟣 Tenant Managed Service Override: {selectedOrgDoc?.name || selectedOrgId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        Active custom override (Workspace: <code>ws_{selectedOrgId}</code>). Changes deployed here strictly apply to this client's workspace without altering any other tenant or the master template.
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
                    borderColor: '#F59E0B',
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
                    '& .MuiAlert-icon': { color: '#F59E0B' }
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        ⚡ Inheriting Industry Baseline: {selectedOrgDoc?.name || selectedOrgId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        This client currently inherits the standard industry baseline template. Saving changes will automatically fork and create an isolated workspace layout strictly for this organization.
                      </Typography>
                    </Box>
                    <Chip size="small" label="Inheriting Baseline" color="warning" sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
                  </Stack>
                </Alert>
              )
            ) : (
              <Alert
                severity="success"
                variant="outlined"
                sx={{
                  borderRadius: '12px',
                  borderWidth: '1.5px',
                  borderColor: '#10B981',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)',
                  '& .MuiAlert-icon': { color: '#10B981' }
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                      🌐 Global Industry Baseline Template Mode: {selectedIndustryDoc?.name || selectedIndustryId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      You are configuring the master industry default template. All organizations in this industry without custom overrides will use this layout.
                    </Typography>
                  </Box>
                  <Chip size="small" label="Global Baseline Master" color="success" sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
                </Stack>
              </Alert>
            )}
          </Box>
        )}

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
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
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
                  Choose how you'd like to start building this dashboard layout:
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

                          {(sec.widgets || []).length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)', border: '1px dashed', borderColor: 'divider', borderRadius: '10px' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Empty Section. Click 'Add Widget' to place components inside.
                              </Typography>
                            </Box>
                          ) : (
                            <Grid container spacing={2}>
                              {(sec.widgets || []).map((widget, wIdx) => {
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
                                          <IconButton size="small" disabled={wIdx === (sec.widgets || []).length - 1} onClick={() => moveWidget(tab.id, sec.id, wIdx, 'down')}>
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
            This will permanently remove the custom dashboard layout for <strong>{selectedOrgDoc?.name || selectedOrgId}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
            This organization will immediately revert to inheriting the standard industry default template. This action cannot be undone.
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
