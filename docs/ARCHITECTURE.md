# System Architecture

This document describes the system architecture of the Leads Rubix CRM platform.

## 1. High-Level Architecture

The platform is designed as a modular Web Application consisting of a decoupled frontend client and a backend API server:

```
[React/Vite Frontend] <--- HTTP / REST ---> [Express/NodeJS Backend] <--- ODM ---> [MongoDB Database]
```

---

## 2. Component Design

### Frontend Client
* **Framework**: React.js with Vite builder.
* **Component Library**: Material UI (MUI).
* **State Management**: React Context / Hooks.
* **Forms System**: Configuration-driven dynamic form engine (`DynamicForm.tsx`).

### Backend API Server
* **Framework**: Node.js with Express.
* **Database Driver**: Mongoose ODM.
* **Security & Authentication**: JWT-based session tokens.
* **Routing**: Router modules grouped by domain (e.g. `authRoutes`, `organizationRoutes`).

---

## 3. Data Flow & Separation

* The frontend application communicates with the backend exclusively via JSON HTTP requests.
* Tenant isolation is enforced at the database level: non-super-admins can only query and modify documents belonging to their own `organizationId`.
