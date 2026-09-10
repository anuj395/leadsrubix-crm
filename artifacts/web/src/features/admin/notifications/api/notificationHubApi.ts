import { api } from '@/services/api';

export interface ChannelToggles {
  whatsapp: boolean;
  email: boolean;
  push: boolean;
  in_app: boolean;
}

export interface RecipientRouting {
  enabled: boolean;
  channels: ChannelToggles;
  override_phone?: string;
  override_email?: string;
}

export interface MatrixRule {
  _id?: string;
  id?: string;
  eventKey: string;
  event_key?: string;
  eventLabel?: string;
  event_label?: string;
  category?: string;
  description?: string;
  isEnabled?: boolean;
  is_enabled?: boolean;
  routing: {
    assigned_agent: RecipientRouting;
    team_lead: RecipientRouting;
    org_admin: RecipientRouting;
    customer: RecipientRouting;
  };
}

export interface NotificationTemplate {
  _id?: string;
  id?: string;
  event_key: string;
  eventKey?: string;
  channel: 'whatsapp' | 'email' | 'push' | 'in_app';
  recipient_type: 'assigned_agent' | 'team_lead' | 'org_admin' | 'customer' | 'all';
  recipientType?: string;
  industry_id?: string;
  industryId?: string;
  subject?: string;
  body: string;
  is_active: boolean;
  isActive?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  tags?: string[];
}

export interface NotificationLog {
  _id: string;
  id?: string;
  event_key: string;
  eventKey?: string;
  channel: 'whatsapp' | 'email' | 'push' | 'in_app';
  recipient_type: 'assigned_agent' | 'team_lead' | 'org_admin' | 'customer';
  recipient_contact: string;
  recipient_name?: string;
  provider?: string;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  message_title?: string;
  message_body: string;
  error_message?: string;
  created_at: string;
  createdAt?: string;
  metadata?: any;
}

export interface EventDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  supportedChannels: string[];
  supportedRecipients: string[];
}

export interface MergeTagDefinition {
  tag: string;
  label: string;
  sample: string;
}

export const notificationHubApi = {
  // Matrix rules
  getMatrix: async (orgId?: string) => {
    const res = await api.get('/notifications/matrix', {
      params: orgId ? { organizationId: orgId } : undefined
    });
    return res.data;
  },

  saveMatrix: async (rules: Partial<MatrixRule>[], orgId?: string) => {
    const res = await api.post('/notifications/matrix', {
      rules,
      organizationId: orgId
    });
    return res.data;
  },

  // Templates
  getTemplates: async (params?: {
    organizationId?: string;
    channel?: string;
    eventKey?: string;
    industryId?: string;
  }) => {
    const res = await api.get('/notifications/templates', { params });
    return res.data;
  },

  saveTemplate: async (template: Partial<NotificationTemplate>, orgId?: string) => {
    const res = await api.post('/notifications/templates', {
      ...template,
      organizationId: orgId
    });
    return res.data;
  },

  resetTemplates: async (payload: {
    eventKey?: string;
    channel?: string;
    organizationId?: string;
    industryId?: string;
  }) => {
    const res = await api.post('/notifications/templates/reset', payload);
    return res.data;
  },

  // Audit delivery logs
  getLogs: async (params?: {
    organizationId?: string;
    channel?: string;
    status?: string;
    eventKey?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/notifications/logs', { params });
    return res.data;
  },

  // Diagnostic live test dispatch
  testDispatch: async (payload: {
    channel: 'whatsapp' | 'email' | 'push' | 'in_app';
    recipientTarget: string;
    recipientName?: string;
    messageContent: string;
    eventKey?: string;
    organizationId?: string;
  }) => {
    const res = await api.post('/notifications/test-dispatch', payload);
    return res.data;
  }
};
