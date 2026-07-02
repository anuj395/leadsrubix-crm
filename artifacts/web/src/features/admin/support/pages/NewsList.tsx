import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
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
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material'
import type { GridColDef } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusBadge } from '@/components/ui/StatusBadge'
import api from '@/services/axiosInstance'
import { useAppSelector } from '@/store/hooks'

export interface NewsArticle {
  id: string
  name: string
  link: string
  status: 'Active' | 'Draft'
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

  return { type: 'iframe', embedUrl: url };
}

const LinkViewer = ({ url }: { url: string }) => {
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
          title="Link Viewer"
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

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
        Link:{' '}
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

export default function NewsListPage() {
  const user = useAppSelector((s) => s.auth.user)
  const isOrgAdmin = user?.role === 'admin'

  const [items, setItems] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NewsArticle | null>(null)
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
    name: '',
    link: '',
    status: 'Active' as NewsArticle['status'],
  })

  const refreshNews = async () => {
    setLoading(true)
    try {
      const res = await api.get('/news')
      const mapped = (res.data || []).map((n: any) => ({
        id: n._id,
        name: n.name,
        link: n.link,
        status: n.status,
        created_by: n.created_by || '',
        organizationId: n.organizationId || n.organization_id || null,
      }))
      setItems(mapped)
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to load news items',
        sev: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshNews()
  }, [])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      name: '',
      link: '',
      status: 'Active',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (art: NewsArticle) => {
    setEditing(art)
    setForm({
      name: art.name,
      link: art.link,
      status: art.status,
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/news/${id}`)
      setToast({ open: true, msg: 'News deleted successfully', sev: 'success' })
      void refreshNews()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to delete news',
        sev: 'error',
      })
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.link) {
      setToast({ open: true, msg: 'Name and Link are required', sev: 'error' })
      return
    }

    try {
      if (editing) {
        await api.put(`/news/${editing.id}`, form)
        setToast({ open: true, msg: 'News updated successfully', sev: 'success' })
      } else {
        await api.post('/news', form)
        setToast({ open: true, msg: 'News published successfully', sev: 'success' })
      }
      setDialogOpen(false)
      void refreshNews()
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.response?.data?.message ?? 'Failed to save news',
        sev: 'error',
      })
    }
  }

  const columns = useMemo<GridColDef<NewsArticle>[]>(
    () => {
      const baseCols: GridColDef<NewsArticle>[] = [
        {
          field: 'name',
          headerName: 'Name',
          flex: 1.2,
          minWidth: 200,
          renderCell: (p) => <Box sx={{ fontWeight: 600 }}>{p.value}</Box>,
        },
        {
          field: 'link',
          headerName: 'Link',
          flex: 1.5,
          minWidth: 250,
          renderCell: (p) => p.value ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', overflow: 'hidden' }}>
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
                  flex: 1,
                }}
              >
                {p.value}
              </Box>
              <Tooltip title="Copy Link">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(p.value);
                    setToast({ open: true, msg: 'Link copied successfully', sev: 'success' });
                  }}
                  sx={{ p: 0.5 }}
                >
                  <ContentCopyIcon fontSize="inherit" sx={{ fontSize: '0.9rem' }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : '—',
        },
        {
          field: 'status',
          headerName: 'Status',
          width: 120,
          renderCell: (p) => <StatusBadge value={p.value} />,
        },
      ]

      if (isOrgAdmin) {
        baseCols.push({
          field: '__actions',
          headerName: 'Actions',
          width: 100,
          sortable: false,
          filterable: false,
          renderCell: (p) => {
            const canModify = p.row.created_by === user?.id
            return (
              <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
                {canModify && (
                  <>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditDialog(p.row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(p.row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            )
          },
        })
      }

      return baseCols
    },
    [isOrgAdmin, user?.id],
  )

  const activeNews = useMemo(() => {
    return items.filter((n) => {
      const isSearchMatch =
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.link.toLowerCase().includes(searchQuery.toLowerCase())
      return n.status === 'Active' && isSearchMatch
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
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AppCard
          title="News Articles Manager"
          subtitle="Manage news articles and announcements."
          action={
            isOrgAdmin ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
                Add News
              </Button>
            ) : undefined
          }
          fullHeight
        >
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <AppDataGrid height="100%" rows={items} columns={columns} getRowId={(r) => r.id} loading={loading} />
          </Box>
        </AppCard>
      </Box>

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
        <DialogTitle>{editing ? 'Edit News' : 'Publish New News'}</DialogTitle>
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
              label="News Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Link / Video URL"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="e.g. https://youtube.com/... or https://..."
                required
              />

              <TextField
                select
                fullWidth
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as NewsArticle['status'] })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
              </TextField>
            </Box>
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
          Are you sure you want to delete this news? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deletingId) {
                handleDelete(deletingId)
              }
              setDeleteConfirmOpen(false)
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
