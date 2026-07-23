# Leads Rubix CRM - Complete Monorepo Documentation

Welcome to the **Leads Rubix CRM** repository. This project is structured as a pnpm monorepo containing the API backend server and the web client applications.

---

## 1. Project Documentation Sitemap

For comprehensive guides on setup, deployment, and architecture, refer to the following documents:
* **Production Deployment**: [`deploy_aws.md`](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/deploy_aws.md) — Comprehensive guide on AWS EC2 (`t3.medium`), Nginx, PM2, local MongoDB setup, domain binding, Let's Encrypt SSL, backup automation, and UFW firewall rules.
* **Backend API Documentation**: [`artifacts/api-server/README.md`](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/artifacts/api-server/README.md) — Details on running the Express API server locally, JWT authentication, and API controllers.
* **Authentication/Authorization Architecture**: [`artifacts/api-server/ARCHITECTURE.md`](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/artifacts/api-server/ARCHITECTURE.md) — Detailed specifications on superAdmin bootstrapping, user signup/login flows, and role-action mapping.

---

## 2. Monorepo Workspace Structure

```
Leads-Rubix-CRM/
  ├── .agents/                 # Workspace customization and agent rules
  ├── .gitlab-ci.yml           # GitLab CI/CD Pipeline specifications
  ├── deploy_aws.md            # AWS production deployment & security documentation
  ├── leads-crm-key.pem        # Generated private SSH key for AWS EC2 instance
  ├── package.json             # Root monorepo workspace definition
  ├── pnpm-workspace.yaml      # pnpm workspace configurations
  └── artifacts/
        ├── api-server/        # Node.js/Express Backend API server
        └── web/               # ReactJS/Vite Frontend Web client
```

---

## 3. Local Development Setup

To run the entire stack locally:

### Prerequisites
* **Node.js**: v20 or higher.
* **pnpm**: Fast, disk-space-efficient package manager.
* **MongoDB**: Running locally on port `27017`.

### Getting Started
1. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```
2. **Configure Environment Variables**:
   * Create an `.env` file in `artifacts/api-server/.env`:
     ```env
     PORT=3001
     MONGO_URI=mongodb://localhost:27017/leadrubix-crm
     JWT_SECRET=your_jwt_secret_here
     JWT_EXPIRES_IN=7d
     ```
   * Create an `.env` file in `artifacts/web/.env`:
     ```env
     VITE_API_URL=http://localhost:3001/api
     ```
3. **Run the Development Server**:
   * To start both the backend API and frontend Vite server concurrently:
     ```bash
     pnpm run dev
     ```
   * To verify compile-time type-safety:
     ```bash
     pnpm run typecheck
     ```

---

## 4. GitLab Branching & Git Workflow

All development work must adhere to the following git workflow rules:

* **Primary Branch**: `main`
* **Development Branch**: `dev_anuj` (Target for local integrations and testing)
* **Production Release Branch**: `prod` (Triggers automatic AWS auto-deploy)

### Branching Rules
1. **Direct Pushes Restricted**: Pushing code directly to the `dev_anuj` and `prod` branches is restricted. All changes must be pushed to a feature branch and merged via a GitLab Merge Request (MR).
2. **Feature Branches**: Branch off from `dev_anuj` using format `feature/<feature-name>`.
3. **Deployment Trigger**: Merging changes into the `prod` branch automatically initiates the GitLab CD pipeline to validate and deploy code directly onto the live AWS server.
