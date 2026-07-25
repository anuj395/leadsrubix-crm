# Environment Comparison & Resolution Report

This document compares the configurations of the **Local Development Environment** and the **Live AWS Production Server** for the LeadsRubix CRM, detailing the discrepancies identified and the steps taken to align them.

---

## 1. Environment & Architecture Overview

| Attribute | Local Development | Live AWS Server | Status |
| :--- | :--- | :--- | :--- |
| **IP / Host** | `localhost` | `13.232.163.144` | Aligned |
| **Port** | `3000` (Frontend) | `80` (Nginx Proxy) | Aligned |
| **Process Manager** | Vite / Node directly | PM2 (`api-server`) | Aligned |
| **Web Server** | None (Dev Server) | Nginx (`nginx/1.24.0`) | Aligned |
| **Database** | MongoDB (`27:017`) | MongoDB (`27:017`) | Aligned |

---

## 2. Key Differences Identified & Resolved

### Discrepancy A: Database Connection Alignment
* **Local Configuration**: Connected to `leadsrubix-migrate-crm`, which contained all seeded screens, permissions, sidebar menus, and user profiles.
* **Live Configuration (Old)**: The live server's `.env` file pointed to `leadrubix-crm`—a blank database containing no configuration parameters or data.
* **Resolution**: Updated the live server's `.env` to point to `leadsrubix-migrate-crm` and reloaded the PM2 environment.

### Discrepancy B: Screen Fields Seeding (Unique Index Crash)
* **Local Configuration**: Screen Field validation worked correctly, showing all options in tables.
* **Live Configuration (Old)**: The live database had an outdated unique index `idx_screen_field_unique` set on camelCase keys `{ screenId, fieldKey }` instead of the database-level snake_case fields `{ screen_id, field_key }`. This caused duplicate key errors (`{ screenId: null, fieldKey: null }`) on startup, preventing the seeder from populating screen fields.
* **Resolution**: Dropped the legacy index on the live server, allowing the backend to correctly recreate the index on the snake_case keys and seed all screen fields (such as `configApi`).

### Discrepancy C: CI/CD Pipeline Mechanism
* **Local/Codebase (Old)**: A legacy GitLab pipeline (`.gitlab-ci.yml`) was used, connected to a self-hosted runner on EC2.
* **New Configuration**: Removed the GitLab dependency entirely and replaced it with a GitHub Actions workflow (`deploy.yml`) restricted to the `prod` branch using repository secrets (`SSH_PRIVATE_KEY` and `EC2_HOST`).

---

## 3. Database Synchronization Summary
The local database `leadsrubix-migrate-crm` has been exported and restored on the live database. All collections (including roles, dropdown options, and screen fields) are now fully synchronized and identical.
