import { apiClient } from '../api/apiClient';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: string;
  isRead: boolean;
  relatedId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  taskId?: string | null;
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

        const rawLeadId = n.lead_id || n.leadId || (n.data && (n.data.leadId || n.data.lead_id)) || null;
        const rawDealId = n.deal_id || n.dealId || (n.data && (n.data.dealId || n.data.deal_id)) || null;
        const rawTaskId = n.task_id || n.taskId || (n.data && (n.data.taskId || n.data.task_id)) || null;
        const rawRelatedId = n.related_id || n.relatedId || (n.data && n.data.relatedId) || rawLeadId || rawDealId || rawTaskId || null;

        return {
          id: n._id || n.id || Date.now().toString(),
          title: n.title || 'Workspace Alert',
          body: n.body || n.message || 'Notification update from CRM system.',
          timestamp: timeStr,
          type: n.type || 'lead_assigned',
          isRead: Boolean(n.is_read ?? n.isRead ?? n.read ?? false),
          relatedId: rawRelatedId,
          leadId: rawLeadId || (n.type?.includes('lead') ? rawRelatedId : null),
          dealId: rawDealId || (n.type?.includes('deal') ? rawRelatedId : null),
          taskId: rawTaskId || (n.type?.includes('task') ? rawRelatedId : null),
        };
      });
    } catch (err) {
      console.warn('[notificationService] Error loading notifications from backend:', err);
      return [];
    }
  },

  /**
   * Marks all notifications as read on the backend server
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient.put('/notifications/mark-all-read');
      return true;
    } catch (err) {
      console.warn('[notificationService] Error marking all as read on backend:', err);
      return false;
    }
  },

  /**
   * Marks a single notification as read on the backend server
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      if (!id) return false;
      await apiClient.put(`/notifications/${id}/read`);
      return true;
    } catch (err) {
      console.warn(`[notificationService] Error marking notification ${id} as read:`, err);
      return false;
    }
  },

  /**
   * Fetches real-time unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      return typeof res.data?.count === 'number' ? res.data.count : 0;
    } catch (err) {
      return 0;
    }
  },
};

