// import type { NewLeadPayload } from '@/features/leads'

// export interface LeadValidationErrors {
//   company?: string
//   email?: string
//   name?: string
// }

// const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// export function validateLeadForm(values: NewLeadPayload) {
//   const errors: LeadValidationErrors = {}

//   if (!values.name.trim()) {
//     errors.name = 'Lead name is required.'
//   }

//   if (!values.company.trim()) {
//     errors.company = 'Company is required.'
//   }

//   if (!emailPattern.test(values.email)) {
//     errors.email = 'Enter a valid email address.'
//   }

//   return errors
// }