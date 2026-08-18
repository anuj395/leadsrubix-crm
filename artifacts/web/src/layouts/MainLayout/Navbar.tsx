import { useState, useEffect, type MouseEvent } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
    loadNotifications,
    loadUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    selectNotifications,
    selectUnreadCount,
    selectNotificationsStatus,
    selectNotificationsError
} from '@/features/notifications/store/notificationSlice'
import type { NotificationItem } from '@/features/notifications/types/notification.types'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import InputOutlinedIcon from '@mui/icons-material/InputOutlined'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { useLocation, useNavigate } from 'react-router-dom'
import { useThemeMode } from '@/app/providers'
import { roleConfig } from '@/config/roleConfig'
import { useAuth } from '@/hooks/useAuth'
import { paths } from '@/routes/paths'

const breadcrumbMap: Record<string, string[]> = {
    '/': ['Home', 'Analytics', 'Overview'],
    '/analytics': ['Home', 'Analytics'],
    '/organization/list': ['Home', 'Organizations'],
    '/organization/new': ['Home', 'Organizations', 'Add Organization'],
    '/users': ['Home', 'Users'],
    '/users/new': ['Home', 'Users', 'Add User'],
    '/leads/contacts': ['Home', 'Leads', 'Contact List'],
    '/leads/contacts/new': ['Home', 'Leads', "Contacts List", 'Add Contact'],
    '/leads/tasks': ['Home', 'Leads', 'Task List'],
    '/leads/tasks/new': ['Home', 'Leads', "Task List", 'Add Task'],
    '/leads/call-logs': ['Home', 'Leads', 'Call Logs'],
    '/leads/bookings': ['Home', 'Leads', 'Bookings'],
    '/configuration/projects': ['Home', 'Configuration', 'Projects'],
    '/configuration/projects/new': ['Home', 'Configuration', 'Projects', 'Create Project'],
    '/configuration/api': ['Home', 'Configuration', 'API'],
    '/configuration/api/new': ['Home', 'Configuration', 'API', 'Create API Connection'],
    '/configuration/booking-form': ['Home', 'Configuration', 'Booking Form'],
    '/configuration/whatsapp': ['Home', 'Configuration', 'WhatsApp API'],
    '/integrations/whatsapp': ['Home', 'Integrations', 'WhatsApp API'],
    '/configuration/holiday-config': ['Home', 'Configuration', 'Holiday Config'],
    '/configuration/holiday-config/new': ['Home', 'Configuration', 'Holiday Config', 'Create Holiday'],
    '/configuration/days-config': ['Home', 'Configuration', 'Days Config'],
    '/configuration/domain-settings': ['Home', 'Configuration', 'Domain Setting'],
    '/configuration/analytics-config': ['Home', 'UI & Navigation', 'Analytics Layout Builder'],
    '/configuration/menus': ['Home', 'UI & Navigation', 'Sidebar Menus'],
    '/configuration/screens': ['Home', 'UI & Navigation', 'Screens'],
    '/configuration/screen-fields': ['Home', 'UI & Navigation', 'Screen Fields'],
    '/ui-navigation/analytics-config': ['Home', 'UI & Navigation', 'Analytics Layout Builder'],
    '/ui-navigation/menus': ['Home', 'UI & Navigation', 'Sidebar Menus'],
    '/ui-navigation/screens': ['Home', 'UI & Navigation', 'Screens'],
    '/ui-navigation/screen-fields': ['Home', 'UI & Navigation', 'Screen Fields'],

    '/support/news': ['Home', 'Support', 'News'],
    '/support/faq': ['Home', 'Support', 'FAQ'],
    '/account/subscription-details': ['Home', 'Account', 'Subscription Details'],
    '/account/payment-invoices': ['Home', 'Account', 'Invoices', 'Payment Invoice Logs'],
    '/account/receipts-history': ['Home', 'Account', 'Invoices', 'Receipts & Historical Charges'],
    '/invoices/payment-invoices': ['Home', 'Invoices', 'Payment Invoice Logs'],
    '/invoices/receipts-history': ['Home', 'Invoices', 'Receipts & Historical Charges'],
    '/account/update-password': ['Home', 'Account', 'Update Password'],
    '/users/roles': ['Home', 'Access Control', 'Roles & Permissions'],
    '/configuration/permissions': ['Home', 'Access Control', 'Permission Matrix (Sidebar)'],
    '/configuration/screen-permissions': ['Home', 'Access Control', 'Permission Fields'],
    '/access-control/roles': ['Home', 'Access Control', 'Roles & Permissions'],
    '/access-control/permissions': ['Home', 'Access Control', 'Permission Matrix (Sidebar)'],
    '/access-control/screen-permissions': ['Home', 'Access Control', 'Permission Fields'],
    '/integrations': ['Home', 'Integrations'],
    '/integrations/api': ['Home', 'Integrations', 'API'],
    '/integrations/api-data': ['Home', 'Integrations', 'API Data'],
    '/integrations/facebook': ['Home', 'Integrations', 'Facebook'],
    '/integrations/99acres': ['Home', 'Integrations', '99Acres'],
    '/integrations/magicbricks': ['Home', 'Integrations', 'MagicBricks'],
    '/integrations/justdial': ['Home', 'Integrations', 'JustDial'],
    '/integrations/sulekha': ['Home', 'Integrations', 'Sulekha'],
    '/integrations/website': ['Home', 'Integrations', 'Website'],
    '/integrations/housing': ['Home', 'Integrations', 'Housing.com'],
    '/lead-distribution/list': ['Home', 'Lead Distribution', 'Lead Distribution List'],
    '/lead-distribution/logic': ['Home', 'Lead Distribution', 'Lead Distribution Logic'],
    '/reassign/list': ['Home', 'Lead Distribution', 'Reassign List'],
    '/reassign/logic': ['Home', 'Lead Distribution', 'Reassign Logic'],
}

