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
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'
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
  Person as PersonIcon,
  Business as BusinessIcon,
  InfoOutlined as InfoIcon
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
  const [pendingLostDeal, setPendingLostDeal] = useState<{ dealId: string; stageId: string; stageName?: string } | null>(null)
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS[0])
  const [lostRemarks, setLostRemarks] = useState('')

  // Add / Edit Modal State
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [dealForm, setDealForm] = useState<Record<string, any>>({
    title: '',
    amount: '',
    currency: 'INR',
    pipelineId: '',
    stage: '',
    stageId: '',
    probability: 10,
    contactId: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    accountName: '',
    ownerName: '',
    expectedCloseDate: '',
    notes: '',
    lostReason: '',
    otherLostReason: '',
    unitNumber: '',
    towerBlock: '',
    propertyType: '',
    vehicleModel: '',
    variant: '',
    modelYear: '',
    clinicalSpecialty: '',
    treatmentProcedure: '',
    programName: '',
    academicIntake: '',
    portfolioType: '',
    riskCategory: '',
    techStack: '',
    sowTerm: '',
    productLine: '',
    batchSize: ''
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
        listPipelines({ organizationId: activeOrg, industryId: activeInd }).catch((err) => {
          console.warn('[DealsList] Error loading pipelines:', err);
          return [] as Pipeline[];
        }),
        listContacts({ organizationId: activeOrg, industryId: activeInd }).catch(() => [] as Contact[]),
        listUsers(activeOrg, true).catch(() => [] as AdminUser[])
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
    if (isSuperAdmin && !selectedIndustry) return
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
      setPendingLostDeal({ dealId, stageId: targetStageId, stageName: targetStage.name })
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
    const { dealId, stageId, stageName } = pendingLostDeal
    const finalStageName = stageName || 'Closed Lost'
    const reasonText = selectedLostReason === 'Other' && lostRemarks ? lostRemarks : selectedLostReason

    // Optimistic update
    setDeals(prev => prev.map(d => {
      if ((d._id || d.id) === dealId) {
        return {
          ...d,
          stage: finalStageName,
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
        stage: finalStageName,
        stageId,
        probability: 0,
        lostReason: reasonText
      })
      setToast({ open: true, msg: `Deal marked as ${finalStageName}`, sev: 'success' })
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
    const ind = String(selectedIndustry || user?.industryId || '').toLowerCase()
    const isB2BVertical = ind === 'temp0006' || ind === 'temp0007'
    const defCustomerType = isB2BVertical ? 'B2B' : 'B2C'
    setCustomerType(defCustomerType)
    setSelectedContact(null)
    setEditingDeal(null)
    setDealForm({
      contactId: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      accountName: '',
      title: '',
      amount: '',
      currency: 'INR',
      pipelineId: selectedPipelineId,
      stage: defaultStageVal,
      stageId: defaultStageVal,
      probability: firstStage?.probability ?? 10,
      ownerName: user?.name || user?.email || '',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      lostReason: '',
      otherLostReason: '',
      unitNumber: '',
      towerBlock: '',
      propertyType: '',
      vehicleModel: '',
      variant: '',
      modelYear: '',
      clinicalSpecialty: '',
      treatmentProcedure: '',
      programName: '',
      academicIntake: '',
      portfolioType: '',
      riskCategory: '',
      techStack: '',
      sowTerm: '',
      productLine: '',
      batchSize: ''
    })
    setDealModalOpen(true)
  }

  const handleOpenEdit = (deal: Deal) => {
    const hasAccount = Boolean(deal.accountName || deal.account_name)
    setCustomerType(hasAccount ? 'B2B' : 'B2C')
    const cId = deal.contactId || deal.contact_id
    const matchedContact = contacts.find(c => String(c._id || c.id) === String(cId)) || (cId ? {
      _id: String(cId),
      customerName: deal.contactName || deal.contact_name || '',
      contactNumber: deal.contactPhone || deal.contact_phone || '',
      emailId: deal.contactEmail || deal.contact_email || ''
    } as Contact : null)
    setSelectedContact(matchedContact)
    setEditingDeal(deal)
    setDealForm({
      contactId: (deal.contactId || deal.contact_id || '') as string,
      contactName: deal.contactName || deal.contact_name || '',
      contactPhone: deal.contactPhone || deal.contact_phone || '',
      contactEmail: deal.contactEmail || deal.contact_email || '',
      accountName: deal.accountName || deal.account_name || '',
      title: deal.title || deal.name || '',
      amount: deal.amount || '',
      currency: deal.currency || 'INR',
      pipelineId: deal.pipelineId || deal.pipeline_id || selectedPipelineId,
      stage: deal.stage || deal.stageId || deal.stage_id || '',
      stageId: deal.stageId || deal.stage_id || deal.stage || '',
      probability: deal.probability ?? 10,
      ownerName: deal.ownerName || deal.owner_name || user?.name || user?.email || '',
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : (deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : ''),
      notes: deal.notes || '',
      lostReason: deal.lostReason || deal.lost_reason || '',
      otherLostReason: '',
      unitNumber: (deal as any).unitNumber || (deal as any).unit_number || '',
      towerBlock: (deal as any).towerBlock || (deal as any).tower_block || '',
      propertyType: (deal as any).propertyType || (deal as any).property_type || '',
      vehicleModel: (deal as any).vehicleModel || (deal as any).vehicle_model || '',
      variant: (deal as any).variant || '',
      modelYear: (deal as any).modelYear || (deal as any).model_year || '',
      clinicalSpecialty: (deal as any).clinicalSpecialty || (deal as any).clinical_specialty || '',
      treatmentProcedure: (deal as any).treatmentProcedure || (deal as any).treatment_procedure || '',
      programName: (deal as any).programName || (deal as any).program_name || '',
      academicIntake: (deal as any).academicIntake || (deal as any).academic_intake || '',
      portfolioType: (deal as any).portfolioType || (deal as any).portfolio_type || '',
      riskCategory: (deal as any).riskCategory || (deal as any).risk_category || '',
      techStack: (deal as any).techStack || (deal as any).tech_stack || '',
      sowTerm: (deal as any).sowTerm || (deal as any).sow_term || '',
      productLine: (deal as any).productLine || (deal as any).product_line || '',
      batchSize: (deal as any).batchSize || (deal as any).batch_size || ''
    })
    setDealModalOpen(true)
  }

  const handleSaveDeal = async () => {
    try {
      const titleVal = String(dealForm.title || '').trim()
      if (!titleVal) {
        setToast({ open: true, msg: 'Please enter a deal title', sev: 'error' })
        return
      }

      if (customerType === 'B2B' && !String(dealForm.accountName || '').trim()) {
        setToast({ open: true, msg: 'Please enter the Company / Corporate Name for B2B deals', sev: 'error' })
        return
      }

      const amtVal = Number(dealForm.amount)
      if (isNaN(amtVal) || amtVal <= 0) {
        setToast({ open: true, msg: 'Deal value must be greater than 0', sev: 'error' })
        return
      }

      if (dealForm.expectedCloseDate) {
        const closeTime = new Date(dealForm.expectedCloseDate).getTime()
        if (!isNaN(closeTime) && closeTime < Date.now() - 24 * 60 * 60 * 1000) {
          setToast({ open: true, msg: 'Expected close date cannot be in the past', sev: 'error' })
          return
        }
      }

      setLoading(true)
      const stageVal = dealForm.stageId || dealForm.stage
      const selectedStageObj = stages.find(s => (s.stageId || s.stage_id || s.name) === stageVal) || stages[0]

      const activeOrg = isSuperAdmin ? selectedOrg || undefined : (user?.organizationId || (user as any)?.organization_id || undefined)
      const activeInd = isSuperAdmin ? selectedIndustry || undefined : (user?.industryId || undefined)

      const payload: Partial<Deal> = {
        title: titleVal,
        name: titleVal,
        amount: amtVal,
        currency: dealForm.currency || 'INR',
        pipelineId: selectedPipelineId || dealForm.pipelineId,
        pipeline_id: selectedPipelineId || dealForm.pipelineId,
        stageId: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage_id: selectedStageObj ? String(selectedStageObj.stageId || selectedStageObj.stage_id || selectedStageObj.name) : stageVal,
        stage: selectedStageObj?.name || stageVal || 'New Enquiry',
        probability: typeof dealForm.probability === 'number' ? dealForm.probability : (selectedStageObj?.probability ?? 10),
        expectedCloseDate: dealForm.expectedCloseDate ? String(dealForm.expectedCloseDate) : undefined,
        accountName: customerType === 'B2B' ? String(dealForm.accountName).trim() : '',
        account_name: customerType === 'B2B' ? String(dealForm.accountName).trim() : '',
        contactId: dealForm.contactId || undefined,
        contact_id: dealForm.contactId || undefined,
        contactName: dealForm.contactName || '',
        contact_name: dealForm.contactName || '',
        contactPhone: dealForm.contactPhone || '',
        contact_phone: dealForm.contactPhone || '',
        contactEmail: dealForm.contactEmail || '',
        contact_email: dealForm.contactEmail || '',
        ownerName: dealForm.ownerName || user?.name || user?.email || '',
        notes: dealForm.notes || '',
        lostReason: dealForm.lostReason === 'Other' && dealForm.otherLostReason ? dealForm.otherLostReason : (dealForm.lostReason || undefined),
        organizationId: activeOrg,
        industryId: activeInd,
        // Dynamic industry vertical fields
        unitNumber: dealForm.unitNumber || undefined,
        towerBlock: dealForm.towerBlock || undefined,
        propertyType: dealForm.propertyType || undefined,
        vehicleModel: dealForm.vehicleModel || undefined,
        variant: dealForm.variant || undefined,
        modelYear: dealForm.modelYear || undefined,
        clinicalSpecialty: dealForm.clinicalSpecialty || undefined,
        treatmentProcedure: dealForm.treatmentProcedure || undefined,
        programName: dealForm.programName || undefined,
        academicIntake: dealForm.academicIntake || undefined,
        portfolioType: dealForm.portfolioType || undefined,
        riskCategory: dealForm.riskCategory || undefined,
        techStack: dealForm.techStack || undefined,
        sowTerm: dealForm.sowTerm || undefined,
        productLine: dealForm.productLine || undefined,
        batchSize: dealForm.batchSize || undefined
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
    } catch (err: any) {
      console.error(err)
      setToast({ open: true, msg: err?.response?.data?.message || 'Failed to save deal', sev: 'error' })
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
        <Box sx={{ py: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              cursor: can_edit ? 'pointer' : 'default',
              '&:hover': { color: can_edit ? 'primary.main' : 'text.primary', textDecoration: can_edit ? 'underline' : 'none' }
            }}
            onClick={() => can_edit && handleOpenEdit(params.row)}
          >
            {params.row.title || params.row.name || 'Untitled Deal'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.25 }}>
            {Boolean(params.row.accountName || params.row.account_name) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                🏢 {params.row.accountName || params.row.account_name}
              </Typography>
            )}
            {Boolean(params.row.contactName || params.row.contact_name) && (
              <Typography
                variant="caption"
                color="primary"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
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
                👤 {params.row.contactName || params.row.contact_name}
              </Typography>
            )}
          </Stack>
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

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {/* Pipeline Selector */}
          {pipelines.length > 1 && (
            <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 } }}>
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
            sx={{ width: { xs: '100%', sm: 200 }, flex: { xs: '1 1 100%', sm: 'none' }, order: { xs: 3, sm: 2 } }}
          />

          {/* View Switcher */}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            sx={{ order: { xs: 2, sm: 3 } }}
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
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ order: { xs: 1, sm: 4 }, fontWeight: 600 }}
            >
              Add Deal
            </Button>
          )}

        </Stack>
      </Box>

      {/* KPI Metric Summary Bar (2x2 on mobile, 4-col on desktop) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 1, sm: 2 }, mb: 2.5, flexShrink: 0 }}>
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Total Deals
            </Typography>
            <Tooltip title="Total number of active and closed deals in the current view/pipeline." arrow>
              <InfoIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {metrics.totalCount}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Total Pipeline Value
            </Typography>
            <Tooltip title="Cumulative face value of all active commercial opportunities in this pipeline." arrow>
              <InfoIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {formatCurrency(metrics.totalVal)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Weighted Forecast
            </Typography>
            <Tooltip title="Calculated as: Σ (Deal Amount × Stage Probability %). Represents realistic expected revenue." arrow>
              <InfoIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#8b5cf6', mt: 0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {formatCurrency(metrics.weightedVal)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Won Value (Win Rate)
            </Typography>
            <Tooltip title="Total closed-won commercial revenue and percentage of won deals vs all closed deals." arrow>
              <InfoIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981', mt: 0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
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
            pt: 0.5,
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: { xs: 'x proximity', sm: 'none' },
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              height: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
            },
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
                  minWidth: { xs: 285, sm: 320 },
                  width: { xs: 285, sm: 320 },
                  scrollSnapAlign: 'start',
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
                        onClick={() => can_edit && handleOpenEdit(deal)}
                        elevation={0}
                        sx={{
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          cursor: can_edit ? 'pointer' : 'default',
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
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            {Boolean(deal.accountName || deal.account_name) && (
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  px: 0.75,
                                  py: 0.3,
                                  bgcolor: 'action.hover',
                                  borderRadius: 1,
                                  maxWidth: '100%'
                                }}
                              >
                                <BusinessIcon sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {deal.accountName || deal.account_name}
                                </Typography>
                              </Box>
                            )}

                            {Boolean(deal.contactName || deal.contact_name) && (
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
                                  gap: 0.5,
                                  px: 0.75,
                                  py: 0.3,
                                  bgcolor: 'primary.50',
                                  borderRadius: 1,
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
                          </Stack>

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
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{editingDeal ? 'Edit Opportunity / Deal' : 'Add New Opportunity / Deal'}</span>
          <Chip
            size="small"
            label={customerType === 'B2B' ? '🏢 B2B Corporate' : '👤 B2C Direct'}
            color={customerType === 'B2B' ? 'secondary' : 'primary'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* Customer Type Selector */}
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                Deal Customer Type
              </Typography>
              <ToggleButtonGroup
                value={customerType}
                exclusive
                onChange={(_, val) => {
                  if (!val) return
                  setCustomerType(val)
                  if (val === 'B2B') {
                    if (!dealForm.accountName && dealForm.contactName) {
                      const acc = `${dealForm.contactName} Co.`
                      setDealForm(prev => ({
                        ...prev,
                        accountName: acc,
                        title: !prev.title || prev.title.includes('Opportunity') ? `${acc} - Enterprise Opportunity` : prev.title
                      }))
                    }
                  } else {
                    if (dealForm.contactName && (!dealForm.title || dealForm.title.includes('Opportunity'))) {
                      setDealForm(prev => ({
                        ...prev,
                        title: `${prev.contactName} - Opportunity`
                      }))
                    }
                  }
                }}
                size="small"
                fullWidth
              >
                <ToggleButton value="B2C" sx={{ py: 0.75, fontWeight: 600, display: 'flex', gap: 1 }}>
                  <PersonIcon fontSize="small" /> Direct Consumer (B2C)
                </ToggleButton>
                <ToggleButton value="B2B" sx={{ py: 0.75, fontWeight: 600, display: 'flex', gap: 1 }}>
                  <BusinessIcon fontSize="small" /> Corporate Account (B2B)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Corporate Account Name if B2B */}
            {customerType === 'B2B' && (
              <TextField
                fullWidth
                size="small"
                required
                label="Company / Corporate Name"
                placeholder="e.g. Reliance Retail Ventures Ltd, Acme Tech"
                value={dealForm.accountName || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setDealForm(prev => ({
                    ...prev,
                    accountName: val,
                    title: (!prev.title || prev.title.includes('Opportunity')) && val ? `${val} - Enterprise Opportunity` : prev.title
                  }))
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" color="secondary" />
                    </InputAdornment>
                  )
                }}
                helperText="Business organization or corporate account name"
              />
            )}

            {/* Link Existing Contact via Searchable Autocomplete */}
            <Autocomplete
              options={contacts}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                const name = option.customerName || option.customer_name || 'Contact'
                const phone = option.contactNumber || option.contact_phone || ''
                const proj = option.projectName || (option as any).project_name || ''
                return `${name}${phone ? ` (${phone})` : ''}${proj ? ` • ${proj}` : ''}`
              }}
              value={selectedContact}
              onChange={(_, newContact) => {
                setSelectedContact(newContact)
                if (newContact) {
                  const cName = newContact.customerName || newContact.customer_name || ''
                  const cPhone = newContact.contactNumber || newContact.contact_phone || ''
                  const cEmail = newContact.emailId || newContact.email_id || ''
                  const cId = String(newContact._id || newContact.id || '')
                  const proj = newContact.projectName || (newContact as any).project_name || 'Opportunity'
                  const parsedBudget = newContact.budget ? Number(String(newContact.budget).replace(/[^0-9]/g, '')) : 0

                  setDealForm(prev => {
                    const nextAcc = prev.accountName || (customerType === 'B2B' ? `${cName} Co.` : '')
                    return {
                      ...prev,
                      contactId: cId,
                      contactName: cName,
                      contactPhone: cPhone,
                      contactEmail: cEmail,
                      accountName: nextAcc,
                      title: prev.title && !prev.title.includes('Opportunity')
                        ? prev.title
                        : (customerType === 'B2B' ? `${nextAcc || cName + ' Co.'} - Enterprise Opportunity` : `${cName} - ${proj}`),
                      amount: prev.amount || (parsedBudget > 0 ? parsedBudget : prev.amount)
                    }
                  })
                } else {
                  setDealForm(prev => ({
                    ...prev,
                    contactId: '',
                    contactName: '',
                    contactPhone: '',
                    contactEmail: ''
                  }))
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Select Contact / Primary Contact Person"
                  placeholder="Search contacts by name, phone or project..."
                  helperText="Search and select existing customer/prospect from your CRM"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" color="primary" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            {/* Core Deal Information (Title & Amount) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2 }}>
              <TextField
                size="small"
                required
                label="Deal Title"
                placeholder="e.g. 3BHK Luxury Suite Booking"
                value={dealForm.title || ''}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                helperText="Descriptive name for this opportunity"
              />
              <TextField
                size="small"
                required
                label="Deal Value (Amount)"
                type="number"
                placeholder="2500000"
                value={dealForm.amount || ''}
                onChange={(e) => setDealForm({ ...dealForm, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>
                }}
                helperText="Total financial pipeline amount"
              />
            </Box>

            {/* Pipeline & Stage Selection */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {pipelines.length > 1 ? (
                <FormControl size="small" fullWidth>
                  <InputLabel>Pipeline</InputLabel>
                  <Select
                    value={dealForm.pipelineId || selectedPipelineId}
                    label="Pipeline"
                    onChange={(e) => {
                      const pId = e.target.value
                      setDealForm(prev => ({ ...prev, pipelineId: pId }))
                    }}
                  >
                    {pipelines.map(p => (
                      <MenuItem key={p._id || p.id} value={p._id || p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  size="small"
                  label="Pipeline"
                  value={activePipeline?.name || 'Standard Pipeline'}
                  disabled
                  fullWidth
                />
              )}

              <FormControl size="small" fullWidth required>
                <InputLabel>Pipeline Stage</InputLabel>
                <Select
                  value={dealForm.stageId || dealForm.stage || (stages[0]?.stageId || stages[0]?.stage_id || '')}
                  label="Pipeline Stage *"
                  onChange={(e) => {
                    const stVal = e.target.value
                    const matchedSt = stages.find(s => (s.stageId || s.stage_id || s.name) === stVal)
                    setDealForm(prev => ({
                      ...prev,
                      stageId: stVal,
                      stage: matchedSt?.name || stVal,
                      probability: matchedSt?.probability ?? prev.probability
                    }))
                  }}
                >
                  {stages.map(s => (
                    <MenuItem key={s.stageId || s.stage_id || s.name} value={s.stageId || s.stage_id || s.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color || '#3b82f6' }} />
                        <span>{s.name} ({s.probability}%)</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Probability & Expected Close Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                size="small"
                label="Win Probability %"
                type="number"
                value={dealForm.probability ?? 10}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                  setDealForm({ ...dealForm, probability: val })
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                helperText="Confidence level of closing this deal"
              />

              <TextField
                size="small"
                label="Expected Close Date"
                type="date"
                value={dealForm.expectedCloseDate || ''}
                onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Estimated closing date"
              />
            </Box>

            {/* Deal Owner */}
            <FormControl size="small" fullWidth>
              <InputLabel>Deal Owner / Assigned Agent</InputLabel>
              <Select
                value={dealForm.ownerName || user?.name || user?.email || ''}
                label="Deal Owner / Assigned Agent"
                onChange={(e) => setDealForm({ ...dealForm, ownerName: e.target.value })}
              >
                {usersList.length > 0 ? (
                  usersList.map(u => (
                    <MenuItem key={u.id || (u as any)._id} value={u.name || u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value={user?.name || user?.email || ''}>
                    {user?.name || user?.email || 'Self'}
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Dynamic Industry Vertical Specific Fields (Gap 4) */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                <InfoIcon sx={{ fontSize: 15, color: 'primary.main' }} /> Industry Context Requirements ({selectedIndustry || user?.industryId || 'Real Estate'})
              </Typography>
              
              {/* Real Estate temp0001 */}
              {(!selectedIndustry || selectedIndustry === 'temp0001' || user?.industryId === 'temp0001') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Unit / Flat Number"
                    placeholder="e.g. Flat 1402"
                    value={dealForm.unitNumber || ''}
                    onChange={(e) => setDealForm({ ...dealForm, unitNumber: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Tower / Wing"
                    placeholder="e.g. Tower B"
                    value={dealForm.towerBlock || ''}
                    onChange={(e) => setDealForm({ ...dealForm, towerBlock: e.target.value })}
                  />
                  <FormControl size="small">
                    <InputLabel>Property Type</InputLabel>
                    <Select
                      value={dealForm.propertyType || ''}
                      label="Property Type"
                      onChange={(e) => setDealForm({ ...dealForm, propertyType: e.target.value })}
                    >
                      <MenuItem value="Apartment">Apartment</MenuItem>
                      <MenuItem value="Villa">Villa / Bungalow</MenuItem>
                      <MenuItem value="Plot">Residential Plot</MenuItem>
                      <MenuItem value="Commercial">Commercial Office</MenuItem>
                      <MenuItem value="Retail">Retail Shop</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Automobiles / E-Commerce temp0002 */}
              {(selectedIndustry === 'temp0002' || user?.industryId === 'temp0002') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Vehicle Model / Product SKU"
                    placeholder="e.g. SUV Pro / SKU-882"
                    value={dealForm.vehicleModel || ''}
                    onChange={(e) => setDealForm({ ...dealForm, vehicleModel: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Trim / Variant"
                    placeholder="e.g. Top Automatic AWD"
                    value={dealForm.variant || ''}
                    onChange={(e) => setDealForm({ ...dealForm, variant: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Model Year"
                    placeholder="2026"
                    value={dealForm.modelYear || ''}
                    onChange={(e) => setDealForm({ ...dealForm, modelYear: e.target.value })}
                  />
                </Box>
              )}

              {/* Healthcare temp0003 */}
              {(selectedIndustry === 'temp0003' || user?.industryId === 'temp0003') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Clinical Specialty"
                    placeholder="e.g. Cardiology, Orthopedics"
                    value={dealForm.clinicalSpecialty || ''}
                    onChange={(e) => setDealForm({ ...dealForm, clinicalSpecialty: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Treatment / Procedure"
                    placeholder="e.g. Knee Replacement Surgery"
                    value={dealForm.treatmentProcedure || ''}
                    onChange={(e) => setDealForm({ ...dealForm, treatmentProcedure: e.target.value })}
                  />
                </Box>
              )}

              {/* Education temp0004 */}
              {(selectedIndustry === 'temp0004' || user?.industryId === 'temp0004') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Program / Course"
                    placeholder="e.g. B.Tech Computer Science"
                    value={dealForm.programName || ''}
                    onChange={(e) => setDealForm({ ...dealForm, programName: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Academic Intake / Semester"
                    placeholder="e.g. Fall 2026 Batch"
                    value={dealForm.academicIntake || ''}
                    onChange={(e) => setDealForm({ ...dealForm, academicIntake: e.target.value })}
                  />
                </Box>
              )}

              {/* Finance temp0005 */}
              {(selectedIndustry === 'temp0005' || user?.industryId === 'temp0005') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Investment Portfolio / Product"
                    placeholder="e.g. High-Yield Wealth Management"
                    value={dealForm.portfolioType || ''}
                    onChange={(e) => setDealForm({ ...dealForm, portfolioType: e.target.value })}
                  />
                  <FormControl size="small">
                    <InputLabel>Risk Category</InputLabel>
                    <Select
                      value={dealForm.riskCategory || 'Moderate'}
                      label="Risk Category"
                      onChange={(e) => setDealForm({ ...dealForm, riskCategory: e.target.value })}
                    >
                      <MenuItem value="Conservative">Conservative</MenuItem>
                      <MenuItem value="Moderate">Moderate</MenuItem>
                      <MenuItem value="Aggressive">Aggressive</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* IT Services temp0006 */}
              {(selectedIndustry === 'temp0006' || user?.industryId === 'temp0006') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Technology Stack / Service Line"
                    placeholder="e.g. Fullstack React/Node Cloud Modernization"
                    value={dealForm.techStack || ''}
                    onChange={(e) => setDealForm({ ...dealForm, techStack: e.target.value })}
                  />
                  <FormControl size="small">
                    <InputLabel>Engagement Model</InputLabel>
                    <Select
                      value={dealForm.sowTerm || 'Fixed Price'}
                      label="Engagement Model"
                      onChange={(e) => setDealForm({ ...dealForm, sowTerm: e.target.value })}
                    >
                      <MenuItem value="Fixed Price">Fixed Price Milestone</MenuItem>
                      <MenuItem value="Monthly Retainer">Monthly Dedicated Retainer</MenuItem>
                      <MenuItem value="Time & Material">Time & Material (Hourly)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Manufacturing temp0007 */}
              {(selectedIndustry === 'temp0007' || user?.industryId === 'temp0007') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Product Line"
                    placeholder="e.g. Industrial Valves & Couplers"
                    value={dealForm.productLine || ''}
                    onChange={(e) => setDealForm({ ...dealForm, productLine: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Production Order Batch Size"
                    placeholder="e.g. 10,000 Units"
                    value={dealForm.batchSize || ''}
                    onChange={(e) => setDealForm({ ...dealForm, batchSize: e.target.value })}
                  />
                </Box>
              )}
            </Box>

            {/* Notes & Details */}
            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label="Deal Notes & Client Requirements"
              placeholder="Key deliverables, timeline expectations, or negotiation notes..."
              value={dealForm.notes || ''}
              onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
            />

            {/* If Lost Stage Selected in Add/Edit */}
            {String(dealForm.stage || dealForm.stageId || '').toUpperCase().includes('LOST') && (
              <Box sx={{ p: 1.5, bgcolor: 'error.50', borderRadius: 1.5, border: '1px solid', borderColor: 'error.200' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', display: 'block', mb: 1 }}>
                  Lost Opportunity Reason
                </Typography>
                <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                  <InputLabel>Reason for Loss</InputLabel>
                  <Select
                    value={dealForm.lostReason || LOST_REASONS[0]}
                    label="Reason for Loss"
                    onChange={(e) => setDealForm({ ...dealForm, lostReason: e.target.value })}
                  >
                    {LOST_REASONS.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {dealForm.lostReason === 'Other' && (
                  <TextField
                    size="small"
                    fullWidth
                    label="Specify Reason"
                    placeholder="Details about client decision or competitor..."
                    value={dealForm.otherLostReason || ''}
                    onChange={(e) => setDealForm({ ...dealForm, otherLostReason: e.target.value })}
                  />
                )}
              </Box>
            )}

          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDealModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveDeal} disabled={loading}>
            {loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : (editingDeal ? 'Save Changes' : 'Create Deal')}
          </Button>
        </DialogActions>
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
