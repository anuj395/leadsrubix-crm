import { useEffect, useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ViewKanban as ViewKanbanIcon,
  ViewList as ViewListIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { 
  listDeals, 
  deleteDeal, 
  createDeal,
  updateDeal, 
  updateDealStage, 
  listPipelines,
  type Deal, 
  type Pipeline, 
  type Stage 
} from '@/services/dealsService'
import { listContacts, type Contact } from '@/services/contactsService'
import { listUsers, type AdminUser } from '@/services/usersAdminService'
import { useConfirm } from '@/components/common/ConfirmContext'
import { useActionPermission } from '@/hooks/useActionPermission'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import type { GridColDef } from '@mui/x-data-grid'

import { useSuperAdminScope } from '@/hooks/useSuperAdminScope'
import { useNavigate } from 'react-router-dom'
import { SuperAdminScopeSelector } from '@/components/common/SuperAdminScopeSelector'
import { resolveScreen, type ResolvedScreen } from '@/services/screenAdminService'
import { DynamicForm } from '@/components/DynamicForm/DynamicForm'

const LOST_REASONS = [
  'Price / Budget Constraint',
  'Competitor Chosen',
  'Location / Timing Mismatch',
  'Project Specifications Unmet',
  'Client unresponsive / Lost interest',
  'Other'
]

function formatCurrency(val?: number, currency = 'INR'): string {
  if (typeof val !== 'number') return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0
  }).format(val)
}

