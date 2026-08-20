import { useEffect, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import CallOutlinedIcon from '@mui/icons-material/CallOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded'
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined'
import PermContactCalendarOutlinedIcon from '@mui/icons-material/PermContactCalendarOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SortOutlinedIcon from '@mui/icons-material/SortOutlined'
import SwitchAccountOutlinedIcon from '@mui/icons-material/SwitchAccountOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined'
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined'
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

import Button from '@mui/material/Button'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { NavLink, useLocation } from 'react-router-dom'

import type { MenuIconKey } from '@/config/menuConfig'
import { useSidebarMenu } from '@/features/sidebar/hooks/useSidebarMenu'
import type { SidebarNavItem } from '@/features/sidebar/types/sidebar.types'
import { api } from '@/services/api'
import { selectAuth } from '@/features/auth/store/authSlice'
import { useAppSelector } from '@/store/hooks'

// ── Icon map ──────────────────────────────────────────────────────────────────
const iconMap: Partial<Record<MenuIconKey, typeof AppsOutlinedIcon>> = {
  account: SwitchAccountOutlinedIcon,
  analytics: AssessmentOutlinedIcon,
  api: ApiOutlinedIcon,
  billing: CreditCardOutlinedIcon,
  blog: ArticleOutlinedIcon,
  booking: ReceiptLongOutlinedIcon,
  call: CallOutlinedIcon,
  configuration: SettingsOutlinedIcon,
  contact: PermContactCalendarOutlinedIcon,
  coupon: Inventory2OutlinedIcon,
  dashboard: AppsOutlinedIcon,
  data: DataObjectOutlinedIcon,
  faq: HelpOutlineRoundedIcon,
  headers: ArticleOutlinedIcon,
  leads: Groups2OutlinedIcon,
  news: NewspaperOutlinedIcon,
  organization: BusinessOutlinedIcon,
  password: VpnKeyOutlinedIcon,
  projects: BusinessOutlinedIcon,
  resources: DataObjectOutlinedIcon,
  integrations: DataObjectOutlinedIcon,
  settings: SettingsOutlinedIcon,
  shield: ShieldOutlinedIcon,
  sidebar: MenuOpenRoundedIcon,
  sort: SortOutlinedIcon,
  support: SupportAgentOutlinedIcon,
  tasks: AssignmentOutlinedIcon,
  users: Groups2OutlinedIcon,
  whatsapp: WhatsAppIcon,
  leadDistribution: AssignmentIndOutlinedIcon,
  reassignList: ContactsOutlinedIcon,
}

function getIcon(iconKey?: MenuIconKey) {
  return iconKey ? (iconMap[iconKey] ?? AppsOutlinedIcon) : AppsOutlinedIcon
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const location = useLocation()
  const { user } = useAppSelector(selectAuth)

  const { menu, loading, error } = useSidebarMenu()

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const toggleExpand = (id: string) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  const { isTrial, isGracePeriod, daysRemaining } = useSubscription()
  const showSubscriptionBanner = (isTrial || isGracePeriod) && daysRemaining > 0

  // Expand all parents that have children by default
  useEffect(() => {
    const defaults = menu.reduce<Record<string, boolean>>((acc, it) => {
      if (it.children && it.children.length) acc[it.id] = true
      return acc
    }, {})
    setExpandedItems((prev) => ({ ...defaults, ...prev }))
  }, [menu])

  // Auto-expand parents that contain the active route
  useEffect(() => {
    menu.forEach((item) => {
      if (item.children?.some((c) => c.route === location.pathname)) {
        setExpandedItems((prev) => ({ ...prev, [item.id]: true }))
      }
    })
  }, [location.pathname, menu])

  // Close mobile drawer on navigation
  useEffect(() => { onMobileClose?.() }, [location.pathname]) // eslint-disable-line

  // ── Colours ───────────────────────────────────────────────────────────────
  const activeBg    = isDark ? 'rgba(79, 106, 245, 0.11)' : 'rgba(79, 106, 245, 0.06)'
  const activeColor = theme.palette.secondary.main

  const navItemBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    px: collapsed ? 0 : 1.25,
    py: 0.85,
    borderRadius: '10px',
    borderLeft: '3px solid transparent',
    textDecoration: 'none',
    color: theme.palette.text.secondary,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderLeft: `3px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
    },
  } as const

  const childItemSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 2,
    py: 0.65,
    borderRadius: '8px',
    textDecoration: 'none',
    color: theme.palette.text.secondary,
    fontSize: '0.8125rem',
    borderLeft: '2px solid transparent',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
    },
    '&.active': {
      color: activeColor,
      fontWeight: 700,
      backgroundColor: isDark ? 'rgba(79, 106, 245, 0.08)' : 'rgba(79, 106, 245, 0.04)',
      borderLeft: `2px solid ${activeColor}`,
    },
  } as const

  // ── Descriptions Map ───────────────────────────────────────────────────────
  const activeIndustry = String(user?.industryId || '').toLowerCase().trim();

  const getMenuDescriptions = (indCode: string): Record<string, string> => {
    // Shared keys across all industries
    const commonAdminItems: Record<string, string> = {
      'uiNavigation': 'UI & Navigation:\nManage analytics layouts, menus,\nscreens, and dynamic fields.',
      'uiNavigation.analyticsConfig': 'Analytics Layout Builder:\nCustomize performance widgets,\ncharts, and dashboard layouts.',
      'uiNavigation.menus': 'Sidebar Menus:\nConfigure active sidebar menus\nand their access roles.',
      'uiNavigation.screens': 'Screens:\nConfigure functional pages\nand screen access scopes.',
      'uiNavigation.screenFields': 'Screen Fields:\nManage dynamic form fields,\nvalidation rules, and constraints.',
      'accessControl': 'Access Control:\nManage roles, user access matrices,\nand field level permissions.',
      'accessControl.roles': 'Roles & Permissions:\nDefine roles and configure\ntheir general system access.',
      'accessControl.permissions': 'Permission Matrix:\nAdjust module and screen permissions\nacross user roles.',
      'accessControl.screenPermissions': 'Permission Fields:\nConfigure field-level view/edit permissions\nfor specific roles.',
      'invoices': 'Invoices & Billing:\nReview subscription invoices\nand charge records.',
      'invoices.paymentLogs': 'Payment Invoice Logs:\nReview historical billing\ndetails and invoices.',
      'invoices.receiptsHistory': 'Receipts History:\nAccess generated payment\nreceipts and charges.',
      'support': 'Support:\nAccess help articles,\nFAQs, and campus announcements.',
      'support.news': 'News List:\nAccess broadcast alerts,\nblogs, and announcements.',
      'support.faq': 'FAQ List:\nRead knowledge base articles\nand answers to common queries.',
      'account': 'Account & Settings:\nManage licenses, coupons,\nand security passwords.',
      'account.subscription': 'Subscription Details:\nView plan features, usage\nmetrics, and limits.',
      'account.licenses': 'License Cost:\nReview active licenses\nand cost per seat.',
      'account.coupons': 'Coupons:\nManage promotional discounts\nand subscription coupons.',
      'account.password': 'Update Password:\nChange login password\nfor security.',
      'configuration.industries': 'Industries:\nManage supported industry\nvertical configurations.',
      'configuration.holiday': 'Holidays:\nDefine non-working national\nor organization holidays.',
      'configuration.holidayConfig': 'Holidays:\nDefine non-working national\nor organization holidays.',
      'configuration.days': 'Working Days:\nAdjust office schedules,\nhours, and weekly offs.',
      'configuration.daysConfig': 'Working Days:\nAdjust office schedules,\nhours, and weekly offs.',
      'configuration.domainSettings': 'Domain Setting:\nCustomize white-label subdomain\nand portal brandings.',
      'integrations.api': 'API Token:\nGenerate secure credentials\nfor integrations.',
      'integrations.whatsapp': 'WhatsApp API:\nConfigure templates and\nactive outreach numbers.',
      'integrations.apiData': 'API Data:\nView incoming payload logs\nfrom third-party integrations.',
      'integrations.webhook': 'Webhook Integrations:\nConnect incoming hooks\nfor leads ingestion.',
    }

    if (indCode === 'temp0003') { // Healthcare
      const hcItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, patient stats,\nand clinical metrics.',
        'organization': 'Organization:\nManage hospital/clinic settings,\nprofile, and configuration.',
        'users': 'Staff & Access:\nManage medical staff, invite doctors,\nand configure clinical roles.',
        'users.list': 'Staff Members:\nAdd, edit, or deactivate\nhospital staff members.',
        'users.roles': 'Roles & Permissions:\nCustomize permission levels\nfor clinical roles.',
        'leads': 'Patients:\nManage patients, triage,\nand consulting history.',
        'leads.contacts': 'Patients List:\nStore and search patient profiles,\nhealth history, and clinical records.',
        'leads.contact': 'Patients List:\nStore and search patient profiles,\nhealth history, and clinical records.',
        'leads.tasks': 'Consultations:\nManage patient check-ups,\nconsultation slots, and doctor tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord patient phone inquiries,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord patient phone inquiries,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Patients:\nFilter and triage patients\nby priority or critical status.',
        'leads.bookings': 'Appointments List:\nTrack clinic doctor appointments\nand patient schedules.',
        'leads.booking': 'Appointments List:\nTrack clinic doctor appointments\nand patient schedules.',
        'leadDistribution': 'Patient Triaging:\nManage automated routing rules\nfor assigning patients to doctors.',
        'leadDistribution.list': 'Patient Triaging:\nAutomate rules for triaging\nnew patients to doctors/departments.',
        'leadDistribution.reassignList': 'Patient Transfers:\nManually transfer active patients\nto different doctors.',
        'configuration': 'Configuration:\nManage clinic specialties,\ndoctor schedules, and settings.',
        'configuration.projects': 'Clinical Specialties:\nDefine clinical specialties\nor medical departments.',
        'configuration.resources': 'Resource:\nMaintain medical documents,\npatient consent forms, and brochures.',
      }
      return hcItems
    }
    if (indCode === 'temp0004') { // Education
      const eduItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, student stats,\nand enrollment metrics.',
        'organization': 'Organization:\nManage campus settings,\nprofile, and configuration.',
        'users': 'Faculty & Access:\nManage counselors, invite teachers,\nand configure academic roles.',
        'users.list': 'Faculty Members:\nAdd, edit, or deactivate\ncampus faculty members.',
        'users.roles': 'Roles & Permissions:\nCustomize permission levels\nfor academic roles.',
        'leads': 'Students:\nManage students, admissions,\nand inquiry records.',
        'leads.contacts': 'Students List:\nStore and search student profiles,\nadmissions history, and records.',
        'leads.contact': 'Students List:\nStore and search student profiles,\nadmissions history, and records.',
        'leads.tasks': 'Counseling Tasks:\nManage counseling calls,\nadmission stages, and tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord student outreach calls,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord student outreach calls,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Inquiries:\nFilter and triage student inquiries\nby enrollment likelihood.',
        'leads.bookings': 'Counseling Sessions:\nTrack academic counseling sessions\nand campus tours.',
        'leads.booking': 'Counseling Sessions:\nTrack academic counseling sessions\nand campus tours.',
        'leadDistribution': 'Applicant Routing:\nManage automated routing rules\nfor assigning student inquiries.',
        'leadDistribution.list': 'Applicant Distribution:\nAutomate routing of student\ninquiries to counselors.',
        'leadDistribution.reassignList': 'Counselor Transfers:\nManually reassign active applicants\nto different counselors.',
        'configuration': 'Configuration:\nManage courses, campus schedules,\nand class settings.',
        'configuration.projects': 'Course Catalog:\nDefine academic courses\nor school study programs.',
        'configuration.resources': 'Resource:\nMaintain syllabus PDFs,\ncampUS banners, and media.',
      }
      return eduItems
    }
    if (indCode === 'temp0002') { // E-Commerce
      const ecoItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, order stats,\nand sales metrics.',
        'organization': 'Organization:\nManage warehouse settings,\nprofile, and configuration.',
        'users': 'Team & Access:\nManage agents, invite store managers,\nand configure backend roles.',
        'leads': 'Customers:\nManage customers, purchase histories,\nand shopping records.',
        'leads.contacts': 'Customers List:\nStore and search customer profiles,\norder history, and shopping records.',
        'leads.contact': 'Customers List:\nStore and search customer profiles,\norder history, and shopping records.',
        'leads.tasks': 'Customer Follow-ups:\nManage cart recovery follow-ups,\norder confirmation tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord buyer inquiry calls,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord buyer inquiry calls,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Buyers:\nFilter and triage customers\nby high-value cart status.',
        'leads.bookings': 'Support Bookings:\nTrack delivery slot bookings\nand order consultations.',
        'leads.booking': 'Support Bookings:\nTrack delivery slot bookings\nand order consultations.',
        'leadDistribution': 'Order Routing:\nManage automated routing rules\nfor allocating orders to agents.',
        'leadDistribution.list': 'Order Routing:\nAutomate rules for distributing\nnew orders to active agents.',
        'leadDistribution.reassignList': 'Order Reassignment:\nManually re-route active leads\nto different agents.',
        'configuration': 'Configuration:\nManage catalog channels,\nwarehouses, and item categories.',
        'configuration.projects': 'Product Catalog:\nDefine catalog inventory,\nproducts, and deal campaigns.',
        'configuration.resources': 'Resource:\nMaintain product catalogs,\npromotional assets, and banners.',
      }
      return ecoItems
    }
    if (indCode === 'temp0005') { // Finance
      const finItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, client stats,\nand investment metrics.',
        'organization': 'Organization:\nManage office settings,\nprofile, and configuration.',
        'users': 'Advisors & Access:\nManage advisors, invite managers,\nand configure advisor roles.',
        'leads': 'Investors:\nManage investor files, KYC records,\nand active client accounts.',
        'leads.contacts': 'Investors List:\nStore and search investor profiles,\nKYC details, and portfolio files.',
        'leads.contact': 'Investors List:\nStore and search investor profiles,\nKYC details, and portfolio files.',
        'leads.tasks': 'KYC & Advisory Tasks:\nManage investor client meetings,\nadvisory calls, and KYC tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord investor advice calls,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord investor advice calls,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Investors:\nFilter investor profiles\nby asset values/risk tier.',
        'leads.bookings': 'Client Meetings:\nTrack financial consultation slots\nand portfolio reviews.',
        'leads.booking': 'Client Meetings:\nTrack financial consultation slots\nand portfolio reviews.',
        'leadDistribution': 'Investor Matching:\nManage automated advisor allocation\nrules for new investors.',
        'leadDistribution.list': 'Client Matching:\nAutomate rules for matching\nnew investors to financial advisors.',
        'leadDistribution.reassignList': 'Advisor Reassignments:\nManually reassign active investors\nto different advisors.',
        'configuration': 'Configuration:\nManage portfolios, risk systems,\nand asset directories.',
        'configuration.projects': 'Financial Portfolios:\nDefine financial portfolios\nor asset class profiles.',
        'configuration.resources': 'Resource:\nMaintain prospectus files,\nstrategy decks, and media.',
      }
      return finItems
    }
    if (indCode === 'temp0006') { // IT Services
      const itItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, ticket stats,\nand delivery metrics.',
        'organization': 'Organization:\nManage center settings,\nprofile, and configuration.',
        'users': 'Engineers & Access:\nManage tech leads, invite members,\nand configure delivery roles.',
        'leads': 'Accounts:\nManage business client accounts,\ntech inquiries, and project records.',
        'leads.contacts': 'Accounts List:\nStore and search business accounts,\nprospect files, and client logs.',
        'leads.contact': 'Accounts List:\nStore and search business accounts,\nprospect files, and client logs.',
        'leads.tasks': 'Service Desk Tasks:\nManage tech lead assignments,\nticket resolutions, and tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord technical query calls,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord technical query calls,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Prospects:\nFilter sales pipeline accounts\nby potential deal value.',
        'leads.bookings': 'SLA Consultations:\nTrack tech discovery calls\nand delivery kickoffs.',
        'leads.booking': 'SLA Consultations:\nTrack tech discovery calls\nand delivery kickoffs.',
        'leadDistribution': 'Ticket Routing:\nManage automated routing rules\nfor IT support tickets.',
        'leadDistribution.list': 'Ticket Routing:\nAutomate rules for distributing\nnew SOWs to delivery units.',
        'leadDistribution.reassignList': 'Ticket Reassignments:\nManually re-route active tickets\nto different tech leads.',
        'configuration': 'Configuration:\nManage systems catalog, SOW lists,\nand workspace settings.',
        'configuration.projects': 'SOW Contracts:\nDefine technical SOW lines\nor service line profiles.',
        'configuration.resources': 'Resource:\nMaintain scope documents,\ndemo videos, and active lines.',
      }
      return itItems
    }
    if (indCode === 'temp0007') { // Manufacturing
      const mfgItems = {
        ...commonAdminItems,
        'analytics': 'Analytics Overview:\nView dashboards, dealer stats,\nand production metrics.',
        'organization': 'Organization:\nManage factory settings,\nprofile, and configuration.',
        'users': 'Managers & Access:\nManage plant staff, invite engineers,\nand configure industrial roles.',
        'leads': 'Dealers:\nManage dealer records, wholesale supply runs,\nand distributor accounts.',
        'leads.contacts': 'Dealers List:\nStore and search dealer records,\nsupply profiles, and business accounts.',
        'leads.contact': 'Dealers List:\nStore and search dealer records,\nsupply profiles, and business accounts.',
        'leads.tasks': 'Quality Checks:\nManage logistics scheduling,\nbatch testing, and quality tasks.',
        'leads.callLogs': 'Call Logs List:\nRecord distributor inquiry calls,\nreview status, and call durations.',
        'leads.call': 'Call Logs List:\nRecord distributor inquiry calls,\nreview status, and call durations.',
        'leads.sorted': 'Sorted Dealers:\nFilter dealer catalog lines\nby fulfillment priority.',
        'leads.bookings': 'Supply Slots:\nTrack warehouse dispatch timing\nand logistics runs.',
        'leads.booking': 'Supply Slots:\nTrack warehouse dispatch timing\nand logistics runs.',
        'leadDistribution': 'Dealer Allocation:\nManage automated dispatch rules\nfor allocating orders.',
        'leadDistribution.list': 'Dealer Allocations:\nAutomate rules for allocating\nsupply orders to distributors.',
        'leadDistribution.reassignList': 'Dealer Reallocations:\nManually reallocate supply leads\nto different managers.',
        'configuration': 'Configuration:\nManage production categories,\nruns, and factory configurations.',
        'configuration.projects': 'Production Runs:\nDefine factory production runs\nor batch run categories.',
        'configuration.resources': 'Resource:\nMaintain plant layouts,\ncompliance certificates, and files.',
      }
      return mfgItems
    }

    // Default Fallback (Real Estate / General)
    return {
      ...commonAdminItems,
      'analytics': 'Analytics Overview:\nView dashboards, lead stats,\nand performance metrics.',
      'organization': 'Organization:\nManage company settings,\nprofile, and configuration.',
      'users': 'Team & Access:\nManage users, invite members,\nand configure roles.',
      'users.list': 'Team Members:\nAdd, edit, or deactivate\nworkspace members.',
      'users.roles': 'Roles & Permissions:\nCustomize permission levels\nfor different roles.',
      'leads': 'Leads:\nManage contacts, pipelines,\nand lead follow-up lists.',
      'leads.contacts': 'Contacts List:\nStore and search lead profiles,\nattributes, and history.',
      'leads.contact': 'Contacts List:\nStore and search lead profiles,\nattributes, and history.',
      'leads.tasks': 'Tasks List:\nManage follow-up assignments,\ndeadlines, and progress.',
      'leads.callLogs': 'Call Logs List:\nRecord calls, review status,\nand call durations.',
      'leads.call': 'Call Logs List:\nRecord calls, review status,\nand call durations.',
      'leads.sorted': 'Sorted List:\nView leads sorted dynamically\nby priority score.',
      'leads.bookings': 'Bookings List:\nTrack active site visits\nand project bookings.',
      'leads.booking': 'Bookings List:\nTrack active site visits\nand project bookings.',
      'leadDistribution': 'Lead Distribution:\nManage rules for routing\nincoming leads to representatives.',
      'leadDistribution.list': 'Lead Distribution:\nAutomate rules for distributing\nnew leads to sales reps.',
      'leadDistribution.reassignList': 'Reassign List:\nManually re-route active leads\nto team members.',
      'configuration': 'Configuration:\nManage projects, holiday lists,\nand custom subdomain parameters.',
      'configuration.projects': 'Project:\nDefine target projects\nor campaigns.',
      'configuration.resources': 'Resource:\nMaintain digital assets,\ndocuments, and media.',
    }
  }

  const menuDescriptions = getMenuDescriptions(activeIndustry);

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderLeaf(item: SidebarNavItem) {
    const Icon = getIcon(item.icon)
    const description = menuDescriptions[item.id] || menuDescriptions[item.module || ''] || ''

    const content = (
      <>
        <Icon sx={{ fontSize: '1.2rem', flexShrink: 0 }} />
        {!collapsed && (
          <>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'inherit', flexGrow: 1 }}>
              {item.name}
            </Typography>
            {description && (
              <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{description}</Box>} placement="right">
                <InfoOutlinedIcon
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  sx={{
                    fontSize: '0.95rem',
                    color: theme.palette.text.disabled,
                    opacity: 0.6,
                    cursor: 'pointer',
                    '&:hover': { opacity: 1, color: theme.palette.secondary.main }
                  }}
                />
              </Tooltip>
            )}
          </>
        )}
      </>
    )

    if (item.route) {
      return (
        <Tooltip
          title={
            collapsed ? (
              <Box sx={{ p: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{item.name}</Typography>
                {description && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.75rem', opacity: 0.85 }}>
                    {description}
                  </Typography>
                )}
              </Box>
            ) : ''
          }
          placement="right"
          key={item.id}
        >
          <Box
            component={NavLink}
            to={item.route}
            end
            sx={{
              ...navItemBase,
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&.active': { color: activeColor, backgroundColor: activeBg, fontWeight: 700, borderLeft: `3px solid ${activeColor}` },
            }}
          >
            {content}
          </Box>
        </Tooltip>
      )
    }

    return (
      <Box key={item.id} sx={{ ...navItemBase, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {content}
      </Box>
    )
  }

  function renderParent(item: SidebarNavItem) {
    const Icon = getIcon(item.icon)
    const isExpanded    = expandedItems[item.id] ?? false
    const isChildActive = item.children?.some((c) => c.route === location.pathname) ?? false
    const description = menuDescriptions[item.id] || menuDescriptions[item.module || ''] || ''

    return (
      <Box key={item.id}>
        <Tooltip
          title={
            collapsed ? (
              <Box sx={{ p: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{item.name}</Typography>
                {description && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.75rem', opacity: 0.85 }}>
                    {description}
                  </Typography>
                )}
              </Box>
            ) : ''
          }
          placement="right"
        >
          <Box
            component="button"
            type="button"
            onClick={() => toggleExpand(item.id)}
            sx={{
              ...navItemBase,
              width: '100%',
              border: 'none',
              backgroundColor: isChildActive ? activeBg : 'transparent',
              color: isChildActive ? activeColor : theme.palette.text.secondary,
              borderLeft: isChildActive ? `3px solid ${activeColor}` : '3px solid transparent',
              textAlign: 'left',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <Icon sx={{ fontSize: '1.2rem', flexShrink: 0 }} />
            {!collapsed && (
              <>
                <Typography sx={{ flexGrow: 1, fontSize: '0.875rem', fontWeight: isChildActive ? 700 : 500, color: 'inherit' }}>
                  {item.name}
                </Typography>
                {description && (
                  <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{description}</Box>} placement="right">
                    <InfoOutlinedIcon
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      sx={{
                        fontSize: '0.95rem',
                        color: theme.palette.text.disabled,
                        opacity: 0.6,
                        mr: 0.5,
                        cursor: 'pointer',
                        '&:hover': { opacity: 1, color: theme.palette.secondary.main }
                      }}
                    />
                  </Tooltip>
                )}
                <ChevronRightRoundedIcon
                  sx={{
                    fontSize: '1rem',
                    flexShrink: 0,
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 180ms ease',
                  }}
                />
              </>
            )}
          </Box>
        </Tooltip>

        <Collapse in={!collapsed && isExpanded} timeout="auto" unmountOnExit>
          <Stack
            spacing={0.15}
            sx={{ mt: 0.25, ml: 1.5, pl: 1.25, borderLeft: `1.5px solid ${theme.palette.divider}` }}
          >
            {item.children?.map((child) => {
              const childDesc = menuDescriptions[child.id] || ''
              return (
                <Box key={child.id} component={NavLink} to={child.route} end sx={{ ...childItemSx, justifyContent: 'space-between', width: '100%' }}>
                  <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.8125rem', flexGrow: 1 }}>
                    {child.name}
                  </Typography>
                  {childDesc && (
                    <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{childDesc}</Box>} placement="right">
                      <InfoOutlinedIcon
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        sx={{
                          fontSize: '0.85rem',
                          color: theme.palette.text.disabled,
                          opacity: 0.5,
                          cursor: 'pointer',
                          '&:hover': { opacity: 1, color: theme.palette.secondary.main }
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
              )
            })}
          </Stack>
        </Collapse>
      </Box>
    )
  }

  return (
    <Box
      component="aside"
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? 'rgba(10, 12, 26, 0.45)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        transition: 'width 220ms ease',
      }}
    >
      {/* ── Logo row ──────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent={collapsed ? 'center' : 'space-between'}
        alignItems="center"
        sx={{
          minHeight: { xs: '3.75rem', md: '4rem' },
          px: collapsed ? 0.75 : 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Box
            component="img"
            src={isDark ? '/companylogo_white.png' : '/companylogo_dark.png'}
            alt="Leads Rubix"
            sx={{
              height: '2.25rem',
              width: 'auto',
              maxWidth: '10rem',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
        )}
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            width: '2rem',
            height: '2rem',
            color: theme.palette.text.secondary,
            display: { xs: 'none', md: 'flex' },
            '&:hover': {
              color: theme.palette.text.primary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <MenuOpenRoundedIcon
            sx={{
              fontSize: '1.125rem',
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 160ms ease',
            }}
          />
        </IconButton>
      </Stack>

      {/* ── Nav content ───────────────────────────────────────────────── */}
      <Stack
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: collapsed ? 0.5 : 1.25,
          py: 1.5,
          gap: 0.5,
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(theme.palette.text.secondary, 0.24)} transparent`,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { background: alpha(theme.palette.text.secondary, 0.22), borderRadius: 999 },
        }}
      >
        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} color="secondary" />
          </Box>
        )}

        {/* Error */}
        {!loading && error && (
          <Typography
            variant="caption"
            sx={{ color: theme.palette.error.main, px: 1, py: 2, textAlign: 'center', display: 'block' }}
          >
            {collapsed ? '!' : `Menu error: ${error}`}
          </Typography>
        )}

        {/* Empty */}
        {!loading && !error && menu.length === 0 && (
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.disabled, px: 1, py: 2, textAlign: 'center', display: 'block' }}
          >
            {collapsed ? '' : 'No menu items available.'}
          </Typography>
        )}

        {/* Menu items */}
        {!loading && menu.length > 0 && (
          <Stack spacing={0.25}>
            {menu.map((item) =>
              item.children?.length ? renderParent(item) : renderLeaf(item),
            )}
          </Stack>
        )}
      </Stack>

      {/* ── Trial Period Banner ───────────────────────────────────────── */}
      {/* ── Subscription / Trial / Grace Period Banner ────────────────── */}
      {showSubscriptionBanner && (
        <Box
          sx={{
            p: collapsed ? 1 : 1.75,
            borderTop: `1px solid ${theme.palette.divider}`,
            background: isDark 
              ? 'rgba(59, 130, 246, 0.05)' 
              : 'rgba(59, 130, 246, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: collapsed ? 'center' : 'stretch',
            flexShrink: 0,
          }}
        >
          {collapsed ? (
            <Tooltip title={`${isTrial ? 'Trial Period Active' : 'Grace Period Active'} - ${daysRemaining} days remaining. Click to Renew.`} placement="right">
              <IconButton
                component={NavLink}
                to="/account/subscription-details"
                color="primary"
                sx={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: isDark ? 'rgba(39, 41, 68, 0.25)' : 'rgba(39, 41, 68, 0.08)',
                  color: isDark ? '#b4b7db' : '#272944',
                  '&:hover': {
                    background: isDark ? 'rgba(39, 41, 68, 0.35)' : 'rgba(39, 41, 68, 0.15)',
                  }
                }}
              >
                <HourglassEmptyIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isGracePeriod ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b3e66 0%, #272944 100%)',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(39, 41, 68, 0.3)',
                  }}
                >
                  <HourglassEmptyIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box minWidth={0}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}>
                    {isTrial ? 'Trial Period Active' : 'Grace Period Active'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                  </Typography>
                </Box>
              </Stack>
              <Button
                component={NavLink}
                to="/account/subscription-details"
                variant="contained"
                size="small"
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  py: 0.5,
                  mt: 0.5,
                  borderRadius: '6px',
                  background: isGracePeriod ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b3e66 0%, #272944 100%)',
                  boxShadow: '0 2px 6px rgba(39, 41, 68, 0.25)',
                  '&:hover': {
                    background: isGracePeriod ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'linear-gradient(135deg, #2f3254 0%, #1b1d31 100%)',
                  }
                }}
              >
                Renew Subscription
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
