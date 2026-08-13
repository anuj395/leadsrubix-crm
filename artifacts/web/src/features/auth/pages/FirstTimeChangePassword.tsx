import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAuth, updateUser } from '@/features/auth/store/authSlice'
import { api } from '@/services/api'
import { InputField } from '@/components/forms/InputField'
import { AppCard } from '@/components/ui/AppCard'

export function FirstTimeChangePasswordPage() {
  const { user } = useAppSelector(selectAuth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      if (!user?.id) {
        throw new Error('User session not found. Please log in again.')
      }

      await api.put(`users/${user.id}`, { password })
      setSuccess(true)
      
      // Update local Redux state and localStorage to clear first-login redirect flags
      dispatch(updateUser({ needsPasswordChange: false }))
      
      // Redirect to dashboard/analytics
      navigate('/analytics', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please try again.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppCard 
      title="Setup Your Password" 
      subtitle="This is your first login. For security reasons, please change your password to continue."
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <InputField
          label="New Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <InputField
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">Password updated successfully! Redirecting...</Alert> : null}

        <Button
          disabled={isSubmitting || success}
          size="large"
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isSubmitting ? 'Updating password…' : 'Update & Continue'}
        </Button>
      </Stack>
    </AppCard>
  )
}
