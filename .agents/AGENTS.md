# Workspace Rules

## Naming Convention Standards
All code changes and additions must strictly adhere to the project's naming conventions defined in [NAMING_CONVENTIONS.md](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/docs/NAMING_CONVENTIONS.md):
* **Database**: `snake_case` (e.g. `organization_id`, `valid_till`)
* **API & Frontend**: `camelCase` (e.g. `organizationId`, `validTill`)
* **Routes**: `kebab-case` (e.g. `/account/subscription-details`)

## Core Agent Operational Guidelines & Zero Gap Tolerance
1. **System-Level Sweeps (Never Stop at First Occurrence)**:
   - When modifying, fixing, or auditing any function, endpoint, or utility, ALWAYS perform a repository-wide check for all callers, related services, routes, and imports. Never do single-file or partial fixes.
2. **Zero Gap Tolerance & Core Integrity**:
   - Ensure backwards compatibility, fallback defaults, defensive checks, and robust logging on every critical path (Webhooks, Lead Routing, Auth, Notifications, Multi-Tenancy).
3. **End-to-End Empirical Verification**:
   - Never declare success without running build (`pnpm build` / `node -c`), checking imports, and verifying that no existing contract or function signature was broken.
4. **Comprehensive Logging & Human Awareness**:
   - Add clear, contextual error logs on all backend try-catch blocks and API middleware to ensure complete auditability and instant root-cause identification.
5. **Mission Goal**:
   - Every change must move the product closer to being the industry's best, most reliable, multi-tenant enterprise CRM.
