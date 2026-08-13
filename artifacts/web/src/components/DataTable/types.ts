import type { ReactNode } from 'react'

// ─── Sort ─────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc'

export interface SortState {
  field: string
  order: SortOrder
}

// ─── DB-driven column config (matches MongoDB table_configs schema) ───────────

export interface DbColumnConfig {
  key: string
  label: string
  type: 'text' | 'badge' | 'avatar' | 'date' | 'number'
  visible: boolean
  sortable?: boolean
  width?: number
}

// ─── Column Definition (runtime — may be built from DbColumnConfig) ───────────

export interface ColumnDef<T = Record<string, unknown>> {
  field: keyof T & string
  label: string
  minWidth?: number
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => ReactNode
  hideOnMobile?: boolean
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationState {
  page: number
  rowsPerPage: number
  total: number
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  label: string
  field: string
  options: FilterOption[]
}

export type ActiveFilters = Record<string, string>

// ─── Toolbar Config ───────────────────────────────────────────────────────────

export interface ToolbarConfig {
  searchPlaceholder?: string
  filterGroups?: FilterGroup[]
  showAdd?: boolean
  showImport?: boolean
  showExport?: boolean
  showSimulateLoad?: boolean
  extraActions?: ReactNode
}

// ─── DataTable Props ──────────────────────────────────────────────────────────

export interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  pagination: PaginationState
  onPaginationChange: (next: Partial<PaginationState>) => void
  onSortChange?: (sort: SortState) => void
  sort?: SortState
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onBulkDelete?: (ids: string[]) => void
  onAdd?: () => void
  onImport?: () => void
  onExport?: () => void
  onSimulateLoad?: () => void
  toolbar?: ToolbarConfig
  search?: string
  onSearchChange?: (value: string) => void
  activeFilters?: ActiveFilters
  onFilterChange?: (filters: ActiveFilters) => void
  title?: string
  subtitle?: string
  selectable?: boolean
  skeletonRows?: number
  emptyMessage?: string
  emptySubMessage?: string
}