export default function DealsListPage() {
  const navigate = useNavigate()
  const { user } = useAppSelector(selectAuth)
  const isSuperAdmin = user?.role === 'superAdmin'
  const { can_view, can_add, can_edit, can_delete, loading: permsLoading } = useActionPermission('deals')

  const {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg
  } = useSuperAdminScope(isSuperAdmin)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [usersList, setUsersList] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const [resolvedScreen, setResolvedScreen] = useState<ResolvedScreen | null>(null)

  useEffect(() => {
    const activeOrg = isSuperAdmin ? selectedOrg || undefined : ((user as any)?.organizationId || (user as any)?.organization_id || undefined)
    const activeInd = isSuperAdmin ? selectedIndustry || undefined : (user?.industryId || undefined)
    void resolveScreen({
      screenKey: 'deals',
      industryCode: activeInd,
      organizationId: activeOrg,
    }).then(res => setResolvedScreen(res)).catch(() => setResolvedScreen(null))
  }, [isSuperAdmin, selectedOrg, selectedIndustry, user?.industryId, (user as any)?.organizationId, (user as any)?.organization_id])

  // Drag-and-drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)

  // Lost Reason Modal State
  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [pendingLostDeal, setPendingLostDeal] = useState<{ dealId: string; stageId: string } | null>(null)
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS[0])
  const [lostRemarks, setLostRemarks] = useState('')

  // Add / Edit Modal State
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [dealForm, setDealForm] = useState<Record<string, any>>({
    title: '',
    amount: 0,
    currency: 'INR',
    pipelineId: '',
    stage: '',
    stageId: '',
    contactName: '',
    ownerName: '',
    expectedCloseDate: '',
    notes: ''
  })

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const { confirmDelete } = useConfirm()

  // Load pipelines, contacts, and users
  const loadInitialData = async () => {
    try {
      setLoading(true)
      const activeOrg = isSuperAdmin ? selectedOrg || undefined : undefined
      const activeInd = isSuperAdmin ? selectedIndustry || undefined : undefined

      const [pipes, contactsRes, usersRes] = await Promise.all([
        listPipelines({ organizationId: activeOrg, industryId: activeInd }),
        listContacts({ organizationId: activeOrg, industryId: activeInd }),
        listUsers(activeOrg, true)
      ])
      setPipelines(pipes)
      setContacts(contactsRes)
      setUsersList(usersRes)

      if (pipes.length > 0) {
        const defaultPipe = pipes.find(p => p.isDefault || p.is_default) || pipes[0]
        const pipeId = defaultPipe._id || defaultPipe.id || ''
        setSelectedPipelineId(pipeId)
        await loadDealsForPipeline(pipeId, activeOrg, activeInd)
      } else {
        setSelectedPipelineId('')
        setDeals([])
      }
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Failed to load pipeline data', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadDealsForPipeline = async (pipeId: string, orgId?: string, indId?: string) => {
    try {
      setLoading(true)
      const activeOrg = orgId ?? (isSuperAdmin ? selectedOrg || undefined : undefined)
      const activeInd = indId ?? (isSuperAdmin ? selectedIndustry || undefined : undefined)
      const list = await listDeals({ pipelineId: pipeId, organizationId: activeOrg, industryId: activeInd })
      setDeals(list)
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Failed to load deals', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && (!selectedIndustry || !selectedOrg)) return
    void loadInitialData()
  }, [selectedIndustry, selectedOrg, isSuperAdmin])

  const activePipeline = useMemo(() => {
    return pipelines.find(p => (p._id || p.id) === selectedPipelineId) || pipelines[0]
  }, [pipelines, selectedPipelineId])

  const stages: Stage[] = useMemo(() => {
    if (!activePipeline?.stages) return []
    return [...activePipeline.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [activePipeline])

  // Filtered deals based on search
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return deals
    const q = searchQuery.toLowerCase().trim()
    return deals.filter(d => {
      const title = (d.title || d.name || '').toLowerCase()
      const contact = (d.contactName || d.contact_name || '').toLowerCase()
      const account = (d.accountName || d.account_name || '').toLowerCase()
      const owner = (d.ownerName || d.owner_name || '').toLowerCase()
      const phone = (d.contactPhone || d.contact_phone || '').toLowerCase()
      return title.includes(q) || contact.includes(q) || account.includes(q) || owner.includes(q) || phone.includes(q)
    })
  }, [deals, searchQuery])

  // Summary KPIs
  const metrics = useMemo(() => {
    let totalVal = 0
    let weightedVal = 0
    let wonVal = 0
    let wonCount = 0
    let lostCount = 0

    filteredDeals.forEach(d => {
      const amt = Number(d.amount || 0)
      const prob = Number(d.probability || 0)
      totalVal += amt
      weightedVal += (amt * prob) / 100

      const stageKey = String(d.stageId || d.stage_id || d.stage || '').toUpperCase()
      if (stageKey === 'WON' || stageKey.includes('WON') || stageKey.includes('BOOKED')) {
        wonVal += amt
        wonCount++
      } else if (stageKey === 'LOST' || stageKey.includes('LOST') || stageKey.includes('DROP')) {
        lostCount++
      }
    })

    const closedTotal = wonCount + lostCount
    const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0

    return {
      totalCount: filteredDeals.length,
      totalVal,
      weightedVal,
      wonVal,
      winRate
    }
  }, [filteredDeals])

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    if (!can_edit) return
    e.dataTransfer.setData('text/plain', dealId)
    setDraggedDealId(dealId)
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    if (!can_edit) return
    e.preventDefault()
    setDragOverStageId(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStageId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStage: Stage) => {
    if (!can_edit) return
    e.preventDefault()
    setDragOverStageId(null)
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    if (!dealId) return

    const targetStageId = targetStage.stageId || targetStage.stage_id || targetStage.name
    const currentDeal = deals.find(d => (d._id || d.id) === dealId)
    if (!currentDeal) return

    const currentStageId = currentDeal.stageId || currentDeal.stage_id || currentDeal.stage
    if (currentStageId === targetStageId) return

    // If target stage is Lost, prompt for reason
    if (targetStage.isLost || targetStage.is_lost || targetStage.name.toUpperCase().includes('LOST')) {
      setPendingLostDeal({ dealId, stageId: targetStageId })
      setLostModalOpen(true)
      return
    }

    // Optimistic UI update
    setDeals(prev => prev.map(d => {
      if ((d._id || d.id) === dealId) {
        return {
          ...d,
          stage: targetStage.name,
          stageId: targetStageId,
          stage_id: targetStageId,
          probability: targetStage.probability
        }
      }
      return d
    }))

    try {
      await updateDealStage(dealId, {
        stage: targetStage.name,
        stageId: targetStageId,
        probability: targetStage.probability
      })
      setToast({ open: true, msg: `Moved to ${targetStage.name}`, sev: 'success' })
      if (selectedPipelineId) await loadDealsForPipeline(selectedPipelineId)
    } catch (err) {
      console.error(err)
      setToast({ open: true, msg: 'Failed to update deal stage', sev: 'error' })
      if (selectedPipelineId) await loadDealsForPipeline(selectedPipelineId)
    }
  }

  const handleConfirmLost = async () => {
    if (!pendingLostDeal) return
    const { dealId, stageId } = pendingLostDeal
    const reasonText = selectedLostReason === 'Other' && lostRemarks ? lostRemarks : selectedLostReason

    // Optimistic update
    setDeals(prev => prev.map(d => {
      if ((d._id || d.id) === dealId) {
        return {
          ...d,
          stage: 'Closed Lost',
          stageId,
          stage_id: stageId,
          probability: 0,
          lostReason: reasonText
        }
      }
      return d
    }))

    try {
      await updateDealStage(dealId, {
        stage: 'Closed Lost',
        stageId,
        probability: 0,
        lostReason: reasonText
      })
      setToast({ open: true, msg: 'Deal marked as Closed Lost', sev: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, msg: 'Failed to update deal', sev: 'error' })
      if (selectedPipelineId) await loadDealsForPipeline(selectedPipelineId)
    } finally {
      setLostModalOpen(false)
      setPendingLostDeal(null)
      setLostRemarks('')
    }
  }

  // Delete handler
  const handleDelete = (deal: Deal) => {
    confirmDelete({
      title: 'Delete Deal',
      message: `Are you sure you want to delete "${deal.title || deal.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDeal((deal._id || deal.id) as string)
          setToast({ open: true, msg: 'Deal deleted successfully', sev: 'success' })
          if (selectedPipelineId) await loadDealsForPipeline(selectedPipelineId)
        } catch (err) {
          setToast({ open: true, msg: 'Failed to delete deal', sev: 'error' })
        }
      }
    })
  }

  // Open Add/Edit Modal
  const handleOpenAdd = () => {
    const firstStage = stages[0]
    const defaultStageVal = firstStage ? (firstStage.stageId || firstStage.stage_id || firstStage.name) : 'New Enquiry'
    setEditingDeal(null)
    setDealForm({
      title: '',
      amount: '',
      currency: 'INR',
      pipelineId: selectedPipelineId,
      stage: defaultStageVal,
      stageId: defaultStageVal,
      probability: firstStage?.probability ?? 10,
      contactName: '',
      ownerName: user?.name || user?.email || '',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    })
    setDealModalOpen(true)
  }

  const handleOpenEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setDealForm({
      title: deal.title || deal.name || '',
      amount: deal.amount || 0,
      currency: deal.currency || 'INR',
      pipelineId: deal.pipelineId || deal.pipeline_id || selectedPipelineId,
      stage: deal.stage || deal.stageId || deal.stage_id || '',
      stageId: deal.stageId || deal.stage_id || deal.stage || '',
      probability: deal.probability || 10,
      contactName: deal.contactName || deal.contact_name || '',
      ownerName: deal.ownerName || deal.owner_name || user?.name || user?.email || '',
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : (deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : ''),
      notes: deal.notes || ''
    })
    setDealModalOpen(true)
  }

  const handleSaveDeal = async (formValues: Record<string, any>) => {
    try {
      setLoading(true)
      const titleVal = String(formValues.title || formValues.name || dealForm.title || '').trim()
      if (!titleVal) {
        setToast({ open: true, msg: 'Please enter a deal title', sev: 'error' })
        return
      }

      const stageVal = formValues.stage || formValues.stageId || dealForm.stageId
      const selectedStageObj = stages.find(s => (s.stageId || s.stage_id || s.name) === stageVal) || stages[0]

      const activeOrg = isSuperAdmin ? selectedOrg || undefined : undefined
      const activeInd = isSuperAdmin ? selectedIndustry || undefined : undefined

      const payload: Partial<Deal> = {
        ...formValues,
        title: titleVal,
        name: titleVal,
        amount: Number(formValues.amount || dealForm.amount || 0),
        currency: formValues.currency || dealForm.currency || 'INR',
        pipelineId: selectedPipelineId || dealForm.pipelineId,
        pipeline_id: selectedPipelineId || dealForm.pipelineId,
        stageId: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage_id: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage: selectedStageObj?.name || stageVal || 'New Enquiry',
        probability: typeof formValues.probability === 'number' ? formValues.probability : (selectedStageObj?.probability ?? 10),
        expectedCloseDate: formValues.expectedCloseDate ? String(formValues.expectedCloseDate) : undefined,
        contactName: formValues.contactName || dealForm.contactName || '',
        ownerName: formValues.ownerName || dealForm.ownerName || user?.name || user?.email || '',
        notes: formValues.notes || dealForm.notes || '',
        organizationId: activeOrg,
        industryId: activeInd
      }

      if (editingDeal) {
        await updateDeal((editingDeal._id || editingDeal.id) as string, payload)
        setToast({ open: true, msg: 'Deal updated successfully', sev: 'success' })
      } else {
        await createDeal(payload)
        setToast({ open: true, msg: 'Deal created successfully', sev: 'success' })
      }
      setDealModalOpen(false)
      if (selectedPipelineId) await loadDealsForPipeline(selectedPipelineId)
    } catch (err) {
      console.error(err)
      setToast({ open: true, msg: 'Failed to save deal', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Grid columns for List View
  const listColumns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Deal Title',
      flex: 1.5,
      minWidth: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {params.row.title || params.row.name || 'Untitled Deal'}
          </Typography>
          {params.row.contactName && (
            <Typography
              variant="caption"
              color="primary"
              sx={{
                display: 'block',
                cursor: params.row.contactId || params.row.contact_id ? 'pointer' : 'default',
                '&:hover': { textDecoration: params.row.contactId || params.row.contact_id ? 'underline' : 'none' }
              }}
              onClick={(e) => {
                const cId = params.row.contactId || params.row.contact_id
                if (cId) {
                  e.stopPropagation()
                  navigate(`/leads/contacts/${cId}`)
                }
              }}
            >
              👤 {params.row.contactName}
            </Typography>
          )}
        </Box>
      )
    },
    {
      field: 'amount',
      headerName: 'Deal Value',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {formatCurrency(params.row.amount, params.row.currency)}
        </Typography>
      )
    },
    {
      field: 'stage',
      headerName: 'Stage',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        const stageObj = stages.find(s => (s.stageId || s.stage_id || s.name) === (params.row.stageId || params.row.stage))
        return (
          <Chip
            size="small"
            label={stageObj?.name || params.row.stage || 'Qualification'}
            sx={{
              bgcolor: `${stageObj?.color || '#3b82f6'}15`,
              color: stageObj?.color || '#3b82f6',
              fontWeight: 600,
              border: `1px solid ${stageObj?.color || '#3b82f6'}40`
            }}
          />
        )
      }
    },
    {
      field: 'probability',
      headerName: 'Probability',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params) => (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={params.row.probability || 10}
            sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {params.row.probability || 10}%
          </Typography>
        </Box>
      )
    },
    {
      field: 'ownerName',
      headerName: 'Owner',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.light' }}>
            {String(params.row.ownerName || params.row.owner_name || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {params.row.ownerName || params.row.owner_name || 'Unassigned'}
          </Typography>
        </Stack>
      )
    },
    {
      field: 'expectedCloseDate',
      headerName: 'Expected Close',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => {
        const d = params.row.expectedCloseDate || params.row.expected_close_date || params.row.closeDate
        if (!d) return <Typography variant="caption" color="text.secondary">—</Typography>
        return (
          <Typography variant="body2">
            {new Date(d as string).toLocaleDateString()}
          </Typography>
        )
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {can_edit && (
            <Tooltip title="Edit Deal">
              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {can_delete && (
            <Tooltip title="Delete Deal">
              <IconButton size="small" color="error" onClick={() => handleDelete(params.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )
    }
  ]

  if (!permsLoading && !can_view) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Access Denied: You do not have permission to view Deals & Pipelines.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Super Admin Industry & Organization Scope Selector */}
      <SuperAdminScopeSelector
        isSuperAdmin={isSuperAdmin}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        filteredOrgs={filteredOrgs}
        selectedOrg={selectedOrg}
        setSelectedOrg={setSelectedOrg}
      />

      {/* Top Header & Toolbar */}
      <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {resolvedScreen?.name || resolvedScreen?.screen?.name || 'Deals & Sales Pipeline'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {resolvedScreen?.description || resolvedScreen?.screen?.description || 'Manage sales opportunities, track pipeline stages, and close deals efficiently.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Pipeline Selector */}
          {pipelines.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Pipeline</InputLabel>
              <Select
                value={selectedPipelineId}
                label="Pipeline"
                onChange={(e) => {
                  const pipeId = e.target.value
                  setSelectedPipelineId(pipeId)
                  void loadDealsForPipeline(pipeId)
                }}
              >
                {pipelines.map(p => (
                  <MenuItem key={p._id || p.id} value={p._id || p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Search Box */}
          <TextField
            size="small"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              )
            }}
            sx={{ width: { xs: 140, sm: 200 } }}
          />

          {/* View Switcher */}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
          >
            <ToggleButton value="kanban">
              <Tooltip title="Kanban Board View">
                <ViewKanbanIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
              <Tooltip title="Table / List View">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Add Deal Button */}
          {can_add && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Add Deal
            </Button>
          )}
        </Stack>
      </Box>

      {/* KPI Metric Summary Bar (Flexbox layout) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5, flexShrink: 0 }}>
        <Paper elevation={0} sx={{ flex: '1 1 180px', p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Deals
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
            {metrics.totalCount}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ flex: '1 1 180px', p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Pipeline Value
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>
            {formatCurrency(metrics.totalVal)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ flex: '1 1 180px', p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Weighted Forecast
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#8b5cf6', mt: 0.5 }}>
            {formatCurrency(metrics.weightedVal)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ flex: '1 1 180px', p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Won Value (Win Rate)
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981', mt: 0.5 }}>
            {formatCurrency(metrics.wonVal)} ({metrics.winRate}%)
          </Typography>
        </Paper>
      </Box>

      {/* Main Content Area: Kanban Board vs Table View */}
      {viewMode === 'kanban' ? (
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1.5,
            pt: 0.5
          }}
        >
          {stages.map((stage) => {
            const stageIdKey = stage.stageId || stage.stage_id || stage.name
            const stageDeals = filteredDeals.filter(d => {
              const dStage = String(d.stage || d.stageId || d.stage_id || '').toUpperCase().trim()
              const targetKey = String(stageIdKey).toUpperCase().trim()
              const targetName = String(stage.name).toUpperCase().trim()

              return dStage === targetName || dStage === targetKey
            })
            const stageSum = stageDeals.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
            const isOver = dragOverStageId === stageIdKey

            return (
              <Box
                key={stageIdKey}
                onDragOver={(e) => handleDragOver(e, stageIdKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                sx={{
                  minWidth: 320,
                  width: 320,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: isOver ? 'action.hover' : 'background.paper',
                  border: '1px solid',
                  borderColor: isOver ? stage.color || 'primary.main' : 'divider',
                  borderTop: `3px solid ${stage.color || '#3b82f6'}`,
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  boxShadow: isOver ? '0 4px 14px -2px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                {/* Stage Header */}
                <Box
                  sx={{
                    p: 1.5,
                    px: 1.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: `${stage.color || '#3b82f6'}0a`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          bgcolor: stage.color || '#3b82f6',
                          flexShrink: 0
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>
                        {stage.name}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={stageDeals.length}
                      sx={{
                        height: 22,
                        minWidth: 24,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Win prob: {stage.probability}%
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.78rem' }}>
                      {formatCurrency(stageSum)}
                    </Typography>
                  </Stack>
                </Box>

                {/* Stage Cards Column */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                  }}
                >
                  {stageDeals.map((deal) => {
                    const dealId = (deal._id || deal.id) as string
                    return (
                      <Card
                        key={dealId}
                        draggable={can_edit}
                        onDragStart={(e) => handleDragStart(e, dealId)}
                        elevation={0}
                        sx={{
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          cursor: can_edit ? 'grab' : 'default',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            transform: 'translateY(-1px)',
                          },
                          '&:active': {
                            cursor: can_edit ? 'grabbing' : 'default'
                          }
                        }}
                      >
                        <CardContent sx={{ p: '14px !important', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Title and Actions Row */}
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                lineHeight: 1.35,
                                color: 'text.primary',
                                flex: 1,
                                minWidth: 0,
                                wordBreak: 'break-word',
                              }}
                            >
                              {deal.title || deal.name || 'Untitled Deal'}
                            </Typography>
                            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                              {can_edit && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenEdit(deal)
                                  }}
                                  sx={{
                                    p: 0.5,
                                    color: 'text.secondary',
                                    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' }
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                              {can_delete && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(deal)
                                  }}
                                  sx={{
                                    p: 0.5,
                                    color: 'text.secondary',
                                    '&:hover': { color: 'error.main', bgcolor: 'error.50' }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                            </Stack>
                          </Stack>

                          {/* Deal Value */}
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 700,
                                color: 'primary.main',
                                fontSize: '1rem',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {formatCurrency(deal.amount, deal.currency)}
                            </Typography>
                          </Box>

                          {/* Contact / Company details */}
                          {(deal.contactName || deal.contact_name) && (
                            <Box
                              onClick={(e) => {
                                const cId = (deal.contactId || deal.contact_id) as string
                                if (cId) {
                                  e.stopPropagation()
                                  navigate(`/leads/contacts/${cId}`)
                                }
                              }}
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1,
                                py: 0.4,
                                bgcolor: 'primary.50',
                                borderRadius: 1.5,
                                width: 'fit-content',
                                maxWidth: '100%',
                                cursor: deal.contactId || deal.contact_id ? 'pointer' : 'default',
                                '&:hover': { bgcolor: 'primary.100' }
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 13, color: 'primary.main', flexShrink: 0 }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  fontSize: '0.72rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {deal.contactName || deal.contact_name}
                              </Typography>
                            </Box>
                          )}

                          {/* Lost Reason Pill if Lost */}
                          {(deal.lostReason || deal.lost_reason) && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: 'error.main',
                                bgcolor: 'error.light',
                                p: 0.6,
                                borderRadius: 1,
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }}
                            >
                              Reason: {deal.lostReason || deal.lost_reason}
                            </Typography>
                          )}

                          {/* Footer Info: Expected Date + Owner Avatar */}
                          <Box
                            sx={{
                              mt: 0.5,
                              pt: 1,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <CalendarIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                {deal.expectedCloseDate || deal.closeDate
                                  ? new Date((deal.expectedCloseDate || deal.closeDate) as string).toLocaleDateString()
                                  : 'No Date'}
                              </Typography>
                            </Stack>

                            <Tooltip title={deal.ownerName || deal.owner_name || 'Owner'}>
                              <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'secondary.main' }}>
                                {String(deal.ownerName || deal.owner_name || 'U').charAt(0).toUpperCase()}
                              </Avatar>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {stageDeals.length === 0 && (
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        color: 'text.secondary',
                        fontSize: '0.8rem',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      No deals in this stage
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      ) : (
        /* Table / List View */
        <AppCard title="Deals List" fullHeight>
          <AppDataGrid
            height="100%"
            rows={filteredDeals}
            columns={listColumns}
            loading={loading}
            getRowId={(r) => r._id || r.id}
          />
        </AppCard>
      )}

      {/* Add / Edit Deal Dialog */}
      <Dialog open={dealModalOpen} onClose={() => setDealModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingDeal ? 'Edit Deal' : 'Add New Deal'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <DynamicForm
              screen="deals"
              industryCode={user?.industryId || 'temp0001'}
              organizationId={(user as any)?.organizationId || (user as any)?.organization_id}
              customOptions={{
                stage: stages.map((s) => ({
                  value: s.stageId || s.stage_id || s.name,
                  label: `${s.name} (${s.probability}%)`,
                })),
              }}
              initialValues={dealForm}
              onSubmit={handleSaveDeal}
              onCancel={() => setDealModalOpen(false)}
              submitLabel={editingDeal ? 'Save Changes' : 'Create Deal'}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Capture Lost Reason Modal */}
      <Dialog open={lostModalOpen} onClose={() => setLostModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Mark Deal as Lost
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please select the primary reason for closing this opportunity as lost:
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Reason for Loss</InputLabel>
            <Select
              value={selectedLostReason}
              label="Reason for Loss"
              onChange={(e) => setSelectedLostReason(e.target.value)}
            >
              {LOST_REASONS.map((r: string) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Remarks"
            value={lostRemarks}
            onChange={(e) => setLostRemarks(e.target.value)}
            placeholder="Details about client decision or competitor..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setLostModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmLost}>
            Confirm Closed Lost
          </Button>
        </DialogActions>
      </Dialog>

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
