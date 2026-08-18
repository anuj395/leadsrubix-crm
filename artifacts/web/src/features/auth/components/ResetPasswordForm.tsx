import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { InputField } from '@/components/forms/InputField'
import { AppCard } from '@/components/ui/AppCard'
import { paths } from '@/routes/paths'

interface ResetPasswordFormProps {
  isSubmitting: boolean
  onSubmit: (password: string) => Promise<string>
}

export function ResetPasswordForm({ isSubmitting, onSubmit }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  return (
    <AppCard subtitle="Please enter your new password below." title="Reset password">
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setSuccessMessage(null)

          if (password.length < 4) {
            setError('Password must be at least 4 characters long.')
            return
          }

          if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
          }

          try {
            const message = await onSubmit(password)
            setSuccessMessage(message)
          } catch (submitError) {
            setError(
              submitError instanceof Error
                ? submitError.message
                : 'Unable to reset password right now.',
            )
          }
        }}
        sx={{ width: '100%' }}
      >
        <InputField
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <InputField
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Button
          disabled={isSubmitting || !!successMessage}
          size="large"
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isSubmitting ? 'Updating password…' : 'Reset password'}
        </Button>

        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          <Typography color="text.secondary" variant="body2">
            <Typography component={RouterLink} sx={{ color: 'secondary.main', fontWeight: 500 }} to={paths.login} variant="inherit">
              Back to sign in
            </Typography>
          </Typography>
        </Stack>
      </Stack>
    </AppCard>
  )
}
