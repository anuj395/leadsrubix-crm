import { callLogRepository } from '../repositories/callLogRepository';

export interface CallLogItem {
  id: string;
  _id?: string;
  buyerName: string;
  phone: string;
  project: string;
  type: string;
  direction?: 'Inbound' | 'Outbound';
  duration: string;
  timestamp: string;
  outcome: string;
  status: string;
  stage?: string;
  agent?: string;
  notes?: string;
  badgeColor: string;
  bgColor: string;
}

export const callLogService = {
  async getCallLogs(userId?: string, role?: string): Promise<CallLogItem[]> {
    try {
      const resData = await callLogRepository.fetchRawCallLogs(userId, role);
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
          item.customerName ||
          item.customer_name ||
          item.buyerName ||
          item.name ||
          'Contact';

        const phone = item.contactNumber || item.contact_number || item.phone || item.contactNo || '';
        const rawType = item.type || item.direction || 'Outbound';
        const isOut = !String(rawType).toLowerCase().includes('inbound');

        let durationStr = '0s';
        if (typeof item.duration === 'number') {
          const mins = Math.floor(item.duration / 60);
          const secs = item.duration % 60;
          durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        } else if (item.duration) {
          durationStr = String(item.duration);
        }

        const status = item.status || item.stage || (isOut ? 'Answered' : 'Connected');
        const notes = item.details || item.notes || '';
        const agent = item.createdBy || item.created_by || item.agent || 'Sales Agent';

        const isAnswered = status.toLowerCase() === 'answered' || status.toLowerCase().includes('won') || status.toLowerCase().includes('site');
        const isMissed = status.toLowerCase() === 'missed' || status.toLowerCase().includes('no answer') || status.toLowerCase().includes('lost');

        return {
          id: item._id || item.id || Date.now().toString(),
          _id: item._id || item.id,
          buyerName: callerName,
          phone,
          project: item.projectName || item.project_name || item.project || '',
          type: isOut ? 'Outbound' : 'Inbound',
          direction: isOut ? 'Outbound' : 'Inbound',
          duration: durationStr,
          timestamp: timeStr,
          outcome: status,
          status,
          stage: item.stage,
          agent,
          notes,
          badgeColor: isAnswered ? '#047857' : isMissed ? '#BE123C' : '#1D4ED8',
          bgColor: isAnswered ? '#ECFDF5' : isMissed ? '#FFF1F2' : '#EFF6FF',
        };
      });
    } catch (err) {
      console.warn('[callLogService] Error loading call logs:', err);
      return [];
    }
  },
};
