import { callLogRepository } from '../repositories/callLogRepository';

export interface CallLogItem {
  id: string;
  _id?: string;
  buyerName: string;
  phone: string;
  project: string;
  type: string;
  duration: string;
  timestamp: string;
  outcome: string;
  badgeColor: string;
  bgColor: string;
}

export const callLogService = {
  async getCallLogs(): Promise<CallLogItem[]> {
    try {
      const resData = await callLogRepository.fetchRawCallLogs();
      const items = resData?.items || resData?.callLogs || (Array.isArray(resData) ? resData : []);
      if (!Array.isArray(items)) return [];

      return items.map((item: any) => {
        let timeStr = 'Recent';
        if (item.createdAt || item.created_at || item.timestamp) {
          const d = new Date(item.createdAt || item.created_at || item.timestamp);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }

        const callerName =
          item.buyerName ||
          item.name ||
          item.customerName ||
          item.customer_name ||
          'Contact';

        return {
          id: item._id || item.id || Date.now().toString(),
          _id: item._id || item.id,
          buyerName: callerName,
          phone: item.phone || item.contactNo || item.contact_number || '',
          project: item.project || item.projectName || item.project_name || '',
          type: item.type || item.callType || 'Call Log',
          duration: item.duration || (item.durationSeconds ? `${item.durationSeconds}s` : '0s'),
          timestamp: timeStr,
          outcome: item.outcome || item.status || 'Connected',
          badgeColor: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.12)',
        };
      });
    } catch (err) {
      console.warn('[callLogService] Error loading call logs:', err);
      return [];
    }
  },
};
