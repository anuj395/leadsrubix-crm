import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import {
  Call as CallIcon,
  Assignment as TaskIcon,
  Note as NoteIcon,
  Timeline as TimelineIcon,
  SwapHoriz as StageIcon,
  MonetizationOn as DealIcon,
  CheckCircle as DoneIcon,
  Schedule as PendingIcon,
  Add as AddIcon
} from '@mui/icons-material'

import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'

export interface TimelineItem {
  id: string
  type: 'call' | 'task' | 'note' | 'stage' | 'deal'
  title: string
  subtitle?: string
  description?: string
  timestamp: string | Date
  author?: string
  status?: string
  meta?: Record<string, any>
}

interface UnifiedActivityTimelineProps {
  calls?: any[]
  tasks?: any[]
  notes?: any[]
  deals?: any[]
  stageHistory?: any[]
  onOpenCallModal?: () => void
  onOpenTaskModal?: () => void
  onOpenNoteModal?: () => void
  onOpenDealModal?: () => void
  canAdd?: boolean
}

export default function UnifiedActivityTimeline({
  calls = [],
  tasks = [],
  notes = [],
  deals = [],
  stageHistory = [],
  onOpenCallModal,
  onOpenTaskModal,
  onOpenNoteModal,
  onOpenDealModal,
  canAdd = true
}: UnifiedActivityTimelineProps) {
  const { user } = useAppSelector(selectAuth)
  const [filterType, setFilterType] = useState<'all' | 'call' | 'task' | 'note' | 'stage' | 'deal'>('all')

  // Combine and normalize all activities into a single timeline stream
  const timelineItems: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = []

    // 1. Calls
    calls.forEach((c, idx) => {
      list.push({
        id: c._id || `call-${idx}`,
        type: 'call',
        title: c.callType ? `Call (${c.callType})` : 'Phone Call Logged',
        subtitle: c.callStatus || c.status || 'Completed',
        description: c.notes || c.remark || c.description || '',
        timestamp: c.createdAt || c.created_at || c.callTime || new Date(),
        author: c.userName || c.createdBy || 'Agent',
        status: c.callStatus || c.status,
        meta: c
      })
    })

    // 2. Tasks
    tasks.forEach((t, idx) => {
      list.push({
        id: t._id || `task-${idx}`,
        type: 'task',
        title: t.taskType ? `Follow-up: ${t.taskType}` : (t.type ? `Task: ${t.type}` : 'Follow-up Task'),
        subtitle: t.nextFollowUpDateTime || t.dueDate ? `Due: ${new Date(t.nextFollowUpDateTime || t.dueDate).toLocaleDateString()}` : undefined,
        description: t.notes || t.description || '',
        author: (() => {
          const name = t.assignedToName || t.createdByName || t.assignedTo || t.createdBy
          if (!name) return 'Assigned Agent'
          if (name.length === 24 && /^[0-9a-fA-F]+$/.test(name)) {
            return t.contactOwnerEmail || t.contact_owner_email || 'Assigned Agent'
          }
          return name
        })(),
        timestamp: t.createdAt || t.created_at || new Date(),
        status: t.status || 'PENDING',
        meta: t
      })
    })

    // 3. Notes
    notes.forEach((n, idx) => {
      list.push({
        id: n._id || `note-${idx}`,
        type: 'note',
        title: 'Note Added',
        description: n.notes || n.text || n.note || '',
        timestamp: n.createdAt || n.created_at || n.date || new Date(),
        author: (() => {
          let name = n.userName || n.user_name || n.createdByName || n.created_by_name || n.userEmail || n.user_email || n.createdBy || n.created_by
          if (!name || name === 'Staff' || name === 'System') {
            name = user?.name || user?.email || 'Admin'
          }
          if (name && name.length === 24 && /^[0-9a-fA-F]+$/.test(name)) {
            name = user?.name || user?.email || 'Admin'
          }
          return name
        })(),
        meta: n
      })
    })

    // 4. Deals
    deals.forEach((d, idx) => {
      const amtFormatted = d.amount != null ? `₹${Number(d.amount).toLocaleString('en-IN')}` : '₹0'
      list.push({
        id: d._id || `deal-${idx}`,
        type: 'deal',
        title: `Deal: ${d.title || d.name || 'Sales Opportunity'}`,
        subtitle: `${d.stage || 'New Enquiry'} (${amtFormatted})`,
        description: d.notes ? `Strategy Notes: ${d.notes}` : undefined,
        timestamp: d.createdAt || d.created_at || d.updatedAt || new Date(),
        author: d.ownerName || d.owner_name || d.ownerEmail || 'Sales Rep',
        status: d.stage,
        meta: d
      })
    })

    // 5. Stage Transitions
    stageHistory.forEach((s, idx) => {
      list.push({
        id: s._id || `stage-${idx}`,
        type: 'stage',
        title: `Stage Changed to ${s.stage || s.toStage}`,
        description: s.reason ? `Reason: ${s.reason}` : '',
        timestamp: s.createdAt || s.created_at || s.timestamp || new Date(),
        author: s.changedBy || s.createdBy || 'System',
        meta: s
      })
    })

    // Sort descending by timestamp (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [calls, tasks, notes, deals, stageHistory, user])

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return timelineItems
    return timelineItems.filter(i => i.type === filterType)
  }, [timelineItems, filterType])

  // Counts for filter chips
  const counts = useMemo(() => ({
    all: timelineItems.length,
    call: timelineItems.filter(i => i.type === 'call').length,
    task: timelineItems.filter(i => i.type === 'task').length,
    note: timelineItems.filter(i => i.type === 'note').length,
    deal: timelineItems.filter(i => i.type === 'deal').length,
    stage: timelineItems.filter(i => i.type === 'stage').length
  }), [timelineItems])

  const getIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'call':
        return <CallIcon sx={{ fontSize: 16, color: '#0284c7' }} />
      case 'task':
        return <TaskIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
      case 'note':
        return <NoteIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
      case 'deal':
        return <DealIcon sx={{ fontSize: 16, color: '#059669' }} />
      case 'stage':
        return <StageIcon sx={{ fontSize: 16, color: '#ec4899' }} />
    }
  }

  const getBgColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'call': return '#e0f2fe'
      case 'task': return '#fef3c7'
      case 'note': return '#ede9fe'
      case 'deal': return '#d1fae5'
      case 'stage': return '#fce7f3'
    }
  }

  const renderStatusChip = (item: TimelineItem) => {
    if (!item.status) return null
    const st = String(item.status).toUpperCase()
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default'
    let label = item.status

    if (st === 'CANCELLED' || st === 'LOST') {
      color = 'error'
      label = st === 'CANCELLED' ? 'Cancelled' : 'Lost'
    } else if (st === 'COMPLETED' || st === 'WON' || st.includes('BOOKED')) {
      color = 'success'
      label = st === 'COMPLETED' ? 'Completed' : 'Won'
    } else if (st === 'PENDING' || st === 'ACTIVE') {
      color = 'warning'
      label = 'Pending'
    } else if (st === 'CONNECTED') {
      color = 'info'
      label = 'Connected'
    }

    return (
      <Chip
        size="small"
        label={label}
        color={color}
        variant={st === 'CANCELLED' ? 'outlined' : 'filled'}
        sx={{
          height: 18,
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'capitalize',
          px: 0.5
        }}
      />
    )
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filter Chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
          <Chip
            size="small"
            label={`All (${counts.all})`}
            onClick={() => setFilterType('all')}
            color={filterType === 'all' ? 'primary' : 'default'}
            variant={filterType === 'all' ? 'filled' : 'outlined'}
          />
          <Chip
            size="small"
            icon={<CallIcon fontSize="small" />}
            label={`Calls (${counts.call})`}
            onClick={() => setFilterType('call')}
            color={filterType === 'call' ? 'primary' : 'default'}
            variant={filterType === 'call' ? 'filled' : 'outlined'}
          />
          <Chip
            size="small"
            icon={<TaskIcon fontSize="small" />}
            label={`Tasks (${counts.task})`}
            onClick={() => setFilterType('task')}
            color={filterType === 'task' ? 'primary' : 'default'}
            variant={filterType === 'task' ? 'filled' : 'outlined'}
          />
          <Chip
            size="small"
            icon={<StageIcon fontSize="small" />}
            label={`Stage History (${counts.stage})`}
            onClick={() => setFilterType('stage')}
            color={filterType === 'stage' ? 'primary' : 'default'}
            variant={filterType === 'stage' ? 'filled' : 'outlined'}
          />
        </Stack>
      </Box>

      {/* Timeline Stream */}
      <Box sx={{ position: 'relative', pl: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Continuous vertical line */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            bottom: 10,
            left: 11,
            width: 2,
            bgcolor: 'divider'
          }}
        />

        {filteredItems.map((item) => {
          const isCancelled = String(item.status).toUpperCase() === 'CANCELLED'
          return (
            <Box key={item.id} sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 2, opacity: isCancelled ? 0.75 : 1 }}>
              {/* Timeline Node Bubble */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -24,
                  top: 2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: isCancelled ? '#fee2e2' : getBgColor(item.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                }}
              >
                {getIcon(item.type)}
              </Box>

              {/* Timeline Content Card */}
              <Paper
                elevation={0}
                sx={{
                  flexGrow: 1,
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: isCancelled ? 'error.light' : 'divider',
                  bgcolor: isCancelled ? 'rgba(239, 68, 68, 0.03)' : 'background.paper'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          color: isCancelled ? 'text.secondary' : 'text.primary'
                        }}
                      >
                        {item.title}
                      </Typography>
                      {renderStatusChip(item)}
                    </Box>
                    {item.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {item.subtitle}
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontWeight: 500 }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                </Box>

                {item.description && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', whiteSpace: 'pre-wrap', bgcolor: 'background.default', p: 1, borderRadius: 0.75, border: '1px solid', borderColor: 'divider' }}>
                    {item.description}
                  </Typography>
                )}

                {item.author && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    By: {item.author}
                  </Typography>
                )}
              </Paper>
            </Box>
          )
        })}

        {filteredItems.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2">No activities recorded yet.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
