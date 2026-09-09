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
  allowGlobal?: boolean
}

export const SuperAdminScopeSelector: React.FC<SuperAdminScopeSelectorProps> = ({
  isSuperAdmin,
  industries,
  selectedIndustry,
  setSelectedIndustry,
  filteredOrgs,
  selectedOrg,
  setSelectedOrg,
  allowGlobal = false
}) => {
  if (!isSuperAdmin) return null

  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        mb: { xs: 1.5, sm: 2 },
        pt: { xs: 0.5, sm: 1.5 },
        width: '100%',
      }}
    >
      {industries.length > 0 && (
        <TextField
          select
          size="small"
          label="Industry"
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          sx={{
            flex: { xs: '1 1 45%', sm: '0 0 200px' },
            minWidth: 0,
            '& .MuiOutlinedInput-root': { borderRadius: '10px' },
            '& .MuiInputLabel-root': { fontSize: { xs: '0.8rem', sm: '0.875rem' } },
            '& .MuiSelect-select': { fontSize: { xs: '0.8rem', sm: '0.875rem' }, py: { xs: '7px', sm: '8.5px' } },
          }}
        >
          {industries.map((ind) => (
            <MenuItem key={ind._id} value={ind.code}>
              {ind.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {(filteredOrgs.length > 0 || allowGlobal) && (
        <TextField
          select
          size="small"
          label="Organization Scope"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          sx={{
            flex: { xs: '1 1 55%', sm: '0 0 280px' },
            minWidth: 0,
            '& .MuiOutlinedInput-root': { borderRadius: '10px' },
            '& .MuiInputLabel-root': { fontSize: { xs: '0.8rem', sm: '0.875rem' } },
            '& .MuiSelect-select': { fontSize: { xs: '0.8rem', sm: '0.875rem' }, py: { xs: '7px', sm: '8.5px' } },
          }}
        >
          {allowGlobal && (
            <MenuItem value="">
              <em style={{ fontStyle: 'normal', fontWeight: 600, color: '#6366F1' }}>
                🌐 Global Baseline
              </em>
            </MenuItem>
          )}
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
