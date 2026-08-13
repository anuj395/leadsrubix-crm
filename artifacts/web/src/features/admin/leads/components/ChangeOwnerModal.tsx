import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { listManagerCandidates, type ManagerCandidate } from '@/services/usersAdminService'
import { transferContacts } from '@/services/contactsService'

interface ChangeOwnerModalProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}

const TRANSFER_REASONS = [
  'Reassigned by Admin',
  'Lead Unresponsive',
  'Territory Re-allocation',
  'Owner Left Organization',
  'Workload Balancing',
  'Other'
]

const LEAD_TYPES = ['Leads', 'Data']

export function ChangeOwnerModal({ open, onClose, selectedIds, onSuccess }: ChangeOwnerModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [users, setUsers] = useState<ManagerCandidate[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [selectedUserId, setSelectedUserId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [leadType, setLeadType] = useState('')

  // Options
  const [fresh, setFresh] = useState(false)
  const [tasks, setTasks] = useState(false)
  const [notes, setNotes] = useState(true)
  const [attachments, setAttachments] = useState(true)
  const [contactDetails, setContactDetails] = useState(true)

  useEffect(() => {
    if (open) {
      setStep(1)
      setError(null)
      setLoadingUsers(true)
      listManagerCandidates('sales')
        .then((data) => setUsers(data))
        .catch(() => setError('Failed to load user list'))
        .finally(() => setLoadingUsers(false))
    }
  }, [open])

  const handleNext = () => {
    if (!selectedUserId) {
      setError('Please choose an owner to assign.')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSubmit = async () => {
    const selectedUser = users.find((u) => u._id === selectedUserId)
    if (!selectedUser) {
      setError('Selected owner is invalid.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await transferContacts({
        ids: selectedIds,
        owner: {
          email: selectedUser.email,
          uid: selectedUser._id,
        },
        reason: transferReason,
        leadType,
        options: {
          fresh,
          task: tasks,
          notes,
          attachments,
          contactDetails,
        },
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to transfer owner.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
        Change Owner ({selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''})
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            <FormControl fullWidth size="small" disabled={loadingUsers}>
              <InputLabel>Choose Owner</InputLabel>
              <Select
                value={selectedUserId}
                label="Choose Owner"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.name} ({u.email}) — {u.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={fresh}
                  onChange={(e) => {
                    setFresh(e.target.checked)
                    if (e.target.checked) setTasks(false)
                  }}
                />
              }
              label="Transfer Lead(s) as Fresh?"
            />

            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>
              Select Transfer Options:
            </Typography>

            <Grid container spacing={1}>
              {!fresh && (
                <Grid size={{ xs: 6 }}>
                  <FormControlLabel
                    control={<Checkbox checked={tasks} onChange={(e) => setTasks(e.target.checked)} />}
                    label="Include Open Tasks"
                  />
                </Grid>
              )}
              <Grid size={{ xs: 6 }}>
                <FormControlLabel
                  control={<Checkbox checked={notes} onChange={(e) => setNotes(e.target.checked)} />}
                  label="Include Notes"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel
                  control={<Checkbox checked={attachments} onChange={(e) => setAttachments(e.target.checked)} />}
                  label="Include Attachments"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel
                  control={<Checkbox checked={contactDetails} onChange={(e) => setContactDetails(e.target.checked)} />}
                  label="Include Contact Details"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Reason To Transfer</InputLabel>
              <Select
                value={transferReason}
                label="Select Reason To Transfer"
                onChange={(e) => setTransferReason(e.target.value)}
              >
                {TRANSFER_REASONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Please Select Lead Type</InputLabel>
              <Select
                value={leadType}
                label="Please Select Lead Type"
                onChange={(e) => setLeadType(e.target.value)}
              >
                {LEAD_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>

        {step === 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={loadingUsers || !selectedUserId}>
            Next
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setStep(1)} disabled={submitting}>
              Back
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Change Owner'}
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  )
}
