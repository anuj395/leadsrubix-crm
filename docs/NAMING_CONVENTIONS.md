# Naming Convention Standards

This document defines the standard naming conventions to be followed across the project to maintain consistency, readability, and scalability.

## 1. Database Naming Convention

**Standard:** `snake_case`

Database tables and columns should use lowercase letters with words separated by underscores.

### Examples:
```text
organization_id
valid_till
subscription_status
created_at
updated_at
```

---

## 2. API & Frontend Naming Convention

**Standard:** `camelCase`

API keys, frontend variables, states, props, and object keys should follow camelCase format.

### Examples:
```json
{
  "organizationId": 101,
  "validTill": "2026-12-31",
  "subscriptionStatus": "active",
  "createdAt": "2026-07-23"
}
```

---

## 3. Route Naming Convention

**Standard:** `kebab-case`

All application routes should use lowercase words separated by hyphens.

### Examples:
```text
/account/subscription-details
/user-management/users-list
/organization-settings
```

---

## Project-Wide Standard Summary

| Application Layer | Naming Convention | Example                 |
| ----------------- | ----------------- | ----------------------- |
| Database          | snake_case        | `valid_till`            |
| API               | camelCase         | `validTill`             |
| Frontend          | camelCase         | `subscriptionStatus`    |
| Routes            | kebab-case        | `/subscription-details` |
