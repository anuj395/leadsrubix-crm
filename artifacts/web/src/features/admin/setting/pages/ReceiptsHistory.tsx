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
import ArticleIcon from '@mui/icons-material/Article'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import VerifiedIcon from '@mui/icons-material/Verified'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import EmailIcon from '@mui/icons-material/Email'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/hooks/useAuth'

interface ReceiptRecord {
  _id: string
  receiptNo: string
  invoiceId: string
  date: string
  planDescription: string
  subtotal: string
  gst: string
  totalPaid: string
  paymentMethod: string
  status: string
}

const MOCK_RECEIPTS: ReceiptRecord[] = Array.from({ length: 24 }, (_, i) => {
  const num = 24 - i
  const year = num > 12 ? '2026' : '2025'
  const monthNum = num > 12 ? num - 12 : num
  const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
  const isPlatinum = i % 4 === 0
  const totalVal = isPlatinum ? 9999 : 4999
  const gstVal = Math.round(totalVal * 0.18)
  const subtotalVal = totalVal - gstVal
  const recNo = `REC-LR-${year}${monthStr}${500 + i}`

  return {
    _id: recNo,
    receiptNo: recNo,
    invoiceId: `INV-${year}-${monthStr}`,
    date: `${year}-${monthStr}-01`,
    planDescription: isPlatinum ? 'Enterprise Platinum Plan (Monthly)' : 'Enterprise Gold Plan (Monthly)',
    subtotal: `₹${subtotalVal.toLocaleString()}.00`,
    gst: `₹${gstVal.toLocaleString()}.00`,
    totalPaid: `₹${totalVal.toLocaleString()}.00`,
    paymentMethod: 'Visa ending in 4242',
    status: 'Paid',
  }
})

export default function ReceiptsHistoryPage() {
  const { user } = useAuth()
  const orgName = (user as any)?.organizationName || (user as any)?.organization_name || 'Leads Rubix Client'
  const adminEmail = user?.email || 'admin@leadsrubix.com'

  const [receipts] = useState<ReceiptRecord[]>(MOCK_RECEIPTS)
  const [yearFilter, setYearFilter] = useState('ALL')

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [targetReceipt, setTargetReceipt] = useState<ReceiptRecord | null>(null)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  // Filter Logic
  const filtered = useMemo(() => {
    return receipts.filter((rec) => {
      const matchesYear = yearFilter === 'ALL' || rec.date.startsWith(yearFilter)
      return matchesYear
    })
  }, [receipts, yearFilter])

  const generatePdfReceipt = (rec: ReceiptRecord) => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${rec.receiptNo}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }
          .container { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; }
          .invoice-title { font-size: 20px; font-weight: 700; color: #0f172a; text-align: right; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
          td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row td { font-weight: 700; font-size: 16px; color: #4f46e5; background: #e0e7ff; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { background: none; margin: 0; } .container { border: none; box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Leads Rubix CRM</div>
            <div class="invoice-title">TAX PAYMENT RECEIPT<br/><span style="font-size: 13px; font-weight: 400; color: #64748b;">${rec.receiptNo}</span></div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Billed To Organization:</div>
              <div class="val">${orgName}</div>
              <div style="font-size: 13px; color: #64748b;">${adminEmail}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">GSTIN: 27AAACL1234H1Z5</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Payment Date:</div>
              <div class="val">${rec.date}</div>
              <div class="label" style="margin-top: 10px;">Linked Invoice:</div>
              <div class="val" style="font-family: monospace;">${rec.invoiceId}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Subtotal</th>
                <th>GST (18%)</th>
                <th style="text-align: right;">Total Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${rec.planDescription}</td>
                <td>${rec.subtotal}</td>
                <td>${rec.gst}</td>
                <td style="text-align: right; font-weight: 700;">${rec.totalPaid}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Net Payment Confirmed:</td>
                <td style="text-align: right;">${rec.totalPaid}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 13px; color: #475569;">
            <strong>Payment Method:</strong> ${rec.paymentMethod}
          </div>
          <div class="footer">
            Official E-Receipt generated by Leads Rubix Enterprise CRM System.<br/>
            This receipt serves as proof of payment for tax filing purposes.
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

  const handleSendEmail = () => {
    setEmailModalOpen(false)
    setToast({ open: true, msg: `Receipt ${targetReceipt?.receiptNo} sent to ${adminEmail}`, sev: 'success' })
  }

  const columns = useMemo<GridColDef<ReceiptRecord>[]>(() => {
    return [
      {
        field: 'receiptNo',
        headerName: 'Receipt No',
        width: 160,
        minWidth: 160,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'primary.main', fontSize: '0.8125rem' }}>
            {p.row.receiptNo}
          </Typography>
        ),
      },
      {
        field: 'invoiceId',
        headerName: 'Linked Invoice',
        width: 140,
        minWidth: 140,
        renderCell: (p) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'text.secondary' }}>
            {p.row.invoiceId}
          </Typography>
        ),
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 130,
        minWidth: 130,
      },
      {
        field: 'planDescription',
        headerName: 'Description',
        flex: 1,
        minWidth: 220,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
            {p.row.planDescription}
          </Typography>
        ),
      },
      {
        field: 'subtotal',
        headerName: 'Subtotal',
        width: 130,
        minWidth: 130,
      },
      {
        field: 'gst',
        headerName: 'GST (18%)',
        width: 130,
        minWidth: 130,
        renderCell: (p) => (
          <Typography color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {p.row.gst}
          </Typography>
        ),
      },
      {
        field: 'totalPaid',
        headerName: 'Total Paid',
        width: 140,
        minWidth: 140,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
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
                setTargetReceipt(p.row)
                setEmailModalOpen(true)
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
          Receipts & Historical Charges
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Official tax receipts, GST audit logs, and historic subscription payments for {orgName}.
        </Typography>
      </Box>

      {/* Metric Cards */}
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
                <ArticleIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Total Receipts</Typography>
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
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.06) 0%, rgba(56, 189, 248, 0.06) 100%)',
              border: '1px solid rgba(14, 165, 233, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <AccountBalanceIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Total GST Paid (18%)</Typography>
                <Typography variant="h6" fontWeight={700}>₹26,096.00</Typography>
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
                <VerifiedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">GSTIN Registration</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: '0.925rem' }}>27AAACL1234H1Z5</Typography>
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
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(236, 72, 153, 0.06) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <CheckCircleIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Tax Audit Status</Typography>
                <Typography variant="h6" fontWeight={700}>100% Verified</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Table AppCard powered by AppDataGrid */}
      <AppCard
        title="Tax Receipts & Historical Payment Log"
        subtitle="Download official proof of payment receipts for accounting and tax records"
        action={
          <TextField
            select
            size="small"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            sx={{ minWidth: 110 }}
          >
            <MenuItem value="ALL">All Years</MenuItem>
            <MenuItem value="2026">2026</MenuItem>
            <MenuItem value="2025">2025</MenuItem>
          </TextField>
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
      <Dialog open={emailModalOpen} onClose={() => setEmailModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Email Receipt — {targetReceipt?.receiptNo}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Send an official PDF copy of this receipt directly to your registered administrator email:
            </Typography>
            <TextField
              label="Recipient Email"
              value={adminEmail}
              size="small"
              fullWidth
              disabled
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEmailModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<EmailIcon fontSize="small" />} onClick={handleSendEmail} sx={{ textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
