import { useState, useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HubIcon from '@mui/icons-material/Hub';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import { AppCard } from '@/components/ui/AppCard';
import { api } from '@/services/api';
import {
  notificationHubApi,
  MatrixRule,
  NotificationTemplate,
  NotificationLog,
  EventDefinition,
  MergeTagDefinition
} from '../api/notificationHubApi';

const INDUSTRY_VERTICALS = [
  { id: 'temp0001', name: 'Real Estate & Properties' },
  { id: 'temp0002', name: 'B2B & Corporate Sales' },
  { id: 'temp0003', name: 'Healthcare & Medical Clinics' },
  { id: 'temp0004', name: 'Education & EdTech' },
  { id: 'temp0005', name: 'Financial Services & Loans' },
  { id: 'temp0006', name: 'IT, Software & SaaS' },
  { id: 'temp0007', name: 'Manufacturing & Industrial' },
];

export default function NotificationHubPage() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingMatrix, setSavingMatrix] = useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [resettingTemplates, setResettingTemplates] = useState<boolean>(false);

  // Snackbar alerts
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Matrix State
  const [matrixRules, setMatrixRules] = useState<MatrixRule[]>([]);
  const [eventsList, setEventsList] = useState<EventDefinition[]>([]);
  const [mergeTagsList, setMergeTagsList] = useState<MergeTagDefinition[]>([]);

  // Template Studio State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('temp0001');
  const [selectedEventKey, setSelectedEventKey] = useState<string>('lead.created');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'push' | 'in_app'>('whatsapp');
  const [activeTemplateBody, setActiveTemplateBody] = useState<string>('');
  const [activeTemplateSubject, setActiveTemplateSubject] = useState<string>('');
  const [activeTemplateEnabled, setActiveTemplateEnabled] = useState<boolean>(true);
  const templateBodyInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Gateways State
  const [waConfig, setWaConfig] = useState<any>({
    type: 'WHAPI',
    wapiUrl: 'https://gate.whapi.cloud',
    wapiToken: '',
    isActive: false,
  });
  const [emailConfig, setEmailConfig] = useState<any>({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    fromEmail: 'noreply@crm.leadsrubix.com',
    fromName: 'LeadsRubix CRM',
    isActive: true,
  });
  const [pushConfig, setPushConfig] = useState<any>({
    region: 'ap-south-1',
    arnAndroid: '',
    arnIos: '',
    expoFallback: true,
    isActive: true,
  });
  const [savingGateway, setSavingGateway] = useState<boolean>(false);

  // Audit Logs State
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logFilterChannel, setLogFilterChannel] = useState<string>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');
  const [logFilterSearch, setLogFilterSearch] = useState<string>('');
  const [selectedLogPayload, setSelectedLogPayload] = useState<NotificationLog | null>(null);

  // Diagnostic Test Modal State
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testChannel, setTestChannel] = useState<'whatsapp' | 'email' | 'push' | 'in_app'>('whatsapp');
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [testName, setTestName] = useState<string>('Sales Agent');
  const [testEventKey, setTestEventKey] = useState<string>('lead.created');
  const [testMessage, setTestMessage] = useState<string>('🎯 LeadsRubix CRM Test Alert: Omnichannel connection operational.');
  const [testDispatching, setTestDispatching] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        loadMatrix(),
        loadTemplates(),
        loadGateways(),
        loadLogs()
      ]);
    } catch (err: any) {
      console.error('Error loading notification hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatrix = async () => {
    try {
      const data = await notificationHubApi.getMatrix();
      if (data.success) {
        setMatrixRules(data.matrix || data.rules || []);
        setEventsList(data.events || []);
        setMergeTagsList(data.mergeTags || []);
      }
    } catch (err: any) {
      console.warn('Failed to fetch matrix rules:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await notificationHubApi.getTemplates({
        industryId: selectedIndustry,
        eventKey: selectedEventKey
      });
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (err: any) {
      console.warn('Failed to fetch templates:', err);
    }
  };

  const loadGateways = async () => {
    try {
      const resWa = await api.get('/whatsapp-config').catch(() => null);
      if (resWa?.data) {
        const d = resWa.data;
        setWaConfig({
          type: d.type || 'WHAPI',
          wapiUrl: d.fields?.wapiUrl || 'https://gate.whapi.cloud',
          wapiToken: d.fields?.wapiToken || '',
          isActive: !!d.isActive,
        });
      }
    } catch (err) {
      console.warn('Error loading gateway configs:', err);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await notificationHubApi.getLogs({
        channel: logFilterChannel !== 'all' ? logFilterChannel : undefined,
        status: logFilterStatus !== 'all' ? logFilterStatus : undefined,
        search: logFilterSearch.trim() || undefined,
        limit: 50
      });
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      console.warn('Failed to fetch delivery logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Sync active template editor state when event or channel changes
  useEffect(() => {
    const matched = templates.find(
      (t) => (t.event_key === selectedEventKey || t.eventKey === selectedEventKey) && t.channel === selectedChannel
    );
    if (matched) {
      setActiveTemplateBody(matched.body || '');
      setActiveTemplateSubject(matched.subject || '');
      setActiveTemplateEnabled(matched.is_active ?? matched.isActive ?? true);
    } else {
      setActiveTemplateBody('');
      setActiveTemplateSubject('');
      setActiveTemplateEnabled(true);
    }
  }, [selectedEventKey, selectedChannel, templates]);

  const getChannelActive = (
    rule: MatrixRule,
    recipient: 'assigned_agent' | 'team_lead' | 'org_admin' | 'customer',
    channel: 'whatsapp' | 'email' | 'push' | 'in_app'
  ): boolean => {
    if (rule.routing && rule.routing[recipient]?.channels) {
      return Boolean(rule.routing[recipient].channels[channel]);
    }
    const directRec = (rule as any)[recipient];
    if (directRec && directRec[channel] !== undefined) {
      return Boolean(directRec[channel]);
    }
    return false;
  };

  // Matrix Rule Toggle Handler
  const handleMatrixToggle = (
    eventKey: string,
    recipient: 'assigned_agent' | 'team_lead' | 'org_admin' | 'customer',
    channel: 'whatsapp' | 'email' | 'push' | 'in_app'
  ) => {
    setMatrixRules((prev) =>
      prev.map((r) => {
        const key = r.eventKey || r.event_key;
        if (key === eventKey) {
          const currentActive = getChannelActive(r, recipient, channel);
          const currentRouting = r.routing || {
            assigned_agent: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
            team_lead: { enabled: true, channels: { whatsapp: false, email: true, push: true, in_app: true } },
            org_admin: { enabled: true, channels: { whatsapp: true, email: true, push: false, in_app: true } },
            customer: { enabled: true, channels: { whatsapp: true, email: false, push: false, in_app: false } }
          };
          const currentRec = currentRouting[recipient] || {
            enabled: true,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          };
          return {
            ...r,
            routing: {
              ...currentRouting,
              [recipient]: {
                ...currentRec,
                channels: {
                  ...currentRec.channels,
                  [channel]: !currentActive
                }
              }
            }
          };
        }
        return r;
      })
    );
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const res = await notificationHubApi.saveMatrix(matrixRules);
      if (res.success) {
        setSnackbar({
          open: true,
          message: 'Omnichannel routing matrix saved successfully! New leads and updates will be routed dynamically.',
          severity: 'success'
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to save matrix rules',
        severity: 'error'
      });
    } finally {
      setSavingMatrix(false);
    }
  };

  // Insert Merge Tag into template body
  const handleInsertMergeTag = (rawTag: string) => {
    const clean = rawTag.replace(/[\{\}]/g, '');
    const tagString = `{{${clean}}}`;
    setActiveTemplateBody((prev) => (prev ? prev + (prev.endsWith(' ') ? '' : ' ') : '') + tagString + ' ');
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const res = await notificationHubApi.saveTemplate({
        eventKey: selectedEventKey,
        channel: selectedChannel,
        recipientType: 'assigned_agent',
        industryId: selectedIndustry,
        subject: activeTemplateSubject,
        body: activeTemplateBody,
        isActive: activeTemplateEnabled
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: `Template for ${selectedEventKey} (${selectedChannel}) saved successfully!`,
          severity: 'success'
        });
        await loadTemplates();
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to save template',
        severity: 'error'
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm(`Reset template for "${selectedEventKey}" (${selectedChannel}) to industry standard preset?`)) return;
    setResettingTemplates(true);
    try {
      const res = await notificationHubApi.resetTemplates({
        eventKey: selectedEventKey,
        channel: selectedChannel,
        industryId: selectedIndustry
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: 'Reset to high-converting industry default preset successfully!',
          severity: 'success'
        });
        await loadTemplates();
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to reset template',
        severity: 'error'
      });
    } finally {
      setResettingTemplates(false);
    }
  };

  // Save WhatsApp Gateway settings
  const handleSaveWaGateway = async () => {
    setSavingGateway(true);
    try {
      const payload = {
        type: waConfig.type,
        url: waConfig.wapiUrl,
        isActive: waConfig.isActive,
        fields: {
          wapiUrl: waConfig.wapiUrl,
          wapiToken: waConfig.wapiToken,
        },
      };
      await api.post('/whatsapp-config', payload);
      setSnackbar({
        open: true,
        message: 'WhatsApp gateway configuration saved successfully!',
        severity: 'success'
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: 'Failed to update WhatsApp gateway',
        severity: 'error'
      });
    } finally {
      setSavingGateway(false);
    }
  };

  // Diagnostic Test Dispatch
  const handleTestDispatch = async () => {
    if (!testRecipient.trim()) {
      setSnackbar({ open: true, message: 'Please enter a test recipient phone or email', severity: 'warning' });
      return;
    }
    setTestDispatching(true);
    setTestResult(null);
    try {
      const res = await notificationHubApi.testDispatch({
        channel: testChannel,
        recipientTarget: testRecipient.trim(),
        recipientName: testName,
        messageContent: testMessage,
        eventKey: testEventKey
      });
      setTestResult(res);
      setSnackbar({
        open: true,
        message: `Diagnostic test message sent via ${testChannel.toUpperCase()} successfully!`,
        severity: 'success'
      });
      loadLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.response?.data?.message || err.message
      });
      setSnackbar({
        open: true,
        message: `Test dispatch error: ${err.response?.data?.message || err.message}`,
        severity: 'error'
      });
    } finally {
      setTestDispatching(false);
    }
  };

  // Preview content with sample tags replaced
  const previewContent = useMemo(() => {
    let text = activeTemplateBody || '';
    const replacements: Record<string, string> = {
      customer_name: 'Sarah Jenkins',
      customer_phone: '+91 98765 43210',
      customer_email: 'sarah.jenkins@example.com',
      assigned_agent_name: 'Alex Rivera',
      assigned_agent_phone: '+91 91234 56789',
      assigned_agent_email: 'alex.rivera@leadsrubix.com',
      previous_agent_name: 'David Vance',
      team_lead_name: 'Marcus Sterling',
      organization_name: 'Acme Global Corp',
      company_name: 'Acme Global Corp',
      budget: '$12,500',
      project_name: 'Horizon Heights Phase 2',
      lead_source: 'Website Direct',
      lead_type: 'Inbound Lead',
      crm_lead_url: 'https://crm.leadsrubix.com/leads/LD-8942',
      deal_title: 'Enterprise 50-Seat Cloud License',
      deal_amount: '$48,000',
      deal_value: '$48,000',
      deal_stage: 'Negotiation',
      task_title: 'Product Demo Call',
      task_type: 'Product Demo Call',
      due_date: 'Today at 3:30 PM',
      task_due: 'Today at 3:30 PM',
      notes: 'Client interested in multi-tenant API integration.',
      location: 'Bangalore, India',
      property_type: 'Commercial Office Space'
    };

    for (const [k, v] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      text = text.replace(regex, v);
    }
    return text;
  }, [activeTemplateBody]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <HubIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
                Omnichannel Notification & Automation Hub
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure multi-recipient routing (Agents, Team Leads, Admins, Customers), vertical templates, and live delivery logs.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Test live delivery across WhatsApp, Email, or Push directly">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SendIcon />}
              onClick={() => {
                setTestModalOpen(true);
                setTestResult(null);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Test Dispatch
            </Button>
          </Tooltip>
          <Tooltip title="Refresh all rules and logs">
            <IconButton onClick={loadAllData} disabled={loading} sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Main Tabs Navigation */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 52,
              gap: 1
            }
          }}
        >
          <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="Automation Matrix" />
          <Tab icon={<NotificationsActiveIcon fontSize="small" />} iconPosition="start" label="Template Studio" />
          <Tab icon={<SettingsInputAntennaIcon fontSize="small" />} iconPosition="start" label="Gateways & Channels" />
          <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Delivery Audit Logs" />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress size={36} />
        </Box>
      )}

      {/* TAB 0: AUTOMATION ROUTING MATRIX */}
      {!loading && activeTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <strong>Intelligent Multi-Recipient Broadcasting:</strong> When a CRM event occurs, notifications are delivered simultaneously to the assigned sales agent, their reporting team lead, workspace admin, and the customer based on these active toggles.
          </Alert>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '22%' }}>CRM Lifecycle Event</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '19.5%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>Assigned Agent</span>
                        <Typography variant="caption" color="text.secondary">Primary Lead Owner</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '19.5%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>Team Lead</span>
                        <Typography variant="caption" color="text.secondary">Reporting Manager</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '19.5%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>Workspace Admin</span>
                        <Typography variant="caption" color="text.secondary">Org Admin / SuperAdmin</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '19.5%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>Customer / Lead</span>
                        <Typography variant="caption" color="text.secondary">External Contact</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrixRules.map((rule) => {
                    const ruleKey = rule.eventKey || rule.event_key;
                    const eventDef = eventsList.find((e) => (e.key === ruleKey || (e as any).event_key === ruleKey));
                    return (
                      <TableRow key={ruleKey} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {/* Event Name & Category */}
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {rule.eventLabel || eventDef?.name || (eventDef as any)?.event_label || rule.event_label || ruleKey}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {rule.description || eventDef?.description || `Trigger: ${ruleKey}`}
                          </Typography>
                          <Chip label={ruleKey} size="small" variant="outlined" sx={{ fontSize: '0.72rem', height: 20 }} />
                        </TableCell>

                        {/* Recipient 1: Assigned Agent */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="WhatsApp to Assigned Agent">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'assigned_agent', 'whatsapp') ? 'success' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'assigned_agent', 'whatsapp')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'assigned_agent', 'whatsapp') ? 'success.main' : 'divider' }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Email to Assigned Agent">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'assigned_agent', 'email') ? 'primary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'assigned_agent', 'email')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'assigned_agent', 'email') ? 'primary.main' : 'divider' }}
                              >
                                <EmailIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Push Notification to Assigned Agent">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'assigned_agent', 'push') ? 'secondary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'assigned_agent', 'push')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'assigned_agent', 'push') ? 'secondary.main' : 'divider' }}
                              >
                                <PhoneIphoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="In-App Bell to Assigned Agent">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'assigned_agent', 'in_app') ? 'warning' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'assigned_agent', 'in_app')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'assigned_agent', 'in_app') ? 'warning.main' : 'divider' }}
                              >
                                <NotificationsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        {/* Recipient 2: Team Lead */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="WhatsApp to Team Lead">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'team_lead', 'whatsapp') ? 'success' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'team_lead', 'whatsapp')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'team_lead', 'whatsapp') ? 'success.main' : 'divider' }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Email to Team Lead">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'team_lead', 'email') ? 'primary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'team_lead', 'email')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'team_lead', 'email') ? 'primary.main' : 'divider' }}
                              >
                                <EmailIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Push Notification to Team Lead">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'team_lead', 'push') ? 'secondary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'team_lead', 'push')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'team_lead', 'push') ? 'secondary.main' : 'divider' }}
                              >
                                <PhoneIphoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="In-App Bell to Team Lead">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'team_lead', 'in_app') ? 'warning' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'team_lead', 'in_app')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'team_lead', 'in_app') ? 'warning.main' : 'divider' }}
                              >
                                <NotificationsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        {/* Recipient 3: Workspace Admin */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="WhatsApp to Admin">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'org_admin', 'whatsapp') ? 'success' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'org_admin', 'whatsapp')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'org_admin', 'whatsapp') ? 'success.main' : 'divider' }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Email to Admin">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'org_admin', 'email') ? 'primary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'org_admin', 'email')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'org_admin', 'email') ? 'primary.main' : 'divider' }}
                              >
                                <EmailIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Push Notification to Admin">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'org_admin', 'push') ? 'secondary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'org_admin', 'push')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'org_admin', 'push') ? 'secondary.main' : 'divider' }}
                              >
                                <PhoneIphoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="In-App Bell to Admin">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'org_admin', 'in_app') ? 'warning' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'org_admin', 'in_app')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'org_admin', 'in_app') ? 'warning.main' : 'divider' }}
                              >
                                <NotificationsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        {/* Recipient 4: Customer / External */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="WhatsApp to Customer">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'customer', 'whatsapp') ? 'success' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'customer', 'whatsapp')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'customer', 'whatsapp') ? 'success.main' : 'divider' }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Email to Customer">
                              <IconButton
                                size="small"
                                color={getChannelActive(rule, 'customer', 'email') ? 'primary' : 'default'}
                                onClick={() => handleMatrixToggle(ruleKey, 'customer', 'email')}
                                sx={{ border: '1px solid', borderColor: getChannelActive(rule, 'customer', 'email') ? 'primary.main' : 'divider' }}
                              >
                                <EmailIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Bottom Actions Bar */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Channel Key:
                </Typography>
                <Chip icon={<WhatsAppIcon sx={{ fontSize: '14px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" />
                <Chip icon={<EmailIcon sx={{ fontSize: '14px !important' }} />} label="Email" size="small" color="primary" variant="outlined" />
                <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '14px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" />
                <Chip icon={<NotificationsIcon sx={{ fontSize: '14px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" />
              </Stack>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveMatrix}
                disabled={savingMatrix}
                sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}
              >
                {savingMatrix ? 'Saving Changes...' : 'Save Routing Matrix'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* TAB 1: DYNAMIC TEMPLATE STUDIO */}
      {!loading && activeTab === 1 && (
        <Box>
          {/* Top Controls: Industry Vertical & Event Selector */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Industry Vertical Preset</InputLabel>
                  <Select
                    value={selectedIndustry}
                    label="Industry Vertical Preset"
                    onChange={(e) => {
                      setSelectedIndustry(e.target.value);
                      setTimeout(() => loadTemplates(), 50);
                    }}
                  >
                    {INDUSTRY_VERTICALS.map((ind) => (
                      <MenuItem key={ind.id} value={ind.id}>{ind.name} ({ind.id})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>CRM Event</InputLabel>
                  <Select
                    value={selectedEventKey}
                    label="CRM Event"
                    onChange={(e) => setSelectedEventKey(e.target.value)}
                  >
                    {eventsList.map((ev) => (
                      <MenuItem key={ev.key} value={ev.key}>{ev.name} ({ev.key})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={handleResetToDefault}
                    disabled={resettingTemplates}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    {resettingTemplates ? 'Resetting...' : 'Reset to Industry Standard'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Click-to-Insert Merge Tag Toolbar */}
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                Click to Insert Standard Merge Tags:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {mergeTagsList.map((tag) => {
                  const cleanTag = tag.tag.replace(/[\{\}]/g, '');
                  return (
                    <Chip
                      key={cleanTag}
                      label={`{{${cleanTag}}}`}
                      size="small"
                      onClick={() => handleInsertMergeTag(cleanTag)}
                      clickable
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          </Paper>

          {/* Studio Workspace: Left Editor, Right Live Preview */}
          <Grid container spacing={3}>
            {/* Left Column: Template Editor */}
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {/* Channel Selector */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Tabs
                    value={selectedChannel}
                    onChange={(_, val) => setSelectedChannel(val)}
                    sx={{ minHeight: 40, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40, py: 0.5 } }}
                  >
                    <Tab value="whatsapp" icon={<WhatsAppIcon fontSize="small" />} iconPosition="start" label="WhatsApp" />
                    <Tab value="email" icon={<EmailIcon fontSize="small" />} iconPosition="start" label="Email" />
                    <Tab value="push" icon={<PhoneIphoneIcon fontSize="small" />} iconPosition="start" label="Push" />
                    <Tab value="in_app" icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label="In-App Bell" />
                  </Tabs>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={activeTemplateEnabled}
                        onChange={(e) => setActiveTemplateEnabled(e.target.checked)}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>}
                  />
                </Box>

                {selectedChannel === 'email' && (
                  <TextField
                    fullWidth
                    label="Email Subject Line"
                    value={activeTemplateSubject}
                    onChange={(e) => setActiveTemplateSubject(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    placeholder="e.g. 🎯 New Lead Alert: {{customer_name}} ({{project_name}})"
                  />
                )}

                <TextField
                  fullWidth
                  multiline
                  minRows={10}
                  maxRows={16}
                  label={`${selectedChannel.toUpperCase()} Message Body`}
                  value={activeTemplateBody}
                  onChange={(e) => setActiveTemplateBody(e.target.value)}
                  placeholder="Enter template copy using merge tags like {{customer_name}}..."
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                    }
                  }}
                />

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Length: {activeTemplateBody.length} characters
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                    >
                      {savingTemplate ? 'Saving...' : 'Save Template'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            {/* Right Column: Live Device Mockup Preview */}
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    LIVE DEVICE PREVIEW ({selectedChannel.toUpperCase()})
                  </Typography>
                  <Chip label="Simulated Sample" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>

                {/* WhatsApp Chat Preview */}
                {selectedChannel === 'whatsapp' && (
                  <Box
                    sx={{
                      flex: 1,
                      bgcolor: '#efeae2',
                      borderRadius: 2,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                      minHeight: 320
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '88%',
                        bgcolor: '#ffffff',
                        borderRadius: '8px 8px 8px 0px',
                        p: 1.5,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        position: 'relative',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'sans-serif',
                        fontSize: '0.88rem',
                        lineHeight: 1.45
                      }}
                    >
                      {previewContent || 'Template message text will preview here...'}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#667781' }}>
                          11:42 AM
                        </Typography>
                        <CheckCircleIcon sx={{ fontSize: 13, color: '#53bdeb' }} />
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Email Preview */}
                {selectedChannel === 'email' && (
                  <Box
                    sx={{
                      flex: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 320
                    }}
                  >
                    <Box sx={{ borderBottom: '1px solid #e5e7eb', pb: 1.5, mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        From: LeadsRubix CRM &lt;noreply@crm.leadsrubix.com&gt;
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        To: Alex Rivera &lt;alex.rivera@leadsrubix.com&gt;
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {activeTemplateSubject ? activeTemplateSubject.replace(/\{\{customer_name\}\}/g, 'Sarah Jenkins') : 'New Lead Notification'}
                      </Typography>
                    </Box>
                    <Box sx={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: '#1f2937', lineHeight: 1.5 }}>
                      {previewContent || 'Email template copy preview will appear here...'}
                    </Box>
                  </Box>
                )}

                {/* Mobile Push Preview */}
                {selectedChannel === 'push' && (
                  <Box
                    sx={{
                      flex: 1,
                      bgcolor: '#111827',
                      borderRadius: 2,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 320
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 340,
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        p: 1.5,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '4px', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <HubIcon sx={{ fontSize: 12 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          LeadsRubix CRM
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto !important' }}>
                          now
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        🎯 {selectedEventKey}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#334155', display: 'block', lineHeight: 1.3 }}>
                        {previewContent.slice(0, 140)}...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* In-App Bell Preview */}
                {selectedChannel === 'in_app' && (
                  <Box
                    sx={{
                      flex: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 320
                    }}
                  >
                    <Paper elevation={2} sx={{ p: 1.5, borderRadius: 2, borderLeft: '4px solid #2563eb' }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ p: 0.8, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                          <NotificationsActiveIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {selectedEventKey}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                            {previewContent}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', mt: 0.5, display: 'block' }}>
                            Just now
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 2: GATEWAYS & CHANNELS */}
      {!loading && activeTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            {/* WhatsApp Gateway Card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <WhatsAppIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>WhatsApp Gateway</Typography>
                    <Typography variant="caption" color="text.secondary">Direct Cloud API / WHAPI Provider</Typography>
                  </Box>
                  <Box sx={{ ml: 'auto !important' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={waConfig.isActive}
                          onChange={(e) => setWaConfig({ ...waConfig, isActive: e.target.checked })}
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>}
                    />
                  </Box>
                </Stack>

                <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  <strong>Universal Platform Fallback:</strong> If tenant API credentials are not configured or quota is exhausted, outgoing alerts automatically fallback to the SuperAdmin gateway with zero downtime.
                </Alert>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={waConfig.type}
                    label="Provider"
                    onChange={(e) => setWaConfig({ ...waConfig, type: e.target.value })}
                  >
                    <MenuItem value="WHAPI">WHAPI Cloud Gateway (Recommended)</MenuItem>
                    <MenuItem value="Simply WhatsApp">Simply WhatsApp</MenuItem>
                    <MenuItem value="ChatSimplified">ChatSimplified</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  label="API Base URL"
                  value={waConfig.wapiUrl}
                  onChange={(e) => setWaConfig({ ...waConfig, wapiUrl: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="Bearer Token / API Key"
                  value={waConfig.wapiToken}
                  onChange={(e) => setWaConfig({ ...waConfig, wapiToken: e.target.value })}
                  placeholder="Paste your WHAPI or Gateway Bearer token"
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSaveWaGateway}
                  disabled={savingGateway}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {savingGateway ? 'Saving...' : 'Save WhatsApp Configuration'}
                </Button>
              </Paper>
            </Grid>

            {/* Email SMTP Gateway Card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <EmailIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Email (SMTP / Amazon SES)</Typography>
                    <Typography variant="caption" color="text.secondary">Transactional & Lead Alert Emails</Typography>
                  </Box>
                  <Box sx={{ ml: 'auto !important' }}>
                    <Chip label="Active" color="success" size="small" />
                  </Box>
                </Stack>

                <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Standard SMTP server connection configured via environment (Amazon SES / Nodemailer).
                </Alert>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={8}>
                    <TextField fullWidth size="small" label="SMTP Host" value={emailConfig.host} disabled />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="Port" value={emailConfig.port} disabled />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="From Email Address" value={emailConfig.fromEmail} disabled />
                  </Grid>
                </Grid>

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setTestChannel('email');
                    setTestRecipient(emailConfig.fromEmail);
                    setTestModalOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  Test Outbound Email
                </Button>
              </Paper>
            </Grid>

            {/* Mobile Push Gateway Card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <PhoneIphoneIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Mobile Push Notification</Typography>
                    <Typography variant="caption" color="text.secondary">AWS SNS Platform Application & Expo Push</Typography>
                  </Box>
                </Stack>

                <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Mobile devices automatically register their FCM/APNS push tokens upon login to the LeadsRubix mobile app.
                </Alert>

                <TextField
                  fullWidth
                  size="small"
                  label="AWS Region"
                  value={pushConfig.region}
                  disabled
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Expo Fallback Relay"
                  value="Enabled (https://exp.host/--/api/v2/push/send)"
                  disabled
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => {
                    setTestChannel('push');
                    setTestRecipient('ExponentPushToken[sample]');
                    setTestModalOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  Test Mobile Push
                </Button>
              </Paper>
            </Grid>

            {/* In-App Bell Notification Service */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <NotificationsIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>In-App Bell Center</Typography>
                    <Typography variant="caption" color="text.secondary">CRM Top-Bar Bell & WebSockets</Typography>
                  </Box>
                  <Box sx={{ ml: 'auto !important' }}>
                    <Chip label="Native Active" color="success" size="small" />
                  </Box>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  In-App notifications are automatically stored in the primary database and pushed in real-time to active user sessions across all roles.
                </Typography>

                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setTestChannel('in_app');
                    setTestRecipient('Current Authed User');
                    setTestModalOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  Test Bell Notification
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 3: OMNICHANNEL DELIVERY AUDIT LOGS */}
      {!loading && activeTab === 3 && (
        <Box>
          {/* Filters Bar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Channel</InputLabel>
                  <Select
                    value={logFilterChannel}
                    label="Channel"
                    onChange={(e) => setLogFilterChannel(e.target.value)}
                  >
                    <MenuItem value="all">All Channels</MenuItem>
                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="push">Mobile Push</MenuItem>
                    <MenuItem value="in_app">In-App Bell</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Delivery Status</InputLabel>
                  <Select
                    value={logFilterStatus}
                    label="Delivery Status"
                    onChange={(e) => setLogFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Contact / Phone / Email"
                  value={logFilterSearch}
                  onChange={(e) => setLogFilterSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
                />
              </Grid>

              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadLogs}
                  disabled={logsLoading}
                  sx={{ textTransform: 'none', fontWeight: 600, height: 40, borderRadius: 2 }}
                >
                  {logsLoading ? 'Loading...' : 'Filter'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Logs Table */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Recipient Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target Contact</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No delivery logs found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {log.channel === 'whatsapp' && (
                            <Chip icon={<WhatsAppIcon sx={{ fontSize: '14px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" />
                          )}
                          {log.channel === 'email' && (
                            <Chip icon={<EmailIcon sx={{ fontSize: '14px !important' }} />} label="Email" size="small" color="primary" variant="outlined" />
                          )}
                          {log.channel === 'push' && (
                            <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '14px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" />
                          )}
                          {log.channel === 'in_app' && (
                            <Chip icon={<NotificationsIcon sx={{ fontSize: '14px !important' }} />} label="In-App" size="small" color="warning" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {log.event_key || log.eventKey}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>
                          {String(log.recipient_type || '').replace('_', ' ')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          <strong>{log.recipient_name || ''}</strong>
                          {log.recipient_contact && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {log.recipient_contact}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.status === 'delivered' && <Chip label="Delivered" size="small" color="success" sx={{ height: 22, fontSize: '0.72rem' }} />}
                          {log.status === 'sent' && <Chip label="Sent" size="small" color="info" sx={{ height: 22, fontSize: '0.72rem' }} />}
                          {log.status === 'failed' && (
                            <Tooltip title={log.error_message || 'Delivery error'}>
                              <Chip label="Failed" size="small" color="error" sx={{ height: 22, fontSize: '0.72rem' }} />
                            </Tooltip>
                          )}
                          {log.status === 'queued' && <Chip label="Queued" size="small" color="warning" sx={{ height: 22, fontSize: '0.72rem' }} />}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => setSelectedLogPayload(log)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* DIAGNOSTIC TEST DISPATCH MODAL */}
      <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          🧪 Diagnostic Omnichannel Test Dispatch
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Trigger an instant diagnostic delivery to verify provider credentials and end-to-end receipt.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Channel</InputLabel>
                <Select
                  value={testChannel}
                  label="Channel"
                  onChange={(e: any) => setTestChannel(e.target.value)}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="push">Mobile Push</MenuItem>
                  <MenuItem value="in_app">In-App Bell</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Key</InputLabel>
                <Select
                  value={testEventKey}
                  label="Event Key"
                  onChange={(e) => setTestEventKey(e.target.value)}
                >
                  {eventsList.map((ev) => (
                    <MenuItem key={ev.key} value={ev.key}>{ev.key}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label={testChannel === 'email' ? 'Recipient Email Address' : testChannel === 'whatsapp' ? 'Recipient Phone Number (+91...)' : 'Recipient Identifier'}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={testChannel === 'email' ? 'e.g. agent@company.com' : '+919876543210'}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Message Content"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </Grid>
          </Grid>

          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mt: 2, fontSize: '0.85rem' }}
            >
              <strong>{testResult.success ? 'Success!' : 'Error:'}</strong> {testResult.message || testResult.error || JSON.stringify(testResult)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTestModalOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleTestDispatch}
            disabled={testDispatching}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {testDispatching ? 'Sending Test...' : 'Send Live Dispatch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW AUDIT PAYLOAD MODAL */}
      <Dialog open={!!selectedLogPayload} onClose={() => setSelectedLogPayload(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delivery Audit Log Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedLogPayload && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Event:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLogPayload.event_key || selectedLogPayload.eventKey}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Channel:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{selectedLogPayload.channel}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Status:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedLogPayload.status}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Recipient Contact:</Typography>
                  <Typography variant="body2">{selectedLogPayload.recipient_contact} ({selectedLogPayload.recipient_name || 'N/A'})</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Recipient Role:</Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{String(selectedLogPayload.recipient_type).replace('_', ' ')}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Rendered Message Body:
              </Typography>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {selectedLogPayload.message_body}
              </Paper>

              {selectedLogPayload.error_message && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="error" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Error Output:
                  </Typography>
                  <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
                    {selectedLogPayload.error_message}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedLogPayload(null)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
