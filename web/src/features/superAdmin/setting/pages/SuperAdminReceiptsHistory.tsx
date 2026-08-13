import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import type { GridColDef } from '@mui/x-data-grid'
import ReceiptIcon from '@mui/icons-material/Receipt'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import EmailIcon from '@mui/icons-material/Email'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

interface SuperAdminReceiptItem {
  _id: string
  id: string
  organizationId: string
  organizationName: string
  receiptNo: string
  linkedInvoice: string
  date: string
  description: string
  subtotal: string
  gst: string
  totalPaid: string
  gstin: string
  industryId: string
}

const CLIENT_ORGS = [
  { id: 'org_alpha', name: 'Alpha Corp Real Estate', industry: 'temp0001', gstin: '27AAACL1234H1Z5' },
  { id: 'org_beta', name: 'Beta Solutions Tech', industry: 'temp0001', gstin: '07BBBCL9876K2Z9' },
  { id: 'org_gamma', name: 'Gamma Enterprises', industry: 'temp0001', gstin: '19CCCDE5432M3Z1' },
  { id: 'org_delta', name: 'Delta Housing Pvt Ltd', industry: 'temp0001', gstin: '33DDDFG8765N4Z8' },
]

const MOCK_SUPER_ADMIN_RECEIPTS: SuperAdminReceiptItem[] = Array.from({ length: 48 }, (_, i) => {
  const num = 48 - i
  const year = num > 24 ? '2026' : '2025'
  const monthNum = (num % 12) + 1
  const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
  const orgObj = CLIENT_ORGS[i % CLIENT_ORGS.length]
  const isPlatinum = i % 3 === 0
  const totalVal = isPlatinum ? 9999 : 4999
  const gstVal = Math.round(totalVal * 0.18)
  const subtotalVal = totalVal - gstVal
  const receiptNo = `REC-SA-${year}-${monthStr}${100 + i}`
  const invNo = `INV-SA-${year}-${monthStr}${10 + i}`

  return {
    _id: receiptNo,
    id: receiptNo,
    organizationId: orgObj.id,
    organizationName: orgObj.name,
    receiptNo: receiptNo,
    linkedInvoice: invNo,
    date: `${year}-${monthStr}-01`,
    description: isPlatinum ? 'Enterprise Platinum Plan (Monthly)' : 'Enterprise Gold Plan (Monthly)',
    subtotal: `₹${subtotalVal.toLocaleString()}.00`,
    gst: `₹${gstVal.toLocaleString()}.00`,
    totalPaid: `₹${totalVal.toLocaleString()}.00`,
    gstin: orgObj.gstin,
    industryId: orgObj.industry,
  }
})

