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
  project?: string;
  projectName?: string;
  notes?: string;
  contactOwnerEmail?: string;
  createdAt?: string;
  isConverted?: boolean;
  is_converted?: boolean;
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
        let createdFormatted = 'Recently';
        if (item.createdAt || item.created_at) {
          const d = new Date(item.createdAt || item.created_at);
          if (!isNaN(d.getTime())) {
            createdFormatted = d.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
          }
        }

        const fullName =
          item.name ||
          `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim() ||
          item.customerName ||
          item.customer_name ||
          'Inquiry';

        return {
          id: item._id || item.id,
          _id: item._id || item.id,
          name: fullName,
          firstName: item.firstName || item.first_name || fullName.split(' ')[0] || '',
          lastName: item.lastName || item.last_name || fullName.split(' ')[1] || '',
          email: item.email || item.emailId || item.user_email || '',
          phone: item.phone || item.contactNo || item.contact_number || item.phone_number || '',
          alternateNo: item.alternateNo || item.alternate_no || '',
          status: item.stage || item.status || 'FRESH',
          stage: item.stage || item.status || 'FRESH',
          leadType: item.leadType || item.lead_type || 'Buyer',
          location: item.location || '',
          source: item.source || item.lead_source || '',
          budget: item.budget || '',
          propertyType: item.propertyType || item.inventoryType || '',
          project: item.projectName || item.project_name || item.project || '',
          projectName: item.projectName || item.project_name || item.project || '',
          notes: item.notes || item.description || '',
          contactOwnerEmail: item.contactOwnerEmail || item.contact_owner_email || '',
          createdAt: createdFormatted,
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
};
