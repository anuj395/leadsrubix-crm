import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { InputField } from '@/components/forms/InputField'
import { AppCard } from '@/components/ui/AppCard'
import { paths } from '@/routes/paths'

import type { LoginCredentials } from '../types/auth'

interface LoginFormProps {
  error: string | null
  isSubmitting: boolean
  onSubmit: (credentials: LoginCredentials) => Promise<void>
}

export function LoginForm({ error, isSubmitting, onSubmit }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: 'sales@rubixcrm.dev',
    password: 'demo1234',
  })

  return (
    <AppCard subtitle="Use the seeded demo credentials or enter your own." title="Welcome back">
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={async (event) => {
          event.preventDefault()
          await onSubmit(credentials)
        }}
        sx={{ width: '100%' }}
      >
        <InputField
          label="Work email"
          type="email"
          value={credentials.email}
          onChange={(event) => {
            setCredentials((current) => ({
              ...current,
              email: event.target.value,
            }))
          }}
        />
        <InputField
          label="Password"
          type="password"
          value={credentials.password}
          onChange={(event) => {
            setCredentials((current) => ({
              ...current,
              password: event.target.value,
            }))
          }}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {/* Full-width CTA — large touch target, high contrast */}
        <Button
          disabled={isSubmitting}
          size="large"
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'center' }}
          spacing={{ xs: 1, sm: 2 }}
        >
          <Typography color="text.secondary" variant="body2">
            <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.forgotPassword} variant="inherit">
              Forgot password?
            </Typography>
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
            New here?{' '}
            <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.signup} variant="inherit">
              Create account
            </Typography>
          </Typography>
        </Stack>
      </Stack>
    </AppCard>
  )
}
