import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useNavigate } from 'react-router-dom'
import { AppCard } from '@/components/ui/AppCard'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { createDistributionRule } from '@/services/leadDistributionService'
import { useActionPermission } from '@/hooks/useActionPermission'

export default function LeadDistributionLogicPage() {
  const navigate = useNavigate()
  const { can_add, loading: permsLoading } = useActionPermission('leadDistribution')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'Normal' | 'Roundrobin'>('Normal')
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
    return 'ld-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
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
        location: Array.isArray(values.location) ? values.location : (values.location ? [values.location] : []),
        budget: Array.isArray(values.budget) ? values.budget : (values.budget ? [values.budget] : []),
        propertyType: Array.isArray(values.propertyType) ? values.propertyType : (values.propertyType ? [values.propertyType] : []),
        users: selectedUsers.map(u => ({ uid: String(u._id || u.id || ''), user_email: String(u.email || '') })),
        usersQueue: selectedUsers.map(u => String(u.email || '')),
        leadManagerUsers: selectedManagers.map(m => ({ uid: String(m._id || m.id || ''), user_email: String(m.email || '') })),
        distributionType: activeTab,
        userIndex: 0,
        leadDistId: generateUuid(),
      }

      await createDistributionRule(payload)
      setToast({ open: true, msg: 'Lead Distribution Created!!', sev: 'success' })
      setTimeout(() => navigate('/lead-distribution/list'), 1500)
    } catch (err: any) {
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to create lead distribution rule', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!permsLoading && !can_add) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to add lead distribution rules.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <AppCard
        title="Lead Distributor Logic Section"
        subtitle="Configure automated normal and round-robin lead distribution rules."
        action={
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/lead-distribution/list')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        }
      >
        
        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Normal Assignment" value="Normal" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Roundrobin Assignment" value="Roundrobin" sx={{ fontWeight: 600, textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* Dynamic Form wrapper */}
        <Box sx={{ mt: 2 }}>
          <DynamicForm
            key={activeTab}
            screen="leadDistribution"
            initialValues={{ distributionType: activeTab }}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/lead-distribution/list')}
            submitLabel={activeTab === 'Normal' ? 'Apply Normal Assignment' : 'Apply Roundrobin Assignment'}
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
