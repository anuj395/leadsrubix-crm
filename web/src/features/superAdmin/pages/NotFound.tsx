import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Typography variant="h4">Page not found</Typography>
      <Typography color="text.secondary">The page you requested does not exist or has been moved.</Typography>
      <Button component={RouterLink} to="/" variant="contained">Go to Home</Button>
    </Box>
  )
}
