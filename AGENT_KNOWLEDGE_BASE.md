# 📚 LEADS RUBIX CRM — COMPLETE SYSTEM KNOWLEDGE BASE & RUNBOOK

This document serves as the permanent, comprehensive knowledge repository for Leads Rubix Multi-Tenant Enterprise CRM. Any human developer or autonomous agent reading this document gains complete insight into the platform's architectural, operational, and domain logic.

---

## 1. High-Level Architecture Overview

Leads Rubix CRM is a multi-tenant enterprise system supporting 7 industry verticals, featuring:
* **Backend API Engine (`artifacts/api-server`)**: Node.js, Express, PostgreSQL (`pg`), Redis, MongoDB, and MySQL. Provides REST endpoints, multi-tenant isolation, cron automation, lead routing, and omnichannel notifications.
* **Web Admin Portal (`artifacts/web`)**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons. Includes 44 administrative screens, dynamic screen customizer, omnichannel notification matrix, lead reassign rules, and third-party portal integrations.
* **Executive Mobile App (`artifacts/app`)**: React Native, Expo, TypeScript, Executive Navy (`#272944`) theme. Delivers real-time action cockpits, telecaller quick-action buttons (Call, WhatsApp, Deals), agenda management, Deals Kanban, and native call logging.

---

## 2. Multi-Tenancy & Template Propagation Engine

The system uses organization-level data partitioning:
* **Organization ID**: Every tenant record is tagged with `organization_id` (UUID).
* **Master Templates**: Global industry vertical templates have `organization_id = NULL`.
* **Workspace Cloner (`workspaceCloner.js`)**: When a new organization registers, master templates for that industry are cloned and assigned to the new `organization_id`.
* **Dynamic Screen Customizer (`syncScreenFields.js`)**: Admins can customize screens, fields, and dropdowns. Tenant custom fields inherit from the industry template while allowing organization-specific overrides.

---

## 3. The 7 Supported Industry Verticals

| ID | Industry Vertical | Primary Domain Entities & Vocabulary |
|---|---|---|
| `temp0001` | **Real Estate** | Projects, Towers, Units, Site Visits, Property Types (Residential/Commercial/Land), Property Subtypes (Apartment/Villa/Penthouse/Office/Plot). |
| `temp0002` | **B2B & Corporate Services** | Accounts, Key Accounts, Contracts, SLA Requirements, Proposal Deliverables, Deal Value. |
| `temp0003` | **Healthcare & Medical Clinic** | Doctors, Clinic Branches, Specialties, Consultation Dates, Medical History, Treatments. |
| `temp0004` | **Education & Admissions** | Courses, Programs, Intake Batches, Campus, Academic Leads, Parent Consultations. |
| `temp0005` | **Financial Services & Wealth** | AUM, Portfolios, Risk Tolerance, Wealth Advisory, Investment Objectives. |
| `temp0006` | **IT & Technology Services** | Tech Stacks, SOW, Sprints, Retainers, Milestones, Technical Scoping. |
| `temp0007` | **Manufacturing & Industrial** | Product Catalogs, MOQ, Supply Chain, Delivery Lead Times, Bulk Quotes. |

---

## 4. Omnichannel Notification Engine

The CRM provides automated event-driven notifications across 4 delivery channels:
* **WhatsApp**: WhatsApp Web.js Gateway with live QR authorization (`/api/whatsapp/qr`).
* **Email**: SMTP dispatch via Gmail SSL (`info@leadsrubix.com`, Port 465).
* **SMS**: HTTP SMS Gateway.
* **In-App**: Notification hub with unread counts and direct link routing.

### 12 Supported CRM Lifecycle Events:
1. `lead.created`: Fresh lead created / ingested from portal.
2. `lead.assigned`: Lead routed to sales telecaller.
3. `lead.transferred`: Lead reassigned to another agent.
4. `lead.stage_changed`: Lead stage updated (e.g. In Discussion ➔ Site Visit Scheduled).
5. `task.reminder`: Scheduled follow-up / task reminder.
6. `task.sla_breach`: Unattended lead exceeding SLA window.
7. `customer.welcome`: Automated welcome message to customer.
8. `customer.reply`: Customer inbound response notification.
9. `deal.won`: Deal closed won celebration & commission logging.
10. `deal.lost`: Deal lost post-mortem and reason audit.
11. `payment.received`: Payment or booking token receipt confirmed.
12. `team.daily_digest`: Morning agenda and pending tasks digest.

---

## 5. Automated Crons & Background Workers

The backend boots 3 automated background crons on server startup:
1. **`startLeadRotationCron`**: Checks for unattended leads exceeding configured SLA timeouts (e.g. 15m, 30m, 60m), verifies agent working hours and company holidays, and rotates leads to the next eligible agent in the distribution pool.
2. **`startTaskReminderCron`**: Scans for upcoming scheduled follow-ups, calls, and site visits, dispatching omnichannel reminders to agents.
3. **`startSubscriptionCron`**: Monitors tenant subscription expiration dates and sends renewal alerts.

---

## 6. Complete Environment Variables & Credentials Registry

### Backend API Server (`artifacts/api-server/.env`):
```env
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:22333,https://web.leadsrubix.com,https://app.leadsrubix.com
JWT_SECRET=leadsrubix_enterprise_jwt_secret_key_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadsrubix_crm

# AWS IAM & S3 Bucket (Production)
AWS_ACCESS_KEY_ID=AKIA4KHGJPGZTLWMCIEF
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=ap-south-1
AWS_S3_BUCKET=leadsrubix-crm-media-uploads

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=info@leadsrubix.com
SMTP_PASS=jucupgkwmniheujp

# Facebook Webhook Verification
FB_VERIFY_TOKEN=EQ1bdEHo4XI4TxhD2EOps

# Razorpay Payments
RAZORPAY_KEY_ID=rzp_test_TWla4Tl3ghuDDM
RAZORPAY_KEY_SECRET=cHrUvAOrAaL8yN59yoBWnKpF
```

### Web Application (`artifacts/web/.env`):
```env
VITE_API_BASE_URL=https://api1.leadsrubix.com
VITE_APP_NAME=LeadsRubix
VITE_ALLOW_DEMO_FALLBACK=false
```

---

## 7. Cloud Staging & Production Deployment Setup

### Live Production Endpoints:
* **Production API**: `https://api1.leadsrubix.com` (Reverse proxied via Ubuntu Nginx)
* **Production Web App**: `https://web.leadsrubix.com`
* **Production Deployment Branch**: `prod` (GitHub: `origin/prod`)
* **Development Branch**: `dev_clinic` (GitHub: `origin/dev_clinic`)

### Staging Deployment Options:
1. **Docker Compose Staging**:
   ```bash
   docker-compose -f docker-compose.staging.yml up -d --build
   ```
2. **PM2 Process Manager**:
   ```bash
   pm2 start ecosystem.staging.config.js --env staging
   ```
