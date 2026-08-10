import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmContext'
import { useAuth } from '@/hooks/useAuth'
import { 
  fetchNotificationSettings, 
  updateNotificationSetting,
  type NotificationSettingsResponse 
} from '@/features/notifications/api/notificationApi'

interface SettingItem {
  _id: string
  name: string
  code?: string
  key?: string
  industryId?: string
  description?: string
  isActive?: boolean
  label?: string
  value?: string
}

interface Industry {
  _id: string
  code: string
  name: string
}

type TabType = 'teams' | 'branches' | 'designations' | 'roles' | 'role-keys' | 'notification-settings' | 'notification-capabilities'

const NOTIFICATION_TYPES = [
  { value: 'LEAD_CREATED', label: 'New Lead Created', description: 'Triggered when a new lead is added to the organization.' },
  { value: 'LEAD_ASSIGNED', label: 'New Lead Assigned', description: 'Triggered when a lead is assigned or transferred to a user.' },
  { value: 'TASK_ASSIGNED', label: 'Task Assigned', description: 'Triggered when a task is created or assigned to a user.' },
  { value: 'SYSTEM', label: 'System Notifications', description: 'General system-wide messages and alerts.' }
]

export default function SettingsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superAdmin'
  const [tab, setTab] = useState<TabType>(isSuperAdmin ? 'roles' : 'teams')
  const [items, setItems] = useState<SettingItem[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [roleKeys, setRoleKeys] = useState<{ _id: string; value: string; label: string }[]>([])
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationSettingsResponse | null>(null)
  const { confirmDelete } = useConfirm()

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SettingItem | null>(null)
  
  // Form fields
  const [nameVal, setNameVal] = useState('')
  const [codeVal, setCodeVal] = useState('')
  const [keyVal, setKeyVal] = useState('sales')
  const [industryVal, setIndustryVal] = useState('')
  const [descVal, setDescVal] = useState('')
  const [isActiveVal, setIsActiveVal] = useState(true)
  
  const [saving, setSaving] = useState(false)

  const showToast = (msg: string, sev: 'success' | 'error' = 'success') => {
    setToast({ open: true, msg, sev })
  }

  const loadNotificationSettings = async (industryIdFilter?: string) => {
    setLoading(true)
    try {
      const res = await fetchNotificationSettings(industryIdFilter)
      setNotificationPrefs(res)
    } catch {
      showToast('Failed to load notification settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePreference = async (level: 'industry' | 'org' | 'user', notificationType: string, currentVal: boolean) => {
    try {
      await updateNotificationSetting({
        level,
        notificationType,
        isEnabled: !currentVal,
        industryId: level === 'industry' ? selectedIndustryId : undefined
      })
      showToast('Preference updated successfully')
      void loadNotificationSettings(selectedIndustryId)
    } catch {
      showToast('Failed to update preference', 'error')
    }
  }

  const loadItems = async (currentTab: TabType, industryIdFilter?: string) => {
    if (currentTab === 'notification-settings' || currentTab === 'notification-capabilities') {
      return loadNotificationSettings(industryIdFilter)
    }
    setLoading(true)
    try {
      const params = currentTab === 'roles' && industryIdFilter ? { industryId: industryIdFilter } : {}
      const res = await api.get(currentTab, { params })
      const list = res.data?.items || res.data || []
      setItems(list)
    } catch {
      showToast('Failed to load items', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadIndustries = async () => {
    try {
      const res = await api.get('industries')
      const list = res.data?.items || res.data || []
      setIndustries(list)
      if (list.length > 0 && !selectedIndustryId) {
        setSelectedIndustryId(list[0]._id)
      }
    } catch {
      showToast('Failed to load industries', 'error')
    }
  }

  const loadRoleKeys = async () => {
    try {
      const res = await api.get('role-keys')
      setRoleKeys(res.data?.items || res.data || [])
    } catch {
      showToast('Failed to load role keys', 'error')
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      void loadIndustries()
      void loadRoleKeys()
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void loadItems(tab, selectedIndustryId)
  }, [tab, selectedIndustryId])

  const openAdd = () => {
    setEditingItem(null)
    setNameVal('')
    setCodeVal('')
    setKeyVal(roleKeys[0]?.value || 'sales')
    setIndustryVal(industries[0]?._id || '')
    setDescVal('')
    setIsActiveVal(true)
    setDialogOpen(true)
  }

  const openEdit = (item: SettingItem) => {
    setEditingItem(item)
    setNameVal(item.name || item.label || item.value || '')
    setCodeVal(item.code || '')
    setKeyVal(item.key || 'sales')
    setIndustryVal(typeof item.industryId === 'object' ? (item.industryId as any)?._id || '' : item.industryId || '')
    setDescVal(item.description || '')
    setIsActiveVal(item.isActive !== false)
    setDialogOpen(true)
  }

  const handleDelete = (item: SettingItem) => {
    confirmDelete({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${item.label || item.value || item.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`${tab}/${item._id}`)
          showToast('Item deleted successfully')
          void loadItems(tab)
          if (tab === 'role-keys') {
            void loadRoleKeys()
          }
        } catch {
          showToast('Failed to delete item', 'error')
        }
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameVal.trim()) return

    setSaving(true)
    try {
      if (tab === 'roles') {
        const payload = {
          industryId: industryVal,
          key: keyVal,
          name: nameVal.trim(),
          description: descVal.trim(),
          isActive: isActiveVal,
        }
        if (editingItem) {
          await api.put(`roles/${editingItem._id}`, payload)
          showToast('Role updated successfully')
        } else {
          await api.post('roles', payload)
          showToast('Role created successfully')
        }
      } else if (tab === 'role-keys') {
        const payload = { name: nameVal.trim() }
        if (editingItem) {
          await api.put(`role-keys/${editingItem._id}`, payload)
          showToast('Role key updated successfully')
        } else {
          await api.post('role-keys', payload)
          showToast('Role key created successfully')
        }
        void loadRoleKeys()
      } else {
        const payload = tab === 'designations'
          ? { name: nameVal.trim() }
          : { name: nameVal.trim(), code: codeVal.trim() }

        if (editingItem) {
          await api.put(`${tab}/${editingItem._id}`, payload)
          showToast('Item updated successfully')
        } else {
          await api.post(tab, payload)
          showToast('Item created successfully')
        }
      }
      setDialogOpen(false)
      void loadItems(tab)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save item', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
            Workspace Settings
          </Typography>
          <Typography color="text.secondary">
            {isSuperAdmin 
              ? 'Manage workspace system roles used across your enterprise industries.'
              : 'Manage system teams, branches, and designations used throughout your organization.'}
          </Typography>
        </Box>
        {isSuperAdmin && (
          <TextField
            select
            size="small"
            label="Industry"
            value={selectedIndustryId}
            onChange={(e) => setSelectedIndustryId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {industries.map((ind) => (
              <MenuItem key={ind._id} value={ind._id}>
                {ind.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <AppCard
        fullHeight
        title="Workspace Parameters"
        subtitle={isSuperAdmin ? 'Configure global tenant roles' : 'Configure system parameters for teams, branches, and designations'}
        sx={{ flex: 1, minHeight: 0 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
          {isSuperAdmin ? (
            <Tabs
              value={tab}
              onChange={(_, val: TabType) => setTab(val)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 100,
                },
              }}
            >
              <Tab label="Roles" value="roles" />
              <Tab label="Role Keys" value="role-keys" />
              <Tab label="Notification Capabilities" value="notification-capabilities" />
            </Tabs>
          ) : (
            <Tabs
              value={tab}
              onChange={(_, val: TabType) => setTab(val)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 100,
                },
              }}
            >
              <Tab label="Teams" value="teams" />
              <Tab label="Branches" value="branches" />
              <Tab label="Designations" value="designations" />
              <Tab label="Notification Settings" value="notification-settings" />
            </Tabs>
          )}

          {!(tab === 'notification-settings' || tab === 'notification-capabilities') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAdd}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              }}
            >
              Add {tab === 'roles' ? 'Role' : tab === 'role-keys' ? 'Role Key' : tab === 'teams' ? 'Team' : tab === 'branches' ? 'Branch' : 'Designation'}
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (tab === 'notification-settings' || tab === 'notification-capabilities') ? (
          <Stack spacing={4} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 0.5 }}>
            {tab === 'notification-capabilities' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Industry Notifications Capabilities</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, width: '30%' }}>Notification Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '50%' }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, pr: 4 }}>Capability Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {NOTIFICATION_TYPES.map((type) => {
                        const industrySetting = notificationPrefs?.industrySettings.find(s => s.notification_type === type.value);
                        const isEnabled = industrySetting ? industrySetting.is_enabled !== false : true;
                        return (
                          <TableRow key={type.value} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{type.label}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{type.description}</TableCell>
                            <TableCell align="right" sx={{ pr: 3 }}>
                              <Switch
                                checked={isEnabled}
                                onChange={() => handleTogglePreference('industry', type.value, isEnabled)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tab === 'notification-settings' && (
              <>
                {user?.role === 'admin' && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Organization-wide Defaults</Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700, width: '30%' }}>Notification Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '50%' }}>Description</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, pr: 4 }}>Default Active Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {NOTIFICATION_TYPES.map((type) => {
                            const industrySetting = notificationPrefs?.industrySettings.find(s => s.notification_type === type.value);
                            const isAllowedByIndustry = industrySetting ? industrySetting.is_enabled !== false : true;

                            const orgSetting = notificationPrefs?.orgSettings.find(s => s.notification_type === type.value);
                            const isEnabled = orgSetting ? orgSetting.is_enabled !== false : true;

                            return (
                              <TableRow key={type.value} hover>
                                <TableCell sx={{ fontWeight: 600, color: isAllowedByIndustry ? 'text.primary' : 'text.disabled' }}>{type.label}</TableCell>
                                <TableCell sx={{ color: isAllowedByIndustry ? 'text.secondary' : 'text.disabled' }}>
                                  {type.description}
                                  {!isAllowedByIndustry && (
                                    <Typography variant="caption" display="block" sx={{ color: 'error.main', mt: 0.5, fontWeight: 500 }}>
                                      Disabled by enterprise industry configuration
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ pr: 3 }}>
                                  <Switch
                                    checked={isAllowedByIndustry && isEnabled}
                                    disabled={!isAllowedByIndustry}
                                    onChange={() => handleTogglePreference('org', type.value, isEnabled)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>My Individual Preferences</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700, width: '30%' }}>Notification Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '50%' }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, pr: 4 }}>Receive Notifications</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {NOTIFICATION_TYPES.map((type) => {
                          const industrySetting = notificationPrefs?.industrySettings.find(s => s.notification_type === type.value);
                          const isAllowedByIndustry = industrySetting ? industrySetting.is_enabled !== false : true;

                          const userSetting = notificationPrefs?.userSettings.find(s => s.notification_type === type.value);
                          const isEnabled = userSetting ? userSetting.is_enabled !== false : true;

                          return (
                            <TableRow key={type.value} hover>
                              <TableCell sx={{ fontWeight: 600, color: isAllowedByIndustry ? 'text.primary' : 'text.disabled' }}>{type.label}</TableCell>
                              <TableCell sx={{ color: isAllowedByIndustry ? 'text.secondary' : 'text.disabled' }}>
                                {type.description}
                                {!isAllowedByIndustry && (
                                  <Typography variant="caption" display="block" sx={{ color: 'error.main', mt: 0.5, fontWeight: 500 }}>
                                    Disabled by enterprise industry configuration
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ pr: 3 }}>
                                <Switch
                                  checked={isAllowedByIndustry && isEnabled}
                                  disabled={!isAllowedByIndustry}
                                  onChange={() => handleTogglePreference('user', type.value, isEnabled)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </>
            )}
          </Stack>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  {tab === 'roles' && <TableCell sx={{ fontWeight: 700 }}>Key</TableCell>}
                  {tab === 'roles' && <TableCell sx={{ fontWeight: 700 }}>Industry</TableCell>}
                  {tab === 'roles' && <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>}
                  {tab !== 'designations' && tab !== 'roles' && tab !== 'role-keys' && <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tab === 'roles' ? 5 : tab === 'designations' || tab === 'role-keys' ? 2 : 3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No items found. Click Add to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{item.label || item.value || item.name}</TableCell>
                      {tab === 'roles' && <TableCell sx={{ fontFamily: 'monospace' }}>{item.key}</TableCell>}
                      {tab === 'roles' && <TableCell>{typeof item.industryId === 'object' ? (item.industryId as any)?.name || '—' : item.industryId || '—'}</TableCell>}
                      {tab === 'roles' && (
                        <TableCell>
                          <Alert severity={item.isActive !== false ? 'success' : 'error'} icon={false} sx={{ display: 'inline-flex', py: 0, px: 1, fontSize: '0.75rem', borderRadius: '4px' }}>
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                          </Alert>
                        </TableCell>
                      )}
                      {tab !== 'designations' && tab !== 'roles' && tab !== 'role-keys' && <TableCell>{item.code || '—'}</TableCell>}
                      <TableCell align="right" sx={{ pr: 2 }}>
                        <IconButton size="small" color="primary" onClick={() => openEdit(item)} sx={{ mr: 1 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => void handleDelete(item)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AppCard>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={(e) => void handleSave(e)}>
          <DialogTitle>
            {editingItem ? 'Edit' : 'Add'}{' '}
            {tab === 'roles' ? 'Role' : tab === 'role-keys' ? 'Role Key' : tab === 'teams' ? 'Team' : tab === 'branches' ? 'Branch' : 'Designation'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {tab === 'roles' && (
                <TextField
                  select
                  required
                  fullWidth
                  size="small"
                  label="Industry"
                  value={industryVal}
                  onChange={(e) => setIndustryVal(e.target.value)}
                  disabled={saving || !!editingItem}
                >
                  {industries.map((ind) => (
                    <MenuItem key={ind._id} value={ind._id}>
                      {ind.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {tab === 'roles' && (
                <TextField
                  select
                  required
                  fullWidth
                  size="small"
                  label="Role Key"
                  value={keyVal}
                  onChange={(e) => setKeyVal(e.target.value)}
                  disabled={saving || !!editingItem}
                >
                  {roleKeys.map((rk) => (
                    <MenuItem key={rk.value} value={rk.value}>
                      {rk.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                required
                fullWidth
                size="small"
                label="Name"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                disabled={saving}
              />

              {tab === 'roles' && (
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  disabled={saving}
                />
              )}

              {tab === 'roles' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActiveVal}
                      onChange={(e) => setIsActiveVal(e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label="Active Status"
                />
              )}

              {tab !== 'designations' && tab !== 'roles' && tab !== 'role-keys' && (
                <TextField
                  fullWidth
                  size="small"
                  label="Code (Optional)"
                  value={codeVal}
                  onChange={(e) => setCodeVal(e.target.value)}
                  disabled={saving}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
