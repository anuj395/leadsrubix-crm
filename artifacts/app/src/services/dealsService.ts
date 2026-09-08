import { apiClient } from '../api/apiClient';

export interface Stage {
  stageId?: string;
  stage_id?: string;
  name: string;
  probability: number;
  color: string;
  order: number;
  isWon?: boolean;
  is_won?: boolean;
  isLost?: boolean;
  is_lost?: boolean;
}

export interface Pipeline {
  _id: string;
  id?: string;
  name: string;
  isDefault?: boolean;
  is_default?: boolean;
  stages: Stage[];
  organizationId?: string;
  workspaceId?: string;
  industryId?: string;
}

export interface Deal {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  amount?: number;
  currency?: string;
  pipelineId?: string;
  pipeline_id?: string;
  stageId?: string;
  stage_id?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  expected_close_date?: string;
  closeDate?: string;
  close_date?: string;
  accountId?: string;
  account_id?: string;
  accountName?: string;
  account_name?: string;
  contactId?: string;
  contact_id?: string;
  contactName?: string;
  contact_name?: string;
  contactPhone?: string;
  contact_phone?: string;
  contactEmail?: string;
  contact_email?: string;
  ownerId?: string;
  owner_id?: string;
  ownerName?: string;
  owner_name?: string;
  ownerEmail?: string;
  owner_email?: string;
  lostReason?: string;
  lost_reason?: string;
  notes?: string;
  organizationId?: string;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export const dealsService = {
  async listPipelines(): Promise<Pipeline[]> {
    try {
      const res = await apiClient.get('/deals/pipelines');
      return res.data?.items || res.data || [];
    } catch (e) {
      console.warn('[dealsService] listPipelines error:', e);
      return [];
    }
  },

  async listDeals(params?: { pipelineId?: string; stageId?: string; contactId?: string }): Promise<Deal[]> {
    try {
      const search = new URLSearchParams();
      if (params?.pipelineId) search.set('pipelineId', params.pipelineId);
      if (params?.stageId) search.set('stageId', params.stageId);
      if (params?.contactId) search.set('contactId', params.contactId);

      const qs = search.toString();
      const res = await apiClient.get(`/deals${qs ? `?${qs}` : ''}`);
      return res.data?.items || res.data || [];
    } catch (e) {
      console.warn('[dealsService] listDeals error:', e);
      return [];
    }
  },

  async createDeal(payload: Partial<Deal>): Promise<Deal> {
    const res = await apiClient.post('/deals', payload);
    return res.data;
  },

  async updateDeal(id: string, payload: Partial<Deal>): Promise<Deal> {
    const res = await apiClient.put(`/deals/${id}`, payload);
    return res.data;
  },

  async updateDealStage(id: string, stageId: string, lostReason?: string): Promise<Deal> {
    const res = await apiClient.patch(`/deals/${id}/stage`, { stageId, lostReason });
    return res.data;
  },

  async deleteDeal(id: string): Promise<void> {
    await apiClient.delete(`/deals/${id}`);
  },
};
