import { apiClient } from '../api/apiClient';
import { openWhatsApp } from '../utils/whatsappHelper';

export interface WhatsAppTemplate {
  id: string;
  title: string;
  body: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'site_visit',
    title: 'Site Visit Confirmation',
    body: 'Hello {{buyerName}}, thank you for inquiring about {{projectName}}. Your site visit has been scheduled for tomorrow. Looking forward to hosting you!',
  },
  {
    id: 'price_matrix',
    title: 'Price Matrix & Offer Quote',
    body: 'Hello {{buyerName}}, please find attached the official CPQ Price Matrix & Brochure for {{projectName}}. Let us know if you would like to reserve a unit.',
  },
  {
    id: 'followup_call',
    title: 'Post Call Follow-up',
    body: 'Hello {{buyerName}}, thank you for speaking with our sales team regarding {{projectName}}. Please feel free to reach out if you have any questions.',
  },
];

export const communicationService = {
  /**
   * Send WhatsApp message template to buyer lead phone number
   */
  async sendWhatsAppMessage(phone: string, templateId: string, replacements: Record<string, string>): Promise<boolean> {
    try {
      const template = DEFAULT_WHATSAPP_TEMPLATES.find((t) => t.id === templateId) || DEFAULT_WHATSAPP_TEMPLATES[0];
      let message = template.body;

      Object.entries(replacements).forEach(([key, val]) => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), val);
      });

      const success = await openWhatsApp(phone, message);
      if (success) {
        apiClient.post('/communications/log', { phone, templateId, channel: 'WhatsApp', text: message }).catch(() => {});
      }
      return success;
    } catch (err) {
      console.warn('[communicationService] WhatsApp dispatch fallback:', err);
      return false;
    }
  },
};
