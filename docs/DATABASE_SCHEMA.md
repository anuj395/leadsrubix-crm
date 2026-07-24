# Database Schema Documentation

This document describes the key Mongoose models and MongoDB collections.

## 1. User Model (`users` collection)
Stores information about the system administrators and sales agents.
* **Fields**:
  * `organization_name` (String, alias: `organizationName`)
  * `first_name` (String, alias: `firstName`)
  * `last_name` (String, alias: `lastName`)
  * `email` (String, unique, lowercase)
  * `password` (String, hashed)
  * `role` (String, enum: `['sales', 'teamLead', 'leadManager', 'admin', 'superAdmin']`)
  * `organization_id` (String, alias: `organizationId`)
  * `industry_id` (String, alias: `industryId`)
  * `is_active` (Boolean, alias: `isActive`)

---

## 2. Organization Model (`organizations` collection)
Stores tenant details and pricing plan parameters.
* **Fields**:
  * `organization_id` (String, alias: `organizationId`)
  * `organization_name` (String, alias: `organizationName`)
  * `contact_number` (String, alias: `contactNumber`)
  * `industry_id` (String, alias: `industryId`)
  * `allow_duplicate_leads` (Boolean, alias: `allowDuplicateLeads`)
  * `is_active` (Boolean, alias: `isActive`)
