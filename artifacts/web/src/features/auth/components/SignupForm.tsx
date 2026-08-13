import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { InputField } from '@/components/forms/InputField'
import { AppCard } from '@/components/ui/AppCard'
import { paths } from '@/routes/paths'

import type { RegisterCredentials } from '../types/auth'

interface SignupFormProps {
  error: string | null
  isSubmitting: boolean
  onSubmit: (credentials: RegisterCredentials & { confirmPassword: string }) => Promise<void>
}

export function SignupForm({ error, isSubmitting, onSubmit }: SignupFormProps) {
  const [credentials, setCredentials] = useState<RegisterCredentials & { confirmPassword: string }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const passwordMismatch =
    credentials.confirmPassword.length > 0 && credentials.password !== credentials.confirmPassword

  return (
    <AppCard subtitle="Create a workspace account to start managing leads." title="Create account">
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={async (event) => {
          event.preventDefault()
          if (passwordMismatch) return
          await onSubmit(credentials)
        }}
        sx={{ width: '100%' }}
      >
        <InputField
          label="Full name"
          value={credentials.name}
          onChange={(event) => {
            setCredentials((current) => ({ ...current, name: event.target.value }))
          }}
        />
        <InputField
          label="Work email"
          type="email"
          value={credentials.email}
          onChange={(event) => {
            setCredentials((current) => ({ ...current, email: event.target.value }))
          }}
        />
        <InputField
          label="Password"
          type="password"
          value={credentials.password}
          onChange={(event) => {
            setCredentials((current) => ({ ...current, password: event.target.value }))
          }}
        />
        <InputField
          error={passwordMismatch}
          helperText={passwordMismatch ? 'Passwords must match.' : 'Use at least 4 characters.'}
          label="Confirm password"
          type="password"
          value={credentials.confirmPassword}
          onChange={(event) => {
            setCredentials((current) => ({ ...current, confirmPassword: event.target.value }))
          }}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Button
          disabled={isSubmitting || passwordMismatch}
          size="large"
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </Button>

        <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.login} variant="inherit">
            Sign in
          </Typography>
        </Typography>
      </Stack>
    </AppCard>
  )
}
