import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
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
import Paper from '@mui/material/Paper'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import PaymentIcon from '@mui/icons-material/Payment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import TuneIcon from '@mui/icons-material/Tune'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import BusinessIcon from '@mui/icons-material/Business'
import EditIcon from '@mui/icons-material/Edit'
import { useNavigate } from 'react-router-dom'

import { AppCard } from '@/components/ui/AppCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/services/api'

export default function SubscriptionDetailsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription, refetch } = useSubscription()

  // Dynamic licensing variables from backend (Default to 10 seats)
  const numEmployees = subscription?.numEmployees || 10
  const costPerLicense = subscription?.costPerLicense || 1000
  const activeUsersCount = subscription?.activeUsersCount || 0
  const registeredMethod = subscription?.registeredMethod || 'Online / Razorpay'
  const isTrial = Boolean(subscription?.isTrial)
  const isExpired = Boolean(subscription?.isExpired)
  const daysRemaining = subscription?.daysRemaining || 0
  const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'
  const monthlyTotal = numEmployees * costPerLicense

  // Modal States
  const [renewModalOpen, setRenewModalOpen] = useState(false)
  const [adjustSeatsModalOpen, setAdjustSeatsModalOpen] = useState(false)
  const [updateCardOpen, setUpdateCardOpen] = useState(false)
  const [updateBillingOpen, setUpdateBillingOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Renewal Form State (Allows scaling seats up or down on renewal)
  const [tenureMonths, setTenureMonths] = useState<number>(1)
  const [renewalSeats, setRenewalSeats] = useState<number>(numEmployees)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponResult, setCouponResult] = useState<{ valid: boolean; code?: string; discountAmount: number; message: string } | null>(null)

  // Adjust / Upgrade Seats Form State (Allows setting target seats e.g. 5, 7, 10, 15)
  const [targetSeats, setTargetSeats] = useState<number>(numEmployees)
  const [adjustSeatsCoupon, setAdjustSeatsCoupon] = useState('')
  const [adjustSeatsCouponResult, setAdjustSeatsCouponResult] = useState<{ valid: boolean; code?: string; discountAmount: number; message: string } | null>(null)

  // Payment Card Form State
  const [cardForm, setCardForm] = useState({
    name: subscription?.cardDetails?.cardholderName || (user?.name || ''),
    number: subscription?.cardDetails?.last4 ? `•••• •••• •••• ${subscription.cardDetails.last4}` : '',
    expiry: subscription?.cardDetails?.expiry || '',
    cvc: '',
    brand: subscription?.cardDetails?.brand || 'Visa',
  })

  // Billing Details Form State
  const [billingForm, setBillingForm] = useState({
    legalName: subscription?.billingDetails?.legalName || subscription?.organizationName || '',
    gstin: subscription?.billingDetails?.gstin || '',
    pan: subscription?.billingDetails?.pan || '',
    billingEmail: subscription?.billingDetails?.billingEmail || user?.email || '',
    billingPhone: subscription?.billingDetails?.billingPhone || '',
    billingAddress: subscription?.billingDetails?.billingAddress || '',
  })

  // Toast notification
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  // Sync state when subscription loads
  useEffect(() => {
    if (subscription?.numEmployees) {
      setRenewalSeats(subscription.numEmployees)
      setTargetSeats(subscription.numEmployees)
    }
    if (subscription?.cardDetails) {
      setCardForm((prev) => ({
        ...prev,
        name: subscription.cardDetails?.cardholderName || prev.name,
        number: subscription.cardDetails?.last4 ? `•••• •••• •••• ${subscription.cardDetails.last4}` : prev.number,
        brand: subscription.cardDetails?.brand || prev.brand,
        expiry: subscription.cardDetails?.expiry || prev.expiry,
      }))
    }
    if (subscription?.billingDetails) {
      setBillingForm({
        legalName: subscription.billingDetails.legalName || subscription.organizationName || '',
        gstin: subscription.billingDetails.gstin || '',
        pan: subscription.billingDetails.pan || '',
        billingEmail: subscription.billingDetails.billingEmail || user?.email || '',
        billingPhone: subscription.billingDetails.billingPhone || '',
        billingAddress: subscription.billingDetails.billingAddress || '',
      })
    }
  }, [subscription])

  // 1. Coupon validation for Renewal
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setToast({ open: true, msg: 'Enter a coupon code', sev: 'error' })
      return
    }
    setCouponLoading(true)
    setCouponResult(null)
    try {
      const subtotal = renewalSeats * costPerLicense * tenureMonths
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        planPrice: subtotal,
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

  // 2. Renewal Submit Handler via Razorpay
  const handleRenewSubmit = async () => {
    setProcessing(true)
    try {
      // 1. Create Razorpay Order
      const orderRes = await api.post('/payments/create-order', {
        type: 'RENEWAL',
        tenureMonths,
        seats: renewalSeats,
        couponCode: couponResult?.valid ? couponCode.trim() : undefined,
      })

      const orderData = orderRes.data
      if (!orderData?.orderId) {
        throw new Error('Failed to create payment order.')
      }

      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay SDK is not loaded. Please check your internet connection.')
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Leads Rubix CRM',
        description: orderData.description || 'Subscription Renewal',
        image: '/companylogo.png',
        order_id: orderData.orderId,
        prefill: orderData.prefill || {},
        theme: { color: '#0052cc' },
        handler: async function (response: any) {
          try {
            setProcessing(true)
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type: 'RENEWAL',
              tenureMonths,
              seats: renewalSeats,
              couponCode: couponResult?.valid ? couponCode.trim() : undefined,
            })
            setToast({ open: true, msg: verifyRes.data?.message || 'Payment verified! Subscription renewed successfully!', sev: 'success' })
            setRenewModalOpen(false)
            setCouponCode('')
            setCouponResult(null)
            await refetch()
          } catch (err: any) {
            setToast({ open: true, msg: err?.response?.data?.message || 'Payment signature verification failed', sev: 'error' })
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || e?.message || 'Failed to initiate payment', sev: 'error' })
      setProcessing(false)
    }
  }

  // 3. Adjust / Upgrade Seats Submit Handler via Razorpay
  const handleAdjustSeatsSubmit = async () => {
    setProcessing(true)
    try {
      if (isScalingUp) {
        // Create Razorpay Order for prorated upgrade
        const orderRes = await api.post('/payments/create-order', {
          type: 'SEAT_UPGRADE',
          targetSeats,
          couponCode: adjustSeatsCouponResult?.valid ? adjustSeatsCoupon.trim() : undefined,
        })

        const orderData = orderRes.data
        if (!orderData?.orderId) {
          throw new Error('Failed to create upgrade order.')
        }

        if (typeof (window as any).Razorpay === 'undefined') {
          throw new Error('Razorpay SDK is not loaded. Please check your internet connection.')
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Leads Rubix CRM',
          description: orderData.description || 'Seat Upgrade',
          image: '/companylogo.png',
          order_id: orderData.orderId,
          prefill: orderData.prefill || {},
          theme: { color: '#0052cc' },
          handler: async function (response: any) {
            try {
              setProcessing(true)
              const verifyRes = await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                type: 'SEAT_UPGRADE',
                seats: targetSeats,
                couponCode: adjustSeatsCouponResult?.valid ? adjustSeatsCoupon.trim() : undefined,
              })
              setToast({ open: true, msg: verifyRes.data?.message || 'Payment verified! Seats upgraded successfully!', sev: 'success' })
              setAdjustSeatsModalOpen(false)
              setAdjustSeatsCoupon('')
              setAdjustSeatsCouponResult(null)
              await refetch()
            } catch (err: any) {
              setToast({ open: true, msg: err?.response?.data?.message || 'Payment signature verification failed', sev: 'error' })
            } finally {
              setProcessing(false)
            }
          },
          modal: {
            ondismiss: function () {
              setProcessing(false)
            }
          }
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      } else {
        // Downscaling seats doesn't require payment
        const res = await api.post('/organizations/my-subscription/upgrade-seats', {
          targetSeats,
          paymentMethod: registeredMethod,
        })
        setToast({ open: true, msg: res.data?.message || `Seats successfully adjusted to ${targetSeats}!`, sev: 'success' })
        setAdjustSeatsModalOpen(false)
        await refetch()
        setProcessing(false)
      }
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || e?.message || 'Failed to adjust seats', sev: 'error' })
      setProcessing(false)
    }
  }

  // 4. Save Payment Card Handler
  const handleSaveCard = async () => {
    if (!cardForm.name.trim()) {
      setToast({ open: true, msg: 'Please enter cardholder name', sev: 'error' })
      return
    }
    const cleanNum = cardForm.number.replace(/\s+/g, '')
    if (!cleanNum || cleanNum.length < 13 || cleanNum.length > 19 || !/^\d+$/.test(cleanNum)) {
      setToast({ open: true, msg: 'Please enter a valid card number (13-19 digits)', sev: 'error' })
      return
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardForm.expiry.trim())) {
      setToast({ open: true, msg: 'Please enter a valid expiry date (MM/YY, e.g. 12/28)', sev: 'error' })
      return
    }
    if (!/^\d{3,4}$/.test(cardForm.cvc.trim())) {
      setToast({ open: true, msg: 'Please enter a valid 3 or 4 digit CVC/CVV', sev: 'error' })
      return
    }
    setProcessing(true)
    try {
      const res = await api.post('/organizations/my-subscription/payment-method', {
        cardholderName: cardForm.name.trim(),
        cardNumber: cleanNum,
        expiry: cardForm.expiry.trim(),
        cvc: cardForm.cvc.trim(),
        brand: cardForm.brand,
      })
      setToast({ open: true, msg: res.data?.message || 'Card updated successfully!', sev: 'success' })
      setUpdateCardOpen(false)
      await refetch()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to update card', sev: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  // 5. Save Billing Details Handler
  const handleSaveBilling = async () => {
    setProcessing(true)
    try {
      const res = await api.post('/organizations/my-subscription/billing-details', billingForm)
      setToast({ open: true, msg: res.data?.message || 'Billing details saved successfully!', sev: 'success' })
      setUpdateBillingOpen(false)
      await refetch()
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to save billing details', sev: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  // Calculations for Renewal Modal
  const renewalSubtotal = renewalSeats * costPerLicense * tenureMonths
  const renewalDiscount = couponResult?.valid ? couponResult.discountAmount : 0
  const renewalDiscountedSubtotal = Math.max(0, renewalSubtotal - renewalDiscount)
  const renewalGst = Math.round(renewalDiscountedSubtotal * 0.18)
  const renewalTotal = renewalDiscountedSubtotal + renewalGst

  // Calculations for Adjust Seats Modal
  const cycleDays = Math.max(1, daysRemaining)
  const perDayCost = costPerLicense / 30
  const seatDiff = targetSeats - numEmployees
  const isScalingUp = seatDiff > 0
  const isScalingDown = seatDiff < 0

  const prorataSubtotal = isScalingUp ? Math.round(seatDiff * perDayCost * cycleDays) : 0
  const prorataDiscount = adjustSeatsCouponResult?.valid ? adjustSeatsCouponResult.discountAmount : 0
  const prorataDiscountedSubtotal = Math.max(0, prorataSubtotal - prorataDiscount)
  const prorataGst = Math.round(prorataDiscountedSubtotal * 0.18)
  const prorataTotal = prorataDiscountedSubtotal + prorataGst

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
          Overview of your enterprise user licenses, workspace quotas, payment cards, and billing statements.
        </Typography>
      </Box>

      {/* Main Info Blocks */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard title="Current Subscription Plan" subtitle="Active licenses & renewal status">
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
                      {subscription?.planName || (isTrial ? 'Trial Enterprise Plan' : 'Enterprise License Plan')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isTrial ? `Trial expires in ${daysRemaining} day(s)` : 'Per-seat recurring license'}
                    </Typography>
                  </Box>
                </Stack>
                <StatusBadge value={isTrial ? 'Trial Period' : (isExpired ? 'Expired' : 'Active')} />
              </Box>

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">License Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ₹{costPerLicense.toLocaleString('en-IN')} / seat / month
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Total Monthly Billing</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ₹{monthlyTotal.toLocaleString('en-IN')} / month ({numEmployees} seats)
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setTargetSeats(numEmployees)
                        setAdjustSeatsModalOpen(true)
                      }}
                      startIcon={<EditIcon sx={{ fontSize: '0.85rem' }} />}
                      sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
                    >
                      Edit Seats
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Renewal / Expiry Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {expiryDate} ({daysRemaining} days left)
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Payment Channel</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PaymentIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} /> {registeredMethod}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setUpdateCardOpen(true)}
                      startIcon={<CreditCardIcon sx={{ fontSize: '0.85rem' }} />}
                      sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
                    >
                      Change Card
                    </Button>
                  </Stack>
                </Stack>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setRenewalSeats(numEmployees)
                    setRenewModalOpen(true)
                  }}
                  startIcon={<AutorenewIcon />}
                  sx={{ flexGrow: 1, borderRadius: '8px', fontWeight: 700 }}
                >
                  Renew Subscription
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setTargetSeats(numEmployees)
                    setAdjustSeatsModalOpen(true)
                  }}
                  startIcon={<TuneIcon />}
                  sx={{ flexGrow: 1, borderRadius: '8px', fontWeight: 700 }}
                >
                  Adjust / Scale Seats
                </Button>
              </Stack>
            </Stack>
          </AppCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppCard title="Workspace Quotas & Usage" subtitle="Track active agent seats and resources">
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Agent Seats / Licenses</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {activeUsersCount} of {numEmployees} active
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (activeUsersCount / Math.max(1, numEmployees)) * 100)}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Monthly Leads Ingestion</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} color="success.main">
                    Unlimited
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  color="success"
                  sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Portal Integrations</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Active (99Acres, FB, MB, Housing)</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  color="info"
                  sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              <Divider />

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Included Benefits</Typography>
                <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
                  <Typography variant="body2">Dedicated Account Manager support</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
                  <Typography variant="body2">Dynamic seat scaling (add or reduce seats anytime)</Typography>
                </Stack>
              </Stack>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>

      {/* Organization Billing & Tax (GSTIN) Card */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <AppCard
            title="Billing & Tax (GSTIN) Entity Details"
            subtitle="Manage your legal entity name, GSTIN number, and billing contact information"
          >
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Legal Entity Name</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {billingForm.legalName || 'Leads Rubix Client'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">GSTIN Number</Typography>
                  <Typography variant="body2" fontWeight={700} color={billingForm.gstin ? 'text.primary' : 'text.disabled'}>
                    {billingForm.gstin || 'Not Configured (Add for 18% ITC)'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Billing Email</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {billingForm.billingEmail || user?.email || ''}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Billing Address</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {billingForm.billingAddress || 'Headquarters / Corporate Office'}
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ pt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setUpdateBillingOpen(true)}
                  startIcon={<BusinessIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                >
                  Edit Billing & GST Details
                </Button>
              </Box>
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
                onClick={() => navigate('/invoices/payment-invoices')}
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
                onClick={() => navigate('/invoices/receipts-history')}
                startIcon={<PictureAsPdfIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Go to Receipts & Historical Charges
              </Button>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>

      {/* ── RENEW SUBSCRIPTION MODAL ────────────────────────────────────── */}
      <Dialog open={renewModalOpen} onClose={() => setRenewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Renew Enterprise Subscription</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Select your renewal tenure and configure the number of seats for your upcoming cycle.
            </Typography>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Tenure"
                value={tenureMonths}
                onChange={(e) => {
                  setTenureMonths(Number(e.target.value))
                  setCouponResult(null)
                }}
                size="small"
                sx={{ width: '45%' }}
              >
                <MenuItem value={1}>1 Month</MenuItem>
                <MenuItem value={3}>3 Months</MenuItem>
                <MenuItem value={6}>6 Months</MenuItem>
                <MenuItem value={12}>12 Months</MenuItem>
              </TextField>

              <TextField
                label="Seats for Renewal"
                type="number"
                value={renewalSeats}
                onChange={(e) => setRenewalSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
                size="small"
                sx={{ width: '55%' }}
                helperText={`Current: ${numEmployees} seats. Scale up or down.`}
              />
            </Stack>

            {/* Promo Code Section */}
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 1, textTransform: 'uppercase' }}>
                Have a Discount Coupon?
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="Enter coupon code"
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
                  Apply
                </Button>
              </Stack>

              {couponResult && (
                <Alert severity={couponResult.valid ? 'success' : 'error'} sx={{ mt: 1.5, py: 0 }}>
                  {couponResult.message}
                </Alert>
              )}
            </Box>

            {/* Calculation Breakdown */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Billing Summary (GST Itemized)
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Base Amount ({renewalSeats} seats × {tenureMonths} mo @ ₹{costPerLicense}):
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>₹{renewalSubtotal.toLocaleString('en-IN')}.00</Typography>
                </Stack>
                {renewalDiscount > 0 && (
                  <Stack direction="row" justifyContent="space-between" color="success.main">
                    <Typography variant="caption" fontWeight={700}>Coupon Discount ({couponResult?.code}):</Typography>
                    <Typography variant="caption" fontWeight={700}>- ₹{renewalDiscount.toLocaleString('en-IN')}.00</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">GST (18%):</Typography>
                  <Typography variant="caption" fontWeight={700}>₹{renewalGst.toLocaleString('en-IN')}.00</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={800}>Total Payable:</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                    ₹{renewalTotal.toLocaleString('en-IN')}.00
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenewModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRenewSubmit}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
          >
            Proceed & Pay with Razorpay
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ADJUST / SCALE SEATS MODAL ─────────────────────────────────── */}
      <Dialog open={adjustSeatsModalOpen} onClose={() => setAdjustSeatsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Adjust & Scale Agent Seats</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Update your workspace license quota. You can scale up (with prorata charges for remaining {cycleDays} days) or scale down.
            </Typography>

            <TextField
              label="Desired Total Seats"
              type="number"
              value={targetSeats}
              onChange={(e) => setTargetSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
              size="small"
              fullWidth
              helperText={`Current Seats: ${numEmployees} → Desired Seats: ${targetSeats}`}
            />

            {/* If Scaling Up */}
            {isScalingUp && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Prorata Charges Breakdown (+{seatDiff} seats)
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Prorata Days Remaining:</Typography>
                    <Typography variant="caption" fontWeight={700}>{cycleDays} days</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Per-Day Seat Rate (₹{costPerLicense} / 30):</Typography>
                    <Typography variant="caption" fontWeight={700}>₹{Math.round(perDayCost)} / seat / day</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Prorata Subtotal ({seatDiff} seats × {cycleDays} days):</Typography>
                    <Typography variant="caption" fontWeight={700}>₹{prorataSubtotal.toLocaleString('en-IN')}.00</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">GST (18%):</Typography>
                    <Typography variant="caption" fontWeight={700}>₹{prorataGst.toLocaleString('en-IN')}.00</Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={800}>Amount to Pay Now:</Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                      ₹{prorataTotal.toLocaleString('en-IN')}.00
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* If Scaling Down */}
            {isScalingDown && (
              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Downscaling Seats ({numEmployees} → {targetSeats})
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  No payment required today. Your license limit will be set to <strong>{targetSeats} seats</strong> immediately, and your recurring monthly charge will adjust to <strong>₹{(targetSeats * costPerLicense).toLocaleString('en-IN')}/mo</strong> upon next renewal.
                </Typography>
              </Alert>
            )}

            {seatDiff === 0 && (
              <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                Enter a different number of seats to scale up or scale down.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdjustSeatsModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdjustSeatsSubmit}
            disabled={processing || seatDiff === 0}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <AddCircleOutlineIcon />}
          >
            {isScalingUp ? `Pay ₹${prorataTotal.toLocaleString('en-IN')} with Razorpay` : `Set Total Seats to ${targetSeats}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── UPDATE PAYMENT CARD MODAL ───────────────────────────────────── */}
      <Dialog open={updateCardOpen} onClose={() => setUpdateCardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Payment Card</DialogTitle>
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
              select
              label="Card Network"
              value={cardForm.brand}
              onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="Visa">Visa</MenuItem>
              <MenuItem value="Mastercard">Mastercard</MenuItem>
              <MenuItem value="RuPay">RuPay</MenuItem>
              <MenuItem value="American Express">American Express</MenuItem>
            </TextField>
            <TextField
              label="Card Number"
              value={cardForm.number}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
                const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw
                setCardForm({ ...cardForm, number: formatted })
              }}
              placeholder="4242 4242 4242 4242"
              size="small"
              fullWidth
              inputProps={{ maxLength: 19 }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expiry (MM/YY)"
                value={cardForm.expiry}
                onChange={(e) => {
                  let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                  if (raw.length > 2) {
                    raw = `${raw.slice(0, 2)}/${raw.slice(2)}`
                  }
                  setCardForm({ ...cardForm, expiry: raw })
                }}
                placeholder="12/28"
                size="small"
                fullWidth
                inputProps={{ maxLength: 5 }}
              />
              <TextField
                label="CVC / CVV"
                type="password"
                value={cardForm.cvc}
                onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="123"
                size="small"
                fullWidth
                inputProps={{ maxLength: 4 }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpdateCardOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveCard}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />}
          >
            Save Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── UPDATE BILLING & GST DETAILS MODAL ──────────────────────────── */}
      <Dialog open={updateBillingOpen} onClose={() => setUpdateBillingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Billing & Tax (GSTIN) Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Legal Organization Name"
              value={billingForm.legalName}
              onChange={(e) => setBillingForm({ ...billingForm, legalName: e.target.value })}
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="GSTIN Number"
                value={billingForm.gstin}
                onChange={(e) => setBillingForm({ ...billingForm, gstin: e.target.value.toUpperCase() })}
                placeholder="07AAAAA0000A1Z5"
                size="small"
                fullWidth
              />
              <TextField
                label="PAN Number"
                value={billingForm.pan}
                onChange={(e) => setBillingForm({ ...billingForm, pan: e.target.value.toUpperCase() })}
                placeholder="AAAAA0000A"
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Billing Email"
                value={billingForm.billingEmail}
                onChange={(e) => setBillingForm({ ...billingForm, billingEmail: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="Billing Phone"
                value={billingForm.billingPhone}
                onChange={(e) => setBillingForm({ ...billingForm, billingPhone: e.target.value })}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Billing Address"
              value={billingForm.billingAddress}
              onChange={(e) => setBillingForm({ ...billingForm, billingAddress: e.target.value })}
              multiline
              rows={2}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpdateBillingOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveBilling}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <BusinessIcon />}
          >
            Save Details
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
