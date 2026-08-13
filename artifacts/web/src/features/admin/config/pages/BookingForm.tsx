import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function BookingFormPage() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: "100%", minWidth: 0 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Booking Form
      </Typography>
      <Typography color="text.secondary">Placeholder page for Booking Form configuration.</Typography>
    </Box>
  )
}
