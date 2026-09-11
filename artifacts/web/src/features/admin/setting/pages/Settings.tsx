import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupsIcon from '@mui/icons-material/Groups'
import LanguageIcon from '@mui/icons-material/Language'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import HubIcon from '@mui/icons-material/Hub'
import SecurityIcon from '@mui/icons-material/Security'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import NotificationsIcon from '@mui/icons-material/Notifications'
import LockIcon from '@mui/icons-material/Lock'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import DnsIcon from '@mui/icons-material/Dns'
import ShieldIcon from '@mui/icons-material/Shield'

import { AppCard } from '@/components/ui/AppCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmContext'
import { useAuth } from '@/hooks/useAuth'
import { EmailSettingsTab } from '@/features/admin/setting/components/EmailSettingsTab'

interface SettingItem {
  _id: string
  name: string
  code?: string
  key?: string
  industryId?: string
  description?: string
  isActive?: boolean
  label?: string
  value?: string
}

interface WorkingDay {
  id: string
  day: string
  closed: boolean
  opensAt: string
  closesAt: string
  notes: string
}

interface Holiday {
  id: string
  name: string
  date: string
  dayOfWeek: string
  type: 'National' | 'State' | 'Company Holiday'
  description: string
}

interface IndustryTerms {
  teamSingular: string
  teamPlural: string
  teamEmptyHint: string
  branchSingular: string
  branchPlural: string
  branchEmptyHint: string
  designationSingular: string
  designationPlural: string
  designationEmptyHint: string
}

const INDUSTRY_TERMS: Record<string, IndustryTerms> = {
  temp0001: {
    teamSingular: 'Sales Team',
    teamPlural: 'Sales Teams',
    teamEmptyHint: 'e.g., Primary Sales, NRI Desk, Luxury Projects, Team Alpha',
    branchSingular: 'Branch Office',
    branchPlural: 'Branches',
    branchEmptyHint: 'e.g., Noida Branch, Gurugram Office, Mumbai Central',
    designationSingular: 'Designation',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Sales Executive, Relationship Manager, Team Lead',
  },
  temp0002: {
    teamSingular: 'Department',
    teamPlural: 'Departments',
    teamEmptyHint: 'e.g., B2B Sales, Fulfillment, Client Support, Logistics',
    branchSingular: 'Warehouse / Hub',
    branchPlural: 'Warehouses & Hubs',
    branchEmptyHint: 'e.g., Central Warehouse, Regional Depot, West Hub',
    designationSingular: 'Designation',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Account Manager, Store Associate, Support Lead',
  },
  temp0003: {
    teamSingular: 'Medical Department',
    teamPlural: 'Departments',
    teamEmptyHint: 'e.g., Cardiology, OPD, Pediatrics, Orthopedics',
    branchSingular: 'Clinic / Center',
    branchPlural: 'Hospitals & Clinics',
    branchEmptyHint: 'e.g., City Center Clinic, Sector 62 Hospital, West Wing',
    designationSingular: 'Clinical Role',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Attending Doctor, Staff Nurse, Medical Director',
  },
  temp0004: {
    teamSingular: 'Faculty / Department',
    teamPlural: 'Academic Departments',
    teamEmptyHint: 'e.g., Admissions, Science Faculty, Humanities, Commerce',
    branchSingular: 'Campus',
    branchPlural: 'Campuses',
    branchEmptyHint: 'e.g., Main Campus, North Branch, City Campus',
    designationSingular: 'Faculty Role',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Admissions Counselor, Senior Professor, Academic Advisor',
  },
  temp0005: {
    teamSingular: 'Advisory Team',
    teamPlural: 'Advisory Teams',
    teamEmptyHint: 'e.g., Wealth Advisory, Retail Loans, Equity Desk',
    branchSingular: 'Branch Office',
    branchPlural: 'Branches & Offices',
    branchEmptyHint: 'e.g., Mumbai HQ, Connaught Place Office, Bangalore Branch',
    designationSingular: 'Financial Role',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Portfolio Manager, Wealth Advisor, Loan Officer',
  },
  temp0006: {
    teamSingular: 'Delivery Team',
    teamPlural: 'Project Teams',
    teamEmptyHint: 'e.g., Frontend Team, Backend Engineering, QA & Testing',
    branchSingular: 'Delivery Center',
    branchPlural: 'Offices & Centers',
    branchEmptyHint: 'e.g., Bangalore Tech Center, Hyderabad SEZ, Pune Office',
    designationSingular: 'Technical Role',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Tech Lead, Senior Architect, Account Executive',
  },
  temp0007: {
    teamSingular: 'Production Team',
    teamPlural: 'Plant Units',
    teamEmptyHint: 'e.g., Assembly Line, Quality Control, Maintenance',
    branchSingular: 'Plant / Factory',
    branchPlural: 'Plants & Facilities',
    branchEmptyHint: 'e.g., Manesar Plant, Bhiwadi Unit, Chakan Facility',
    designationSingular: 'Plant Role',
    designationPlural: 'Designations',
    designationEmptyHint: 'e.g., Plant Manager, Line Supervisor, Quality Auditor',
  },
}

