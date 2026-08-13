import { useState } from 'react'

import { authService } from '../api/authService'
import { ForgotPasswordForm } from '../components/ForgotPasswordForm'
import type { ForgotPasswordRequest } from '../types/auth'

export function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (request: ForgotPasswordRequest) => {
    setIsSubmitting(true)

    try {
      const response = await authService.requestPasswordReset(request)
      return response.message
    } finally {
      setIsSubmitting(false)
    }
  }

  return <ForgotPasswordForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
}