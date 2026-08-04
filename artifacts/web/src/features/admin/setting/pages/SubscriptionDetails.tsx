import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TablePagination from '@mui/material/TablePagination'
import InputAdornment from '@mui/material/InputAdornment'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import PaymentIcon from '@mui/icons-material/Payment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import SearchIcon from '@mui/icons-material/Search'

import { AppCard } from '@/components/ui/AppCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/services/api'

interface Invoice {
  id: string
  date: string
  amount: string
  method: string
  status: string
}

const INITIAL_INVOICES: Invoice[] = Array.from({ length: 24 }, (_, i) => {
  const num = 24 - i
  const monthStr = num < 10 ? `0${num}` : `${num}`
  const year = num > 12 ? '2026' : '2025'
  const displayMonth = num > 12 ? (num - 12 < 10 ? `0${num - 12}` : `${num - 12}`) : monthStr
  return {
    id: `INV-${year}-${displayMonth}`,
    date: `${year}-${displayMonth}-01`,
    amount: i % 3 === 0 ? '₹9,999.00' : '₹4,999.00',
    method: 'Visa ending in 4242',
    status: 'Paid',
  }
})

const PLANS = [
  { name: 'Silver Growth Plan', price: 2999, seats: 5, leads: 25000, desc: 'Ideal for small growing sales teams.' },
  { name: 'Enterprise Gold Plan', price: 4999, seats: 10, leads: 50000, desc: 'Our most popular enterprise plan with full features.' },
  { name: 'Enterprise Platinum Plan', price: 9999, seats: 25, leads: 150000, desc: 'Unlimited scale for high volume enterprise organizations.' },
]

import { useNavigate } from 'react-router-dom'

