/**
 * services/contactsApi.ts
 *
 * API layer for fetching contacts list data from the backend.
 * Mirrors the same axiosInstance + pattern used across the project.
 */

import axiosInstance from "@/services/axiosInstance"

export interface ContactApiRow {
  id: string
  [key: string]: unknown // dynamic fields driven by table_configs
}

export interface ContactsApiResponse {
  items: ContactApiRow[]
  total?: number
  page?: number
  limit?: number
}

export interface FetchContactsParams {
  industryId: string
  page?: number          // 0-based (converted to 1-based before sending)
  limit?: number
  search?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, string>
}

/**
 * GET /api/contacts
 * Returns paginated, sorted, filtered contacts for a given industry.
 */
export async function fetchContacts(params: FetchContactsParams): Promise<ContactsApiResponse> {
  const {
    industryId,
    page = 0,
    limit = 10,
    search = '',
    sortField,
    sortOrder,
    filters = {},
  } = params

  // Build query params
  const queryParams: Record<string, string> = {
    industryId,
    page: String(page + 1), // backend is 1-based
    limit: String(limit),
  }

  if (search) queryParams.search = search
  if (sortField) queryParams.sortField = sortField
  if (sortOrder) queryParams.sortOrder = sortOrder

  // Flatten active filters into query string
  Object.entries(filters).forEach(([field, value]) => {
    if (value && value !== 'All') {
      queryParams[field] = value
    }
  })

  const response = await axiosInstance.get<ContactsApiResponse>('/contacts', {
    params: queryParams,
  })

  return response.data
}
