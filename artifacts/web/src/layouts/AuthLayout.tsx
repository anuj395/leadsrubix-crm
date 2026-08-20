import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Outlet, useLocation } from 'react-router-dom'
import { ThemeProvider, alpha } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useMemo, useState } from 'react'

import { createAppTheme } from '@/styles/theme'

export default function AuthLayout() {
  const location = useLocation()
  const [isWider, setIsWider] = useState(false)
  const lightTheme = useMemo(() => createAppTheme('light'), [])

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
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
          background: `radial-gradient(ellipse 80% 60% at 10% 5%, ${alpha(lightTheme.palette.primary.main, 0.09)} 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 90%, ${alpha(lightTheme.palette.primary.dark, 0.06)} 0%, transparent 55%),
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
              src="/companylogo_dark.png"
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
                color: lightTheme.palette.secondary.main,
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
                color: lightTheme.palette.text.primary,
                lineHeight: 1.15,
                fontWeight: 800,
              }}
            >
              Lead operations built for fast teams.
            </Typography>

            <Typography
              sx={{
                color: lightTheme.palette.text.secondary,
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
                    color: alpha(lightTheme.palette.text.primary, 0.75),
                    lineHeight: 1.5,
                    fontWeight: 500,
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
                src="/companylogo_dark.png"
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
  </ThemeProvider>
  )
}
