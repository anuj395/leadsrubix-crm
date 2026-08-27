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
      const items = res.data?.items || res.data?.notifications || res.data || [];
      if (!Array.isArray(items)) return [];

      return items.map((n: any) => {
        let timeStr = 'Just now';
        if (n.createdAt || n.created_at || n.timestamp) {
          const d = new Date(n.createdAt || n.created_at || n.timestamp);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }

        return {
          id: n._id || n.id || Date.now().toString(),
          title: n.title || 'Workspace Alert',
          body: n.body || n.message || 'Notification update from CRM system.',
          timestamp: timeStr,
          type: n.type || 'lead_assigned',
          isRead: Boolean(n.isRead || n.read),
        };
      });
    } catch (err) {
      console.warn('[notificationService] Error loading notifications from backend:', err);
      return [];
    }
  },
};
