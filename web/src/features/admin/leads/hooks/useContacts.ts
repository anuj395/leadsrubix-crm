/**
 * features/admin/leads/hooks/useContacts.ts
 *
 * Data-fetching hook for the Contacts list.
 * Accepts all table-control params (page, sort, search, filters) and
 * returns paginated rows from the backend API.
 *
 * Falls back to a client-side mock when industryId is absent,
 * matching the pattern already used by useTableConfig.
 */
import { useState, useEffect, useCallback } from 'react'
import type { PaginationState, SortState, ActiveFilters } from '../../../../components/DataTable'
import { fetchContacts, type ContactApiRow } from '../api/contactsApi'

// ─── Local mock data (mirrors the shape of real API responses) ────────────────

const MOCK_CONTACTS: ContactApiRow[] = [
  {
    id: '1', name: 'Alice Johnson', customer_name: 'Alice Johnson',
    email: 'alice@acme.com', phone: '555-0101', contact_no: '+1-555-0101',
    alternate_no: '+1-555-0151', country_code: 'US', role: 'Sales Rep',
    status: 'Active', department: 'Sales', lead_source: 'Website',
    lead_type: 'Inbound', propertyType: 'Residential', property_sub_type: 'Apartment',
    property_stage: 'New Lead', location: 'San Francisco, CA', budget: '$120,000',
    project: 'Bayview Estates', contact_owner_email: 'owner1@acme.com',
    call_back_reason: 'Requested demo',
  },
  {
    id: '2', name: 'Bob Martin', customer_name: 'Bob Martin',
    email: 'bob@acme.com', phone: '555-0102', contact_no: '+1-555-0102',
    alternate_no: '+1-555-0152', country_code: 'US', role: 'Lead Manager',
    status: 'Active', department: 'Sales', lead_source: 'Referral',
    lead_type: 'Outbound', propertyType: 'Commercial', property_sub_type: 'Office',
    property_stage: 'Contacted', location: 'New York, NY', budget: '$200,000',
    project: 'Downtown Plaza', contact_owner_email: 'owner2@acme.com',
    call_back_reason: 'Follow-up call',
  },
  {
    id: '3', name: 'Carol Lee', customer_name: 'Carol Lee',
    email: 'carol@acme.com', phone: '555-0103', contact_no: '+1-555-0103',
    alternate_no: '+1-555-0153', country_code: 'US', role: 'Administrator',
    status: 'Inactive', department: 'Operations', lead_source: 'Email Campaign',
    lead_type: 'Inbound', propertyType: 'Residential', property_sub_type: 'Villa',
    property_stage: 'Closed Lost', location: 'Chicago, IL', budget: '$90,000',
    project: 'Lakeview Homes', contact_owner_email: 'owner3@acme.com',
    call_back_reason: 'Not interested',
  },
  {
    id: '4', name: 'David Park', customer_name: 'David Park',
    email: 'david@acme.com', phone: '555-0104', contact_no: '+1-555-0104',
    alternate_no: '+1-555-0154', country_code: 'US', role: 'Team Lead',
    status: 'Active', department: 'Engineering', lead_source: 'Website',
    lead_type: 'Inbound', propertyType: 'Commercial', property_sub_type: 'Office',
    property_stage: 'Negotiation', location: 'Austin, TX', budget: '$300,000',
    project: 'Platform Revamp', contact_owner_email: 'owner4@acme.com',
    call_back_reason: 'Pricing discussion',
  },
  {
    id: '5', name: 'Eve Kim', customer_name: 'Eve Kim',
    email: 'eve@acme.com', phone: '555-0105', contact_no: '+1-555-0105',
    alternate_no: '+1-555-0155', country_code: 'US', role: 'Sales Rep',
    status: 'Pending', department: 'Sales', lead_source: 'Ad Campaign',
    lead_type: 'Outbound', propertyType: 'Residential', property_sub_type: 'Apartment',
    property_stage: 'New Lead', location: 'Los Angeles, CA', budget: '$150,000',
    project: 'Sunset Villas', contact_owner_email: 'owner5@acme.com',
    call_back_reason: 'Initial inquiry',
  },
  {
    id: '6', name: 'Frank Wu', customer_name: 'Frank Wu',
    email: 'frank@acme.com', phone: '555-0106', contact_no: '+1-555-0106',
    alternate_no: '+1-555-0156', country_code: 'US', role: 'Sales Rep',
    status: 'Active', department: 'Sales', lead_source: 'Cold Call',
    lead_type: 'Outbound', propertyType: 'Commercial', property_sub_type: 'Retail',
    property_stage: 'Qualified', location: 'Seattle, WA', budget: '$180,000',
    project: 'Tech Park Offices', contact_owner_email: 'owner6@acme.com',
    call_back_reason: 'Interested in demo',
  },
  {
    id: '7', name: 'Grace Patel', customer_name: 'Grace Patel',
    email: 'grace@acme.com', phone: '555-0107', contact_no: '+1-555-0107',
    alternate_no: '+1-555-0157', country_code: 'US', role: 'Designer',
    status: 'Active', department: 'Product', lead_source: 'Social Media',
    lead_type: 'Inbound', propertyType: 'Residential', property_sub_type: 'Apartment',
    property_stage: 'Contacted', location: 'San Diego, CA', budget: '$110,000',
    project: 'Ocean Breeze Homes', contact_owner_email: 'owner7@acme.com',
    call_back_reason: 'Requested brochure',
  },
  {
    id: '8', name: 'Henry Brooks', customer_name: 'Henry Brooks',
    email: 'henry@acme.com', phone: '555-0108', contact_no: '+1-555-0108',
    alternate_no: '+1-555-0158', country_code: 'US', role: 'Engineer',
    status: 'Inactive', department: 'Engineering', lead_source: 'Referral',
    lead_type: 'Inbound', propertyType: 'Commercial', property_sub_type: 'Office',
    property_stage: 'Closed Won', location: 'Denver, CO', budget: '$250,000',
    project: 'Mountain View Plaza', contact_owner_email: 'owner8@acme.com',
    call_back_reason: 'Deal closed',
  },
  {
    id: '9', name: 'Isabella Cruz', customer_name: 'Isabella Cruz',
    email: 'isabella@acme.com', phone: '555-0109', contact_no: '+1-555-0109',
    alternate_no: '+1-555-0159', country_code: 'US', role: 'Product Manager',
    status: 'Active', department: 'Product', lead_source: 'Website',
    lead_type: 'Inbound', propertyType: 'Residential', property_sub_type: 'Villa',
    property_stage: 'Qualified', location: 'Miami, FL', budget: '$170,000',
    project: 'Palm Residences', contact_owner_email: 'owner9@acme.com',
    call_back_reason: 'Needs site visit',
  },
  {
    id: '10', name: 'James Rivera', customer_name: 'James Rivera',
    email: 'james@acme.com', phone: '555-0110', contact_no: '+1-555-0110',
    alternate_no: '+1-555-0160', country_code: 'US', role: 'Analyst',
    status: 'Pending', department: 'Finance', lead_source: 'Email Campaign',
    lead_type: 'Outbound', propertyType: 'Commercial', property_sub_type: 'Office',
    property_stage: 'Negotiation', location: 'Boston, MA', budget: '$220,000',
    project: 'Financial Hub Tower', contact_owner_email: 'owner10@acme.com',
    call_back_reason: 'Budget discussion',
  },
  {
    id: '11', name: 'Karen Nguyen', customer_name: 'Karen Nguyen',
    email: 'karen@acme.com', phone: '555-0111', contact_no: '+1-555-0111',
    alternate_no: '+1-555-0161', country_code: 'US', role: 'HR Lead',
    status: 'Active', department: 'HR', lead_source: 'Social Media',
    lead_type: 'Inbound', propertyType: 'Residential', property_sub_type: 'Apartment',
    property_stage: 'Contacted', location: 'Houston, TX', budget: '$130,000',
    project: 'Green Meadows', contact_owner_email: 'owner11@acme.com',
    call_back_reason: 'Requested callback',
  },
  {
    id: '12', name: 'Leo Thompson', customer_name: 'Leo Thompson',
    email: 'leo@acme.com', phone: '555-0112', contact_no: '+1-555-0112',
    alternate_no: '+1-555-0162', country_code: 'US', role: 'Engineer',
    status: 'Active', department: 'Engineering', lead_source: 'Cold Call',
    lead_type: 'Outbound', propertyType: 'Commercial', property_sub_type: 'Retail',
    property_stage: 'Qualified', location: 'Phoenix, AZ', budget: '$210,000',
    project: 'Desert Business Park', contact_owner_email: 'owner12@acme.com',
    call_back_reason: 'Interested in pricing',
  },
]

