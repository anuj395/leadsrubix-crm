import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import type { Industry } from '@/services/sidebarAdminService'
import type { ScopeOrg } from '@/hooks/useSuperAdminScope'

interface SuperAdminScopeSelectorProps {
  isSuperAdmin: boolean
  industries: Industry[]
  selectedIndustry: string
  setSelectedIndustry: (val: string) => void
  filteredOrgs: ScopeOrg[]
  selectedOrg: string
  setSelectedOrg: (val: string) => void
}

export const SuperAdminScopeSelector: React.FC<SuperAdminScopeSelectorProps> = ({
  isSuperAdmin,
  industries,
  selectedIndustry,
  setSelectedIndustry,
  filteredOrgs,
  selectedOrg,
  setSelectedOrg
}) => {
  if (!isSuperAdmin) return null

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, pt: 1.5 }}>
      {industries.length > 0 && (
        <TextField
          select
          size="small"
          label="Select Industry"
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          {industries.map((ind) => (
            <MenuItem key={ind._id} value={ind.code}>
              {ind.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {filteredOrgs.length > 0 && (
        <TextField
          select
          size="small"
          label="Select Organization"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          {filteredOrgs.map((org) => (
            <MenuItem key={org.code} value={org.code}>
              {org.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  )
}
