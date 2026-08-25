import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import { Call as CallIcon, Assignment as TaskIcon } from '@mui/icons-material'
import { fetchActivityTimeline, type ActivityItem } from '@/services/activitiesService'

interface ActivityTimelineProps {
  type: 'Lead' | 'Account' | 'Contact' | 'Deal'
  id: string
}

export default function ActivityTimeline({ type, id }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const list = await fetchActivityTimeline(type, id)
        setActivities(list)
      } catch (err) {
        console.error('Failed to load activity timeline:', err)
      } finally {
        setLoading(false)
      }
    }
    if (id) void load()
  }, [type, id])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', bgcolor: 'action.hover', borderRadius: '8px' }}>
        No activities logged yet.
      </Box>
    )
  }

  return (
    <Stack spacing={2} sx={{ position: 'relative', pl: 3, borderLeft: '2px solid', borderColor: 'divider', ml: 1.5 }}>
      {activities.map((item) => {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
        const isCall = item.type === 'CallLog'
        return (
          <Box key={item._id} sx={{ position: 'relative' }}>
            {/* Timeline node icon indicator */}
            <Box sx={{
              position: 'absolute',
              left: '-36px',
              top: '4px',
              bgcolor: isCall ? 'info.main' : 'warning.main',
              color: 'primary.contrastText',
              width: 26,
              height: 26,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}>
              {isCall ? <CallIcon sx={{ fontSize: '0.9rem' }} /> : <TaskIcon sx={{ fontSize: '0.9rem' }} />}
            </Box>

            <Card variant="outlined" sx={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {item.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dateStr}
                  </Typography>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                  {item.description}
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  {item.assignedTo && (
                    <Typography variant="caption" color="text.disabled">
                      Rep: {item.assignedTo}
                    </Typography>
                  )}
                  {item.duration !== undefined && (
                    <Typography variant="caption" color="text.disabled">
                      Duration: {item.duration}s
                    </Typography>
                  )}
                  {item.status && (
                    <Typography variant="caption" color="text.disabled">
                      Status: {item.status}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )
      })}
    </Stack>
  )
}
