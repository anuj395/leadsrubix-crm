/**
 * services/tasksApi.ts
 *
 * API layer for fetching tasks list data from the backend.
 * Mirrors the same axiosInstance + pattern used across the project.
 */

import axiosInstance from "@/services/axiosInstance"

export interface TaskApiRow {
  id: string
  [key: string]: unknown // dynamic fields driven by table_configs
}

export interface TasksApiResponse {
  items: TaskApiRow[]
  total?: number
  page?: number
  limit?: number
}

export interface FetchTasksParams {
  industryId: string
  page?: number          // 0-based (converted to 1-based before sending)
  limit?: number
  search?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, string>
}

/**
 * GET /api/tasks
 * Returns paginated, sorted, filtered tasks for a given industry.
 */
export async function fetchTasks(params: FetchTasksParams): Promise<TasksApiResponse> {
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
    page: String(page), // backend is 0-based
    pageSize: String(limit), // backend uses pageSize
  }

  if (search) queryParams.q = search // backend uses q
  if (sortField) queryParams.sortField = sortField
  if (sortOrder) queryParams.sortOrder = sortOrder

  // Flatten active filters into query string
  Object.entries(filters).forEach(([field, value]) => {
    if (value && value !== 'All') {
      queryParams[field] = value
    }
  })

  const response = await axiosInstance.get<TasksApiResponse>('/tasks', {
    params: queryParams,
  })

  return response.data
}
