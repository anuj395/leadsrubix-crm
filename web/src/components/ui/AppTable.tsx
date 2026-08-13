import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableContainer from '@mui/material/TableContainer'
import type { ReactNode } from 'react'

interface AppTableProps {
  children: ReactNode
}

export function AppTable({ children }: AppTableProps) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        width: '100%',
        maxWidth: '100%',
        // Horizontal scroll on mobile — no content clipping
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        border: 'none',
        boxShadow: 'none',
        // Show scroll shadow hint on mobile
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 999,
          background: 'rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* minWidth ensures table doesn't collapse on tiny screens */}
      <Table sx={{ minWidth: { xs: '32rem', sm: '36rem' } }}>
        {children}
      </Table>
    </TableContainer>
  )
}
