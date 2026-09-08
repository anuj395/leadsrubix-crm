import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import SaveIcon from '@mui/icons-material/Save'
import { api } from '@/services/api'

interface UserItem {
  _id: string
  id?: string
  name?: string
  email: string
  role?: string
}

export function LeadDistributionTab({ showToast }: { showToast: (msg: string, sev?: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])

  const [form, setForm] = useState({
    enabled: true,
    mode: 'ROUND_ROBIN',
    maxDailyCapPerUser: 25,
    participatingUserIds: [] as string[],
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cfgRes, usersRes] = await Promise.all([
        api.get('lead-distribution').catch(() => ({ data: null })),
        api.get('users').catch(() => ({ data: null })),
      ])

      if (cfgRes?.data?.item) {
        const item = cfgRes.data.item
        setForm({
          enabled: Boolean(item.enabled),
          mode: item.mode || 'ROUND_ROBIN',
          maxDailyCapPerUser: Number(item.maxDailyCapPerUser) || 25,
          participatingUserIds: Array.isArray(item.participatingUserIds) ? item.participatingUserIds : [],
        })
      }

      const uItems = usersRes?.data?.items || usersRes?.data?.users || (Array.isArray(usersRes?.data) ? usersRes.data : [])
      setUsers(uItems)
    } catch (err: any) {
      showToast(err?.message || 'Failed to load lead distribution settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('lead-distribution', form)
      showToast('Lead distribution rules updated successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleUser = (email: string) => {
    setForm((prev) => {
      const exists = prev.participatingUserIds.includes(email)
      const next = exists ? prev.participatingUserIds.filter((e) => e !== email) : [...prev.participatingUserIds, email]
      return { ...prev, participatingUserIds: next }
    })
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 780 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Automated Lead Distribution Engine
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Automatically route incoming Meta/Facebook, Google, and Website webhooks to active sales reps based on Round-Robin rules and daily lead capacity.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                />
              }
              label={
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Enable Automated Lead Distribution Engine
                </Typography>
              }
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Distribution Algorithm"
                fullWidth
                value={form.mode}
                onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
              >
                <MenuItem value="ROUND_ROBIN">Weighted Round-Robin Rotation</MenuItem>
                <MenuItem value="CAPACITY_BASED">Daily Capacity Routing</MenuItem>
              </TextField>

              <TextField
                label="Max Daily Lead Cap Per Agent"
                type="number"
                fullWidth
                value={form.maxDailyCapPerUser}
                onChange={(e) => setForm((p) => ({ ...p, maxDailyCapPerUser: Number(e.target.value) || 1 }))}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Participating Sales Reps ({form.participatingUserIds.length} Selected)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', maxHeight: 220, overflowY: 'auto' }}>
                {users.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No users found.
                  </Typography>
                ) : (
                  users.map((u) => (
                    <FormControlLabel
                      key={u._id || u.id || u.email}
                      control={
                        <Switch
                          checked={form.participatingUserIds.includes(u.email)}
                          onChange={() => handleToggleUser(u.email)}
                        />
                      }
                      label={`${u.name || u.email} (${u.email})`}
                      sx={{ display: 'block', mb: 0.5 }}
                    />
                  ))
                )}
              </Paper>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Save Distribution Rules'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
