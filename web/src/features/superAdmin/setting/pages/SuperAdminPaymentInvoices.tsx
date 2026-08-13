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
import Chip from '@mui/material/Chip'
import type { GridColDef } from '@mui/x-data-grid'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PaymentsIcon from '@mui/icons-material/Payments'
import BusinessIcon from '@mui/icons-material/Business'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'

interface SuperAdminPaymentInvoice {
  _id: string
  id: string
  organizationId: string
  organizationName: string
  date: string
  amount: string
  subtotal: string
  gst: string
  planName: string
  method: string
  status: string
  txnId: string
  industryId: string
}

const CLIENT_ORGS = [
  { id: 'org_alpha', name: 'Alpha Corp Real Estate', industry: 'temp0001' },
  { id: 'org_beta', name: 'Beta Solutions Tech', industry: 'temp0001' },
  { id: 'org_gamma', name: 'Gamma Enterprises', industry: 'temp0001' },
  { id: 'org_delta', name: 'Delta Housing Pvt Ltd', industry: 'temp0001' },
]

const MOCK_SUPER_ADMIN_INVOICES: SuperAdminPaymentInvoice[] = Array.from({ length: 48 }, (_, i) => {
  const num = 48 - i
  const year = num > 24 ? '2026' : '2025'
  const monthNum = (num % 12) + 1
  const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
  const orgObj = CLIENT_ORGS[i % CLIENT_ORGS.length]
  const isPlatinum = i % 3 === 0
  const amountVal = isPlatinum ? 9999 : 4999
  const gstVal = Math.round(amountVal * 0.18)
  const subtotalVal = amountVal - gstVal
  const invId = `INV-SA-${year}-${monthStr}${10 + i}`

  return {
    _id: invId,
    id: invId,
    organizationId: orgObj.id,
    organizationName: orgObj.name,
    date: `${year}-${monthStr}-01`,
    amount: `₹${amountVal.toLocaleString()}.00`,
    subtotal: `₹${subtotalVal.toLocaleString()}.00`,
    gst: `₹${gstVal.toLocaleString()}.00`,
    planName: isPlatinum ? 'Enterprise Platinum Plan' : 'Enterprise Gold Plan',
    method: 'Visa ending in 4242',
    status: i === 7 ? 'Pending' : 'Paid',
    txnId: `TXN_SA_${year}${monthStr}${1000 + i}`,
    industryId: orgObj.industry,
  }
})