function formatRelativeTime(dateString: string): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHr / 24)

    if (diffSec < 60) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface NavbarProps {
    onMobileMenuOpen?: () => void
}

export function Navbar({ onMobileMenuOpen }: NavbarProps) {
    const theme = useTheme()
    const location = useLocation()
    const { mode, toggleMode } = useThemeMode()
    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null)
    const [isRotating, setIsRotating] = useState(false)

    const dispatch = useAppDispatch()
    const notifications = useAppSelector(selectNotifications)
    const unreadCount = useAppSelector(selectUnreadCount)
    const status = useAppSelector(selectNotificationsStatus)
    const error = useAppSelector(selectNotificationsError)

    const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null)

    useEffect(() => {
        let interval: any
        if (user) {
            dispatch(loadUnreadCount())
            dispatch(loadNotifications())
            interval = setInterval(() => {
                dispatch(loadUnreadCount())
            }, 30000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [dispatch, user])

    const handleNotificationsToggle = (event: MouseEvent<HTMLElement>) => {
        setNotificationsAnchor((current) => {
            if (current) {
                return null;
            } else {
                dispatch(loadNotifications());
                dispatch(loadUnreadCount());
                return event.currentTarget;
            }
        })
    }

    const handleCloseNotifications = () => {
        setNotificationsAnchor(null)
    }

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsRead())
    }

    const handleRetryFetch = () => {
        dispatch(loadNotifications())
    }

    const handleNotificationClick = (item: NotificationItem) => {
        dispatch(markNotificationRead(item._id || item.id))
        setNotificationsAnchor(null)
        if (item.related_id) {
            if (item.type === 'LEAD_ASSIGNED' || item.type === 'LEAD_TRANSFERRED') {
                navigate(`/leads/contacts/${item.related_id}/edit`)
            } else if (item.type === 'TASK_ASSIGNED') {
                navigate('/leads/tasks')
            }
        }
    }

    const handleThemeToggle = () => {
        setIsRotating(true)
        toggleMode()
        setTimeout(() => setIsRotating(false), 500)
    }

    let resolvedBreadcrumbs = breadcrumbMap[location.pathname]
    if (!resolvedBreadcrumbs) {
        if (location.pathname.startsWith('/leads/contacts/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Leads', 'Contact List', 'Edit Contact']
        } else if (location.pathname.startsWith('/configuration/holiday-config/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Configuration', 'Holiday Config', 'Edit Holiday']
        } else if (location.pathname.startsWith('/users/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Users', 'Edit User']
        } else if (location.pathname.startsWith('/organization/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Organizations', 'Edit Organization']
        } else if (location.pathname.startsWith('/configuration/projects/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Configuration', 'Edit Project']
        } else if (location.pathname.startsWith('/configuration/api/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Configuration', 'Edit API']
        }
    }
    const breadcrumbs = resolvedBreadcrumbs ?? ['Home', 'Overview']
    const initials =
        user?.name
            ?.split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? 'GU'
    const isProfileMenuOpen = Boolean(profileAnchor)
    const profileMenuLabelSx = {
        fontFamily: theme.typography.fontFamily,
        color: theme.palette.text.primary,
        fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
        fontWeight: 400,
        lineHeight: 1.2,
    } as const

    // Icon button style — with proper mobile touch targets
    const iconBtnSx = {
        width: { xs: '2.5rem', md: '2.25rem' },
        height: { xs: '2.5rem', md: '2.25rem' },
        minWidth: { xs: 44, md: 36 },
        minHeight: { xs: 44, md: 36 },
        borderRadius: '10px',
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
        transition: 'all 160ms ease',
        '&:hover': {
            borderColor: theme.palette.secondary.main,
            backgroundColor: alpha(theme.palette.secondary.main, 0.06),
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'scale(0.95)',
        },
        '@media (hover: none)': {
            '&:hover': { transform: 'none' },
        },
    } as const

    const handleProfileToggle = (event: MouseEvent<HTMLElement>) => {
        setProfileAnchor((current) => (current ? null : event.currentTarget))
    }

    const handleCloseProfileMenu = () => {
        setProfileAnchor(null)
    }

    return (
        <>
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    flexShrink: 0,
                    minHeight: { xs: '3.5rem', sm: '3.75rem', md: '4rem' },
                    px: { xs: 1, sm: 1.75, md: 3.5 },
                    py: { xs: 0.5, md: 1 },
                    background: theme.palette.mode === 'dark' ? 'rgba(10, 12, 26, 0.45)' : 'rgba(255, 255, 255, 0.55)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    gap: { xs: 0.75, md: 2 },
                    // Prevent overflow
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: '100%',
                }}
            >
                {/* Left: hamburger (mobile) + breadcrumbs */}
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={{ xs: 0.5, sm: 1 }}
                    sx={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}
                >
                    {/* Hamburger — mobile only */}
                    <Tooltip title="Toggle Navigation Menu">
                        <IconButton
                            onClick={onMobileMenuOpen}
                            sx={{
                                display: { xs: 'flex', md: 'none' },
                                ...iconBtnSx,
                                flexShrink: 0,
                            }}
                            aria-label="Open navigation menu"
                        >
                            <MenuRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* Breadcrumbs — hidden on xs, visible on sm+ */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                            minWidth: 0,
                            overflow: 'hidden',
                            display: { xs: 'none', sm: 'flex' },
                            flex: '1 1 auto',
                        }}
                    >
                        {breadcrumbs.map((crumb, index) => (
                            <Stack
                                key={crumb}
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{
                                    minWidth: 0,
                                    flexShrink: index === breadcrumbs.length - 1 ? 1 : 0,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                                        fontSize: 'clamp(0.75rem, 1.8vw, 0.8125rem)',
                                        color:
                                            index === breadcrumbs.length - 1
                                                ? theme.palette.text.primary
                                                : theme.palette.text.secondary,
                                        whiteSpace: 'nowrap',
                                        overflow: index === breadcrumbs.length - 1 ? 'hidden' : 'visible',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {crumb}
                                </Typography>
                                {index < breadcrumbs.length - 1 ? (
                                    <ChevronRightRoundedIcon
                                        sx={{ color: theme.palette.text.secondary, fontSize: 15, flexShrink: 0 }}
                                    />
                                ) : null}
                            </Stack>
                        ))}
                    </Stack>

                    {/* Mobile: show current page title */}
                    <Typography
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: theme.palette.text.primary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                        }}
                    >
                        {breadcrumbs[breadcrumbs.length - 1]}
                    </Typography>
                </Stack>

                {/* Right: search + actions */}
                <Stack
                    direction="row"
                    spacing={{ xs: 0.5, sm: 1 }}
                    alignItems="center"
                    sx={{ flexShrink: 0 }}
                >
                    {/* Search bar — hidden on mobile, visible on sm+ */}
                    <Tooltip title="Search leads, tasks, and configurations (⌘K)" placement="bottom">
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{
                                display: { xs: 'none', sm: 'flex' },
                                width: { sm: '10rem', md: '14rem', lg: '18rem' },
                                px: 1.25,
                                py: 0.5,
                                borderRadius: '10px',
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,17,23,0.08)'}`,
                                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:focus-within': {
                                    borderColor: theme.palette.secondary.main,
                                    boxShadow: `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.16)}`,
                                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
                                },
                            }}
                        >
                            <SearchRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: 17, flexShrink: 0 }} />
                            <InputBase
                                placeholder="Search…"
                                sx={{
                                    flexGrow: 1,
                                    minWidth: 0,
                                    fontSize: '0.8125rem',
                                    color: theme.palette.text.primary,
                                    '& input::placeholder': {
                                        color: theme.palette.text.secondary,
                                        opacity: 1,
                                    },
                                }}
                            />
                            <Typography
                                sx={{
                                    display: { sm: 'none', lg: 'block' },
                                    color: alpha(theme.palette.text.secondary, 0.55),
                                    fontWeight: 500,
                                    fontSize: '0.6875rem',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                ⌘K
                            </Typography>
                        </Stack>
                    </Tooltip>

                    {/* Dark mode toggle */}
                    <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} placement="bottom">
                        <IconButton onClick={handleThemeToggle} sx={{
                            ...iconBtnSx,
                            '& svg': {
                                transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isRotating ? 'rotate(360deg)' : 'none'
                            }
                        }} aria-label="Toggle color mode">
                            {mode === 'dark'
                                ? <LightModeOutlinedIcon fontSize="small" />
                                : <DarkModeOutlinedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>

                    {/* Notifications */}
                    <Tooltip title="View Notifications" placement="bottom">
                        <IconButton
                            onClick={handleNotificationsToggle}
                            sx={{
                                ...iconBtnSx,
                                backgroundColor: Boolean(notificationsAnchor) ? alpha(theme.palette.secondary.main, 0.08) : theme.palette.background.default,
                                borderColor: Boolean(notificationsAnchor) ? theme.palette.secondary.main : theme.palette.divider,
                            }}
                            aria-label="Notifications"
                        >
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                <NotificationsNoneRoundedIcon fontSize="small" />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Popover
                        id="navbar-notifications-popover"
                        open={Boolean(notificationsAnchor)}
                        anchorEl={notificationsAnchor}
                        onClose={handleCloseNotifications}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    width: 360,
                                    maxHeight: 480,
                                    mt: 1.5,
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                                    border: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }
                            }
                        }}
                    >
                        {/* Popover Header */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Notifications
                            </Typography>
                            {unreadCount > 0 && (
                                <ButtonBase
                                    onClick={handleMarkAllRead}
                                    sx={{
                                        color: theme.palette.primary.main,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        px: 1,
                                        py: 0.5,
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}
                                >
                                    Mark all as read
                                </ButtonBase>
                            )}
                        </Stack>

                        <Divider />

                        {/* Popover Content */}
                        <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
                            {status === 'loading' && notifications.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ py: 6, gap: 1 }}>
                                    <CircularProgress size={24} color="secondary" />
                                    <Typography variant="body2" color="text.secondary">
                                        Loading notifications...
                                    </Typography>
                                </Stack>
                            ) : status === 'failed' ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ py: 4, px: 2, gap: 1 }}>
                                    <Typography variant="body2" color="error" textAlign="center">
                                        {error || 'Failed to load notifications'}
                                    </Typography>
                                    <ButtonBase
                                        onClick={handleRetryFetch}
                                        sx={{
                                            color: theme.palette.secondary.main,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Retry
                                    </ButtonBase>
                                </Stack>
                            ) : notifications.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ py: 6, px: 3, gap: 1.5 }}>
                                    <NotificationsOffOutlinedIcon sx={{ fontSize: 36, color: theme.palette.text.secondary, opacity: 0.5 }} />
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        You're all caught up! No notifications.
                                    </Typography>
                                </Stack>
                            ) : (
                                notifications.map((item) => (
                                    <Box
                                        key={item._id || item.id}
                                        onClick={() => handleNotificationClick(item)}
                                        sx={{
                                            p: 2,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            backgroundColor: !item.is_read
                                                ? alpha(theme.palette.secondary.main, 0.03)
                                                : 'transparent',
                                            transition: 'background-color 150ms ease',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.action.hover, 0.05)
                                            }
                                        }}
                                    >
                                        {/* Unread dot indicator */}
                                        {!item.is_read && (
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: theme.palette.secondary.main,
                                                    mt: 0.75,
                                                    flexShrink: 0
                                                }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1, ml: item.is_read ? 2 : 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: !item.is_read ? 600 : 400, color: 'text.primary', mb: 0.25 }}>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, lineHeight: 1.3 }}>
                                                {item.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>
                                                {formatRelativeTime(item.created_at || item.createdAt)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Popover>

                    {/* Profile button */}
                    <Tooltip title="View profile, settings, and sign out options" placement="bottom">
                        <ButtonBase
                            onClick={handleProfileToggle}
                            aria-describedby={isProfileMenuOpen ? 'navbar-profile-popover' : undefined}
                            sx={{
                                pl: { xs: 0.5, sm: 0.25 },
                                pr: { xs: 0.5, sm: 0.5 },
                                py: { xs: 0.5, sm: 0.25 },
                                borderRadius: '10px',
                                border: `1px solid ${isProfileMenuOpen ? theme.palette.divider : 'transparent'}`,
                                backgroundColor: isProfileMenuOpen
                                    ? alpha(theme.palette.secondary.main, 0.08)
                                    : 'transparent',
                                transition: 'all 180ms ease',
                                minHeight: { xs: 44, sm: 'auto' },
                                minWidth: { xs: 44, sm: 'auto' },
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                                    borderColor: theme.palette.secondary.main,
                                },
                            }}
                        >
                            <Stack direction="row" spacing={{ xs: 0, sm: 0.75 }} alignItems="center">
                                <Avatar
                                    sx={{
                                        width: { xs: '2rem', md: '2rem' },
                                        height: { xs: '2rem', md: '2rem' },
                                        flexShrink: 0,
                                        bgcolor: alpha(theme.palette.secondary.main, mode === 'dark' ? 0.22 : 0.12),
                                        color: theme.palette.secondary.main,
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    {initials}
                                </Avatar>

                                {/* Name + role — only on sm+ */}
                                <Box sx={{
                                    minWidth: 0,
                                    textAlign: 'left',
                                    display: { xs: 'none', sm: 'block' },
                                    maxWidth: { sm: '7rem', md: '9rem' },
                                }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                            color: theme.palette.text.primary,
                                            lineHeight: 1.15,
                                            fontSize: '0.8125rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {user?.name ?? 'Guest User'}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            lineHeight: 1.2,
                                            fontSize: '0.6875rem',
                                            fontWeight: 400,
                                            mt: 0.1,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {user ? roleConfig[user.role].label : 'Guest'}
                                    </Typography>
                                </Box>

                                <KeyboardArrowDownRoundedIcon
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '1rem',
                                        flexShrink: 0,
                                        transform: isProfileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 180ms ease',
                                        display: { xs: 'none', sm: 'block' },
                                    }}
                                />
                            </Stack>
                        </ButtonBase>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Profile popover */}
            <Popover
                id="navbar-profile-popover"
                open={isProfileMenuOpen}
                anchorEl={profileAnchor}
                onClose={handleCloseProfileMenu}
                slots={{ transition: Fade }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.75,
                            width: { xs: 'calc(100vw - 2rem)', sm: 272 },
                            maxWidth: 'calc(100vw - 2rem)',
                            overflow: 'hidden',
                            borderRadius: '14px',
                        },
                    },
                }}
                transitionDuration={{ appear: 0, enter: 160, exit: 120 }}
            >
                <Stack>
                    <Stack
                        alignItems="center"
                        sx={{
                            px: 1.5,
                            pt: 1.75,
                            pb: 1.5,
                            textAlign: 'center',
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 52,
                                height: 52,
                                bgcolor: alpha(theme.palette.secondary.main, mode === 'dark' ? 0.22 : 0.12),
                                color: theme.palette.secondary.main,
                                fontWeight: 700,
                                fontSize: '1.125rem',
                            }}
                        >
                            {initials}
                        </Avatar>

                        <Box sx={{ mt: 0.875 }}>
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    color: theme.palette.text.primary,
                                    fontSize: '0.9rem',
                                    lineHeight: 1.25,
                                }}
                            >
                                {user?.name ?? 'Guest User'}
                            </Typography>
                            <Typography
                                sx={{
                                    mt: 0.2,
                                    color: theme.palette.text.secondary,
                                    fontSize: '0.75rem',
                                    fontWeight: 400,
                                }}
                            >
                                {user ? roleConfig[user.role].label : 'Guest'}
                            </Typography>
                        </Box>
                    </Stack>

                    <Divider sx={{ mx: 1.25 }} />

                    <Stack spacing={0.1} sx={{ px: 1, pt: 0.75, pb: 1 }}>
                        {(user?.role === 'superAdmin' || user?.role === 'admin') && (
                            <ButtonBase
                                onClick={() => { handleCloseProfileMenu(); navigate('/settings') }}
                                sx={{
                                    justifyContent: 'flex-start',
                                    gap: 1.25,
                                    width: '100%',
                                    px: 0.75,
                                    py: { xs: 0.75, sm: 0.6 },
                                    borderRadius: '8px',
                                    color: theme.palette.text.primary,
                                    minHeight: 42,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    },
                                }}
                            >
                                <SettingsOutlinedIcon sx={{ color: theme.palette.text.secondary, fontSize: '1.2rem' }} />
                                <Typography sx={profileMenuLabelSx}>Settings</Typography>
                            </ButtonBase>
                        )}

                        {/* Logout button — red accent, full width, prominent */}
                        <ButtonBase
                            onClick={async () => { handleCloseProfileMenu(); await logout(); navigate(paths.login) }}
                            sx={{
                                justifyContent: 'center',
                                gap: 0.875,
                                width: '100%',
                                mt: 1,
                                px: 1,
                                py: { xs: 0.875, sm: 0.75 },
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(220,38,38,0.08) 100%)',
                                border: `1.5px solid rgba(239,68,68,0.20)`,
                                color: '#ef4444',
                                minHeight: 44,
                                transition: 'all 180ms ease',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.14) 100%)',
                                    borderColor: 'rgba(239,68,68,0.40)',
                                    transform: 'translateY(-1px)',
                                },
                                '&:active': {
                                    transform: 'scale(0.98)',
                                },
                            }}
                        >
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'inherit' }}>
                                Sign out
                            </Typography>
                            <InputOutlinedIcon sx={{ fontSize: '1rem', color: 'inherit' }} />
                        </ButtonBase>
                    </Stack>
                </Stack>
            </Popover>
        </>
    )
}
