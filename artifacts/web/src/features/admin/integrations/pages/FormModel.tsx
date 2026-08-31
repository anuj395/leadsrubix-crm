import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed'

interface FormModelProps {
  open: boolean
  onClose: () => void
  pageName?: string
  pageFormsData: any[]
  pageId: string
  allFacebookPages: any[]
  dispatcher?: any
  projectsList: any[]
  onSave?: (updatedPages: any[]) => Promise<void>
}

export default function FormModel({
  open,
  onClose,
  pageName = '',
  pageFormsData = [],
  pageId,
  allFacebookPages = [],
  projectsList = [],
  onSave,
}: FormModelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [savingFormId, setSavingFormId] = useState<string | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    pageFormsData.forEach((form) => {
      initial[form.id] = form.projectId || form.project_id || ''
    })
    return initial
  })

  useEffect(() => {
    const initial: Record<string, string> = {}
    pageFormsData.forEach((form) => {
      initial[form.id] = form.projectId || form.project_id || ''
    })
    setMappings(initial)
  }, [pageFormsData])

  const handleProjectChange = (formId: string, projectId: string) => {
    setMappings((prev) => ({
      ...prev,
      [formId]: projectId,
    }))
  }

  const handleSaveMapping = async (formId: string) => {
    setSavingFormId(formId)
    const targetProjId = mappings[formId] || ''
    const updatedPages = allFacebookPages.map((page: any) => {
      if (String(page.id) === String(pageId)) {
        const updatedForms = (page.form_data || page.formData || []).map((form: any) => {
          if (String(form.id) === String(formId)) {
            return { ...form, projectId: targetProjId, project_id: targetProjId }
          }
          return form
        })
        return { ...page, form_data: updatedForms }
      }
      return page
    })

    try {
      if (onSave) {
        await onSave(updatedPages)
      }
    } finally {
      setSavingFormId(null)
    }
  }

  const filteredForms = pageFormsData.filter((form) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const formName = (form.name || '').toLowerCase()
    const formId = String(form.id || '')
    return formName.includes(term) || formId.includes(term)
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DynamicFeedIcon color="primary" sx={{ fontSize: 26 }} />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                Lead Form Project Routing
              </Typography>
              <Chip
                label={`${pageFormsData.length} Forms`}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700 }}
              />
            </Stack>
            {pageName && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                Page: <strong>{pageName}</strong> (ID: {pageId})
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            Map incoming leads from each Facebook leadgen form to an existing CRM project.
          </Typography>
          {pageFormsData.length > 3 && (
            <TextField
              size="small"
              placeholder="Search form name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                minWidth: { xs: '100%', sm: 240 },
                '& .MuiInputBase-root': { borderRadius: '8px', fontSize: '0.8125rem' },
              }}
            />
          )}
        </Stack>

        {filteredForms.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No forms matching your search query.' : 'No lead forms found for this Facebook page.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 2,
              maxHeight: 400,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 }}>Form ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Form Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Map to Project</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow key={form.id} hover>
                    <TableCell sx={{ py: 1.2 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.4, borderRadius: 1 }}>
                        {form.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {form.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.2 }}>
                      <Chip
                        icon={<CheckCircleRoundedIcon sx={{ fontSize: '0.75rem !important' }} />}
                        label={form.status || 'Active'}
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.2 }}>
                      <TextField
                        select
                        size="small"
                        value={mappings[form.id] || ''}
                        onChange={(e) => handleProjectChange(form.id, e.target.value)}
                        sx={{
                          minWidth: 200,
                          '& .MuiInputBase-root': { fontSize: '0.8125rem', borderRadius: '6px' },
                        }}
                      >
                        <MenuItem value="">
                          <em>Default Project (Auto-Route)</em>
                        </MenuItem>
                        {projectsList.map((proj) => (
                          <MenuItem key={proj.id || proj._id} value={proj.id || proj._id}>
                            {proj.projectName || proj.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={savingFormId === form.id}
                        startIcon={<LinkRoundedIcon sx={{ fontSize: '0.95rem !important' }} />}
                        onClick={() => handleSaveMapping(form.id)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          px: 2,
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' },
                        }}
                      >
                        {savingFormId === form.id ? 'Saving...' : 'Link Project'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 2.5 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
