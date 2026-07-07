import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

interface AppCardProps {
  action?: ReactNode
  children: ReactNode
  subtitle?: string
  title: string
  sx?: SxProps<Theme>
  fullHeight?: boolean
}

export function AppCard({ action, children, subtitle, title, sx, fullHeight = false }: AppCardProps) {
  const theme = useTheme()

  return (
    <Card
      className="glass-card"
      sx={{
        width: '100%',
        minWidth: 0,
        ...(fullHeight
          ? { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
          : {}),
        ...sx,
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          ...(fullHeight ? { height: '100%', minHeight: 0, overflow: 'hidden' } : {}),
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ mb: 2, minWidth: 0, flexWrap: 'wrap', flexShrink: 0 }}
        >
          {/* <Stack sx={{ minWidth: 0, flex: '1 1 12rem' }}> */}
          <Stack sx={{ minWidth: 0, flex: { xs: '1 1 4rem', sm: '1 1 12rem' } }}>
            <Typography
              variant="overline"
              sx={{
                color: theme.palette.secondary.main,
                fontWeight: 700,
                letterSpacing: '0.08em',
                lineHeight: 1.4,
                mb: subtitle ? 0.5 : 0,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  lineHeight: 1.55,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Stack>

          {action && (
            <Box sx={{
              flexShrink: 0,
              maxWidth: '100%',
              // On mobile, actions sit below title (column layout above handles it)
              // On sm+, they float right
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
            }}>
              {action}
            </Box>
          )}
        </Stack>

        {fullHeight ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
          </Box>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
