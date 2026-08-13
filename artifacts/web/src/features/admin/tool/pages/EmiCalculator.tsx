import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { AppCard } from '@/components/ui/AppCard'

export default function EmiCalculatorPage() {
  // State variables for inputs
  const [loanAmount, setLoanAmount] = useState<number>(5000000) // Default 50 Lakhs
  const [interestRate, setInterestRate] = useState<number>(8.5) // Default 8.5%
  const [tenure, setTenure] = useState<number>(20) // Default 20 Years

  // Handle inputs changes with safety boundary
  const handleAmountChange = (val: number) => {
    setLoanAmount(Math.max(10000, Math.min(val, 100000000)))
  };

  const handleRateChange = (val: number) => {
    setInterestRate(Math.max(1, Math.min(val, 30)))
  };

  const handleTenureChange = (val: number) => {
    setTenure(Math.max(1, Math.min(val, 40)))
  };

  // Calculations
  const calculations = useMemo(() => {
    const p = loanAmount
    const r = interestRate / 12 / 100 // monthly interest rate
    const n = tenure * 12 // monthly tenure

    let emi = 0
    if (r === 0) {
      emi = p / n
    } else {
      emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    }

    const totalAmount = emi * n
    const totalInterest = totalAmount - p

    // Generate monthly schedule grouped by year for readability
    const schedule: Array<{
      year: number
      principalPaid: number
      interestPaid: number
      balance: number
    }> = []

    let balance = p
    for (let yr = 1; yr <= tenure; yr++) {
      let principalPaidInYr = 0
      let interestPaidInYr = 0

      for (let m = 0; m < 12; m++) {
        const interest = balance * r
        const principal = emi - interest
        if (balance <= 0) break
        
        interestPaidInYr += interest
        principalPaidInYr += principal
        balance -= principal
      }

      if (balance < 0) balance = 0

      schedule.push({
        year: yr,
        principalPaid: principalPaidInYr,
        interestPaid: interestPaidInYr,
        balance: balance,
      })
    }

    return {
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      schedule,
    }
  }, [loanAmount, interestRate, tenure])

  // Donut chart calculations
  const interestPercentage = (calculations.totalInterest / calculations.totalAmount) * 100
  const principalPercentage = (loanAmount / calculations.totalAmount) * 100

  // SVG parameters
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const interestOffset = circumference - (interestPercentage / 100) * circumference

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
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
        gap: 3,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800, mb: 0.5 }}>
          EMI Calculator
        </Typography>
        <Typography color="text.secondary">
          Calculate your home, car or personal loan EMI and view detailed interest splits.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Input Parameters */}
        <Grid size={{ xs: 12, md: 7 }}>
          <AppCard title="Loan Details" subtitle="Adjust parameters using sliders or inputs">
            <Stack spacing={4} sx={{ mt: 2 }}>
              {/* Loan Amount */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    LOAN AMOUNT
                  </Typography>
                  <TextField
                    size="small"
                    value={loanAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    type="number"
                    InputProps={{
                      startAdornment: (
                        <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                          ₹
                        </Typography>
                      ),
                    }}
                    sx={{
                      width: '150px',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontWeight: 600,
                      },
                    }}
                  />
                </Stack>
                <Slider
                  value={loanAmount}
                  min={100000}
                  max={20000000}
                  step={100000}
                  onChange={(_, val) => handleAmountChange(val as number)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v / 100000} Lakh`}
                  sx={{ py: 1 }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">₹1 Lakh</Typography>
                  <Typography variant="caption" color="text.secondary">₹2 Crore</Typography>
                </Stack>
                {/* Amount presets */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  {[1000000, 3000000, 5000000, 10000000].map((preset) => (
                    <Button
                      key={preset}
                      variant="outlined"
                      size="small"
                      onClick={() => handleAmountChange(preset)}
                      sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.25 }}
                    >
                      {preset >= 10000000 ? `${preset / 10000000} Cr` : `${preset / 100000} L`}
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Interest Rate */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    INTEREST RATE
                  </Typography>
                  <TextField
                    size="small"
                    value={interestRate}
                    onChange={(e) => handleRateChange(Number(e.target.value))}
                    type="number"
                    inputProps={{ step: 0.1 }}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="body2" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                          %
                        </Typography>
                      ),
                    }}
                    sx={{
                      width: '100px',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontWeight: 600,
                      },
                    }}
                  />
                </Stack>
                <Slider
                  value={interestRate}
                  min={5}
                  max={20}
                  step={0.1}
                  onChange={(_, val) => handleRateChange(val as number)}
                  valueLabelDisplay="auto"
                  sx={{ py: 1 }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">5%</Typography>
                  <Typography variant="caption" color="text.secondary">20%</Typography>
                </Stack>
                {/* Rate Presets */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  {[7.5, 8.5, 9.5, 10.5].map((preset) => (
                    <Button
                      key={preset}
                      variant="outlined"
                      size="small"
                      onClick={() => handleRateChange(preset)}
                      sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.25 }}
                    >
                      {preset}%
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Loan Tenure */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    LOAN TENURE (YEARS)
                  </Typography>
                  <TextField
                    size="small"
                    value={tenure}
                    onChange={(e) => handleTenureChange(Number(e.target.value))}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <Typography variant="body2" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                          Yrs
                        </Typography>
                      ),
                    }}
                    sx={{
                      width: '100px',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontWeight: 600,
                      },
                    }}
                  />
                </Stack>
                <Slider
                  value={tenure}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(_, val) => handleTenureChange(val as number)}
                  valueLabelDisplay="auto"
                  sx={{ py: 1 }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">1 Yr</Typography>
                  <Typography variant="caption" color="text.secondary">30 Yrs</Typography>
                </Stack>
                {/* Tenure Presets */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  {[5, 10, 15, 20, 30].map((preset) => (
                    <Button
                      key={preset}
                      variant="outlined"
                      size="small"
                      onClick={() => handleTenureChange(preset)}
                      sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.25 }}
                    >
                      {preset} Yrs
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </AppCard>
        </Grid>

        {/* Results and Visualizations */}
        <Grid size={{ xs: 12, md: 5 }}>
          <AppCard title="Breakdown Summary" subtitle="Calculated monthly payments & interest details">
            <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Monthly EMI Large Panel */}
              <Box
                sx={{
                  width: '100%',
                  textAlign: 'center',
                  py: 3,
                  px: 2,
                  mb: 3,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ESTIMATED MONTHLY EMI
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'secondary.main', mt: 1 }}>
                  {formatCurrency(calculations.emi)}
                </Typography>
              </Box>

              {/* Chart Visual */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                  <svg width="100%" height="100%" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="rgba(99, 102, 241, 0.15)"
                      strokeWidth="14"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="rgb(99, 102, 241)"
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={0}
                      transform="rotate(-90 70 70)"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="rgb(236, 72, 153)"
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={interestOffset}
                      transform="rotate(-90 70 70)"
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.35s' }}
                    />
                  </svg>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {Math.round(principalPercentage)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      Principal
                    </Typography>
                  </Box>
                </Box>

                {/* Details list */}
                <Stack spacing={2} sx={{ flexGrow: 1, width: '100%' }}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: 'rgb(99, 102, 241)' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Principal Loan Amount
                      </Typography>
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 700, ml: 2.5 }}>
                      {formatCurrency(loanAmount)}
                    </Typography>
                  </Box>

                  <Box>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: 'rgb(236, 72, 153)' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Total Interest Payable
                      </Typography>
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', ml: 2.5 }}>
                      {formatCurrency(calculations.totalInterest)}
                    </Typography>
                  </Box>

                  <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL REPAYMENT AMOUNT
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {formatCurrency(calculations.totalAmount)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </AppCard>
        </Grid>
      </Grid>

      {/* Yearly Amortization Table */}
      <AppCard title="Annual Amortization Schedule" subtitle="View details of principal vs. interest pay-offs over years">
        <TableContainer component={Paper} sx={{ boxShadow: 'none', background: 'transparent', maxHeight: '400px' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Year</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Principal Repaid</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Interest Repaid</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Payments</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calculations.schedule.map((row) => (
                <TableRow key={row.year} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    Year {row.year}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(row.principalPaid)}</TableCell>
                  <TableCell align="right" sx={{ color: 'secondary.main' }}>{formatCurrency(row.interestPaid)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.principalPaid + row.interestPaid)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AppCard>
    </Box>
  )
}