const DEFAULT_TERMS: IndustryTerms = {
  teamSingular: 'Team',
  teamPlural: 'Teams',
  teamEmptyHint: 'e.g., Team A, Team B, Operations',
  branchSingular: 'Branch / Location',
  branchPlural: 'Branches',
  branchEmptyHint: 'e.g., Main Office, Regional Branch',
  designationSingular: 'Designation',
  designationPlural: 'Designations',
  designationEmptyHint: 'e.g., Lead Specialist, Manager, Associate',
}

type MainTab = 'parameters' | 'domain' | 'calendar' | 'notifications' | 'security'
type ParamSubTab = 'teams' | 'branches' | 'designations'
type DomainSubTab = 'web' | 'email'
type CalendarSubTab = 'days' | 'holidays'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const indCode = String(user?.industryId || (user as any)?.industry_id || '').toLowerCase().trim()
  const terms = useMemo(() => INDUSTRY_TERMS[indCode] || DEFAULT_TERMS, [indCode])

  const [mainTab, setMainTab] = useState<MainTab>('parameters')
  const [paramTab, setParamTab] = useState<ParamSubTab>('teams')
  const [domainTab, setDomainTab] = useState<DomainSubTab>('web')
  const [calendarTab, setCalendarTab] = useState<CalendarSubTab>('days')

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })
  const showToast = (msg: string, sev: 'success' | 'error' = 'success') => {
    setToast({ open: true, msg, sev })
  }
  const { confirmDelete } = useConfirm()

  // -------------------------------------------------------------
  // TAB 0: Workspace Parameters State (Teams, Branches, Designations)
  // -------------------------------------------------------------
  const [paramItems, setParamItems] = useState<SettingItem[]>([])
  const [paramLoading, setParamLoading] = useState(false)
  const [paramDialogOpen, setParamDialogOpen] = useState(false)
  const [paramEditingItem, setParamEditingItem] = useState<SettingItem | null>(null)
  const [paramName, setParamName] = useState('')
  const [paramCode, setParamCode] = useState('')
  const [paramSaving, setParamSaving] = useState(false)

  const loadParamItems = async (subTab: ParamSubTab) => {
    setParamLoading(true)
    try {
      const res = await api.get(subTab)
      const list = res.data?.items || res.data || []
      setParamItems(list)
    } catch {
      showToast('Failed to load items', 'error')
    } finally {
      setParamLoading(false)
    }
  }

  useEffect(() => {
    if (mainTab === 'parameters' && !isSuperAdmin) {
      void loadParamItems(paramTab)
    }
  }, [mainTab, paramTab, isSuperAdmin])

  const openAddParam = () => {
    setParamEditingItem(null)
    setParamName('')
    setParamCode('')
    setParamDialogOpen(true)
  }

  const openEditParam = (item: SettingItem) => {
    setParamEditingItem(item)
    setParamName(item.name || item.label || item.value || '')
    setParamCode(item.code || '')
    setParamDialogOpen(true)
  }

  const handleDeleteParam = (item: SettingItem) => {
    confirmDelete({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${item.label || item.value || item.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`${paramTab}/${item._id}`)
          showToast('Item deleted successfully')
          void loadParamItems(paramTab)
        } catch {
          showToast('Failed to delete item', 'error')
        }
      }
    })
  }

  const handleSaveParam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paramName.trim()) return
    setParamSaving(true)
    try {
      const payload = paramTab === 'designations'
        ? { name: paramName.trim() }
        : { name: paramName.trim(), code: paramCode.trim() }

      if (paramEditingItem) {
        await api.put(`${paramTab}/${paramEditingItem._id}`, payload)
        showToast('Item updated successfully')
      } else {
        await api.post(paramTab, payload)
        showToast('Item created successfully')
      }
      setParamDialogOpen(false)
      void loadParamItems(paramTab)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save item', 'error')
    } finally {
      setParamSaving(false)
    }
  }

  // -------------------------------------------------------------
  // TAB 1: Domain & Branding State
  // -------------------------------------------------------------
  const [domainForm, setDomainForm] = useState({
    subdomain: '',
    customDomain: '',
    appName: 'Leads Rubix CRM',
    logoUrl: '',
    primaryColor: '#1976d2',
  })
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null)

  const loadDomainSettings = async () => {
    let targetOrgId = resolvedOrgId || (user as any)?.organizationId || (user as any)?.organization_id
    if (!targetOrgId) {
      try {
        const subRes = await api.get('organizations/my-subscription')
        targetOrgId = subRes.data?.organizationId
      } catch { /* ignore */ }
    }
    if (!targetOrgId) return

    setDomainLoading(true)
    try {
      const res = await api.get(`organizations/${targetOrgId}`)
      const data = res.data
      setResolvedOrgId(targetOrgId)
      setDomainForm({
        subdomain: data.subdomain || '',
        customDomain: data.customDomain || data.custom_domain || '',
        appName: data.appName || data.app_name || 'Leads Rubix CRM',
        logoUrl: data.logoUrl || data.logo_url || '',
        primaryColor: data.primaryColor || data.primary_color || '#1976d2',
      })
    } catch {
      showToast('Failed to load domain settings', 'error')
    } finally {
      setDomainLoading(false)
    }
  }

  useEffect(() => {
    if (mainTab === 'domain') {
      void loadDomainSettings()
    }
  }, [mainTab])

  const saveDomainSettings = async () => {
    let targetOrgId = resolvedOrgId || (user as any)?.organizationId || (user as any)?.organization_id
    if (!targetOrgId) {
      showToast('Unable to resolve Organization ID to save domain settings', 'error')
      return
    }

    setDomainSaving(true)
    try {
      await api.put(`organizations/${targetOrgId}`, {
        subdomain: domainForm.subdomain ? domainForm.subdomain.toLowerCase().trim() : '',
        customDomain: domainForm.customDomain ? domainForm.customDomain.toLowerCase().trim() : '',
        appName: domainForm.appName,
        logoUrl: domainForm.logoUrl,
        primaryColor: domainForm.primaryColor,
      })
      showToast('Domain and workspace settings saved successfully!')
      await loadDomainSettings()
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to save domain settings', 'error')
    } finally {
      setDomainSaving(false)
    }
  }

  const copyCNAME = () => {
    const text = `Type: CNAME | Name: ${domainForm.customDomain || 'crm.yourdomain.com'} | Target: custom.leadsrubix.com`
    navigator.clipboard.writeText(text)
    showToast('DNS CNAME target copied to clipboard')
  }

  // -------------------------------------------------------------
  // TAB 2: Business Hours & Holidays State
  // -------------------------------------------------------------
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([])
  const [daysLoading, setDaysLoading] = useState(false)
  const [daysDialogOpen, setDaysDialogOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkingDay | null>(null)
  const [dayForm, setDayForm] = useState({ closed: false, opensAt: '09:00', closesAt: '18:00', notes: '' })

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    dayOfWeek: 'Monday',
    type: 'National' as Holiday['type'],
    description: '',
  })

  const loadWorkingDays = async () => {
    setDaysLoading(true)
    try {
      const res = await api.get('/working-days')
      setWorkingDays(res.data?.items || [])
    } catch {
      showToast('Failed to load working days', 'error')
    } finally {
      setDaysLoading(false)
    }
  }

  const loadHolidays = async () => {
    setHolidaysLoading(true)
    try {
      const res = await api.get('/holidays')
      setHolidays(res.data?.items || [])
    } catch {
      showToast('Failed to load holidays', 'error')
    } finally {
      setHolidaysLoading(false)
    }
  }

  useEffect(() => {
    if (mainTab === 'calendar') {
      if (calendarTab === 'days') void loadWorkingDays()
      if (calendarTab === 'holidays') void loadHolidays()
    }
  }, [mainTab, calendarTab])

  const openEditDay = (day: WorkingDay) => {
    setEditingDay(day)
    setDayForm({
      closed: day.closed,
      opensAt: day.closed ? '09:00' : day.opensAt,
      closesAt: day.closed ? '18:00' : day.closesAt,
      notes: day.notes || '',
    })
    setDaysDialogOpen(true)
  }

  const saveDay = async () => {
    if (!editingDay) return
    try {
      await api.put(`/working-days/${editingDay.id}`, dayForm)
      showToast(`${editingDay.day} business hours updated`)
      setDaysDialogOpen(false)
      void loadWorkingDays()
    } catch {
      showToast('Failed to update business hours', 'error')
    }
  }

  const openAddHoliday = () => {
    setEditingHoliday(null)
    setHolidayForm({ name: '', date: '', dayOfWeek: 'Monday', type: 'National', description: '' })
    setHolidayDialogOpen(true)
  }

  const openEditHoliday = (h: Holiday) => {
    setEditingHoliday(h)
    setHolidayForm({
      name: h.name,
      date: h.date,
      dayOfWeek: h.dayOfWeek,
      type: h.type,
      description: h.description || '',
    })
    setHolidayDialogOpen(true)
  }

  const handleHolidayDateChange = (dateVal: string) => {
    if (!dateVal) {
      setHolidayForm(f => ({ ...f, date: '', dayOfWeek: '' }))
      return
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = days[new Date(dateVal).getDay()]
    setHolidayForm(f => ({ ...f, date: dateVal, dayOfWeek: dayName }))
  }

  const saveHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      showToast('Holiday name and date are required', 'error')
      return
    }
    try {
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday.id}`, holidayForm)
        showToast('Holiday updated successfully')
      } else {
        await api.post('/holidays', holidayForm)
        showToast('Holiday created successfully')
      }
      setHolidayDialogOpen(false)
      void loadHolidays()
    } catch {
      showToast('Failed to save holiday', 'error')
    }
  }

  const deleteHoliday = (id: string, name: string) => {
    confirmDelete({
      title: 'Delete Holiday',
      message: `Are you sure you want to delete holiday "${name}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/holidays/${id}`)
          showToast('Holiday deleted successfully')
          void loadHolidays()
        } catch {
          showToast('Failed to delete holiday', 'error')
        }
      }
    })
  }

  // -------------------------------------------------------------
  // TAB 4: Security & Update Password State
  // -------------------------------------------------------------
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [showPwdCurrent, setShowPwdCurrent] = useState(false)
  const [showPwdNew, setShowPwdNew] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwdNew || !pwdConfirm) {
      showToast('Please fill in new password fields', 'error')
      return
    }
    if (pwdNew.length < 6) {
      showToast('Password must be at least 6 characters long', 'error')
      return
    }
    if (pwdNew !== pwdConfirm) {
      showToast('New passwords do not match', 'error')
      return
    }
    setPwdSaving(true)
    try {
      const userId = user?.id || (user as any)?._id
      if (!userId) throw new Error('User not identified')
      await api.put(`users/${userId}`, { password: pwdNew })
      showToast('Password updated successfully!')
      setPwdCurrent('')
      setPwdNew('')
      setPwdConfirm('')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update password', 'error')
    } finally {
      setPwdSaving(false)
    }
  }

  // SuperAdmin View
  if (isSuperAdmin) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', overflowY: 'auto' }}>
        <AppCard
          title="Global Platform Administration"
          subtitle="Enterprise governance, multi-industry template definitions, and global system configuration."
        >
          <Box sx={{ py: 3, textAlign: 'center', maxWidth: 640, mx: 'auto' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <ShieldIcon color="primary" sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Super Administrator Access Control
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              Global roles, permission matrices, sidebar configurations, and multi-industry verticals are managed in dedicated enterprise modules.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<ShieldIcon />}
                onClick={() => navigate('/access-control/roles')}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, py: 1.2, px: 3 }}
              >
                Roles & Permissions Matrix
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/organization/list')}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, py: 1.2, px: 3 }}
              >
                Manage Organizations
              </Button>
            </Stack>
          </Box>
        </AppCard>
      </Box>
    )
  }

  // Client Admin View (Unified Settings Hub)
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2.5, flexShrink: 0 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
          Workspace Settings
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Configure system parameters, custom domain mapping, business hours, notification automation, and account credentials.
        </Typography>
      </Box>

      {/* Main Unified Settings Card */}
      <AppCard fullHeight sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Main Tabs Header */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5, flexShrink: 0 }}>
          <Tabs
            value={mainTab}
            onChange={(_, val: MainTab) => setMainTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                minHeight: 46,
                px: 2,
                gap: 0.75,
              },
            }}
          >
            <Tab
              icon={<GroupsIcon sx={{ fontSize: '1.2rem !important' }} />}
              iconPosition="start"
              label="Teams & Branches"
              value="parameters"
            />
            <Tab
              icon={<LanguageIcon sx={{ fontSize: '1.2rem !important' }} />}
              iconPosition="start"
              label="Domain & Custom URL"
              value="domain"
            />
            <Tab
              icon={<CalendarMonthIcon sx={{ fontSize: '1.2rem !important' }} />}
              iconPosition="start"
              label="Business Hours & Holidays"
              value="calendar"
            />
            <Tab
              icon={<HubIcon sx={{ fontSize: '1.2rem !important' }} />}
              iconPosition="start"
              label="Notification Hub"
              value="notifications"
            />
            <Tab
              icon={<SecurityIcon sx={{ fontSize: '1.2rem !important' }} />}
              iconPosition="start"
              label="Security & Password"
              value="security"
            />
          </Tabs>
        </Box>

        {/* ========================================================================= */}
        {/* TAB 0: TEAMS, BRANCHES & DESIGNATIONS                                      */}
        {/* ========================================================================= */}
        {mainTab === 'parameters' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
              <Tabs
                value={paramTab}
                onChange={(_, val: ParamSubTab) => setParamTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: 38,
                    py: 0.5,
                  },
                }}
              >
                <Tab label={terms.teamPlural} value="teams" />
                <Tab label={terms.branchPlural} value="branches" />
                <Tab label={terms.designationPlural} value="designations" />
              </Tabs>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openAddParam}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2 }}
              >
                Add {paramTab === 'teams' ? terms.teamSingular : paramTab === 'branches' ? terms.branchSingular : terms.designationSingular}
              </Button>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {paramLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={36} />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        {paramTab !== 'designations' && <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>}
                        <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paramItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={paramTab !== 'designations' ? 3 : 2} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            {paramTab === 'teams'
                              ? `No ${terms.teamPlural.toLowerCase()} configured. Click Add to create one (${terms.teamEmptyHint}).`
                              : paramTab === 'branches'
                              ? `No ${terms.branchPlural.toLowerCase()} configured. Click Add to create one (${terms.branchEmptyHint}).`
                              : `No ${terms.designationPlural.toLowerCase()} configured. Click Add to create one (${terms.designationEmptyHint}).`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paramItems.map((item) => (
                          <TableRow key={item._id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{item.label || item.value || item.name}</TableCell>
                            {paramTab !== 'designations' && <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{item.code || '—'}</TableCell>}
                            <TableCell align="right">
                              <IconButton size="small" color="primary" onClick={() => openEditParam(item)} sx={{ mr: 0.5 }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteParam(item)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: DOMAIN & CUSTOM URL                                                */}
        {/* ========================================================================= */}
        {mainTab === 'domain' && (
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
              <Tabs value={domainTab} onChange={(_, val: DomainSubTab) => setDomainTab(val)}>
                <Tab label="Web Subdomain & Custom CNAME" value="web" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Email Sending Domain (SES / DKIM)" value="email" sx={{ textTransform: 'none', fontWeight: 600 }} />
              </Tabs>
            </Box>

            {domainTab === 'email' ? (
              <EmailSettingsTab showToast={showToast} />
            ) : domainLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={36} />
              </Box>
            ) : (
              <Stack spacing={3}>
                <Card variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DnsIcon color="primary" /> Subdomain & Custom CNAME Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Give your team and clients a personalized branded experience with dedicated URLs.
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Dedicated Subdomain"
                          value={domainForm.subdomain}
                          onChange={(e) => setDomainForm({ ...domainForm, subdomain: e.target.value })}
                          placeholder="e.g. yourcompany"
                          helperText={`Your URL: https://${domainForm.subdomain || 'yourcompany'}.leadsrubix.com`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Custom CNAME Domain"
                          value={domainForm.customDomain}
                          onChange={(e) => setDomainForm({ ...domainForm, customDomain: e.target.value })}
                          placeholder="e.g. crm.yourcompany.com"
                          helperText="Point CNAME record in your DNS provider to custom.leadsrubix.com"
                        />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        disabled={domainSaving}
                        onClick={saveDomainSettings}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        {domainSaving ? 'Saving Settings...' : 'Save Domain Settings'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={copyCNAME}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        Copy DNS Instructions
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BUSINESS HOURS & HOLIDAYS                                          */}
        {/* ========================================================================= */}
        {mainTab === 'calendar' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
              <Tabs
                value={calendarTab}
                onChange={(_, val: CalendarSubTab) => setCalendarTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: 38,
                    py: 0.5,
                  },
                }}
              >
                <Tab label="Working Days & Hours" value="days" />
                <Tab label="Holiday Calendar" value="holidays" />
              </Tabs>

              {calendarTab === 'holidays' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAddHoliday}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  Add Holiday
                </Button>
              )}
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {calendarTab === 'days' ? (
                daysLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={36} /></Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Day of Week</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Business Hours</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workingDays.map((d) => (
                          <TableRow key={d.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{d.day}</TableCell>
                            <TableCell><StatusBadge value={d.closed ? 'Closed' : 'Open'} /></TableCell>
                            <TableCell>{d.closed ? 'Closed' : `${d.opensAt} - ${d.closesAt}`}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{d.notes || '—'}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="primary" onClick={() => openEditDay(d)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              ) : (
                holidaysLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={36} /></Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Holiday Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {holidays.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                              No holidays scheduled. Click "Add Holiday" to register official off-days.
                            </TableCell>
                          </TableRow>
                        ) : (
                          holidays.map((h) => (
                            <TableRow key={h.id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{h.name}</TableCell>
                              <TableCell>{h.date ? new Date(h.date).toLocaleDateString() : '—'}</TableCell>
                              <TableCell>{h.dayOfWeek || '—'}</TableCell>
                              <TableCell><Chip label={h.type} size="small" variant="outlined" /></TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>{h.description || '—'}</TableCell>
                              <TableCell align="right">
                                <IconButton size="small" color="primary" onClick={() => openEditHoliday(h)} sx={{ mr: 0.5 }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => deleteHoliday(h.id, h.name)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}
            </Box>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NOTIFICATION HUB & AUTOMATION                                      */}
        {/* ========================================================================= */}
        {mainTab === 'notifications' && (
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HubIcon color="primary" /> Omnichannel Notification & Automation Gateway
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Universal dispatch engine for automated agent lead assignments, manager alerts, task SLA breaches, and customer updates.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/configuration/notifications')}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                  >
                    Open Notification Studio
                  </Button>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', textAlign: 'center' }}>
                      <WhatsAppIcon sx={{ fontSize: 32, color: '#25D366', mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={700}>WhatsApp Gateway</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Official WHAPI & Cloud API</Typography>
                      <Chip label="Engine Ready" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', textAlign: 'center' }}>
                      <EmailIcon sx={{ fontSize: 32, color: '#3B82F6', mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={700}>Email (SES / SMTP)</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Verified DKIM Sending</Typography>
                      <Chip label="Engine Ready" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', textAlign: 'center' }}>
                      <PhoneIphoneIcon sx={{ fontSize: 32, color: '#8B5CF6', mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={700}>Mobile Push</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Firebase Cloud Messaging</Typography>
                      <Chip label="Engine Ready" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', textAlign: 'center' }}>
                      <NotificationsIcon sx={{ fontSize: 32, color: '#F59E0B', mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={700}>In-App Bell Alerts</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Real-Time Live WebSockets</Typography>
                      <Chip label="Active" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SECURITY & CREDENTIALS                                             */}
        {/* ========================================================================= */}
        {mainTab === 'security' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Card variant="outlined" sx={{ width: '100%', maxWidth: 440, borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <SecurityIcon color="primary" /> Change Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Ensure your administrator account stays protected with a strong credentials.
                </Typography>

                <form onSubmit={handlePasswordUpdate}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type={showPwdCurrent ? 'text' : 'password'}
                      label="Current Password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPwdCurrent(!showPwdCurrent)}>
                              {showPwdCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      type={showPwdNew ? 'text' : 'password'}
                      label="New Password"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPwdNew(!showPwdNew)}>
                              {showPwdNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      type={showPwdConfirm ? 'text' : 'password'}
                      label="Confirm New Password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPwdConfirm(!showPwdConfirm)}>
                              {showPwdConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={pwdSaving}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, py: 1 }}
                    >
                      {pwdSaving ? 'Updating Password...' : 'Save New Password'}
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Box>
        )}
      </AppCard>

      {/* Param Dialog (Teams, Branches, Designations) */}
      <Dialog open={paramDialogOpen} onClose={() => !paramSaving && setParamDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveParam}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {paramEditingItem ? 'Edit' : 'Add'} {paramTab === 'teams' ? terms.teamSingular : paramTab === 'branches' ? terms.branchSingular : terms.designationSingular}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                required
                fullWidth
                size="small"
                label="Name"
                value={paramName}
                onChange={(e) => setParamName(e.target.value)}
                disabled={paramSaving}
                autoFocus
              />
              {paramTab !== 'designations' && (
                <TextField
                  fullWidth
                  size="small"
                  label="Code (Optional)"
                  value={paramCode}
                  onChange={(e) => setParamCode(e.target.value)}
                  disabled={paramSaving}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setParamDialogOpen(false)} disabled={paramSaving} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={paramSaving} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              {paramSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Day Dialog */}
      <Dialog open={daysDialogOpen} onClose={() => setDaysDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Configure {editingDay?.day}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={dayForm.closed ? 'closed' : 'open'}
              onChange={(e) => setDayForm({ ...dayForm, closed: e.target.value === 'closed' })}
            >
              <MenuItem value="open">Open (Working Day)</MenuItem>
              <MenuItem value="closed">Closed (Weekend / Off)</MenuItem>
            </TextField>
            {!dayForm.closed && (
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Opens At"
                    type="time"
                    value={dayForm.opensAt}
                    onChange={(e) => setDayForm({ ...dayForm, opensAt: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Closes At"
                    type="time"
                    value={dayForm.closesAt}
                    onChange={(e) => setDayForm({ ...dayForm, closesAt: e.target.value })}
                  />
                </Grid>
              </Grid>
            )}
            <TextField
              fullWidth
              size="small"
              label="Remarks / Notes"
              value={dayForm.notes}
              onChange={(e) => setDayForm({ ...dayForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDaysDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveDay} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Holiday Dialog */}
      <Dialog open={holidayDialogOpen} onClose={() => setHolidayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              required
              fullWidth
              size="small"
              label="Holiday Name"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              placeholder="e.g. Republic Day"
              autoFocus
            />
            <TextField
              required
              fullWidth
              size="small"
              type="date"
              label="Date"
              value={holidayForm.date}
              onChange={(e) => handleHolidayDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Category"
              value={holidayForm.type}
              onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as any })}
            >
              <MenuItem value="National">National Holiday</MenuItem>
              <MenuItem value="State">State Holiday</MenuItem>
              <MenuItem value="Company Holiday">Company Holiday</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Description (Optional)"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHolidayDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveHoliday} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none' }}>Save Holiday</Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(t => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
