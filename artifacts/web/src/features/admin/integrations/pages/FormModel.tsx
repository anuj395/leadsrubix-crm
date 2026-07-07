import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

interface FormModelProps {
  pageFormsData: any[]
  pageId: string
  allFacebookPages: any[]
  dispatcher: any
  projectsList: any[]
  setExpandedId: (id: string | null) => void
}

export default function FormModel({
  pageFormsData = [],
  pageId,
  projectsList = [],
  setExpandedId,
}: FormModelProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({})

  const handleProjectChange = (formId: string, projectId: string) => {
    setMappings(prev => ({
      ...prev,
      [formId]: projectId,
    }))
  }

  const handleSaveMapping = (formId: string) => {
    alert(`Successfully mapped Form ID ${formId} to Project ID ${mappings[formId] || 'None'}`)
    setExpandedId(null)
  }

  if (!pageFormsData || pageFormsData.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No lead forms found for this Facebook page.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'rgb(39, 41, 68)' }}>
        Lead Form Mapping
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Form ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Form Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Map to Project</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageFormsData.map((form) => (
            <TableRow key={form.id}>
              <TableCell>{form.id}</TableCell>
              <TableCell>{form.name}</TableCell>
              <TableCell>{form.status || 'Active'}</TableCell>
              <TableCell>
                <TextField
                  select
                  size="small"
                  value={mappings[form.id] || ''}
                  onChange={(e) => handleProjectChange(form.id, e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">
                    <em>Select Project</em>
                  </MenuItem>
                  {projectsList.map((proj) => (
                    <MenuItem key={proj.id || proj._id} value={proj.id || proj._id}>
                      {proj.projectName || proj.name}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleSaveMapping(form.id)}
                  sx={{ textTransform: 'none' }}
                >
                  Link Form
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}
