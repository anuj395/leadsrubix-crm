import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadIcon from '@mui/icons-material/Download'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import InfoIcon from '@mui/icons-material/Info'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import { useAuth } from '@/hooks/useAuth'
import { resolveScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { bulkImportContacts, fetchImportHistory, deleteImportHistory } from '@/services/contactsService'

interface ImportContactModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportContactModal({ open, onClose, onSuccess }: ImportContactModalProps) {
  const { user } = useAuth()
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dynamicFields, setDynamicFields] = useState<ResolvedFormField[]>([])

  const loadHistoryAndConfig = async () => {
    try {
      setLoadingHistory(true)
      const [logs, screenData] = await Promise.all([
        fetchImportHistory(),
        resolveScreen({ screenKey: 'contacts', industryCode: user?.industryId }).catch(() => null)
      ])
      setImportHistory(logs)
      if (screenData?.form_fields) {
        setDynamicFields(screenData.form_fields)
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (open) {
      setError(null)
      void loadHistoryAndConfig()
    }
  }, [open, user?.industryId])

  const handleDownloadTemplate = () => {
    // Generate CSV template dynamically based on configured contact form fields
    const headers = dynamicFields.length > 0
      ? dynamicFields.map((f) => f.key)
      : ['customerName', 'contactNumber', 'email', 'stage', 'leadSource', 'budget', 'location', 'notes']

    const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n'
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'contact_import_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)

        if (lines.length < 2) {
          setError('CSV file must contain a header row and at least one contact row.')
          setUploading(false)
          return
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
        const contacts: any[] = []

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
          const rowObj: Record<string, string> = {}
          headers.forEach((header, idx) => {
            rowObj[header] = values[idx] || ''
          })
          if (
            rowObj.customer_name ||
            rowObj.customerName ||
            rowObj.contact_number ||
            rowObj.contactNumber ||
            rowObj.name ||
            rowObj.phone
          ) {
            contacts.push(rowObj)
          }
        }

        if (contacts.length === 0) {
          setError('No valid contact entries found in the uploaded file.')
          setUploading(false)
          return
        }

        const res = await bulkImportContacts(contacts, file.name)
        onSuccess()
        void loadHistoryAndConfig()
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to process file import.')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteHistory = async (id: string) => {
    if (!id) return
    try {
      setDeletingId(id)
      setError(null)
      await deleteImportHistory(id)
      await loadHistoryAndConfig()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete import history item.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', fontSize: '1.25rem' }}>
        Import Data for "Contact Form"
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250, mb: 3 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Sno.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Request Id</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Upload Count</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Uploaded File</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Processed File</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingHistory ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : importHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                    No previous import requests found.
                  </TableCell>
                </TableRow>
              ) : (
                importHistory.map((item, idx) => {
                  const itemId = item._id || item.requestId
                  return (
                    <TableRow key={itemId || idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{item.requestId || item._id}</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.uploadCount ?? 0}</TableCell>
                      <TableCell>
                        {item.fileUrl ? (
                          <Link href={item.fileUrl} target="_blank" rel="noopener">
                            Uploaded File
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.responseUrl ? (
                          <Link href={item.responseUrl} target="_blank" rel="noopener">
                            Processed File
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Delete Import Log & S3 Files">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={deletingId === itemId}
                            onClick={() => handleDeleteHistory(itemId)}
                          >
                            {deletingId === itemId ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DeleteOutlineIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>

          <Button variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>

          <Button
            variant="contained"
            component="label"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <FileUploadIcon />}
            disabled={uploading}
          >
            {uploading ? 'Upload...' : 'Upload File'}
            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
          </Button>
        </Stack>

        <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 1 }}>
          <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <InfoIcon fontSize="small" /> Only .csv file type is supported.
          </Typography>
          <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
            <InfoIcon fontSize="small" /> Please ensure all mandatory fields are filled.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
