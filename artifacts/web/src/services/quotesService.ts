import { api } from './api'

export interface QuoteItem {
  productName: string
  quantity: number
  unitPrice: number
  total?: number
}

export interface Quote {
  _id: string
  quoteNumber: string
  dealId?: string
  accountId?: string
  contactId?: string
  organizationId: string
  validTill?: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'ORDERED'
  items: QuoteItem[]
  subtotal: number
  tax: number
  discount: number
  grandTotal: number
  [k: string]: unknown
}

export async function listQuotes(): Promise<Quote[]> {
  const res = await api.get('quotes')
  return (res.data?.items ?? []) as Quote[]
}

export async function createQuote(payload: Record<string, unknown>): Promise<Quote> {
  const res = await api.post('quotes', payload)
  return res.data as Quote
}

export async function updateQuote(id: string, payload: Record<string, unknown>): Promise<Quote> {
  const res = await api.put(`quotes/${id}`, payload)
  return res.data as Quote
}

export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`quotes/${id}`)
}

export async function convertQuoteToOrder(id: string): Promise<any> {
  const res = await api.post(`quotes/${id}/convert-to-order`)
  return res.data
}

export function getQuotePdfUrl(id: string): string {
  // Return path directly to open in standard web page
  return `${api.defaults.baseURL || ''}/quotes/${id}/pdf`
}
