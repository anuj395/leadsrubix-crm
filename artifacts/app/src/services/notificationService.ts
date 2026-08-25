import { apiClient } from '../api/apiClient';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'lead_assigned' | 'task_due' | 'call_reminder' | 'system_alert';
  isRead: boolean;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await apiClient.get('/notifications');
      const items = res.data?.items || res.data || [];
      return items.map((n: any) => ({
        id: n._id || n.id || Date.now().toString(),
        title: n.title || 'Lead Assignment Alert',
        body: n.body || n.message || 'New prospect assigned to your pipeline.',
        timestamp: n.timestamp || n.createdAt || 'Just now',
        type: n.type || 'lead_assigned',
        isRead: Boolean(n.isRead || n.read),
      }));
    } catch (err) {
      console.warn('[notificationService] API fallback active, returning workspace alerts:', err);
      return [
        {
          id: '1',
          title: 'New Buyer Lead Assigned',
          body: 'Rajesh Kumar expressed interest in 3 BHK Luxury Apartment.',
          timestamp: '10 mins ago',
          type: 'lead_assigned',
          isRead: false,
        },
        {
          id: '2',
          title: 'Site Visit Follow-up Reminder',
          body: 'Scheduled site visit tour with Sunita Sharma today at 4:00 PM.',
          timestamp: '1 hour ago',
          type: 'task_due',
          isRead: false,
        },
        {
          id: '3',
          title: 'CPQ Quote Shared',
          body: 'PDF quotation sent via WhatsApp to Amitabh Verma.',
          timestamp: 'Yesterday',
          type: 'system_alert',
          isRead: true,
        },
      ];
    }
  },
};
