import { useState, useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BoltIcon from '@mui/icons-material/Bolt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SpeedIcon from '@mui/icons-material/Speed';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import EditIcon from '@mui/icons-material/Edit';
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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BusinessIcon from '@mui/icons-material/Business';
import ForumIcon from '@mui/icons-material/Forum';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const userRole = user?.role || 'sales';
  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';
  const isSuperAdmin = userRole === 'superAdmin';
  const isTeamLead = userRole === 'teamLead' || userRole === 'leadManager';
  const isSales = userRole === 'sales';

  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingMatrix, setSavingMatrix] = useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [resettingTemplates, setResettingTemplates] = useState<boolean>(false);
  const [matrixSearchQuery, setMatrixSearchQuery] = useState<string>('');
  const [showWaToken, setShowWaToken] = useState<boolean>(false);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto reset scroll to top on tab change so user never lands halfway down a page
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  // Snackbar alerts
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Personal preferences state
  const [myPreferences, setMyPreferences] = useState<any>({
    lead_assigned: {
      whatsapp: true,
      push: true,
      email: true,
      in_app: true,
      label: 'New Lead Assigned to You',
      description: 'Instant notification when an inbound lead or inquiry is assigned to your queue'
    },
    task_due: {
      whatsapp: true,
      push: true,
      email: true,
      in_app: true,
      label: 'Follow-up & Callback Reminders',
      description: 'Timely reminders for scheduled follow-ups, pending tasks, and scheduled callbacks'
    },
    deal_update: {
      whatsapp: false,
      push: true,
      email: true,
      in_app: true,
      label: 'Deal Pipeline Updates',
      description: 'Updates when a deal assigned to you changes stage, is won, or requires review'
    },
    customer_message: {
      whatsapp: true,
      push: true,
      email: false,
      in_app: true,
      label: 'Inbound Customer Responses',
      description: 'Alerts when a prospect replies to your WhatsApp messages or inbound inquiries'
    }
  });
  const [savingMyPrefs, setSavingMyPrefs] = useState<boolean>(false);
  const [testingMyChannel, setTestingMyChannel] = useState<string | null>(null);

  // Define tabs dynamically by role
  interface HubTabItem {
    key: 'my_prefs' | 'matrix' | 'templates' | 'gateways' | 'logs';
    label: string;
    icon: React.ReactElement;
  }

  const roleTabs: HubTabItem[] = useMemo(() => {
    if (isAdmin) {
      return [
        { key: 'matrix', label: 'Automation Matrix', icon: <TuneIcon fontSize="small" /> },
        { key: 'templates', label: 'Template Studio', icon: <NotificationsActiveIcon fontSize="small" /> },
        { key: 'gateways', label: 'Gateways & Channels', icon: <SettingsInputAntennaIcon fontSize="small" /> },
        { key: 'logs', label: 'Delivery Audit Logs', icon: <HistoryIcon fontSize="small" /> }
      ];
    }
    if (isTeamLead) {
      return [
        { key: 'my_prefs', label: 'My Alert Preferences', icon: <NotificationsActiveIcon fontSize="small" /> },
        { key: 'matrix', label: 'Team Routing Matrix', icon: <TuneIcon fontSize="small" /> },
        { key: 'templates', label: 'Template Previews', icon: <VisibilityIcon fontSize="small" /> },
        { key: 'logs', label: 'Team Delivery Logs', icon: <HistoryIcon fontSize="small" /> }
      ];
    }
    // Frontline Sales / Telecaller
    return [
      { key: 'my_prefs', label: 'My Notification Channels', icon: <NotificationsActiveIcon fontSize="small" /> },
      { key: 'logs', label: 'My Alert History', icon: <HistoryIcon fontSize="small" /> }
    ];
  }, [isAdmin, isTeamLead]);

  const currentTabKey = roleTabs[activeTab]?.key || roleTabs[0]?.key || 'logs';

  const roleBadgeConfig = useMemo(() => {
    if (isSuperAdmin) {
      return {
        label: 'Super Admin Universal Platform Engine',
        bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        chipBg: '#f3e8ff',
        chipColor: '#7c3aed'
      };
    }
    if (userRole === 'admin') {
      return {
        label: 'Workspace Administrator Control Center',
        bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        chipBg: '#eff6ff',
        chipColor: '#1d4ed8'
      };
    }
    if (isTeamLead) {
      return {
        label: `${userRole === 'leadManager' ? 'Lead Manager' : 'Team Lead'} Supervisory Hub`,
        bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        chipBg: '#f0fdfa',
        chipColor: '#0f766e'
      };
    }
    return {
      label: 'Sales Agent Personal Alert Center',
      bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      chipBg: '#fffbeb',
      chipColor: '#b45309'
    };
  }, [userRole, isSuperAdmin, isTeamLead]);

  // Matrix State
  const [matrixRules, setMatrixRules] = useState<MatrixRule[]>([]);
  const [eventsList, setEventsList] = useState<EventDefinition[]>([]);
  const [mergeTagsList, setMergeTagsList] = useState<MergeTagDefinition[]>([]);

  // Template Studio State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>((user as any)?.industryId || (user as any)?.industry_id || 'temp0001');
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
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<number>(0);
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
      const promises: Promise<any>[] = [loadLogs()];
      if (isAdmin) {
        promises.push(loadMatrix(), loadTemplates(), loadGateways(), loadMyPreferences());
      } else if (isTeamLead) {
        promises.push(loadMyPreferences(), loadMatrix(), loadTemplates());
      } else {
        promises.push(loadMyPreferences());
      }
      await Promise.allSettled(promises);
    } catch (err: any) {
      console.error('Error loading notification hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPreferences = async () => {
    try {
      const data = await notificationHubApi.getMyPreferences();
      if (data.success && data.preferences) {
        setMyPreferences(data.preferences);
      }
    } catch (err: any) {
      console.warn('Failed to fetch personal preferences:', err);
    }
  };

  const handleSaveMyPreferences = async () => {
    setSavingMyPrefs(true);
    try {
      const res = await notificationHubApi.saveMyPreferences(myPreferences);
      if (res.success) {
        setSnackbar({
          open: true,
          message: 'Your personal notification preferences have been saved successfully!',
          severity: 'success'
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to save preferences',
        severity: 'error'
      });
    } finally {
      setSavingMyPrefs(false);
    }
  };

  const handleSendMyTestAlert = async (channel: 'whatsapp' | 'email' | 'push' | 'in_app') => {
    setTestingMyChannel(channel);
    try {
      const res = await notificationHubApi.sendMyTestAlert(channel);
      if (res.success) {
        setSnackbar({
          open: true,
          message: res.message || `Test alert sent via ${channel.toUpperCase()}!`,
          severity: 'success'
        });
        await loadLogs();
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || `Failed to dispatch test ${channel} alert`,
        severity: 'error'
      });
    } finally {
      setTestingMyChannel(null);
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

  const loadTemplates = async (industryIdOverride?: string, eventKeyOverride?: string) => {
    try {
      const targetIndustry = industryIdOverride || selectedIndustry;
      const data = await notificationHubApi.getTemplates({
        industryId: targetIndustry,
        eventKey: eventKeyOverride || selectedEventKey
      });
      if (data.success) {
        setTemplates(data.templates || []);
        if (data.industryId && !industryIdOverride && selectedIndustry === 'temp0001' && data.industryId !== 'temp0001') {
          setSelectedIndustry(data.industryId);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch templates:', err);
    }
  };

  // Automatically refresh templates when selected industry or event changes
  useEffect(() => {
    loadTemplates();
  }, [selectedIndustry, selectedEventKey]);

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
      const b = matched.body || matched.bodyTemplate || (matched as any).body_template || '';
      const s = matched.subject || matched.subjectTemplate || (matched as any).subject_template || '';
      setActiveTemplateBody(b);
      setActiveTemplateSubject(s);
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

  // Insert Merge Tag into template body with cursor awareness and focus preservation
  const handleInsertMergeTag = (rawTag: string) => {
    const clean = rawTag.replace(/[\{\}]/g, '');
    const tagString = `{{${clean}}}`;
    const textarea = templateBodyInputRef.current;
    if (textarea && typeof textarea.selectionStart === 'number') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value || activeTemplateBody;
      const nextVal = val.substring(0, start) + tagString + ' ' + val.substring(end);
      setActiveTemplateBody(nextVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagString.length + 1, start + tagString.length + 1);
      }, 0);
    } else {
      setActiveTemplateBody((prev) => (prev ? prev + (prev.endsWith(' ') ? '' : ' ') : '') + tagString + ' ');
    }
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
        subjectTemplate: activeTemplateSubject,
        body: activeTemplateBody,
        bodyTemplate: activeTemplateBody,
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

  // 1-Click High-Level Presets for Client Admins
  const handleApplyPreset = (type: 'recommended' | 'high_velocity' | 'essential') => {
    setMatrixRules((prev) =>
      prev.map((r) => {
        const ev = r.event_key || r.eventKey;
        if (type === 'recommended') {
          return {
            ...r,
            is_enabled: true,
            routing: {
              assigned_agent: { enabled: true, channels: { whatsapp: true, email: false, push: true, in_app: true } },
              team_lead: { enabled: true, channels: { whatsapp: false, email: true, push: false, in_app: true } },
              org_admin: { enabled: true, channels: { whatsapp: false, email: true, push: false, in_app: true } },
              customer: { enabled: ev === 'lead.created', channels: { whatsapp: ev === 'lead.created', email: false, push: false, in_app: false } }
            }
          };
        } else if (type === 'high_velocity') {
          return {
            ...r,
            is_enabled: true,
            routing: {
              assigned_agent: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
              team_lead: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
              org_admin: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
              customer: { enabled: ev === 'lead.created', channels: { whatsapp: ev === 'lead.created', email: false, push: false, in_app: false } }
            }
          };
        } else {
          // essential
          return {
            ...r,
            is_enabled: true,
            routing: {
              assigned_agent: { enabled: true, channels: { whatsapp: false, email: false, push: false, in_app: true } },
              team_lead: { enabled: true, channels: { whatsapp: false, email: true, push: false, in_app: true } },
              org_admin: { enabled: true, channels: { whatsapp: false, email: true, push: false, in_app: true } },
              customer: { enabled: false, channels: { whatsapp: false, email: false, push: false, in_app: false } }
            }
          };
        }
      })
    );
    setSnackbar({
      open: true,
      message: `Applied ${type === 'recommended' ? 'Recommended Standard' : type === 'high_velocity' ? 'High Velocity' : 'Essential Only'} preset! Click "Save Routing Matrix" below to commit changes.`,
      severity: 'info'
    });
  };

  // Direct Template Customization Navigation Shortcut
  const handleNavigateToTemplate = (eventKey: string, channel: 'whatsapp' | 'email' | 'push' | 'in_app') => {
    setSelectedEventKey(eventKey);
    setSelectedChannel(channel);
    const templateTabIndex = roleTabs.findIndex((t) => t.key === 'templates');
    if (templateTabIndex >= 0) {
      setActiveTab(templateTabIndex);
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

  // Helper to render authentic bold formatting in WhatsApp preview
  const renderFormattedWhatsAppText = (text: string) => {
    if (!text) return 'Template message text will preview here...';
    return text.split('\n').map((line, lIdx) => {
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <span key={lIdx} style={{ display: 'block', minHeight: line ? undefined : '1em' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return <strong key={pIdx}>{part.slice(1, -1)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxWidth: 1600,
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Pinned Top Region: Header & Main Tabs Navigation (NEVER SCROLLS) */}
      <Box
        sx={{
          flexShrink: 0,
          pt: { xs: 1.5, sm: 2.5 },
          px: { xs: 1.5, sm: 3 },
          pb: 0,
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 5
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  background: roleBadgeConfig.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  flexShrink: 0
                }}
              >
                <HubIcon fontSize="medium" />
              </Box>
              <Box>
                <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    {isAdmin
                      ? 'Omnichannel Notification & Automation Hub'
                      : isTeamLead
                      ? 'Team Notification & Alert Center'
                      : 'My Alerts & Notification Center'}
                  </Typography>
                  <Chip
                    label={roleBadgeConfig.label}
                    size="small"
                    sx={{
                      bgcolor: roleBadgeConfig.chipBg,
                      color: roleBadgeConfig.chipColor,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      border: '1px solid',
                      borderColor: 'divider',
                      height: 22
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', fontSize: '0.8rem' }}>
                  {isAdmin
                    ? 'Configure multi-recipient routing (Agents, Team Leads, Admins, Customers), vertical templates, and live delivery logs.'
                    : isTeamLead
                    ? 'Supervise team routing rules, preview customer message templates, and manage your personal alert channels.'
                    : 'Manage how you receive notifications for assigned leads, task deadlines, and customer responses across your devices.'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.25} alignItems="center" flexShrink={0}>
            <Tooltip title={isAdmin ? 'Test live delivery across WhatsApp, Email, or Push directly' : 'Send a diagnostic test alert to your verified personal device'}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<SendIcon />}
                onClick={() => {
                  if (!isAdmin) {
                    setTestRecipient(testChannel === 'email' ? (user?.email || '') : (user?.contactNumber || user?.phone || ''));
                    setTestName(user?.name || 'Sales Representative');
                  }
                  setTestModalOpen(true);
                  setTestResult(null);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36 }}
              >
                {isAdmin ? 'Test Dispatch' : 'Quick Test Alert'}
              </Button>
            </Tooltip>
            <Tooltip title="View layman guide, merge tags reference, and automation best practices">
              <Button
                variant="outlined"
                size="small"
                startIcon={<MenuBookIcon />}
                onClick={() => setGuideModalOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  height: 36,
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
              >
                Automation Guide
              </Button>
            </Tooltip>
            <Tooltip title="Refresh all rules and logs">
              <IconButton onClick={loadAllData} disabled={loading} size="small" sx={{ bgcolor: 'action.hover', borderRadius: 2, width: 36, height: 36 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Main Tabs Navigation */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 46,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.92rem',
              minHeight: 46,
              py: 0.75,
              px: 2,
              gap: 1
            }
          }}
        >
          {roleTabs.map((t) => (
            <Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>
      </Box>

      {/* Scrollable Tab Panel Body with Auto-Reset to Top */}
      <Box
        ref={contentContainerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: { xs: 1.5, sm: 3 },
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3 }
        }}
      >

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress size={36} />
        </Box>
      )}

      {/* TAB: MY PERSONAL ALERT PREFERENCES & CHANNELS */}
      {!loading && currentTabKey === 'my_prefs' && (
        <Box>
          {/* Identity & Verified Endpoints Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(13,148,136,0.03) 100%)'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: roleBadgeConfig.chipBg,
                      color: roleBadgeConfig.chipColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <PersonIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email}
                      </Typography>
                      <Chip
                        label={roleBadgeConfig.label}
                        size="small"
                        sx={{
                          bgcolor: roleBadgeConfig.chipBg,
                          color: roleBadgeConfig.chipColor,
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Configure your personal alert channels. Automatic CRM notifications will be routed directly to your verified endpoints below.
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} useFlexGap>
                  <Chip
                    icon={<WhatsAppIcon sx={{ fontSize: '15px !important' }} />}
                    label={`WhatsApp: ${user?.contactNumber || user?.phone || 'Not set'}`}
                    variant="outlined"
                    color={user?.contactNumber || user?.phone ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<EmailIcon sx={{ fontSize: '15px !important' }} />}
                    label={`Email: ${user?.email || 'N/A'}`}
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<NotificationsIcon sx={{ fontSize: '15px !important' }} />}
                    label="Bell: Active"
                    variant="outlined"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Quick Channel Diagnostic Dispatch */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Instant Channel Verification
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Send an immediate test alert directly to your verified devices to confirm delivery.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => handleSendMyTestAlert('whatsapp')}
                  disabled={testingMyChannel !== null}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {testingMyChannel === 'whatsapp' ? 'Sending...' : 'Test WhatsApp'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<EmailIcon />}
                  onClick={() => handleSendMyTestAlert('email')}
                  disabled={testingMyChannel !== null}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {testingMyChannel === 'email' ? 'Sending...' : 'Test Email'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<NotificationsIcon />}
                  onClick={() => handleSendMyTestAlert('in_app')}
                  disabled={testingMyChannel !== null}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {testingMyChannel === 'in_app' ? 'Sending...' : 'Test In-App Bell'}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Preference Toggle Cards */}
          <Grid container spacing={2.5}>
            {Object.entries(myPreferences).map(([categoryKey, prefObj]: [string, any]) => {
              let categoryIcon = <AssignmentIcon />;
              let iconBg = '#dbeafe';
              let iconColor = '#2563eb';

              if (categoryKey === 'lead_assigned') {
                categoryIcon = <PersonIcon />;
                iconBg = '#dbeafe';
                iconColor = '#1d4ed8';
              } else if (categoryKey === 'task_due') {
                categoryIcon = <AssignmentIcon />;
                iconBg = '#d1fae5';
                iconColor = '#047857';
              } else if (categoryKey === 'deal_update') {
                categoryIcon = <TrendingUpIcon />;
                iconBg = '#f3e8ff';
                iconColor = '#7c3aed';
              } else if (categoryKey === 'customer_message') {
                categoryIcon = <ForumIcon />;
                iconBg = '#fef3c7';
                iconColor = '#b45309';
              }

              return (
                <Grid size={{ xs: 12, md: 6 }} key={categoryKey}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 2,
                            bgcolor: iconBg,
                            color: iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {categoryIcon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                            {prefObj.label || categoryKey}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.84rem' }}>
                            {prefObj.description || 'Notification triggers for this event category.'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Delivery Channels
                      </Typography>

                      <Stack spacing={1.2}>
                        {/* WhatsApp */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: prefObj.whatsapp ? 'rgba(34,197,94,0.06)' : 'transparent', border: '1px solid', borderColor: prefObj.whatsapp ? 'rgba(34,197,94,0.2)' : 'divider' }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <WhatsAppIcon sx={{ color: '#25D366', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>WhatsApp Message</Typography>
                              <Typography variant="caption" color="text.secondary">Direct message with CRM quick-action link</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={Boolean(prefObj.whatsapp)}
                            onChange={(e) => {
                              setMyPreferences((prev: any) => ({
                                ...prev,
                                [categoryKey]: { ...prev[categoryKey], whatsapp: e.target.checked }
                              }));
                            }}
                            color="success"
                            size="small"
                          />
                        </Box>

                        {/* Push */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: prefObj.push ? 'rgba(147,51,234,0.06)' : 'transparent', border: '1px solid', borderColor: prefObj.push ? 'rgba(147,51,234,0.2)' : 'divider' }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <PhoneIphoneIcon sx={{ color: '#9333ea', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>Mobile Push Notification</Typography>
                              <Typography variant="caption" color="text.secondary">Instant banner alert on mobile app</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={Boolean(prefObj.push)}
                            onChange={(e) => {
                              setMyPreferences((prev: any) => ({
                                ...prev,
                                [categoryKey]: { ...prev[categoryKey], push: e.target.checked }
                              }));
                            }}
                            color="secondary"
                            size="small"
                          />
                        </Box>

                        {/* Email */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: prefObj.email ? 'rgba(37,99,235,0.06)' : 'transparent', border: '1px solid', borderColor: prefObj.email ? 'rgba(37,99,235,0.2)' : 'divider' }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <EmailIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>Email Notification</Typography>
                              <Typography variant="caption" color="text.secondary">Digest email with client summary</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={Boolean(prefObj.email)}
                            onChange={(e) => {
                              setMyPreferences((prev: any) => ({
                                ...prev,
                                [categoryKey]: { ...prev[categoryKey], email: e.target.checked }
                              }));
                            }}
                            color="primary"
                            size="small"
                          />
                        </Box>

                        {/* In-App Bell */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: prefObj.in_app ? 'rgba(234,179,8,0.06)' : 'transparent', border: '1px solid', borderColor: prefObj.in_app ? 'rgba(234,179,8,0.2)' : 'divider' }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <NotificationsIcon sx={{ color: '#eab308', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>In-App Topbar Bell</Typography>
                              <Typography variant="caption" color="text.secondary">Real-time desktop popover and sound ping</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={Boolean(prefObj.in_app)}
                            onChange={(e) => {
                              setMyPreferences((prev: any) => ({
                                ...prev,
                                [categoryKey]: { ...prev[categoryKey], in_app: e.target.checked }
                              }));
                            }}
                            color="warning"
                            size="small"
                          />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Bottom Save Preferences Bar */}
          <Paper elevation={0} sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveMyPreferences}
              disabled={savingMyPrefs}
              sx={{ textTransform: 'none', fontWeight: 600, px: 4, borderRadius: 2 }}
            >
              {savingMyPrefs ? 'Saving Preferences...' : 'Save Channel Preferences'}
            </Button>
          </Paper>
        </Box>
      )}

      {/* TAB 0: AUTOMATION ROUTING MATRIX */}
      {!loading && currentTabKey === 'matrix' && (
        <Box>
          {!isAdmin && (
            <Alert severity="info" icon={<SecurityIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
              <strong>Team Supervisory Operational View:</strong> Workspace-wide routing rules are configured by your Workspace Administrator. Displayed below so team leaders have complete operational transparency into which team members and customers receive automatic CRM notifications.
            </Alert>
          )}

          {/* Platform Assurance Banner for Client Admin */}
          {/* Consolidated Command Header: Platform Status, 1-Click Presets & Save Button */}
          {isAdmin && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2.5,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                alignItems: { xs: 'stretch', lg: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}
            >
              {/* Left: Platform Engine Live Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}>
                  <BoltIcon fontSize="small" />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Universal Platform Engine Active
                    </Typography>
                    <Chip label="Zero Setup" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Pre-connected cloud delivery across WhatsApp, Email, Push & Bell.
                  </Typography>
                </Box>
              </Box>

              {/* Right: 1-Click Presets & Save Button within fingertip reach */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" justifyContent="flex-end">
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'block' }, mr: 0.5 }}>
                  Presets:
                </Typography>
                <ButtonGroup size="small" variant="outlined" sx={{ borderRadius: 2 }}>
                  <Button
                    onClick={() => handleApplyPreset('recommended')}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', py: 0.6, px: 1.25 }}
                  >
                    🌟 Standard
                  </Button>
                  <Button
                    onClick={() => handleApplyPreset('high_velocity')}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', py: 0.6, px: 1.25 }}
                  >
                    🚀 High Velocity
                  </Button>
                  <Button
                    onClick={() => handleApplyPreset('essential')}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', py: 0.6, px: 1.25 }}
                  >
                    🔕 Essential
                  </Button>
                </ButtonGroup>

                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<SaveIcon sx={{ fontSize: '16px !important' }} />}
                  onClick={handleSaveMatrix}
                  disabled={savingMatrix}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, height: 34, px: 2, ml: { sm: 1 }, whiteSpace: 'nowrap' }}
                >
                  {savingMatrix ? 'Saving...' : 'Save Routing'}
                </Button>
              </Stack>
            </Paper>
          )}

          {/* 5 Layman Smart Workflow Micro-Cards */}
          {isAdmin && (
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Core Automation Workflows
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Essential automated alerts configured for your sales team. Toggle active status or customize copy.
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={1.5}>
                {/* Workflow Card 1: New Lead Arrival */}
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(37,99,235,0.1)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PersonIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          New Lead Inbound Alert
                        </Typography>
                      </Stack>
                      <Switch
                        checked={matrixRules.find(r => (r.event_key || r.eventKey) === 'lead.created')?.is_enabled !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMatrixRules(prev => prev.map(r => (r.event_key || r.eventKey) === 'lead.created' ? { ...r, is_enabled: checked } : r));
                        }}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, flex: 1, lineHeight: 1.35 }}>
                      Alerts assigned reps instantly when a prospect inquires via ads, website, or import.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={0.5}>
                        <Chip icon={<WhatsAppIcon sx={{ fontSize: '12px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '12px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<NotificationsIcon sx={{ fontSize: '12px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => handleNavigateToTemplate('lead.created', 'whatsapp')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.25, px: 0.75, minWidth: 'auto' }}
                      >
                        Customize ✏️
                      </Button>
                    </Box>
                  </Card>
                </Grid>

                {/* Workflow Card 2: Callback & Task Due */}
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: 'warning.main', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(234,179,8,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AssignmentIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          Follow-Up & Task Due
                        </Typography>
                      </Stack>
                      <Switch
                        checked={matrixRules.find(r => (r.event_key || r.eventKey) === 'task.reminder')?.is_enabled !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMatrixRules(prev => prev.map(r => (r.event_key || r.eventKey) === 'task.reminder' ? { ...r, is_enabled: checked } : r));
                        }}
                        color="warning"
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, flex: 1, lineHeight: 1.35 }}>
                      Sends timely reminders to reps before a scheduled callback, inspection, or task due date.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={0.5}>
                        <Chip icon={<WhatsAppIcon sx={{ fontSize: '12px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '12px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<NotificationsIcon sx={{ fontSize: '12px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => handleNavigateToTemplate('task.reminder', 'whatsapp')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.25, px: 0.75, minWidth: 'auto' }}
                      >
                        Customize ✏️
                      </Button>
                    </Box>
                  </Card>
                </Grid>

                {/* Workflow Card 3: Instant Customer Welcome */}
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: 'success.main', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(34,197,94,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <WhatsAppIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          Customer Welcome Greeting
                        </Typography>
                      </Stack>
                      <Switch
                        checked={(() => {
                          const r = matrixRules.find(x => (x.event_key || x.eventKey) === 'customer.welcome' || (x.event_key || x.eventKey) === 'lead.created');
                          return r ? getChannelActive(r, 'customer', 'whatsapp') : false;
                        })()}
                        onChange={() => handleMatrixToggle('customer.welcome', 'customer', 'whatsapp')}
                        color="success"
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, flex: 1, lineHeight: 1.35 }}>
                      Sends a warm, professional WhatsApp welcome greeting directly to the prospect immediately.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={0.5}>
                        <Chip icon={<WhatsAppIcon sx={{ fontSize: '12px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip label="Direct to Lead" size="small" variant="filled" sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#15803d', fontWeight: 700 }} />
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => handleNavigateToTemplate('customer.welcome', 'whatsapp')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.25, px: 0.75, minWidth: 'auto' }}
                      >
                        Customize ✏️
                      </Button>
                    </Box>
                  </Card>
                </Grid>

                {/* Workflow Card 4: Deal Won Milestone */}
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: '#9333ea', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(168,85,247,0.1)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUpIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          Deal Won Victory Milestone
                        </Typography>
                      </Stack>
                      <Switch
                        checked={matrixRules.find(r => (r.event_key || r.eventKey) === 'deal.won')?.is_enabled !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMatrixRules(prev => prev.map(r => (r.event_key || r.eventKey) === 'deal.won' ? { ...r, is_enabled: checked } : r));
                        }}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, flex: 1, lineHeight: 1.35 }}>
                      Broadcasts victory alerts to managers and reps when an opportunity is successfully closed.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={0.5}>
                        <Chip icon={<EmailIcon sx={{ fontSize: '12px !important' }} />} label="Email" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<NotificationsIcon sx={{ fontSize: '12px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => handleNavigateToTemplate('deal.won', 'email')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.25, px: 0.75, minWidth: 'auto' }}
                      >
                        Customize ✏️
                      </Button>
                    </Box>
                  </Card>
                </Grid>

                {/* Workflow Card 5: Uncontacted SLA Escalation */}
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: 'error.main', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ErrorOutlineIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          Urgent SLA Escalation
                        </Typography>
                      </Stack>
                      <Switch
                        checked={matrixRules.find(r => (r.event_key || r.eventKey) === 'task.sla_breach')?.is_enabled !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMatrixRules(prev => prev.map(r => (r.event_key || r.eventKey) === 'task.sla_breach' ? { ...r, is_enabled: checked } : r));
                        }}
                        color="error"
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, flex: 1, lineHeight: 1.35 }}>
                      Escalates to Team Leads and Admins when a new lead remains uncontacted past the response SLA window.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={0.5}>
                        <Chip icon={<WhatsAppIcon sx={{ fontSize: '12px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '12px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        <Chip icon={<NotificationsIcon sx={{ fontSize: '12px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => handleNavigateToTemplate('task.sla_breach', 'whatsapp')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', py: 0.25, px: 0.75, minWidth: 'auto' }}
                      >
                        Customize ✏️
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Advanced Channel Matrix Accordion */}
          <Accordion
            defaultExpanded={false}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px !important',
              overflow: 'hidden',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              mb: 3
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover', minHeight: 52 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TuneIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Advanced Granular Channel Matrix (144-Switch Grid)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fine-tune specific delivery channels (WhatsApp, Email, Push, Bell) per recipient role and CRM lifecycle event.
                    </Typography>
                  </Box>
                </Stack>
                <Chip label="12 Events × 4 Channels × 3 Roles" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
              {/* Quick Search inside Matrix */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Filter matrix events (e.g., 'Lead', 'Deal', 'Payment', 'Task')..."
                  value={matrixSearchQuery}
                  onChange={(e) => setMatrixSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: matrixSearchQuery ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setMatrixSearchQuery('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                  sx={{ width: { xs: '100%', sm: 360 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  Showing {matrixRules.filter(r => {
                    if (!matrixSearchQuery.trim()) return true;
                    const q = matrixSearchQuery.toLowerCase();
                    const rk = (r.eventKey || r.event_key || '').toLowerCase();
                    const rl = (r.eventLabel || r.event_label || '').toLowerCase();
                    return rk.includes(q) || rl.includes(q);
                  }).length} of {matrixRules.length} configurable events
                </Typography>
              </Box>

              <TableContainer
                sx={{
                  overflowX: 'auto',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3 }
                }}
              >
                <Table size="small" sx={{ minWidth: 960 }}>
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
                  {matrixRules
                    .filter((rule) => {
                      if (!matrixSearchQuery.trim()) return true;
                      const q = matrixSearchQuery.toLowerCase();
                      const ruleKey = (rule.eventKey || rule.event_key || '').toLowerCase();
                      const ruleLabel = (rule.eventLabel || rule.event_label || '').toLowerCase();
                      const desc = (rule.description || '').toLowerCase();
                      return ruleKey.includes(q) || ruleLabel.includes(q) || desc.includes(q);
                    })
                    .map((rule) => {
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
          </AccordionDetails>
        </Accordion>

        {/* Bottom Save Routing Matrix Bar */}
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Channel Key:
            </Typography>
            <Chip icon={<WhatsAppIcon sx={{ fontSize: '14px !important' }} />} label="WhatsApp" size="small" color="success" variant="outlined" />
            <Chip icon={<EmailIcon sx={{ fontSize: '14px !important' }} />} label="Email" size="small" color="primary" variant="outlined" />
            <Chip icon={<PhoneIphoneIcon sx={{ fontSize: '14px !important' }} />} label="Push" size="small" color="secondary" variant="outlined" />
            <Chip icon={<NotificationsIcon sx={{ fontSize: '14px !important' }} />} label="Bell" size="small" color="warning" variant="outlined" />
          </Stack>
          {isAdmin ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveMatrix}
              disabled={savingMatrix}
              sx={{ textTransform: 'none', fontWeight: 700, px: 3.5, borderRadius: 2 }}
            >
              {savingMatrix ? 'Saving Changes...' : 'Save Routing Matrix'}
            </Button>
          ) : (
            <Chip icon={<LockIcon sx={{ fontSize: '15px !important' }} />} label="Supervisory Read-Only Mode" color="default" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
        </Paper>
      </Box>
    )}

      {/* TAB 1: DYNAMIC TEMPLATE STUDIO */}
      {!loading && currentTabKey === 'templates' && (
        <Box>
          {!isAdmin && (
            <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
              <strong>Supervisory Template Preview Mode:</strong> Master notification templates and merge tags are configured by your Workspace Administrator. You can select CRM events and channels below to preview message layouts and live device mockups.
            </Alert>
          )}
          {/* Top Controls: Industry Vertical & Event Selector */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flex: 1 }}>
                {isSuperAdmin ? (
                  <FormControl sx={{ minWidth: 260, flex: 1 }} size="small">
                    <InputLabel>Platform Industry Baseline</InputLabel>
                    <Select
                      value={selectedIndustry}
                      label="Platform Industry Baseline"
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                    >
                      {INDUSTRY_VERTICALS.map((ind) => (
                        <MenuItem key={ind.id} value={ind.id}>{ind.name} ({ind.id})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, px: 1.75, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider', flex: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BusinessIcon fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', lineHeight: 1.1 }}>
                        Workspace Industry
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {INDUSTRY_VERTICALS.find(i => i.id === selectedIndustry)?.name || 'Real Estate & Properties'}
                      </Typography>
                    </Box>
                    <Chip label="Configured" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                  </Box>
                )}

                <FormControl sx={{ minWidth: 260, flex: 1 }} size="small">
                  <InputLabel>Notification Trigger Event</InputLabel>
                  <Select
                    value={selectedEventKey}
                    label="Notification Trigger Event"
                    onChange={(e) => setSelectedEventKey(e.target.value)}
                  >
                    {eventsList.map((ev) => {
                      const k = ev.key || (ev as any).event_key;
                      const label = ev.name || (ev as any).event_label || k;
                      return (
                        <MenuItem key={k} value={k}>
                          {label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>

              {isAdmin && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<RestartAltIcon />}
                  onClick={handleResetToDefault}
                  disabled={resettingTemplates}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 40, whiteSpace: 'nowrap', px: 2 }}
                >
                  {resettingTemplates ? 'Resetting...' : 'Reset to Industry Standard'}
                </Button>
              )}
            </Box>

            {/* Click-to-Insert Merge Tag Toolbar (Categorized) */}
            {isAdmin && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Click-to-Insert Merge Tags:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    Inserts dynamic lead, agent & deal data at cursor
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label="Prospect" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: 'rgba(37,99,235,0.08)', color: '#2563eb' }} />
                    {['customer_name', 'customer_phone', 'customer_email', 'lead_source', 'location'].map((tag) => (
                      <Chip
                        key={tag}
                        label={`{{${tag}}}`}
                        size="small"
                        onClick={() => handleInsertMergeTag(tag)}
                        clickable
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          height: 24,
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'primary.main', color: '#fff' }
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label="Rep & Team" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: 'rgba(16,185,129,0.08)', color: '#059669' }} />
                    {['assigned_agent_name', 'assigned_agent_phone', 'team_lead_name'].map((tag) => (
                      <Chip
                        key={tag}
                        label={`{{${tag}}}`}
                        size="small"
                        onClick={() => handleInsertMergeTag(tag)}
                        clickable
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          height: 24,
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'success.main', color: '#fff' }
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label="Deal & Info" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: 'rgba(147,51,234,0.08)', color: '#7c3aed' }} />
                    {['project_name', 'property_type', 'budget', 'deal_title', 'crm_lead_url', 'organization_name'].map((tag) => (
                      <Chip
                        key={tag}
                        label={`{{${tag}}}`}
                        size="small"
                        onClick={() => handleInsertMergeTag(tag)}
                        clickable
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          height: 24,
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: '#7c3aed', color: '#fff' }
                        }}
                      />
                    ))}
                  </Box>
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Main Studio Editor: 2-Column Responsive Workspace */}
          <Grid container spacing={2.5}>
            {/* Left Column: Template Editor Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Tabs
                    value={selectedChannel}
                    onChange={(_, val) => setSelectedChannel(val)}
                    sx={{
                      minHeight: 38,
                      '& .MuiTab-root': {
                        minHeight: 38,
                        py: 0.5,
                        px: 1.75,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        gap: 0.75
                      }
                    }}
                  >
                    <Tab icon={<WhatsAppIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="WhatsApp" value="whatsapp" />
                    <Tab icon={<EmailIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="Email" value="email" />
                    <Tab icon={<PhoneIphoneIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="Push" value="push" />
                    <Tab icon={<NotificationsIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="In-App Bell" value="in_app" />
                  </Tabs>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={activeTemplateEnabled}
                        onChange={(e) => setActiveTemplateEnabled(e.target.checked)}
                        size="small"
                        color="success"
                        disabled={!isAdmin}
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>}
                  />
                </Box>

                {selectedChannel !== 'whatsapp' && (
                  <TextField
                    fullWidth
                    label={selectedChannel === 'email' ? 'Email Subject Line' : (selectedChannel === 'push' ? 'Push Notification Title' : 'Bell Alert Title')}
                    value={activeTemplateSubject}
                    onChange={(e) => setActiveTemplateSubject(e.target.value)}
                    size="small"
                    InputProps={{ readOnly: !isAdmin }}
                    sx={{ mb: 2 }}
                    placeholder={selectedChannel === 'email' ? 'e.g. 🎯 New Lead Alert: {{customer_name}} ({{project_name}})' : 'e.g. 🎯 New Lead Assigned: {{customer_name}}'}
                  />
                )}

                <TextField
                  fullWidth
                  multiline
                  minRows={8}
                  maxRows={13}
                  label={`${selectedChannel.toUpperCase()} Message Copy`}
                  value={activeTemplateBody}
                  onChange={(e) => setActiveTemplateBody(e.target.value)}
                  placeholder="Enter template copy using merge tags like {{customer_name}}..."
                  InputProps={{
                    inputRef: templateBodyInputRef,
                    readOnly: !isAdmin
                  }}
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.88rem',
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
                    {isAdmin ? (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        {savingTemplate ? 'Saving...' : 'Save Template for Workspace'}
                      </Button>
                    ) : (
                      <Chip icon={<LockIcon sx={{ fontSize: '15px !important' }} />} label="Supervisory Preview Only" color="default" variant="outlined" size="small" />
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            {/* Right Column: Live Device Mockup Preview */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column', position: { md: 'sticky' }, top: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
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
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundImage: 'radial-gradient(#d1d7db 1.2px, transparent 1.2px)',
                      backgroundSize: '16px 16px',
                      border: '1px solid',
                      borderColor: 'divider',
                      minHeight: 340
                    }}
                  >
                    {/* Simulated WhatsApp Chat App Header */}
                    <Box sx={{ bgcolor: '#075e54', color: '#fff', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <WhatsAppIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2, fontSize: '0.85rem' }}>
                          LeadsRubix Alerts
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', display: 'block' }}>
                          Official Business Account • Online
                        </Typography>
                      </Box>
                      <Chip label="Verified" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.65rem', height: 20 }} />
                    </Box>

                    {/* Chat Messages Area */}
                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box
                        sx={{
                          maxWidth: '92%',
                          bgcolor: '#ffffff',
                          borderRadius: '8px 8px 8px 0px',
                          p: 1.5,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                          position: 'relative',
                          fontFamily: 'sans-serif',
                          fontSize: '0.86rem',
                          lineHeight: 1.45,
                          color: '#111b21'
                        }}
                      >
                        {renderFormattedWhatsAppText(previewContent)}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#667781' }}>
                            10:42 AM
                          </Typography>
                          <CheckCircleIcon sx={{ fontSize: 13, color: '#53bdeb' }} />
                        </Box>
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
                      borderRadius: 2.5,
                      p: 2,
                      bgcolor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 340
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
                      borderRadius: 2.5,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 340
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
                      borderRadius: 2.5,
                      p: 2,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 340
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

      {/* TAB 2: GATEWAYS & CHANNELS (Sleek 2x2 Dashboard Grid) */}
      {!loading && currentTabKey === 'gateways' && isAdmin && (
        <Box>
          <Grid container spacing={2.5}>
            {/* WhatsApp Gateway Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <WhatsAppIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>WhatsApp Cloud Gateway</Typography>
                    <Typography variant="caption" color="text.secondary">Direct Cloud API / WHAPI Provider</Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={waConfig.isActive}
                        onChange={(e) => setWaConfig({ ...waConfig, isActive: e.target.checked })}
                        color="success"
                        size="small"
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontWeight: 700 }}>{waConfig.isActive ? 'Active' : 'Disabled'}</Typography>}
                    sx={{ m: 0 }}
                  />
                </Stack>

                <Alert severity="success" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5, px: 1.5, borderRadius: 1.5 }}>
                  <strong>Universal Platform Fallback:</strong> If tenant API credentials are not set, outgoing alerts fallback to the SuperAdmin gateway with zero downtime.
                </Alert>

                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
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
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  type={showWaToken ? 'text' : 'password'}
                  label="Bearer Token / API Key"
                  value={waConfig.wapiToken}
                  onChange={(e) => setWaConfig({ ...waConfig, wapiToken: e.target.value })}
                  placeholder="Paste your WHAPI or Gateway Bearer token"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowWaToken(!showWaToken)}>
                          {showWaToken ? <VisibilityOff fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mt: 'auto', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={handleSaveWaGateway}
                    disabled={savingGateway}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36, px: 2 }}
                  >
                    {savingGateway ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => {
                      setTestChannel('whatsapp');
                      setTestRecipient(user?.contactNumber || user?.phone || '');
                      setTestModalOpen(true);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36 }}
                  >
                    Test WhatsApp
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Email SMTP Gateway Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <EmailIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Email (SMTP / Amazon SES)</Typography>
                    <Typography variant="caption" color="text.secondary">Transactional & Lead Alert Emails</Typography>
                  </Box>
                  <Chip label="Active - Cloud Managed" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                </Stack>

                <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5, px: 1.5, borderRadius: 1.5 }}>
                  Standard SMTP server connection configured via environment (Amazon SES / Nodemailer).
                </Alert>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 8 }}>
                    <TextField fullWidth size="small" label="SMTP Host" value={emailConfig.host} disabled />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField fullWidth size="small" label="Port" value={emailConfig.port} disabled />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="From Email Address" value={emailConfig.fromEmail} disabled />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<EmailIcon />}
                    onClick={() => {
                      setTestChannel('email');
                      setTestRecipient(emailConfig.fromEmail);
                      setTestModalOpen(true);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36 }}
                  >
                    Test Outbound Email
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Mobile Push Gateway Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <PhoneIphoneIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mobile Push Notification</Typography>
                    <Typography variant="caption" color="text.secondary">AWS SNS Platform & Expo Push</Typography>
                  </Box>
                  <Chip label="Auto-Provisioned" color="secondary" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                </Stack>

                <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5, px: 1.5, borderRadius: 1.5 }}>
                  Mobile devices automatically register their FCM/APNS push tokens upon login to the LeadsRubix mobile app.
                </Alert>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="AWS Region" value={pushConfig.region} disabled />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="Expo Push Relay" value="Enabled (exp.host)" disabled />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<PhoneIphoneIcon />}
                    onClick={() => {
                      setTestChannel('push');
                      setTestRecipient('ExponentPushToken[sample]');
                      setTestModalOpen(true);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36 }}
                  >
                    Test Mobile Push
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* In-App Bell Center Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <NotificationsIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>In-App Bell Center</Typography>
                    <Typography variant="caption" color="text.secondary">CRM Top-Bar Bell & WebSockets</Typography>
                  </Box>
                  <Chip label="Native Active" color="warning" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                </Stack>

                <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5, px: 1.5, borderRadius: 1.5 }}>
                  Real-time PostgreSQL database storage and WebSocket push to active user sessions across all roles.
                </Alert>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem', lineHeight: 1.5 }}>
                  In-app notifications trigger audible alerts, top-bar badge counters, and real-time toast banners across both desktop and mobile web sessions.
                </Typography>

                <Box sx={{ mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<NotificationsIcon />}
                    onClick={() => {
                      setTestChannel('in_app');
                      setTestRecipient('Current Authed User');
                      setTestModalOpen(true);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, height: 36 }}
                  >
                    Test Bell Notification
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 3: OMNICHANNEL DELIVERY AUDIT LOGS */}
      {!loading && currentTabKey === 'logs' && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {isSales ? 'My Alert History & Delivery Logs' : isTeamLead ? 'Team & Supervisory Delivery Logs' : 'Cross-Channel Delivery Audit Trail'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isSales
                  ? 'Real-time cryptographic log of alerts dispatched to your verified channels'
                  : isTeamLead
                  ? 'Supervisory delivery log for you and your reporting team members'
                  : 'Workspace-wide cryptographic audit log of all automated dispatches'}
              </Typography>
            </Box>
          </Box>

          {/* Filters Bar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 3 }}>
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

              <Grid size={{ xs: 12, sm: 3 }}>
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

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Contact / Phone / Email"
                  value={logFilterSearch}
                  onChange={(e) => setLogFilterSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
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
            <TableContainer
              sx={{
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3 }
              }}
            >
              <Table size="small" sx={{ minWidth: 960 }}>
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
      </Box>

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
            <Grid size={{ xs: 6 }}>
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

            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Key</InputLabel>
                <Select
                  value={testEventKey}
                  label="Event Key"
                  onChange={(e) => setTestEventKey(e.target.value)}
                >
                  {eventsList.map((ev) => {
                    const k = ev.key || (ev as any).event_key;
                    const label = ev.name || (ev as any).event_label || k;
                    return (
                      <MenuItem key={k} value={k}>{label} ({k})</MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label={testChannel === 'email' ? 'Recipient Email Address' : testChannel === 'whatsapp' ? 'Recipient Phone Number (+91...)' : 'Recipient Identifier'}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={testChannel === 'email' ? 'e.g. agent@company.com' : '+919876543210'}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
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
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Event:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLogPayload.event_key || selectedLogPayload.eventKey}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Channel:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{selectedLogPayload.channel}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Status:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedLogPayload.status}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Recipient Contact:</Typography>
                  <Typography variant="body2">{selectedLogPayload.recipient_contact} ({selectedLogPayload.recipient_name || 'N/A'})</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
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

      {/* COMPREHENSIVE AUTOMATION & NOTIFICATION GUIDE MODAL */}
      <Dialog
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MenuBookIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Notifications & Automation Guide
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Layman guide to multi-channel routing, dynamic templates, merge tags & delivery engines
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setGuideModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default', px: 2.5 }}>
          <Tabs
            value={guideTab}
            onChange={(_, v) => setGuideTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minHeight: 48 }
            }}
          >
            <Tab label="⚡ Universal Engine" />
            <Tab label="🎛️ 1-Click Presets" />
            <Tab label="📝 Dynamic Merge Tags" />
            <Tab label="🔌 Custom Gateways" />
            <Tab label="❓ Common Questions (FAQ)" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 3, maxHeight: '60vh', overflowY: 'auto' }}>
          {/* TAB 0: Universal Engine */}
          {guideTab === 0 && (
            <Stack spacing={2.5}>
              <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Universal Platform Engine Active (Zero Setup Required)
                </Typography>
                <Typography variant="body2">
                  Your CRM is pre-connected to our high-speed central notification infrastructure. Lead alerts, task reminders, and welcome messages dispatch automatically without purchasing extra phone numbers or API licenses.
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <WhatsAppIcon sx={{ color: '#25D366' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        WhatsApp Delivery
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      Delivers rich text alerts to assigned reps on new inquiries and sends personalized welcome messages directly to prospective customers.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <PhoneIphoneIcon sx={{ color: '#0284C7' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Mobile Device Push
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      Pushes real-time sound and lock-screen alerts to reps' mobile devices when on the road or outside the office.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <NotificationsIcon sx={{ color: '#F59E0B' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        In-App Bell Alerts
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      Provides an unmissable red badge counter and audio chime inside the desktop web portal for reps currently online.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <EmailIcon sx={{ color: '#EA4335' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Corporate Email (SMTP)
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      Sends branded HTML deal-won milestones and escalation notices with full lead records directly to leadership inboxes.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 1: 1-Click Presets */}
          {guideTab === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Instead of manually configuring 144 individual channel toggles, you can select one of 3 battle-tested industry presets:
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #3B82F6' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  🌟 Standard Preset (Recommended)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  Balanced setup for most sales teams. Alerts assigned reps via WhatsApp, Push, and Bell on new leads and task follow-ups, sends an automated welcome greeting to the customer, and emails managers when deals are closed.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #10B981' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                  🚀 High Velocity Preset
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  Maximum speed-to-lead. Dispatches aggressive alerts simultaneously to both assigned reps and team leads across all 4 channels (WhatsApp + Push + Bell + Email) on every lead lifecycle event.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #6B7280' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  🔕 Essential Only Preset
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  Low-noise mode for established teams. Silences frequent routine reminders and alerts leadership only on high-priority deal closures and SLA response breaches.
                </Typography>
              </Paper>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                  💡 Zero-Scroll Tip:
                </Typography>
                <Typography variant="caption">
                  After clicking any preset, simply click the blue <strong>Save Routing</strong> button right in the top command bar. You do not need to scroll to the bottom of the page!
                </Typography>
              </Alert>
            </Stack>
          )}

          {/* TAB 2: Dynamic Merge Tags */}
          {guideTab === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Use merge tags in Template Studio to dynamically personalize notification copy. Click any tag in the studio to insert it directly into your message.
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Tag Variable</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Replaced With</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Example Output</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { tag: '{{customer_name}}', desc: 'Full name of the prospect', eg: 'Sarah Jenkins' },
                      { tag: '{{customer_phone}}', desc: 'Contact phone number of the lead', eg: '+91 98765 43210' },
                      { tag: '{{customer_email}}', desc: 'Email address of the lead', eg: 'sarah.j@gmail.com' },
                      { tag: '{{lead_source}}', desc: 'Channel where the lead originated', eg: 'Facebook Ads / Website' },
                      { tag: '{{project_name}}', desc: 'Project or property category', eg: 'Horizon Heights Phase 2' },
                      { tag: '{{property_type}}', desc: 'Specific subtype or inventory classification', eg: '3 BHK Luxury Apartment' },
                      { tag: '{{budget}}', desc: 'Customer indicated budget range', eg: '$75,000 - $90,000' },
                      { tag: '{{location}}', desc: 'Customer preferred location / city', eg: 'Bangalore, India' },
                      { tag: '{{assigned_agent_name}}', desc: 'Name of the sales rep handling this lead', eg: 'Alex Rivera' },
                      { tag: '{{organization_name}}', desc: 'Your company or agency workspace name', eg: 'Acme Properties' },
                      { tag: '{{crm_lead_url}}', desc: '1-Click secure link to open the lead in CRM', eg: 'http://crm.company.com/leads/123' },
                    ].map((row) => (
                      <TableRow key={row.tag}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main', fontSize: '0.78rem' }}>
                          {row.tag}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.desc}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', fontStyle: 'italic' }}>{row.eg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {/* TAB 3: Custom Gateways */}
          {guideTab === 3 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                You have the choice to use our pre-connected platform gateway or connect your company's own verified messaging channels:
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  Mode 1: Universal Platform Gateway (Default)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  Requires zero setup. All internal alerts to your reps, managers, and admins run through the Leads Rubix high-availability gateway automatically.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WhatsAppIcon sx={{ color: '#25D366' }} fontSize="small" />
                  Mode 2: Bring Your Own (BYO) WhatsApp Gateway
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  If your company already has an official WhatsApp Business API account with <strong>WHAPI</strong>, <strong>ChatSimplified</strong>, or <strong>Simply</strong>, navigate to the <strong>Gateways & Channels</strong> tab and toggle on your provider. All customer-facing messages will be sent from your brand's verified WhatsApp number.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="primary" fontSize="small" />
                  Custom Email SMTP Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8125rem' }}>
                  Configure your company's Google Workspace, Microsoft 365, or Amazon SES SMTP server under <strong>Configuration ➔ Domain & Email</strong> so outgoing emails are sent from your company domain (e.g. <code>info@yourcompany.com</code>).
                </Typography>
              </Paper>
            </Stack>
          )}

          {/* TAB 4: Common Questions FAQ */}
          {guideTab === 4 && (
            <Stack spacing={1.5}>
              {[
                {
                  q: 'Why didn’t my sales rep receive a WhatsApp alert?',
                  a: 'Make sure the rep has a valid mobile number configured in Team Members. Also verify the assigned agent switch is turned ON in the Automation Matrix.'
                },
                {
                  q: 'Can sales reps manage their own sound and alert channels?',
                  a: 'Yes! When reps log into the CRM, clicking the bell icon in the top navbar gives them their own personal Notification Preferences drawer to toggle WhatsApp, Sound, or Bell.'
                },
                {
                  q: 'What happens if a customer provides an invalid phone number?',
                  a: 'The engine records the delivery attempt in Delivery Audit Logs, marks it with an informative failure notice, and ensures the assigned rep still gets their internal desktop bell alert.'
                },
                {
                  q: 'Can I revert custom template copy back to the default?',
                  a: 'Yes. In the Template Studio tab, simply click the "Reset to Industry Standard" button at any time to restore the verified baseline copy.'
                },
                {
                  q: 'Where can I see live delivery statuses?',
                  a: 'Switch to the "Delivery Audit Logs" tab to inspect the timestamp, recipient, channel, and payload of every single alert sent.'
                }
              ].map((faq, i) => (
                <Accordion key={i} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => {
              setGuideModalOpen(false);
              setTestModalOpen(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Test Live Alert Dispatch
          </Button>
          <Button
            variant="contained"
            onClick={() => setGuideModalOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Got It, Close Guide
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