export default function SuperAdminReceiptsHistoryPage() {
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(true)

  const [receipts] = useState<SuperAdminReceiptItem[]>(MOCK_SUPER_ADMIN_RECEIPTS)
  const [yearFilter, setYearFilter] = useState('ALL')

  // Email Dialog State
  const [emailDialogTarget, setEmailDialogTarget] = useState<SuperAdminReceiptItem | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const filtered = useMemo(() => {
    return receipts.filter((rec) => {
      const matchesIndustry = !selectedIndustry || rec.industryId === selectedIndustry
      const matchesOrg = !selectedOrg || selectedOrg === 'all' || rec.organizationId === selectedOrg
      const matchesYear = yearFilter === 'ALL' || rec.date.startsWith(yearFilter)
      return matchesIndustry && matchesOrg && matchesYear
    })
  }, [receipts, selectedIndustry, selectedOrg, yearFilter])

  const generatePdfReceipt = (item: SuperAdminReceiptItem) => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GST Tax Receipt - ${item.receiptNo}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }
          .container { max-width: 750px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
          .receipt-title { font-size: 20px; font-weight: 700; color: #0f172a; text-align: right; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
          td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row td { font-weight: 700; font-size: 16px; color: #059669; background: #d1fae5; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { background: none; margin: 0; } .container { border: none; box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Leads Rubix Global Ledger</div>
            <div class="receipt-title">GST TAX RECEIPT<br/><span style="font-size: 13px; font-weight: 400; color: #64748b;">${item.receiptNo}</span></div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Billed Organization:</div>
              <div class="val">${item.organizationName}</div>
              <div style="font-size: 13px; color: #64748b;">GSTIN: ${item.gstin}</div>
              <div style="font-size: 13px; color: #64748b;">Tenant ID: ${item.organizationId}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Payment Date:</div>
              <div class="val">${item.date}</div>
              <div class="label" style="margin-top: 10px;">Linked Invoice Ref:</div>
              <div class="val" style="color: #059669;">${item.linkedInvoice}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Subtotal</th>
                <th style="text-align: right;">GST (18%)</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${item.description}</td>
                <td style="text-align: right;">${item.subtotal}</td>
                <td style="text-align: right;">${item.gst}</td>
                <td style="text-align: right; font-weight: 700;">${item.totalPaid}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Net Amount Received:</td>
                <td style="text-align: right;">${item.totalPaid}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Official Proof of Payment & GST Audit Record — Leads Rubix Super Admin Global SaaS Management
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    const printWin = window.open('', '_blank', 'width=800,height=900')
    if (printWin) {
      printWin.document.write(receiptHtml)
      printWin.document.close()
    }
  }

  const sendEmailReceipt = () => {
    if (!emailInput || !emailDialogTarget) return
    setSendingEmail(true)
    setTimeout(() => {
      setSendingEmail(false)
      setToast({ open: true, message: `Tax receipt ${emailDialogTarget.receiptNo} successfully sent to ${emailInput}` })
      setEmailDialogTarget(null)
      setEmailInput('')
    }, 600)
  }

  const columns = useMemo<GridColDef<SuperAdminReceiptItem>[]>(() => {
    return [
      {
        field: 'receiptNo',
        headerName: 'Receipt No',
        width: 170,
        minWidth: 170,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'primary.main', fontSize: '0.8125rem' }}>
            {p.row.receiptNo}
          </Typography>
        ),
      },
      {
        field: 'organizationName',
        headerName: 'Organization',
        flex: 1.2,
        minWidth: 180,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {p.row.organizationName}
          </Typography>
        ),
      },
      {
        field: 'linkedInvoice',
        headerName: 'Linked Invoice',
        width: 160,
        minWidth: 160,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 500, fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8125rem' }}>
            {p.row.linkedInvoice}
          </Typography>
        ),
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        minWidth: 120,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.2,
        minWidth: 200,
      },
      {
        field: 'subtotal',
        headerName: 'Subtotal',
        width: 120,
        minWidth: 120,
      },
      {
        field: 'gst',
        headerName: 'GST (18%)',
        width: 120,
        minWidth: 120,
      },
      {
        field: 'totalPaid',
        headerName: 'Total Paid',
        width: 130,
        minWidth: 130,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 700, color: 'success.main', fontSize: '0.8125rem' }}>
            {p.row.totalPaid}
          </Typography>
        ),
      },
      {
        field: '__actions__',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        headerAlign: 'right',
        width: 220,
        minWidth: 220,
        renderCell: (p) => (
          <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<EmailIcon sx={{ fontSize: '0.875rem' }} />}
              onClick={(e) => {
                e.stopPropagation()
                setEmailDialogTarget(p.row)
                setEmailInput(`admin@${p.row.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
              }}
              sx={{
                height: 30,
                px: 1.25,
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            >
              Email
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdfIcon sx={{ fontSize: '0.875rem' }} />}
              onClick={(e) => {
                e.stopPropagation()
                generatePdfReceipt(p.row)
              }}
              sx={{
                height: 30,
                px: 1.25,
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                boxShadow: 'none',
              }}
            >
              PDF Receipt
            </Button>
          </Stack>
        ),
      },
    ]
  }, [])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          Global Receipts & Historical Charges (Super Admin)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Platform-wide GST tax receipts, payment auditing, and subscription charge history.
        </Typography>
      </Box>

      {/* Global Super Admin Scope Selector */}
      <SuperAdminScopeSelector
        isSuperAdmin={true}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        filteredOrgs={filteredOrgs}
        selectedOrg={selectedOrg}
        setSelectedOrg={setSelectedOrg}
      />

      {/* Platform Metric Cards */}
      <Grid container spacing={2} sx={{ flexShrink: 0 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <ReceiptIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Total System Receipts</Typography>
                <Typography variant="h6" fontWeight={700}>{receipts.length} Receipts</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(16, 185, 129, 0.06) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <AccountBalanceIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Total GST Collected (18%)</Typography>
                <Typography variant="h6" fontWeight={700}>₹59,388.00</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(234, 179, 8, 0.06) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <VerifiedUserIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">GSTIN Registrations</Typography>
                <Typography variant="h6" fontWeight={700}>{CLIENT_ORGS.length} Tax Entities</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(37, 99, 235, 0.06) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <VerifiedUserIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Tax Audit Status</Typography>
                <Typography variant="h6" fontWeight={700}>100% Verified</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Table AppCard */}
      <AppCard
        title="Super Admin Receipts Catalog"
        subtitle="Download and audit official proof of payment receipts for all client tenants"
        action={
          <Stack direction="row" spacing={1.5}>
            <TextField
              select
              size="small"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="ALL">All Years</MenuItem>
              <MenuItem value="2026">2026</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
            </TextField>
          </Stack>
        }
      >
        <AppDataGrid
          height="520px"
          rows={filtered}
          columns={columns}
          getRowId={(r) => r._id}
          pageSizeOptions={[10, 25, 50]}
        />
      </AppCard>

      {/* Email Receipt Dialog */}
      <Dialog open={Boolean(emailDialogTarget)} onClose={() => setEmailDialogTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: '1.1rem' }}>
          Email GST Receipt — {emailDialogTarget?.receiptNo}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send official proof of payment to the client organization billing administrator.
          </Typography>
          <TextField
            fullWidth
            label="Recipient Email Address"
            variant="outlined"
            size="small"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEmailDialogTarget(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!emailInput || sendingEmail}
            onClick={sendEmailReceipt}
            sx={{ textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {sendingEmail ? 'Sending...' : 'Send Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast({ open: false, message: '' })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
