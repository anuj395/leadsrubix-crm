import { useState, type MouseEvent } from 'react'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import InputOutlinedIcon from '@mui/icons-material/InputOutlined'
import GTranslateRoundedIcon from '@mui/icons-material/GTranslateRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import FormatTextdirectionRToLRoundedIcon from '@mui/icons-material/FormatTextdirectionRToLRounded'
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
    '/configuration/resources': ['Home', 'Configuration', 'Resources'],
    '/configuration/whatsapp': ['Home', 'Configuration', 'WhatsApp API'],
    '/configuration/holidayConfig': ['Home', 'Configuration', 'Holiday Config'],
    '/configuration/holidayConfig/new': ['Home', 'Configuration', 'Holiday Config', 'Create Holiday'],
    '/configuration/daysConfig': ['Home', 'Configuration', 'Days Config'],

    '/support/news': ['Home', 'Support', 'News'],
    '/support/faq': ['Home', 'Support', 'FAQ'],
    '/account/subscription-details': ['Home', 'Account', 'Subscription Details'],
    '/account/update-password': ['Home', 'Account', 'Update Password'],
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
    '/leadDistribution/list': ['Home', 'Lead Distribution', 'Lead Distribution List'],
    '/leadDistribution/logic': ['Home', 'Lead Distribution', 'Lead Distribution Logic'],
    '/reassign/list': ['Home', 'Lead Distribution', 'Reassign List'],
    '/reassign/logic': ['Home', 'Lead Distribution', 'Reassign Logic'],
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

    const handleThemeToggle = () => {
        setIsRotating(true)
        toggleMode()
        setTimeout(() => setIsRotating(false), 500)
    }

    let resolvedBreadcrumbs = breadcrumbMap[location.pathname]
    if (!resolvedBreadcrumbs) {
        if (location.pathname.startsWith('/leads/contacts/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Leads', 'Contact List', 'Edit Contact']
        } else if (location.pathname.startsWith('/configuration/holidayConfig/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Configuration', 'Holiday Config', 'Edit Holiday']
        } else if (location.pathname.startsWith('/users/') && location.pathname.endsWith('/edit')) {
            resolvedBreadcrumbs = ['Home', 'Users', 'Edit User']
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

                    {/* Dark mode toggle */}
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

                    {/* Notifications */}
                    <IconButton sx={iconBtnSx} aria-label="Notifications">
                        <Badge color="error" variant="dot" overlap="circular">
                            <NotificationsNoneRoundedIcon fontSize="small" />
                        </Badge>
                    </IconButton>

                    {/* Profile button */}
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
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                px: 0.75,
                                py: { xs: 0.75, sm: 0.5 },
                                borderRadius: '8px',
                                minHeight: 42,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                                <FormatTextdirectionRToLRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: '1.2rem' }} />
                                <Typography sx={profileMenuLabelSx}>RTL</Typography>
                            </Stack>
                            <Switch size="small" checked={false} sx={{ mr: -0.5 }} />
                        </Stack>

                        <ButtonBase
                            onClick={handleCloseProfileMenu}
                            sx={{
                                justifyContent: 'space-between',
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
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                                <GTranslateRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: '1.2rem' }} />
                                <Typography sx={profileMenuLabelSx}>Language</Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.8125rem' }}>Eng</Typography>
                                <ChevronRightRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: 16 }} />
                            </Stack>
                        </ButtonBase>

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
