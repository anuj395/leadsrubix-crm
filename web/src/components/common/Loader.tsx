import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

interface LoaderProps {
  message?: string
  fullScreen?: boolean
  size?: number
}

export function Loader({ message, fullScreen = false, size = 36 }: LoaderProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: fullScreen ? '100vh' : '100%',
        minHeight: fullScreen ? '100vh' : '12rem',
        backgroundColor: fullScreen ? theme.palette.background.default : 'transparent',
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress
          size={size}
          thickness={3.5}
          sx={{ color: theme.palette.secondary.main }}
        />
        {message && (
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
              letterSpacing: '0.01em',
            }}
          >
            {message}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
