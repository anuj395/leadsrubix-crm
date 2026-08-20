import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { listDeals, deleteDeal, updateDeal, type Deal } from '@/services/dealsService'
import { useConfirm } from '@/components/common/ConfirmContext'

const STAGES = [
  { key: 'QUALIFICATION', label: 'Qualification' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'WON', label: 'Closed Won' },
  { key: 'LOST', label: 'Closed Lost' }
]

export default function DealsListPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listDeals()
      setDeals(list)
    } catch (e: unknown) {
      setToast({ open: true, msg: 'Failed to load deals', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Deal) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete deal: ${String(row.name)}?`,
      onConfirm: async () => {
        try {
          await deleteDeal(row._id)
          setToast({ open: true, msg: 'Deal deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to delete deal', sev: 'error' })
        }
      }
    })
  }

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await updateDeal(dealId, { stage: newStage })
      setToast({ open: true, msg: `Deal stage updated to ${newStage}`, sev: 'success' })
      await refresh()
    } catch (e: unknown) {
      setToast({ open: true, msg: 'Failed to update deal stage', sev: 'error' })
    }
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ typography: 'h5', fontWeight: 700 }}>Deals Pipeline (Kanban)</Box>
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflowX: 'auto', pb: 2 }}>
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => (d.stage || 'QUALIFICATION') === stage.key)
          return (
            <Box key={stage.key} sx={{ minWidth: 280, width: 280, flexShrink: 0 }}>
              <Box sx={{
                bgcolor: 'background.default',
                borderRadius: '12px',
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {stage.label}
                  </Typography>
                  <Typography variant="caption" sx={{
                    bgcolor: 'action.selected',
                    px: 1,
                    py: 0.25,
                    borderRadius: '8px',
                    fontWeight: 600
                  }}>
                    {stageDeals.length}
                  </Typography>
                </Stack>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flexGrow: 1 }}>
                  {stageDeals.map((deal) => (
                    <Card key={deal._id} sx={{
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {deal.name}
                          </Typography>
                          <IconButton onClick={() => handleDelete(deal)} size="small" color="error" sx={{ p: 0.25 }}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Amount: {deal.amount ? `$${deal.amount.toLocaleString()}` : '—'}
                        </Typography>

                        <FormControl size="small" fullWidth>
                          <InputLabel>Stage</InputLabel>
                          <Select
                            value={deal.stage || 'QUALIFICATION'}
                            label="Stage"
                            onChange={(e) => handleStageChange(deal._id, e.target.value)}
                          >
                            {STAGES.map((s) => (
                              <MenuItem key={s.key} value={s.key}>
                                {s.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
