import { useState } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export function InputField(props: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = props.type === 'password'
  const finalType = isPassword ? (showPassword ? 'text' : 'password') : props.type

  const InputProps = isPassword
    ? {
        ...props.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={() => setShowPassword((prev) => !prev)}
              onMouseDown={(e) => e.preventDefault()}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }
    : props.InputProps

  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      {...props}
      type={finalType}
      InputProps={InputProps}
      sx={{
        // Labels
        '& .MuiFormLabel-root': {
          fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
        },
        // Input text — 16px minimum on mobile to prevent iOS zoom
        '& .MuiInputBase-input': {
          fontSize: 'clamp(16px, 2vw, 0.9375rem)',
          // On larger screens, don't need the 16px minimum
          '@media (min-width: 600px)': {
            fontSize: '0.9375rem',
          },
          // Comfortable touch target on mobile
          paddingBlock: 'clamp(0.5625rem, 1.5vw, 0.6875rem)',
        },
        // Helper text
        '& .MuiFormHelperText-root': {
          fontSize: '0.75rem',
          marginTop: '0.25rem',
        },
        // Ensure full width always
        width: '100%',
        ...props.sx,
      }}
    />
  )
}
