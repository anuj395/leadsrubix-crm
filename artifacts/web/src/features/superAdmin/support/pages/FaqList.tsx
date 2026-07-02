import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import api from '@/services/axiosInstance'

export interface FaqItem {
  id: string
  question: string
  answer: string
  status: 'Active' | 'Draft'
  videoUrl?: string
  created_by?: string
  organizationId?: string | null
}

function getEmbedUrl(url: string): { type: 'iframe' | 'video' | 'link'; embedUrl: string } {
  if (!url) return { type: 'link', embedUrl: '' };
  
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: 'iframe', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: 'iframe', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Direct HTML5 Video
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return { type: 'video', embedUrl: url };
  }

  return { type: 'link', embedUrl: url };
}

const VideoPlayer = ({ url }: { url: string }) => {
  const { type, embedUrl } = getEmbedUrl(url);

  if (type === 'iframe') {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          mt: 2,
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video Player"
        />
      </Box>
    );
  }

  if (type === 'video') {
    return (
      <Box sx={{ width: '100%', mt: 2, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <video src={embedUrl} controls style={{ width: '100%', display: 'block' }} />
      </Box>
    );
  }

  // Fallback to text link
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
        Tutorial Video:{' '}
        <Box
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'primary.main', textDecoration: 'underline', fontWeight: 500 }}
        >
          {url}
        </Box>
      </Typography>
    </Box>
  );
};

export default function FaqListPage() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success',
  })

  // Form state
  const [form, setForm] = useState({
    question: '',
    answer: '',
    status: 'Active' as FaqItem['status'],
    videoUrl: '',
  })

  const refreshFaqs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/faqs')
      const mapped = (res.data || []).map((f: any) => ({
        id: f._id,
        question: f.question,
        answer: f.answer,
        status: f.status,
        videoUrl: f.videoUrl || '',
        created_by: f.created_by || '',
        organizationId: f.organizationId || f.organization_id || null,
      }))
      setItems(mapped)
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to load FAQs',
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshFaqs()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      question: '',
      answer: '',
      status: 'Active',
      videoUrl: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (faq: FaqItem) => {
    setEditing(faq)
    setForm({
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
      videoUrl: faq.videoUrl || '',
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/faqs/${id}`)
      setToast({ open: true, msg: 'FAQ deleted successfully', sev: 'success' })
      void refreshFaqs()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to delete FAQ',
        sev: 'error',
      })
    }
  }

  const handleSave = async () => {
    if (!form.question || !form.answer) {
      setToast({ open: true, msg: 'Question and Answer are required', sev: 'error' })
      return
    }

    try {
      if (editing) {
        await api.put(`/faqs/${editing.id}`, form)
        setToast({ open: true, msg: 'FAQ updated successfully', sev: 'success' })
      } else {
        await api.post('/faqs', form)
        setToast({ open: true, msg: 'FAQ published successfully', sev: 'success' })
      }
      setDialogOpen(false)
      void refreshFaqs()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to save FAQ',
        sev: 'error',
      })
    }
  }

  const columns = useMemo<GridColDef<FaqItem>[]>(
    () => [
      {
        field: 'question',
        headerName: 'Question',
        flex: 1.2,
        minWidth: 200,
        renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
      },
      {
        field: 'videoUrl',
        headerName: 'Video URL',
        flex: 1.0,
        minWidth: 180,
        renderCell: (p) => p.value ? (
          <Box
            component="a"
            href={p.value}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'primary.main',
              textDecoration: 'underline',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              width: '100%',
            }}
          >
            {p.value}
          </Box>
        ) : '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => <StatusBadge value={p.value} />,
      },
      {
        field: '__actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            <Tooltip title="Edit FAQ">
              <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  )

  const activeFaqs = useMemo(() => {
    return items.filter((f) => {
      const isSearchMatch =
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return f.status === 'Active' && isSearchMatch
    })
  }, [items, searchQuery])

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="FAQ Reader" id="faq-tab-0" />
          <Tab label="FAQ Articles Manager" id="faq-tab-1" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            pb: 2,
          }}
        >
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
              fullWidth
              size="small"
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />

            <AppCard title="Frequently Asked Questions (FAQ)" subtitle="Quick accordion viewer of the most commonly asked queries.">
              <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {activeFaqs.map((faq) => (
                   <Accordion key={faq.id} TransitionProps={{ unmountOnExit: true }} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.6, mb: faq.videoUrl ? 1 : 0 }}>
                        {faq.answer}
                      </Typography>
                      {faq.videoUrl && (
                        <Box sx={{ width: '100%', maxWidth: '600px', alignSelf: 'center' }}>
                          <VideoPlayer url={faq.videoUrl} />
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
                {activeFaqs.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No FAQs found matching your search criteria.
                  </Typography>
                )}
              </Box>
            </AppCard>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppCard
            title="FAQ Articles Manager"
            subtitle="Manage frequently asked questions and categorical descriptions."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
                Add FAQ
              </Button>
            }
            fullHeight
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} loading={loading} />
            </Box>
          </AppCard>
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '750px',
          },
        }}
      >
        <DialogTitle>{editing ? 'Edit FAQ Item' : 'Create New FAQ'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              pt: 1,
            }}
          >
            <TextField
              fullWidth
              label="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as FaqItem['status'] })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Video URL"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="e.g. https://youtube.com/watch?v=..."
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={6}
              label="Answer Details"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this FAQ? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deletingId) {
                handleDelete(deletingId);
              }
              setDeleteConfirmOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
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
