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

        let badgeColor = '#047857';
        let bgColor = '#ECFDF5';
        const s = status.toLowerCase();
        if (s.includes('missed')) {
          badgeColor = '#DC2626';
          bgColor = '#FEF2F2';
        } else if (s.includes('busy')) {
          badgeColor = '#EA580C';
          bgColor = '#FFF7ED';
        } else if (s.includes('call back') || s.includes('callback') || s.includes('follow')) {
          badgeColor = '#D97706';
          bgColor = '#FFFBEB';
        } else if (s.includes('no answer')) {
          badgeColor = '#64748B';
          bgColor = '#F8FAFC';
        } else if (s.includes('wrong')) {
          badgeColor = '#E11D48';
          bgColor = '#FFF1F2';
        }

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
          badgeColor,
          bgColor,
        };
      });
    } catch (err) {
      console.warn('[callLogService] Error loading call logs:', err);
      return [];
    }
  },

  async logCall(payload: {
    contactId?: string;
    leadId?: string;
    customerName: string;
    contactNumber: string;
    duration?: number;
    details?: string;
    stage?: string;
    projectName?: string;
    createdBy?: string;
    organizationId?: string;
    industryId?: string;
    type?: string;
  }): Promise<any> {
    try {
      const res = await callLogRepository.createCallLog({
        contact_id: payload.contactId || null,
        contactId: payload.contactId || null,
        lead_id: payload.leadId || payload.contactId || '',
        leadId: payload.leadId || payload.contactId || '',
        customer_name: payload.customerName || 'Contact',
        customerName: payload.customerName || 'Contact',
        contact_number: payload.contactNumber,
        contactNumber: payload.contactNumber,
        phone: payload.contactNumber,
        duration: payload.duration || 0,
        details: payload.details || '',
        notes: payload.details || '',
        stage: payload.stage || 'Answered',
        project_name: payload.projectName || '',
        projectName: payload.projectName || '',
        created_by: payload.createdBy || '',
        createdBy: payload.createdBy || '',
        organization_id: payload.organizationId || null,
        organizationId: payload.organizationId || null,
        industry_id: payload.industryId || null,
        industryId: payload.industryId || null,
        type: payload.type || 'Outbound',
      });
      return res;
    } catch (err) {
      console.warn('[callLogService] Error saving call log:', err);
      throw err;
    }
  },
};
