import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import CalculateIcon from '@mui/icons-material/Calculate'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import HistoryIcon from '@mui/icons-material/History'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { AppCard } from '@/components/ui/AppCard'

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState(0)

  // --- Desk Calculator State ---
  const [calcInput, setCalcInput] = useState('')
  const [calcHistory, setCalcHistory] = useState<string[]>([])

  const handleCalcClick = (char: string) => {
    if (char === 'C') {
      setCalcInput('')
    } else if (char === '⌫') {
      setCalcInput((prev) => prev.slice(0, -1))
    } else if (char === '=') {
      try {
        // Safe evaluation of basic math strings only
        if (!calcInput) return
        const sanitized = calcInput.replace(/×/g, '*').replace(/÷/g, '/')
        // eslint-disable-next-line no-eval
        const res = eval(sanitized) as number
        setCalcHistory((prev) => [`${calcInput} = ${res}`, ...prev].slice(0, 10))
        setCalcInput(String(res))
      } catch {
        setCalcInput('Error')
      }
    } else {
      if (calcInput === 'Error') {
        setCalcInput(char)
      } else {
        setCalcInput((prev) => prev + char)
      }
    }
  }

  // --- ROI Calculator State ---
  const [propertyVal, setPropertyVal] = useState<number>(8500000) // Default 85 Lakhs
  const [commissionRate, setCommissionRate] = useState<number>(2.5) // Default 2.5%
  const [marketingCost, setMarketingCost] = useState<number>(35000) // Marketing spend
  const [agentSplit, setAgentSplit] = useState<number>(60) // Agent gets 60%, Agency gets 40%

  const roiCalculations = useMemo(() => {
    const grossCommission = (propertyVal * commissionRate) / 100
    const agentPayout = (grossCommission * agentSplit) / 100
    const agencyPayout = grossCommission - agentPayout
    const netAgencyProfit = agencyPayout - marketingCost
    const roi = marketingCost > 0 ? ((grossCommission - marketingCost) / marketingCost) * 100 : 0

    return {
      grossCommission,
      agentPayout,
      agencyPayout,
      netAgencyProfit,
      roi: Math.round(roi),
    }
  }, [propertyVal, commissionRate, marketingCost, agentSplit])

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
          CRM Calculators
        </Typography>
        <Typography color="text.secondary">
          Evaluate deals, commissions, marketing ROI, or perform quick math utilities.
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val: number) => setActiveTab(val)}
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 1,
          '& .MuiTab-root': {
            fontWeight: 600,
            textTransform: 'none',
            minWidth: 140,
            fontSize: '0.95rem',
          },
        }}
      >
        <Tab icon={<ShowChartIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="ROI & Commission" />
        <Tab icon={<CalculateIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="Desk Calculator" />
      </Tabs>
      {activeTab === 0 ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <AppCard title="Deal Parameters" subtitle="Simulate property prices and commission structures">
              <Stack spacing={4} sx={{ mt: 2 }}>
                {/* Property Value */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      PROPERTY VALUE
                    </Typography>
                    <TextField
                      size="small"
                      value={propertyVal}
                      onChange={(e) => setPropertyVal(Number(e.target.value))}
                      type="number"
                      InputProps={{
                        startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>₹</Typography>,
                      }}
                      sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  </Stack>
                  <Slider
                    value={propertyVal}
                    min={500000}
                    max={50000000}
                    step={500000}
                    onChange={(_, val) => setPropertyVal(val as number)}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">₹5 Lakhs</Typography>
                    <Typography variant="caption" color="text.secondary">₹5 Crore</Typography>
                  </Stack>
                </Box>

                {/* Commission Rate */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      COMMISSION RATE (%)
                    </Typography>
                    <TextField
                      size="small"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      type="number"
                      inputProps={{ step: 0.1 }}
                      sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  </Stack>
                  <Slider
                    value={commissionRate}
                    min={0.5}
                    max={10}
                    step={0.1}
                    onChange={(_, val) => setCommissionRate(val as number)}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">0.5%</Typography>
                    <Typography variant="caption" color="text.secondary">10%</Typography>
                  </Stack>
                </Box>

                {/* Marketing Spend */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      MARKETING / ACQUISITION COST
                    </Typography>
                    <TextField
                      size="small"
                      value={marketingCost}
                      onChange={(e) => setMarketingCost(Number(e.target.value))}
                      type="number"
                      InputProps={{
                        startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>₹</Typography>,
                      }}
                      sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  </Stack>
                  <Slider
                    value={marketingCost}
                    min={0}
                    max={200000}
                    step={5000}
                    onChange={(_, val) => setMarketingCost(val as number)}
                  />
                </Box>

                {/* Agent Split */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      AGENT SHARE SPLIT
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                      {agentSplit}% Agent / {100 - agentSplit}% Agency
                    </Typography>
                  </Stack>
                  <Slider
                    value={agentSplit}
                    min={10}
                    max={90}
                    step={5}
                    onChange={(_, val) => setAgentSplit(val as number)}
                  />
                </Box>
              </Stack>
            </AppCard>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <AppCard title="ROI Metrics" subtitle="Revenue splits and marketing effectiveness">
              <Stack spacing={3} sx={{ mt: 2 }}>
                {/* Gross Comm Box */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                    GROSS REVENUE (COMMISSION)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
                    {formatCurrency(roiCalculations.grossCommission)}
                  </Typography>
                </Box>

                {/* Splits Grid */}
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                      <Typography variant="caption" color="text.secondary">Agent Payout</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'secondary.main', mt: 0.5 }}>
                        {formatCurrency(roiCalculations.agentPayout)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{agentSplit}% split</Typography>
                    </Box>
                  </Grid>
                  <Grid size={6}>
                    <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                      <Typography variant="caption" color="text.secondary">Agency Gross</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {formatCurrency(roiCalculations.agencyPayout)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{100 - agentSplit}% split</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />

                {/* ROI Analysis */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Agency Net Profit</Typography>
                    <Typography variant="caption" color="text.secondary">After subtracting marketing cost</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {formatCurrency(roiCalculations.netAgencyProfit)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Campaign ROI</Typography>
                    <Typography variant="caption" color="text.secondary">Marketing efficiency ratio</Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '6px',
                      backgroundColor: roiCalculations.roi > 300 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: roiCalculations.roi > 300 ? '#10b981' : '#f59e0b',
                      fontWeight: 700,
                    }}
                  >
                    {roiCalculations.roi}%
                  </Box>
                </Stack>
              </Stack>
            </AppCard>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, sm: 8, md: 5 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
              }}
            >
              {/* Screen */}
              <Box
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: '16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  minHeight: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>
                  {calcInput || '0'}
                </Typography>
              </Box>

              {/* Pad Buttons */}
              <Grid container spacing={1.5}>
                {['C', '÷', '×', '⌫', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '(', ')'].map((char) => {
                  const isAction = ['C', '⌫'].includes(char)
                  const isOperator = ['÷', '×', '-', '+', '=', '(', ')'].includes(char)
                  return (
                    <Grid size={3} key={char}>
                      <Button
                        fullWidth
                        onClick={() => handleCalcClick(char)}
                        sx={{
                          height: '56px',
                          borderRadius: '12px',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          backgroundColor: isAction
                            ? 'rgba(244, 63, 94, 0.12)'
                            : char === '='
                            ? 'secondary.main'
                            : isOperator
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'rgba(255,255,255,0.04)',
                          color: isAction
                            ? '#f43f5e'
                            : char === '='
                            ? '#fff'
                            : isOperator
                            ? 'secondary.main'
                            : 'text.primary',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          '&:hover': {
                            backgroundColor: char === '=' ? 'secondary.dark' : 'rgba(255,255,255,0.08)',
                          },
                        }}
                      >
                        {char}
                      </Button>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          </Grid>

          {/* History Column */}
          <Grid size={{ xs: 12, sm: 8, md: 4 }}>
            <AppCard
              title="Calculation Log"
              subtitle="Recently resolved expressions"
              action={
                calcHistory.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteSweepIcon />}
                    onClick={() => setCalcHistory([])}
                  >
                    Clear
                  </Button>
                )
              }
              fullHeight
            >
              {calcHistory.length === 0 ? (
                <Stack spacing={1} sx={{ alignItems: 'center', py: 6, color: 'text.secondary' }}>
                  <HistoryIcon sx={{ fontSize: '2rem', opacity: 0.5 }} />
                  <Typography variant="body2">No calculations recorded yet.</Typography>
                </Stack>
              ) : (
                <List dense>
                  {calcHistory.map((item, idx) => (
                    <ListItem key={idx} sx={{ px: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <ListItemText
                        primary={item}
                        primaryTypographyProps={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </AppCard>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
