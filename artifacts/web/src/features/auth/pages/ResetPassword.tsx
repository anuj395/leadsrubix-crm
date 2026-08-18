import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { authService } from '../api/authService'
import { ResetPasswordForm } from '../components/ResetPasswordForm'

export function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const handleSubmit = async (password: string) => {
    if (!token) {
      throw new Error('Password reset token is missing from the URL.')
    }

    setIsSubmitting(true)

    try {
      const response = await authService.resetPassword({ token, password })
      return response.message
    } finally {
      setIsSubmitting(false)
    }
  }

  return <ResetPasswordForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
}
