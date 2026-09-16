import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

const CHUNK_RELOAD_STORAGE_KEY = 'lr_last_chunk_reload_ts'

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LeadsRubix ErrorBoundary caught exception]:', error, errorInfo)
    this.setState({ errorInfo })

    // Auto-recover from chunk mismatch errors on new deployments
    const errorMessage = error?.message || ''
    const isChunkError =
      errorMessage.includes('dynamically imported module') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError'

    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || 0)
      const now = Date.now()
      // If we haven't reloaded in the last 15 seconds, auto-reload with cache bypass
      if (now - lastReload > 15000) {
        sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
        console.warn('[ErrorBoundary] New deployment detected / chunk mismatch. Auto-refreshing...')
        window.location.reload()
      }
    }
  }

  private handleManualReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            bgcolor: '#0f172a',
            color: '#f8fafc',
            p: 3,
            boxSizing: 'border-box',
          }}
        >
          <Stack
            spacing={3}
            alignItems="center"
            textAlign="center"
            sx={{
              maxWidth: 480,
              p: 4,
              borderRadius: 4,
              bgcolor: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.4) 100%)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <WarningAmberRoundedIcon sx={{ fontSize: 34 }} />
            </Box>

            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: '#ffffff' }}>
                Session Update Required
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                A new workspace update has been deployed or temporary connection latency occurred. Please refresh to load the latest dashboard components.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<RefreshIcon />}
              onClick={this.handleManualReload}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 3.5,
                py: 1.2,
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #2563eb 100%)',
                },
              }}
            >
              Reload Workspace
            </Button>
          </Stack>
        </Box>
      )
    }

    return this.props.children
  }
}
