import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { InputField } from '@/components/forms/InputField'
import { AppCard } from '@/components/ui/AppCard'
import { paths } from '@/routes/paths'

import type { ForgotPasswordRequest } from '../types/auth'

interface ForgotPasswordFormProps {
  isSubmitting: boolean
  onSubmit: (request: ForgotPasswordRequest) => Promise<string>
}

export function ForgotPasswordForm({ isSubmitting, onSubmit }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  return (
    <AppCard subtitle="We'll send a reset link to your work email." title="Reset password">
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setSuccessMessage(null)

          try {
            const message = await onSubmit({ email })
            setSuccessMessage(message)
          } catch (submitError) {
            setError(
              submitError instanceof Error
                ? submitError.message
                : 'Unable to send reset instructions right now.',
            )
          }
        }}
        sx={{ width: '100%' }}
      >
        <InputField
          label="Work email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Button
          disabled={isSubmitting}
          size="large"
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isSubmitting ? 'Sending link…' : 'Send reset link'}
        </Button>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={{ xs: 1, sm: 2 }}
        >
          <Typography color="text.secondary" variant="body2">
            <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.login} variant="inherit">
              Back to sign in
            </Typography>
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Need an account?{' '}
            <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.signup} variant="inherit">
              Create account
            </Typography>
          </Typography>
        </Stack>
      </Stack>
    </AppCard>
  )
}
