import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import {
  ShoppingCart as OrderIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listQuotes, deleteQuote, convertQuoteToOrder, getQuotePdfUrl, type Quote } from '@/services/quotesService'
import { useConfirm } from '@/components/common/ConfirmContext'

export default function QuotesListPage() {
  const [items, setItems] = useState<Quote[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await listQuotes()
      setItems(list)
    } catch (e: unknown) {
      setToast({ open: true, msg: 'Failed to load quotes', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const { confirmDelete } = useConfirm()

  const handleDelete = async (row: Quote) => {
    confirmDelete({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete Quote: ${String(row.quoteNumber)}?`,
      onConfirm: async () => {
        try {
          await deleteQuote(row._id)
          setToast({ open: true, msg: 'Quote deleted successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to delete quote', sev: 'error' })
        }
      }
    })
  }

  const handleConvertToOrder = async (row: Quote) => {
    confirmDelete({
      title: 'Convert to Order',
      message: `Are you sure you want to convert Quote ${String(row.quoteNumber)} to an Order?`,
      onConfirm: async () => {
        setLoading(true)
        try {
          await convertQuoteToOrder(row._id)
          setToast({ open: true, msg: 'Quote converted to Order successfully', sev: 'success' })
          await refresh()
        } catch (e: unknown) {
          setToast({ open: true, msg: 'Failed to convert quote to order', sev: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleOpenPdf = (row: Quote) => {
    window.open(getQuotePdfUrl(row._id), '_blank')
  }

  const columns = useMemo<GridColDef<Quote>[]>(() => [
    { field: 'quoteNumber', headerName: 'Quote #', flex: 1.2, minWidth: 130 },
    {
      field: 'grandTotal',
      headerName: 'Total Amount',
      flex: 1.2,
      minWidth: 130,
      valueFormatter: (params: any) => {
        const val = params.value as number
        return val ? `$${val.toLocaleString()}` : '$0'
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params: any) => {
        const val = params.value || 'DRAFT'
        return <StatusBadge value={String(val)} />
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1.5,
      minWidth: 170,
      valueFormatter: (params: any) => {
        const val = params.value as string
        return val ? new Date(val).toLocaleDateString() : '—'
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
          {params.row.status !== 'ORDERED' && (
            <Tooltip title="Convert to Order">
              <IconButton onClick={() => handleConvertToOrder(params.row)} size="small" color="success">
                <OrderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Print / PDF Invoice">
            <IconButton onClick={() => handleOpenPdf(params.row)} size="small" color="primary">
              <PdfIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(params.row)} size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ], [])

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ typography: 'h5', fontWeight: 700 }}>CPQ Quotes & Invoices</Box>
      </Stack>

      <AppCard title="" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppDataGrid
          rows={items}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          checkboxSelection
          onRowSelectionModelChange={(ids) => setSelectedIds(ids as string[])}
        />
      </AppCard>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