export default function SuperAdminPaymentInvoicesPage() {
  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(true)

  const [invoices] = useState<SuperAdminPaymentInvoice[]>(MOCK_SUPER_ADMIN_INVOICES)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [planFilter, setPlanFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

  // Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<SuperAdminPaymentInvoice | null>(null)

  // Filter Logic
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesIndustry = !selectedIndustry || inv.industryId === selectedIndustry
      const matchesOrg = !selectedOrg || selectedOrg === 'all' || inv.organizationId === selectedOrg
      const matchesStatus = statusFilter === 'ALL' || inv.status.toUpperCase() === statusFilter.toUpperCase()
      const matchesPlan = planFilter === 'ALL' || inv.planName.toLowerCase().includes(planFilter.toLowerCase())
      const matchesYear = yearFilter === 'ALL' || inv.date.startsWith(yearFilter)
      return matchesIndustry && matchesOrg && matchesStatus && matchesPlan && matchesYear
    })
  }, [invoices, selectedIndustry, selectedOrg, statusFilter, planFilter, yearFilter])

  const generatePdfReceipt = (inv: SuperAdminPaymentInvoice) => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Global Invoice - ${inv.id}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }
          .container { max-width: 750px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
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
            <div class="logo">Leads Rubix Master Admin</div>
            <div class="invoice-title">CLIENT INVOICE RECORD<br/><span style="font-size: 13px; font-weight: 400; color: #64748b;">${inv.id}</span></div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Billed Client Tenant:</div>
              <div class="val">${inv.organizationName}</div>
              <div style="font-size: 13px; color: #64748b;">Tenant ID: ${inv.organizationId}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Billing Date:</div>
              <div class="val">${inv.date}</div>
              <div class="label" style="margin-top: 10px;">Status:</div>
              <div class="badge">${inv.status.toUpperCase()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Subscription Plan</th>
                <th>Transaction Reference</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${inv.planName}</td>
                <td>${inv.txnId}</td>
                <td style="text-align: right;">${inv.subtotal}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; font-weight: 600;">GST Tax (18% Included):</td>
                <td style="text-align: right; font-weight: 600;">${inv.gst}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right;">Total Amount Paid:</td>
                <td style="text-align: right;">${inv.amount}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 13px; color: #475569;">
            <strong>Payment Method:</strong> ${inv.method}
          </div>
          <div class="footer">
            Super Admin Global Financial Ledger — Leads Rubix Multi-Tenant SaaS Platform
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

  const columns = useMemo<GridColDef<SuperAdminPaymentInvoice>[]>(() => {
    return [
      {
        field: 'id',
        headerName: 'Invoice ID',
        width: 160,
        minWidth: 160,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'primary.main', fontSize: '0.8125rem' }}>
            {p.row.id}
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
        field: 'planName',
        headerName: 'Plan Name',
        flex: 1,
        minWidth: 180,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
            {p.row.planName}
          </Typography>
        ),
      },
      {
        field: 'date',
        headerName: 'Billing Date',
        width: 130,
        minWidth: 130,
      },
      {
        field: 'amount',
        headerName: 'Amount Charged',
        width: 140,
        minWidth: 140,
        renderCell: (p) => (
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
            {p.row.amount}
          </Typography>
        ),
      },
      {
        field: 'method',
        headerName: 'Payment Method',
        width: 160,
        minWidth: 160,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        minWidth: 120,
        renderCell: (p) => <StatusBadge value={p.row.status} />,
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
              startIcon={<VisibilityIcon sx={{ fontSize: '0.875rem' }} />}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedInvoice(p.row)
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
              Details
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
              Invoice PDF
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
          Global Payment Invoice Logs (Super Admin)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor system-wide client billing logs, transaction receipts, and organization payments.
        </Typography>
      </Box>

      {/* Global Super Admin Scope Bar */}
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
                <ReceiptLongIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Total System Invoices</Typography>
                <Typography variant="h6" fontWeight={700}>{invoices.length} Invoices</Typography>
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
                <PaymentsIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Platform Revenue</Typography>
                <Typography variant="h6" fontWeight={700}>₹329,936.00</Typography>
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
                <BusinessIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Active Client Tenants</Typography>
                <Typography variant="h6" fontWeight={700}>{CLIENT_ORGS.length} Organizations</Typography>
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
                <AutorenewIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.01em">Auto-Renew Status</Typography>
                <Typography variant="h6" fontWeight={700}>98% Active</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Table AppCard */}
      <AppCard
        title="Super Admin Invoice Catalog"
        subtitle="Global billing records across all client organizations"
        action={
          <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
            <TextField
              select
              size="small"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">All Plans</MenuItem>
              <MenuItem value="Gold">Enterprise Gold</MenuItem>
              <MenuItem value="Platinum">Enterprise Platinum</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
            </TextField>

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

      {/* Invoice Details Dialog */}
      <Dialog open={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: '1.1rem' }}>
          Global Invoice — {selectedInvoice?.id}
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Organization:</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedInvoice.organizationName}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Tenant ID:</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {selectedInvoice.organizationId}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Plan:</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedInvoice.planName}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Billing Date:</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedInvoice.date}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Txn Ref ID:</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {selectedInvoice.txnId}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedInvoice.subtotal}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">GST (18%):</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedInvoice.gst}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={700}>Total Charged:</Typography>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  {selectedInvoice.amount}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Chip label={selectedInvoice.status} color="success" size="small" />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedInvoice(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>Close</Button>
          {selectedInvoice && (
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon fontSize="small" />}
              onClick={() => {
                const inv = selectedInvoice
                setSelectedInvoice(null)
                generatePdfReceipt(inv)
              }}
              sx={{ textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
