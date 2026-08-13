import { useEffect, useState } from 'react'
import { useNavigate, Link as RouterLink, useOutletContext } from 'react-router-dom'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'

import { clearAuthError, register, logout, selectAuth } from '@/features/auth'
import { paths } from '@/routes/paths'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'
import { AppCard } from '@/components/ui/AppCard'

export function SignupPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { error: authError, status } = useAppSelector(selectAuth)

  const { setIsWider } = useOutletContext<{ setIsWider: (w: boolean) => void }>() || {}

  const [industries, setIndustries] = useState<Industry[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')

  const [signupError, setSignupError] = useState<string | null>(null)

  useEffect(() => {
    if (setIsWider) {
      setIsWider(!!selectedIndustry)
    }
  }, [selectedIndustry, setIsWider])

  useEffect(() => {
    dispatch(clearAuthError())
    setLoadingIndustries(true)
    getIndustries(true)
      .then((inds: Industry[]) => {
        setIndustries(inds)
        setLoadingIndustries(false)
      })
      .catch((err: any) => {
        console.error('Failed to load industries:', err)
        setLoadingIndustries(false)
      })
  }, [dispatch])

  const handleSignup = async (dynamicVals: Record<string, any>) => {
    setSignupError(null)

    try {
      await dispatch(
        register({
          fields: {
            ...dynamicVals,
            industryId: selectedIndustry,
          },
          password: dynamicVals.password || dynamicVals.password_hash || '',
        })
      ).unwrap()
      await dispatch(logout())
      navigate(paths.login, { replace: true })
    } catch (err: any) {
      setSignupError(err.message || 'Unable to create account.')
    }
  }

  if (loadingIndustries) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        maxWidth: selectedIndustry ? '720px' : '420px',
        width: '100%',
        mx: 'auto',
        transition: 'max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <AppCard
        title="Create Account"
        subtitle={
          selectedIndustry
            ? 'Enter your organization details to complete registration.'
            : 'Select your industry vertical to get started.'
        }
      >
        <Stack spacing={3}>
          {!selectedIndustry ? (
            <TextField
              select
              fullWidth
              label="Industry *"
              value={selectedIndustry}
              onChange={(e) => {
                setSelectedIndustry(e.target.value)
                setSignupError(null)
              }}
            >
              {industries.map((ind) => (
                <MenuItem key={ind.code} value={ind.code}>
                  {ind.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ color: 'primary.main', fontWeight: 600 }}>
                Industry: {industries.find(i => i.code === selectedIndustry)?.name || selectedIndustry}
              </Typography>
              <Button 
                size="small" 
                variant="text" 
                onClick={() => {
                  setSelectedIndustry('')
                  setSignupError(null)
                }}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                Change Industry
              </Button>
            </Box>
          )}

          {selectedIndustry && (
            <DynamicForm
              screen="organization"
              industry_code={selectedIndustry}
              role_key="admin"
              initialValues={{
                industryId: selectedIndustry,
              }}
              submitLabel="Sign Up"
              hideActions={false}
              fullWidthSubmit={true}
              onSubmit={handleSignup}
            />
          )}

          {authError || signupError ? (
            <Alert severity="error">{authError || signupError}</Alert>
          ) : null}

          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
            Already have an account?{' '}
            <Typography
              component={RouterLink}
              sx={{ color: 'secondary.main', fontWeight: 500 }}
              to={paths.login}
              variant="inherit"
            >
              Sign in
            </Typography>
          </Typography>
        </Stack>
      </AppCard>
    </Box>
  )
}