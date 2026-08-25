import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import DownloadIcon from '@mui/icons-material/Download'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import InfoIcon from '@mui/icons-material/Info'
import DescriptionIcon from '@mui/icons-material/Description'
import DateRangeIcon from '@mui/icons-material/DateRange'
import { AppCard } from '@/components/ui/AppCard'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

function getCreatedAtUTC(startDateStr: string, endDateStr: string): [string, string] {
  const startUTC = new Date(`${startDateStr}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${endDateStr}T23:59:59.999+05:30`).toISOString()
  return [startUTC, endUTC]
}

export default function SortedListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const isSuperAdmin = user?.role === 'superAdmin'
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'warning' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
  } = useSuperAdminScope(isSuperAdmin)

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) {
      setToast({ open: true, msg: 'Enter Start Date!!', sev: 'error' })
      return
    }
    if (!endDate) {
      setToast({ open: true, msg: 'Enter End Date!!', sev: 'error' })
      return
    }

    setExporting(true)
    try {
      const [startUTC, endUTC] = getCreatedAtUTC(startDate, endDate)
      const res = await api.post(
        'contacts/masterSortSearch',
        {
          startDate: startUTC,
          endDate: endUTC,
          industryId: isSuperAdmin ? selectedIndustry || undefined : undefined,
          organizationId: isSuperAdmin ? selectedOrg || undefined : undefined,
          sort: { created_at: '-1' },
          filter: {
            transfer_status: [false],
          },
        },
        {
          responseType: 'blob',
        }
      )

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const indCode = String(selectedIndustry || '').toLowerCase().trim()
      const leadsLabel = indCode === 'temp0003' ? 'Patients' : 
                         indCode === 'temp0004' ? 'Students' : 
                         indCode === 'temp0005' ? 'Clients' : 
                         indCode === 'temp0006' ? 'Leads' : 
                         indCode === 'temp0007' ? 'Distributors' : 
                         indCode === 'temp0002' ? 'Customers' : 
                         'Leads'

      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${leadsLabel}_${new Date().toISOString().split('T')[0]}.xlsx`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(downloadUrl)
      setToast({ open: true, msg: 'Excel file downloaded successfully!', sev: 'success' })
    } catch (err: any) {
      console.error('Error while exporting leads:', err)
      setToast({ open: true, msg: 'Error while fetching sorted leads', sev: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const indCode = String(selectedIndustry || '').toLowerCase().trim()
  const leadsLabel = indCode === 'temp0003' ? 'Patients' : 
                     indCode === 'temp0004' ? 'Students' : 
                     indCode === 'temp0005' ? 'Clients' : 
                     indCode === 'temp0006' ? 'Leads' : 
                     indCode === 'temp0007' ? 'Distributors' : 
                     indCode === 'temp0002' ? 'Customers' : 
                     'Leads'

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
      <AppCard
        title={`Export Sorted ${leadsLabel}`}
        subtitle={`Configure criteria and export your ${leadsLabel} database records directly into Excel spreadsheet workbooks.`}
        fullHeight
      >
        <SuperAdminScopeSelector
          isSuperAdmin={isSuperAdmin}
          industries={industries}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filteredOrgs={filteredOrgs}
          selectedOrg={selectedOrg}
          setSelectedOrg={setSelectedOrg}
        />
        <Box sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, md: 2 }, height: '100%', overflowY: 'auto' }}>
          <Grid container spacing={4} sx={{ minHeight: '100%' }}>
            {/* Left Pane - Date Selector Form */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                component="form"
                onSubmit={handleExport}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  maxWidth: 500,
                  width: '100%',
                  mx: 'auto',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <DateRangeIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Select Export Window
                  </Typography>
                </Box>

                <TextField
                  type="date"
                  label="Start Date"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <CalendarMonthIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.25rem' }} />
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                    },
                  }}
                />

                <TextField
                  type="date"
                  label="End Date"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <CalendarMonthIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.25rem' }} />
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={exporting}
                  fullWidth
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 1,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'none',
                    },
                  }}
                >
                  {exporting ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      <span>Generating Spreadsheet...</span>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DownloadIcon />
                      <span>Export to Excel</span>
                    </Box>
                  )}
                </Button>
              </Box>
            </Grid>

            {/* Right Pane - Instructions and Guidelines Panel */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 3,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(79, 106, 245, 0.02)',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Export Guidelines & Rules
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <InfoIcon color="action" sx={{ mt: 0.25, fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Timezone Compatibility
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Start and End dates are configured in Indian Standard Time (IST) and mapped to UTC range filters on the backend to match creation parameters.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <InfoIcon color="action" sx={{ mt: 0.25, fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Workbook Formatting
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        The exported file will contain structured details on lead prioritization, contact owners, project info, locations, budgets, and transfer logs.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <InfoIcon color="action" sx={{ mt: 0.25, fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Access Scoping
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Super Administrators can download leads globally across organizations. Tenant administrators can only retrieve records belonging to their active workspace.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={toast.sev}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
