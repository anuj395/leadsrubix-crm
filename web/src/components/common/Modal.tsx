import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import type { ReactNode } from 'react'

interface AppModalProps {
  actions?: ReactNode
  children: ReactNode
  onClose: () => void
  open: boolean
  title: string
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function AppModal({ actions, children, onClose, open, title, maxWidth = 'sm' }: AppModalProps) {
  const resolvedMaxWidth = maxWidth === 'md' ? '800px' : maxWidth === 'xs' ? '400px' : '560px'

  return (
    <Dialog
      fullWidth
      maxWidth={maxWidth}
      onClose={onClose}
      open={open}
      sx={{
        // Proper mobile dialog sizing
        '& .MuiDialog-paper': {
          mx: { xs: 1, sm: 'auto' },
          // Full width minus margins on mobile
          width: { xs: 'calc(100% - 2rem)', sm: 'auto' },
          maxWidth: { xs: '100%', sm: resolvedMaxWidth },
          borderRadius: { xs: '16px', sm: '16px' },
          // Max height with scroll for tall content
          maxHeight: { xs: 'calc(100vh - 4rem)', sm: 'calc(100vh - 6rem)' },
          overflowY: 'auto',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1.5,
          gap: 1,
          fontSize: 'clamp(0.9375rem, 2.5vw, 1.0625rem)',
          // Sticky title on tall dialogs
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backdropFilter: 'blur(8px)',
        }}
      >
        {title}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            flexShrink: 0,
            minWidth: 36,
            minHeight: 36,
            '&:hover': { color: 'text.primary' },
          }}
          aria-label="Close dialog"
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 1.75 },
            gap: 1,
            // Stack actions on mobile
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            '& .MuiButton-root': {
              flex: { xs: '1 1 auto', sm: '0 0 auto' },
            },
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}
