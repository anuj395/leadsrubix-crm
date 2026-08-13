import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'

import { useState } from 'react'

export default function AuthLayout() {
  const theme = useTheme()
  const location = useLocation()
  const isDark = theme.palette.mode === 'dark'
  const [isWider, setIsWider] = useState(false)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'center',
        // Responsive padding — snug on mobile
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2.5, sm: 4, md: 6 },
        background: isDark
       ? `radial-gradient(ellipse 80% 60% at 10% 5%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 60%),
         radial-gradient(ellipse 60% 50% at 90% 90%, ${alpha(theme.palette.primary.dark, 0.40)} 0%, transparent 55%),
         linear-gradient(160deg, #0B0D1A 0%, #111629 100%)`
       : `radial-gradient(ellipse 80% 60% at 10% 5%, ${alpha(theme.palette.primary.main, 0.09)} 0%, transparent 60%),
         radial-gradient(ellipse 60% 50% at 90% 90%, ${alpha(theme.palette.primary.dark, 0.06)} 0%, transparent 55%),
         linear-gradient(160deg, #eef1ff 0%, #fafbff 60%, #f5f6fa 100%)`,
      }}
    >
      <Container maxWidth="lg" disableGutters sx={{ width: '100%' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, sm: 3, md: 6 }}
          alignItems="center"
          justifyContent="center"
          sx={{ width: '100%' }}
        >
          {/* ── Left: brand copy (desktop only) ─────────────── */}
          <Box
            sx={{
              flex: '1 1 420px',
              maxWidth: { xs: '100%', md: 480 },
              textAlign: { xs: 'center', md: 'left' },
              order: { xs: 2, md: 1 },
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box
              component="img"
              src={isDark ? '/companylogo_white.png' : '/companylogo_dark.png'}
              alt="Leads Rubix"
              sx={{
                height: 38,
                width: 'auto',
                mb: 3,
                display: 'block',
                maxWidth: '100%',
              }}
            />

            <Typography
              variant="overline"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 700,
                letterSpacing: '0.1em',
                mb: 1.5,
                display: 'block',
              }}
            >
              Leads Rubix CRM
            </Typography>

            <Typography
              variant="h2"
              sx={{
                mb: 2,
                color: theme.palette.text.primary,
                lineHeight: 1.15,
              }}
            >
              Lead operations built for fast teams.
            </Typography>

            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '1rem',
                lineHeight: 1.7,
                maxWidth: 380,
              }}
            >
              Centralize pipeline visibility, qualify prospects faster, and
              keep sales workflows tidy from a single workspace.
            </Typography>

            <Stack spacing={1.25} sx={{ mt: 3.5 }}>
              {[
                '✦  360° lead visibility across your pipeline',
                '✦  Real-time team collaboration on deals',
                '✦  Smart filters, stages, and follow-ups',
              ].map((feat) => (
                <Typography
                  key={feat}
                  sx={{
                    fontSize: '0.875rem',
                    color: isDark
                      ? alpha(theme.palette.text.primary, 0.75)
                      : alpha(theme.palette.text.primary, 0.65),
                    lineHeight: 1.5,
                  }}
                >
                  {feat}
                </Typography>
              ))}
            </Stack>
          </Box>

          {/* ── Right: auth form ──────────────────────────────── */}
          <Box
            sx={{
              flex: '0 0 auto',
              width: '100%',
              // Widen layout to 720px for multi-field signup only when industry is selected; standard 420px otherwise
              maxWidth: (location.pathname === '/signup' && isWider)
                ? { xs: '100%', sm: 720, md: 720 }
                : { xs: '100%', sm: 420, md: 420 },
              transition: 'max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              order: { xs: 1, md: 2 },
              minWidth: 0,
            }}
          >
            {/* Mobile logo */}
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                justifyContent: 'center',
                mb: { xs: 2, sm: 2.5 },
              }}
            >
              <Box
                component="img"
                src={isDark ? '/companylogo_white.png' : '/companylogo_dark.png'}
                alt="Leads Rubix"
                sx={{
                  height: 30,
                  width: 'auto',
                  maxWidth: '60vw',
                }}
              />
            </Box>
            <Outlet context={{ setIsWider }} />
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