export default function SubscriptionDetailsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription, refetch } = useSubscription()

  const [registeredMethod, setRegisteredMethod] = useState('Visa ending in 4242')
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES)

  // Modal States
  const [updateCardOpen, setUpdateCardOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [savingCard, setSavingCard] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  // Card Form State
  const [cardForm, setCardForm] = useState({
    name: 'Admin User',
    number: '•••• •••• •••• 4242',
    expiry: '12/28',
    cvc: '•••',
  })

  // Upgrade Plan Form State
  const [selectedPlan, setSelectedPlan] = useState('Enterprise Gold Plan')
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly')
  const [customSeats, setCustomSeats] = useState(10)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponResult, setCouponResult] = useState<{ valid: boolean; code?: string; discountAmount: number; message: string } | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  // Invoice Table Pagination & Filtering State
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const filteredInvoices = invoices.filter((inv) => {
    const q = invoiceSearch.toLowerCase().trim()
    if (!q) return true
    return (
      inv.id.toLowerCase().includes(q) ||
      inv.date.toLowerCase().includes(q) ||
      inv.amount.toLowerCase().includes(q) ||
      inv.method.toLowerCase().includes(q)
    )
  })

  const pagedInvoices = filteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const generatePdfReceipt = (inv: Invoice) => {
    const orgName = (user as any)?.organizationName || (user as any)?.organization_name || 'Leads Rubix Client'
    const adminEmail = user?.email || 'admin@leadsrubix.com'

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${inv.id}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }
          .container { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; }
          .invoice-title { font-size: 20px; font-weight: 700; color: #0f172a; text-align: right; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
          td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row td { font-weight: 800; font-size: 16px; color: #4f46e5; background: #e0e7ff; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #dcfce7; color: #166534; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { background: none; margin: 0; } .container { border: none; box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Leads Rubix CRM</div>
            <div class="invoice-title">OFFICIAL RECEIPT<br/><span style="font-size: 13px; font-weight: 400; color: #64748b;">${inv.id}</span></div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Billed To:</div>
              <div class="val">${orgName}</div>
              <div style="font-size: 13px; color: #64748b;">${adminEmail}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Billing Date:</div>
              <div class="val">${inv.date}</div>
              <div class="label" style="margin-top: 10px;">Payment Status:</div>
              <div class="badge">${inv.status.toUpperCase()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Billing Cycle</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Enterprise Gold Subscription Plan</td>
                <td>Monthly</td>
                <td style="text-align: right;">${inv.amount}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; font-weight: 600;">GST (18% Included):</td>
                <td style="text-align: right; font-weight: 600;">Calculated in total</td>
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
            Thank you for choosing Leads Rubix Enterprise CRM.<br/>
            For support inquiries, contact support@leadsrubix.com
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

  // 2. Save Card Handler
  const handleSaveCard = async () => {
    if (!cardForm.name || !cardForm.number) {
      setToast({ open: true, msg: 'Please fill in valid card details', sev: 'error' })
      return
    }
    setSavingCard(true)
    setTimeout(() => {
      const last4 = cardForm.number.replace(/\s/g, '').slice(-4) || '4242'
      const newMethod = `Visa ending in ${last4}`
      setRegisteredMethod(newMethod)
      setSavingCard(false)
      setUpdateCardOpen(false)
      setToast({ open: true, msg: 'Payment card updated successfully!', sev: 'success' })
    }, 800)
  }

  // 3. Coupon Validation Handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setToast({ open: true, msg: 'Enter a coupon code', sev: 'error' })
      return
    }
    setCouponLoading(true)
    setCouponResult(null)
    try {
      const targetPlan = PLANS.find((p) => p.name === selectedPlan) || PLANS[1]
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        planPrice: targetPlan.price,
      })
      if (res.data?.valid) {
        setCouponResult({
          valid: true,
          code: res.data.code,
          discountAmount: res.data.discountAmount,
          message: res.data.message,
        })
        setToast({ open: true, msg: res.data.message, sev: 'success' })
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Invalid or expired coupon code'
      setCouponResult({ valid: false, discountAmount: 0, message: msg })
      setToast({ open: true, msg, sev: 'error' })
    } finally {
      setCouponLoading(false)
    }
  }

  // 4. Upgrade Plan Submission Handler
  const handleUpgradeSubmit = async () => {
    setUpgrading(true)
    try {
      const res = await api.post('/organizations/my-subscription/upgrade', {
        planName: selectedPlan,
        billingFrequency: billingCycle,
        seats: customSeats,
        couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        paymentMethod: registeredMethod,
      })

      setToast({ open: true, msg: res.data?.message || 'Subscription upgraded successfully!', sev: 'success' })

      // Create new invoice log
      const newInv: Invoice = {
        id: `INV-2026-00${invoices.length + 7}`,
        date: new Date().toISOString().split('T')[0],
        amount: `₹${(PLANS.find((p) => p.name === selectedPlan)?.price || 4999).toLocaleString()}.00`,
        method: registeredMethod,
        status: 'Paid',
      }
      setInvoices([newInv, ...invoices])

      setUpgradeModalOpen(false)
      await refetch()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to upgrade subscription', sev: 'error' })
    } finally {
      setUpgrading(false)
    }
  }

  const activePlanObj = PLANS.find((p) => p.name === selectedPlan) || PLANS[1]
  const basePrice = activePlanObj.price * (billingCycle === 'Yearly' ? 0.85 : 1)
  const discountVal = couponResult?.valid ? couponResult.discountAmount : 0
  const finalPrice = Math.max(0, Math.round(basePrice - discountVal))

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
          Subscription & Billing
        </Typography>
        <Typography color="text.secondary">
          Overview of your current enterprise subscription plan, workspace usage, and payment history.
        </Typography>
      </Box>

      {/* Main Info Blocks */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard title="Current Subscription Plan" subtitle="Active features & license status">
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'secondary.main',
                    }}
                  >
                    <CardMembershipIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {selectedPlan}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Renewing automatically
                    </Typography>
                  </Box>
                </Stack>
                <StatusBadge value={subscription?.isExpired ? 'Expired' : 'Active'} />
              </Box>

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Plan Price</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{activePlanObj.price.toLocaleString()} / month</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Next Renewal Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'July 1, 2026'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Billing Frequency</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{billingCycle}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Registered Method</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PaymentIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} /> {registeredMethod}
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => setUpgradeModalOpen(true)}
                  sx={{ flexGrow: 1, borderRadius: '8px', fontWeight: 700 }}
                >
                  Upgrade Plan
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setUpdateCardOpen(true)}
                  sx={{ flexGrow: 1, borderRadius: '8px', fontWeight: 600 }}
                >
                  Update Card
                </Button>
              </Stack>
            </Stack>
          </AppCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard title="Workspace Quotas & Usage" subtitle="Track active limits across features">
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Agent Seats / Licenses</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>8 of {customSeats} active</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (8 / customSeats) * 100)}
                  sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Monthly Leads Volume</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>14,208 of {activePlanObj.leads.toLocaleString()} processed</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (14208 / activePlanObj.leads) * 100)}
                  color="success"
                  sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Custom Integrations</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>4 of 5 active</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={80}
                  color="warning"
                  sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Divider />

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Included Add-ons</Typography>
                <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
                  <Typography variant="body2">Dedicated Account Manager support</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
                  <Typography variant="body2">Unlimited Projects & Config Catalogs</Typography>
                </Stack>
              </Stack>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>

      {/* Quick Access Cards to Dedicated Invoices & Receipts Modules */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard
            title="Payment Invoice Logs"
            subtitle="View recurring payment logs, itemized billing statements, and transaction histories"
          >
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="body2" color="text.secondary">
                Access full billing logs, inspect transaction reference IDs, and view status breakdowns across your enterprise subscription.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/account/payment-invoices')}
                startIcon={<PaymentIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Go to Payment Invoices Logs
              </Button>
            </Stack>
          </AppCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard
            title="Receipts & Historical Charges"
            subtitle="Download verified tax payment receipts, GST breakdown records, and audit receipts"
          >
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="body2" color="text.secondary">
                Generate official tax receipts, inspect 18% GST itemized breakdowns, and send e-receipts directly to your admin email.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/account/receipts-history')}
                startIcon={<PictureAsPdfIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Go to Receipts & Historical Charges
              </Button>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>

      {/* ── UPDATE PAYMENT CARD MODAL ───────────────────────────────────── */}
      <Dialog open={updateCardOpen} onClose={() => setUpdateCardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Registered Payment Card</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Cardholder Name"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Card Number"
              value={cardForm.number}
              onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
              placeholder="4242 4242 4242 4242"
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expiry (MM/YY)"
                value={cardForm.expiry}
                onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="CVC"
                type="password"
                value={cardForm.cvc}
                onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                size="small"
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpdateCardOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveCard}
            disabled={savingCard}
            startIcon={savingCard ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />}
          >
            Save Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── UPGRADE PLAN & COUPON MODAL ─────────────────────────────────── */}
      <Dialog open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Upgrade Plan & Subscription</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              select
              label="Select Subscription Plan"
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value)
                setCouponResult(null)
              }}
              size="small"
              fullWidth
            >
              {PLANS.map((plan) => (
                <MenuItem key={plan.name} value={plan.name}>
                  {plan.name} — ₹{plan.price.toLocaleString()} / mo ({plan.seats} seats)
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Billing Frequency"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'Monthly' | 'Yearly')}
                size="small"
                fullWidth
              >
                <MenuItem value="Monthly">Monthly Billing</MenuItem>
                <MenuItem value="Yearly">Yearly Billing (15% OFF)</MenuItem>
              </TextField>

              <TextField
                label="Agent Seats / Licenses"
                type="number"
                value={customSeats}
                onChange={(e) => setCustomSeats(Math.max(1, Number(e.target.value)))}
                size="small"
                fullWidth
              />
            </Stack>

            {/* Coupon Code Section */}
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 1, textTransform: 'uppercase' }}>
                Have a Promo / Coupon Code?
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="e.g. WELCOME20 or ENTERPRISE50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  startIcon={couponLoading ? <CircularProgress size={14} /> : <LocalOfferIcon />}
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Apply Coupon
                </Button>
              </Stack>

              {couponResult && (
                <Alert severity={couponResult.valid ? 'success' : 'error'} sx={{ mt: 1.5, py: 0 }}>
                  {couponResult.message}
                </Alert>
              )}
            </Box>

            {/* Summary Box */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Upgrade Order Summary
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Base Plan Price ({billingCycle}):</Typography>
                  <Typography variant="caption" fontWeight={700}>₹{Math.round(basePrice).toLocaleString()}</Typography>
                </Stack>
                {couponResult?.valid && (
                  <Stack direction="row" justifyContent="space-between" color="success.main">
                    <Typography variant="caption" fontWeight={700}>Coupon Discount ({couponResult.code}):</Typography>
                    <Typography variant="caption" fontWeight={700}>- ₹{discountVal.toLocaleString()}</Typography>
                  </Stack>
                )}
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={800}>Total Payable:</Typography>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                    ₹{finalPrice.toLocaleString()} / {billingCycle === 'Yearly' ? 'year' : 'month'}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpgradeModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpgradeSubmit}
            disabled={upgrading}
            startIcon={upgrading ? <CircularProgress size={16} color="inherit" /> : <CardMembershipIcon />}
          >
            Confirm & Upgrade Plan
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
