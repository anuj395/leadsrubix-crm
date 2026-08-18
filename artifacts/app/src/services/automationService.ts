import { automationRepository } from '../repositories/automationRepository';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'lead_created' | 'stage_changed' | 'call_log_added' | 'quote_generated';
  action: 'send_whatsapp' | 'send_email' | 'assign_agent' | 'create_task' | 'webhook';
  actionConfig: {
    templateId?: string;
    targetEmail?: string;
    assigneeRole?: string;
    taskTitle?: string;
    webhookUrl?: string;
  };
  isActive: boolean;
  executionCount: number;
}

export const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'rule_1',
    name: 'Auto WhatsApp Brochure on New Inquiry',
    trigger: 'lead_created',
    action: 'send_whatsapp',
    actionConfig: { templateId: 'price_matrix' },
    isActive: true,
    executionCount: 142,
  },
  {
    id: 'rule_2',
    name: 'Auto-Schedule Site Visit Task on Stage Rollforward',
    trigger: 'stage_changed',
    action: 'create_task',
    actionConfig: { taskTitle: 'Conduct On-Site Property Visit' },
    isActive: true,
    executionCount: 68,
  },
  {
    id: 'rule_3',
    name: 'Webhook Payload Dispatch to External ERP',
    trigger: 'quote_generated',
    action: 'webhook',
    actionConfig: { webhookUrl: 'https://hooks.zapier.com/hooks/catch/12345/abcde' },
    isActive: true,
    executionCount: 32,
  },
];

export const automationService = {
  async getAutomations(): Promise<AutomationRule[]> {
    try {
      const data = await automationRepository.fetchRawAutomations();
      const items = data?.items || data || [];
      return items.length > 0 ? items : DEFAULT_AUTOMATIONS;
    } catch (err) {
      console.warn('[automationService] API fallback, using default Zapier workflow rules:', err);
      return DEFAULT_AUTOMATIONS;
    }
  },

  async createAutomation(rule: Partial<AutomationRule>): Promise<AutomationRule> {
    return await automationRepository.createRawAutomation(rule);
  },

  async updateAutomation(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    return await automationRepository.updateRawAutomation(id, updates);
  },
};
