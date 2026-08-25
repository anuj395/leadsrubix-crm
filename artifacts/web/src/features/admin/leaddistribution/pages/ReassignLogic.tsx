import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { createRotationRule } from '@/services/leadDistributionService'
import { useActionPermission } from '@/hooks/useActionPermission'

export default function ReassignLogicPage() {
  const navigate = useNavigate()
  const { can_add, loading: permsLoading } = useActionPermission('leadRotation')
  const [loading, setLoading] = useState(false)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  useEffect(() => {
    void (async () => {
      try {
        const usrs = await listUsers(undefined, true)
        setAllUsers(usrs || [])
      } catch (err) {
        console.error('Failed to pre-load users', err)
      }
    })()
  }, [])

  const generateUuid = () => {
    return 'reloc-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
  }

  const handleSubmit = async (values: Record<string, any>) => {
    setLoading(true)
    try {
      const selectedUserIds = Array.isArray(values.users) ? values.users : (values.users ? [values.users] : [])
      const selectedManagerIds = Array.isArray(values.leadManagerUsers) ? values.leadManagerUsers : (values.leadManagerUsers ? [values.leadManagerUsers] : [])

      const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u._id || u.id))
      const selectedManagers = allUsers.filter(u => selectedManagerIds.includes(u._id || u.id))

      const payload = {
        source: values.source,
        project: Array.isArray(values.project) ? values.project : (values.project ? [values.project] : []),
        rotationTime: Number(values.rotationTime),
        users: selectedUsers.map(u => ({ uid: String(u._id || u.id || ''), user_email: String(u.email || '') })),
        usersQueue: selectedUsers.map(u => String(u.email || '')),
        leadManagerUsers: selectedManagers.map(m => ({ uid: String(m._id || m.id || ''), user_email: String(m.email || '') })),
        userIndex: 0,
        relocId: generateUuid(),
      }

      await createRotationRule(payload)
      setToast({ open: true, msg: 'Reassign Created!!', sev: 'success' })
      setTimeout(() => navigate('/reassign/list'), 1500)
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to create rotation rule', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!permsLoading && !can_add) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to add lead rotation rules.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <AppCard
        title="Reassign Logic Section"
        subtitle="Configure unattended lead auto-rotation logic rules."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reassign/list')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 500 }}>
          (Note: Please configure Days first. Reassign logic can be created only after that.)
        </Typography>

        {/* Dynamic Form wrapper */}
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            screen="leadRotation"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/reassign/list')}
            submitLabel="Apply Reassign Logic"
          />
        </Box>
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.sev}
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
