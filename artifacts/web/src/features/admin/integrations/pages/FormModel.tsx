import React, { useState } from 'react'
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
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { alpha } from '@mui/material/styles'

interface FormModelProps {
  pageFormsData: any[]
  pageId: string
  allFacebookPages: any[]
  dispatcher: any
  projectsList: any[]
  setExpandedId: (id: string | null) => void
  onSave?: (updatedPages: any[]) => Promise<void>
}

export default function FormModel({
  pageFormsData = [],
  pageId,
  allFacebookPages = [],
  projectsList = [],
  setExpandedId,
  onSave,
}: FormModelProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    pageFormsData.forEach((form) => {
      initial[form.id] = form.projectId || form.project_id || ''
    })
    return initial
  })

  const handleProjectChange = (formId: string, projectId: string) => {
    setMappings((prev) => ({
      ...prev,
      [formId]: projectId,
    }))
  }

  const handleSaveMapping = async (formId: string) => {
    const targetProjId = mappings[formId] || ''
    const updatedPages = allFacebookPages.map((page: any) => {
      if (String(page.id) === String(pageId)) {
        const updatedForms = (page.form_data || page.formData || []).map((form: any) => {
          if (String(form.id) === String(formId)) {
            return { ...form, projectId: targetProjId }
          }
          return form
        })
        return { ...page, form_data: updatedForms }
      }
      return page
    })

    if (onSave) {
      await onSave(updatedPages)
    } else {
      alert(`Mapped Form ID ${formId} to Project ID ${targetProjId}`)
    }
    setExpandedId(null)
  }

  if (!pageFormsData || pageFormsData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No lead forms found for this Facebook page.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Lead Form Project Routing & Mapping
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Map incoming leads from each Facebook form to a specific CRM project/campaign.
          </Typography>
        </Box>
        <Chip
          label={`${pageFormsData.length} Lead Forms`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
        />
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, bgcolor: 'background.paper' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 }}>Form ID</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Form Name</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Map to Project</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageFormsData.map((form) => (
              <TableRow key={form.id} hover>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.4, borderRadius: 1 }}>
                    {form.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {form.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<CheckCircleRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
                    label={form.status || 'Active'}
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
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
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<LinkRoundedIcon sx={{ fontSize: '1rem !important' }} />}
                    onClick={() => handleSaveMapping(form.id)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      px: 2,
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 'none' },
                    }}
                  >
                    Link Project
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
