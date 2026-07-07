import { useEffect, useState } from 'react'

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
  const [showTrialBanner, setShowTrialBanner] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  const toggleExpand = (id: string) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))

  useEffect(() => {
    if (!user || user.role === 'superAdmin') return

    void (async () => {
      try {
        const res = await api.get(`/organizations?industryId=${user.industryId}`)
        const orgs = res.data?.items ?? []
        const org = orgs[0]
        if (org) {
          if (org.trialPeriod === true || org.trialPeriod === 'true') {
            const now = Date.now()
            const createdAt = org.createdAt ? new Date(org.createdAt).getTime() : now
            const trialDays = typeof org.trialPeriodDays === 'number' ? org.trialPeriodDays : 7
            const trialExpiry = createdAt + trialDays * 24 * 60 * 60 * 1000
            const diff = trialExpiry - now
            if (diff > 0) {
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              setTrialDaysLeft(days)
              setShowTrialBanner(true)
            } else {
              setShowTrialBanner(false)
            }
          } else {
            setShowTrialBanner(false)
          }
        }
      } catch (err) {
        console.error('[Sidebar] Failed to load trial status', err)
      }
    })()
  }, [user])

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

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderLeaf(item: SidebarNavItem) {
    const Icon = getIcon(item.icon)
    const content = (
      <>
        <Icon sx={{ fontSize: '1.2rem', flexShrink: 0 }} />
        {!collapsed && (
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'inherit' }}>
            {item.name}
          </Typography>
        )}
      </>
    )

    if (item.route) {
      return (
        <Tooltip title={collapsed ? item.name : ''} placement="right" key={item.id}>
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

    return (
      <Box key={item.id}>
        <Tooltip title={collapsed ? item.name : ''} placement="right">
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
            {item.children?.map((child) => (
              <Box key={child.id} component={NavLink} to={child.route} end sx={childItemSx}>
                <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.8125rem' }}>
                  {child.name}
                </Typography>
              </Box>
            ))}
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
      {showTrialBanner && (
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
            <Tooltip title={`Trial Period Active - ${trialDaysLeft} days remaining. Click to Renew.`} placement="right">
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
                    background: 'linear-gradient(135deg, #3b3e66 0%, #272944 100%)',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(39, 41, 68, 0.3)',
                  }}
                >
                  <HourglassEmptyIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box minWidth={0}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}>
                    Trial Period Active
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} remaining
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
                  background: 'linear-gradient(135deg, #3b3e66 0%, #272944 100%)',
                  boxShadow: '0 2px 6px rgba(39, 41, 68, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2f3254 0%, #1b1d31 100%)',
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
