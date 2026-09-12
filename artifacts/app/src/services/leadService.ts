import { leadRepository } from '../repositories/leadRepository';

export interface LeadItem {
  id: string;
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  contactNo?: string;
  alternateNo?: string;
  status: string;
  stage?: string;
  leadType?: string;
  location?: string;
  source?: string;
  budget?: string;
  propertyType?: string;
  propertySubType?: string;
  project?: string;
  projectName?: string;
  notes?: string;
  contactOwnerEmail?: string;
  contactOwnerId?: string;
  contactOwnerName?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  createdAtFull?: string;
  rawCreatedAt?: string;
  nextFollowUpDateTime?: string;
  rawFollowUpDate?: string;
  isConverted?: boolean;
  is_converted?: boolean;
  convertedToDeal?: boolean;
  inquiryCount?: number;
  dealAmount?: number | string;
  lastContactedAt?: string;
  inquiries?: any[];
  stageHistory?: any[];
  stage_history?: any[];
}

export interface TransferOptions {
  fresh?: boolean;
  task?: boolean;
  notes?: boolean;
  attachments?: boolean;
  contactDetails?: boolean;
}

export const leadService = {
  async getLeads(params?: {
    status?: string;
    stage?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<LeadItem[]> {
    try {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.stage) search.set('stage', params.stage);
      if (params?.q) search.set('q', params.q);
      if (params?.page) search.set('page', String(params.page));
      if (params?.limit) search.set('limit', String(params.limit));

      const qs = search.toString();
      const rawData = await leadRepository.fetchRawLeads(qs);
      const items = rawData?.items || rawData?.leads || rawData?.contacts || (Array.isArray(rawData) ? rawData : []);

      if (!Array.isArray(items)) return [];

      return items.map((item: any) => {
        const rawCreated = item.createdAt || item.created_at || '';
        let createdFormatted = 'Recently';
        let createdFull = '';
        if (rawCreated) {
          const d = new Date(rawCreated);
          if (!isNaN(d.getTime())) {
            createdFormatted = d.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            createdFull = `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
        }

        const rawFollowUp = item.nextFollowUpDateTime || item.next_follow_up_date_time || item.followUpDate || item.follow_up_date || '';
        let followUpFull = '';
        if (rawFollowUp) {
          const fd = new Date(rawFollowUp);
          if (!isNaN(fd.getTime())) {
            followUpFull = `${fd.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${fd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          } else {
            followUpFull = String(rawFollowUp);
          }
        }

        const fullName =
          item.name ||
          `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim() ||
          item.customerName ||
          item.customer_name ||
          'Inquiry';

        const stage = item.stage || item.status || 'FRESH';
        const stUpper = String(stage).toUpperCase();
        const isConverted = Boolean(
          item.isConverted ||
          item.is_converted ||
          item.convertedToDeal ||
          item.converted_to_deal ||
          stUpper.includes('CONVERT') ||
          stUpper.includes('WON') ||
          stUpper.includes('DEAL') ||
          stUpper.includes('BOOKED')
        );

        const inqCount = item.inquiryCount || item.inquiry_count || (Array.isArray(item.inquiries) && item.inquiries.length > 0 ? item.inquiries.length : 1);

        return {
          id: item._id || item.id,
          _id: item._id || item.id,
          name: fullName,
          firstName: item.firstName || item.first_name || fullName.split(' ')[0] || '',
          lastName: item.lastName || item.last_name || fullName.split(' ')[1] || '',
          email: item.email || item.emailId || item.user_email || '',
          phone: item.phone || item.contactNo || item.contact_number || item.phone_number || '',
          alternateNo: item.alternateNo || item.alternate_no || '',
          status: stage,
          stage: stage,
          leadType: item.leadType || item.lead_type || 'Buyer',
          location: item.location || '',
          source: item.source || item.lead_source || '',
          budget: item.budget || '',
          propertyType: item.propertyType || item.inventoryType || '',
          propertySubType: item.propertySubType || item.property_sub_type || '',
          project: item.projectName || item.project_name || item.project || '',
          projectName: item.projectName || item.project_name || item.project || '',
          notes: item.notes || item.description || '',
          contactOwnerEmail: item.contactOwnerEmail || item.contact_owner_email || '',
          contactOwnerId: item.contactOwnerId || item.contact_owner_id || item.ownerId || item.owner_id || '',
          contactOwnerName: item.contactOwnerName || item.contact_owner_name || '',
          assignedTo: item.assignedTo || item.assigned_to || item.contactOwnerEmail || item.contact_owner_email || '',
          createdBy: item.createdBy || item.created_by || '',
          createdAt: createdFormatted,
          createdAtFull: createdFull || createdFormatted,
          rawCreatedAt: rawCreated,
          nextFollowUpDateTime: followUpFull,
          rawFollowUpDate: rawFollowUp,
          isConverted: isConverted,
          is_converted: isConverted,
          convertedToDeal: isConverted,
          inquiryCount: inqCount,
          dealAmount: item.dealAmount || item.deal_amount || item.amount || item.budget || '',
          lastContactedAt: item.lastContactedAt || item.last_contacted_at || item.callResponseTime || item.call_response_time || '',
          inquiries: Array.isArray(item.inquiries) ? item.inquiries : [],
          stageHistory: Array.isArray(item.stageHistory) ? item.stageHistory : Array.isArray(item.stage_history) ? item.stage_history : [],
          stage_history: Array.isArray(item.stage_history) ? item.stage_history : Array.isArray(item.stageHistory) ? item.stageHistory : [],
        };
      });

    } catch (err) {
      console.warn('[leadService] Error loading leads from backend:', err);
      return [];
    }
  },

  async createLead(payload: Partial<LeadItem>): Promise<LeadItem | null> {
    try {
      const res = await leadRepository.createRawLead(payload);
      return res;
    } catch (err) {
      console.error('[leadService] Failed to create lead:', err);
      return null;
    }
  },

  async transitionLead(id: string, stage: string, remarks?: string): Promise<boolean> {
    try {
      await leadRepository.transitionRawLeadStage(id, { stage, remarks });
      return true;
    } catch (err) {
      console.error('[leadService] Failed to transition lead:', err);
      return false;
    }
  },

  async updateLeadStage(id: string, stage: string, remarks?: string): Promise<boolean> {
    return this.transitionLead(id, stage, remarks);
  },

  async updateLead(id: string, payload: Partial<LeadItem>): Promise<boolean> {
    try {
      await leadRepository.updateRawLead(id, payload);
      return true;
    } catch (err) {
      console.error('[leadService] Failed to update lead:', err);
      return false;
    }
  },

  async bulkChangeOwner(
    leadIds: string[],
    owner: { email: string; uid?: string } | string,
    reason: string = 'Reassigned from Mobile App',
    leadType: 'Leads' | 'Data' = 'Leads',
    options: TransferOptions = { notes: true, attachments: true, contactDetails: true }
  ): Promise<boolean> {
    const targetEmail = typeof owner === 'string' ? owner : owner?.email;
    const targetUid = typeof owner === 'string' ? '' : owner?.uid || '';
    if (!leadIds || leadIds.length === 0 || !targetEmail) return false;
    try {
      const { apiClient } = await import('../api/apiClient');
      try {
        await apiClient.post('/contacts/transfer', {
          ids: leadIds,
          owner: {
            email: targetEmail,
            uid: targetUid,
          },
          reason: reason || 'Reassigned from Mobile App',
          leadType: leadType || 'Leads',
          options: {
            fresh: options?.fresh || false,
            task: options?.task || false,
            notes: options?.notes !== false,
            attachments: options?.attachments !== false,
            contactDetails: options?.contactDetails !== false,
          },
        });
        return true;
      } catch (postErr) {
        // Fallback: batch individual PUT calls
        await Promise.all(
          leadIds.map((id) =>
            apiClient.put(`/contacts/${id}`, {
              contactOwnerEmail: targetEmail,
              contact_owner_email: targetEmail,
              assignedTo: targetEmail,
              assigned_to: targetEmail,
              contactOwnerId: targetUid,
              contact_owner_id: targetUid,
              transferReason: reason || 'Reassigned from Mobile App',
              leadType: leadType || 'Leads',
              modifiedAt: new Date(),
            }).catch(() => null)
          )
        );
        return true;
      }
    } catch (err) {
      console.error('[leadService] Failed to bulk reassign leads:', err);
      return false;
    }
  },

  async bulkDeleteLeads(leadIds: string[]): Promise<boolean> {
    if (!leadIds || leadIds.length === 0) return false;
    try {
      const { apiClient } = await import('../api/apiClient');
      await Promise.all(
        leadIds.map((id) =>
          apiClient.delete(`/leads/${id}`).catch(() => apiClient.delete(`/contacts/${id}`).catch(() => null))
        )
      );
      return true;
    } catch (err) {
      console.error('[leadService] Failed to bulk delete leads:', err);
      return false;
    }
  },
};