function applyMockClientSide(
  all: ContactApiRow[],
  params: {
    search: string
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    filters: ActiveFilters
    page: number
    limit: number
  },
) {
  const q = params.search.toLowerCase()

  let result = all.filter((c) => {
    const matchSearch =
      !q ||
      String(c.name ?? '').toLowerCase().includes(q) ||
      String(c.email ?? '').toLowerCase().includes(q) ||
      String(c.role ?? '').toLowerCase().includes(q)

    const matchFilters = Object.entries(params.filters).every(([field, value]) => {
      if (!value || value === 'All') return true
      return String(c[field] ?? '') === value
    })

    return matchSearch && matchFilters
  })

  if (params.sortField) {
    const sf = params.sortField
    const dir = params.sortOrder === 'desc' ? -1 : 1
    result = [...result].sort((a, b) =>
      String(a[sf] ?? '').localeCompare(String(b[sf] ?? '')) * dir,
    )
  }

  const total = result.length
  const start = params.page * params.limit
  const data = result.slice(start, start + params.limit)

  return { data, total, page: params.page, limit: params.limit }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseContactsOptions {
  industryId?: string
  pagination: PaginationState
  sort: SortState
  search: string
  activeFilters: ActiveFilters
}

interface UseContactsResult {
  rows: ContactApiRow[]
  total: number
  loading: boolean
  error: string | null
  reload: () => void
}

export function useContacts({
  industryId,
  pagination,
  sort,
  search,
  activeFilters,
}: UseContactsOptions): UseContactsResult {
  const [rows, setRows] = useState<ContactApiRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        if (industryId) {
          // ── Real API ──────────────────────────────────────────────────────
          const result = await fetchContacts({
            industryId,
            page: pagination.page,
            limit: pagination.rowsPerPage,
            search,
            sortField: sort.field,
            sortOrder: sort.order,
            filters: activeFilters,
          })

          if (!cancelled) {
            setRows(result.items || [])
            setTotal(result.total ?? result.items?.length ?? 0)
          }
        } else {
          // ── Mock / dev fallback ───────────────────────────────────────────
          await new Promise((r) => setTimeout(r, 350))

          const result = applyMockClientSide(MOCK_CONTACTS, {
            search,
            sortField: sort.field,
            sortOrder: sort.order,
            filters: activeFilters,
            page: pagination.page,
            limit: pagination.rowsPerPage,
          })

          if (!cancelled) {
            setRows(result.data)
            setTotal(result.total)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contacts')
          // Graceful mock fallback on error
          const result = applyMockClientSide(MOCK_CONTACTS, {
            search,
            sortField: sort.field,
            sortOrder: sort.order,
            filters: activeFilters,
            page: pagination.page,
            limit: pagination.rowsPerPage,
          })
          setRows(result.data)
          setTotal(result.total)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    industryId,
    pagination.page,
    pagination.rowsPerPage,
    sort.field,
    sort.order,
    search,
    // Stringify filters so the effect only re-runs when values actually change
    JSON.stringify(activeFilters),
    tick,
  ])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { rows, total, loading, error, reload }
}
