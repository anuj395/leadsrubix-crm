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
  organization_id?: string;
  workspaceId?: string;
  workspace_id?: string;
  industryId?: string;
  industry_id?: string;
}

export interface TeamMember {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
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
  customerType?: 'B2C' | 'B2B';
  customer_type?: 'B2C' | 'B2B';
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
  workspaceId?: string;
  workspace_id?: string;
  industryId?: string;
  industry_id?: string;
  createdAt?: string;
  updatedAt?: string;
  // Dynamic Industry Vertical fields
  unitNumber?: string;
  unit_number?: string;
  towerBlock?: string;
  tower_block?: string;
  propertyType?: string;
  property_type?: string;
  vehicleModel?: string;
  vehicle_model?: string;
  variant?: string;
  modelYear?: string;
  model_year?: string;
  clinicalSpecialty?: string;
  clinical_specialty?: string;
  treatmentProcedure?: string;
  treatment_procedure?: string;
  programName?: string;
  program_name?: string;
  academicIntake?: string;
  academic_intake?: string;
  portfolioType?: string;
  portfolio_type?: string;
  riskCategory?: string;
  risk_category?: string;
  techStack?: string;
  tech_stack?: string;
  sowTerm?: string;
  sow_term?: string;
  productLine?: string;
  product_line?: string;
  batchSize?: string;
  batch_size?: string;
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

  async getDeal(id: string): Promise<Deal | null> {
    try {
      const res = await apiClient.get(`/deals/${id}`);
      return res.data;
    } catch (e) {
      console.warn('[dealsService] getDeal error:', e);
      return null;
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

  async updateDealStage(
    id: string,
    stageId: string,
    lostReason?: string,
    stageName?: string,
    probability?: number
  ): Promise<Deal> {
    const res = await apiClient.patch(`/deals/${id}/stage`, {
      stageId,
      stage: stageName || stageId,
      probability,
      lostReason,
    });
    return res.data;
  },

  async deleteDeal(id: string): Promise<void> {
    await apiClient.delete(`/deals/${id}`);
  },

  async convertLeadToDeal(contactId: string, payload: any): Promise<any> {
    const res = await apiClient.post(`/contacts/${contactId}/convert`, payload);
    return res.data;
  },

  async listTeamMembers(): Promise<TeamMember[]> {
    try {
      const res = await apiClient.get('/users');
      const raw = res.data?.items || res.data || [];
      if (Array.isArray(raw)) {
        return raw
          .filter((u: any) => u.isActive !== false)
          .map((u: any) => ({
            id: String(u._id || u.id),
            _id: String(u._id || u.id),
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email,
            role: u.role || 'Sales Rep',
            isActive: u.isActive !== false,
          }));
      }
      return [];
    } catch (e) {
      console.warn('[dealsService] listTeamMembers error:', e);
      return [];
    }
  },

  async listContacts(): Promise<any[]> {
    try {
      const res = await apiClient.get('/contacts');
      return res.data?.items || res.data || [];
    } catch (e) {
      console.warn('[dealsService] listContacts error:', e);
      return [];
    }
  },
};
