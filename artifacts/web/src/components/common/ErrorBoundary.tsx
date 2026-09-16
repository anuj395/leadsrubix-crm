import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Collapse from '@mui/material/Collapse'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

const CHUNK_RELOAD_STORAGE_KEY = 'lr_last_chunk_reload_ts'

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
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
        window.location.href = window.location.pathname + '?v=' + now
      }
    }
  }

  private handleManualReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
    window.location.href = window.location.pathname + '?v=' + Date.now()
  }

  private handleClearAndReset = () => {
    sessionStorage.clear()
    localStorage.removeItem('rubix-crm.auth')
    window.location.href = '/login'
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || ''
      const isChunkError =
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Failed to fetch') ||
        this.state.error?.name === 'ChunkLoadError'

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
              maxWidth: 580,
              width: '100%',
              p: 4,
              borderRadius: 4,
              bgcolor: 'rgba(30, 41, 59, 0.85)',
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
                {isChunkError ? 'Workspace Update Detected' : 'Application Encountered an Issue'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                {isChunkError
                  ? 'A new workspace version has been deployed. Please refresh to load the latest dashboard components.'
                  : 'A dashboard rendering component encountered an unexpected error. Please refresh or reset session to continue.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={this.handleManualReload}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
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

              <Button
                variant="outlined"
                size="large"
                startIcon={<LogoutOutlinedIcon />}
                onClick={this.handleClearAndReset}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  py: 1.2,
                  color: '#cbd5e1',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                Reset Session
              </Button>
            </Stack>

            {this.state.error && (
              <Box sx={{ width: '100%', textAlign: 'left', mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<BugReportOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  sx={{
                    color: '#94a3b8',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    p: 0,
                    '&:hover': { color: '#f8fafc', bgcolor: 'transparent' },
                  }}
                >
                  {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
                </Button>

                <Collapse in={this.state.showDetails}>
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#020617',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxHeight: 200,
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#f87171',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <strong>{this.state.error.name}: {this.state.error.message}</strong>
                    {this.state.error.stack && (
                      <Box sx={{ color: '#64748b', mt: 1 }}>
                        {this.state.error.stack}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Stack>
        </Box>
      )
    }

    return this.props.children
  }
}

