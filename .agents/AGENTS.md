# Workspace Rules

## Naming Convention Standards
All code changes and additions must strictly adhere to the project's naming conventions defined in [NAMING_CONVENTIONS.md](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/docs/NAMING_CONVENTIONS.md):
* **Database**: `snake_case` (e.g. `organization_id`, `valid_till`)
* **API & Frontend**: `camelCase` (e.g. `organizationId`, `validTill`)
* **Routes**: `kebab-case` (e.g. `/account/subscription-details`)

## Core Agent Operational Guidelines & Zero Gap Tolerance
1. **System-Level Sweeps (Never Stop at First Occurrence)**:
   - When modifying, fixing, or auditing any function, endpoint, screen, or utility, ALWAYS perform a repository-wide check for all callers, related services, routes, imports, screens, and modals. Never do single-file or partial fixes. Every form, model, field, and dropdown across the entire CRM must be kept in perfect sync.
2. **Product-Expert & Layman Experience Standard**:
   - Every form, field, and dropdown must make intuitive sense to a non-technical layman in any industry.
   - Eliminate all unprofessional artifacts: no double asterisks (`* *`) in labels, no nonsensical default values (e.g. durations on unanswered/busy calls), and no disconnected dependent dropdowns.
   - Intelligent dependencies (Country ➔ State, Property Type ➔ Sub Type, Deal Stage ➔ Probability %, Call Outcome ➔ Duration/Callback) must be consistently implemented.
3. **Multi-Tenant Workspace & Dynamic Industry Integrity**:
   - Maintain multi-tenant data isolation and clean template propagation (`organization_id: null` -> tenant organizations via `workspaceCloner.js` and `syncScreenFields.js`).
   - Preserve dynamic industry semantics across all 7 supported industry verticals (`temp0001` to `temp0007`).
4. **Zero Gap Tolerance & Core Integrity**:
   - Ensure backwards compatibility, fallback defaults, defensive checks, and robust logging on every critical path (Webhooks, Lead Routing, Auth, Notifications, Multi-Tenancy).
5. **End-to-End Empirical Verification**:
   - Never declare success without running build (`pnpm build` / `node -c`), checking imports, and empirically verifying the live UI in Chrome DevTools with visual proof.
6. **Modern Industry Best-Practices Standard (Never Perpetuate Flawed Legacy Logic)**:
   - When modifying or enhancing any module, endpoint, or screen, DO NOT blindly follow, inherit, or propagate flawed legacy patterns, historical hacks, or convoluted UX logic simply because it exists in the codebase.
   - Always benchmark against modern, world-class enterprise SaaS standards (HubSpot, Salesforce, Zoho) grounded in authentic domain and industry knowledge.
   - Proactively elevate and refactor flawed code into clean, scalable, layman-friendly, and enterprise-grade implementations.
7. **Mission Goal**:
   - Every change must move the product closer to being the industry's best, most reliable, multi-tenant enterprise CRM.
