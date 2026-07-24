# Security Architecture

This document defines the security policies, token management, and data access isolation protocols.

## 1. Authentication
* Users authenticate using their email and password.
* Passwords are encrypted using bcrypt hashing before storage.
* Sessions are maintained via Json Web Tokens (JWT) sent in the HTTP `Authorization` header.

## 2. Authorization & RBAC
* Role-Based Access Control (RBAC) restricts access to sensitive endpoints.
* Roles are verified at the middleware level:
  ```javascript
  router.post('/organizations', authenticate, permit('superAdmin'), ctrl.create);
  ```

## 3. Data Isolation (Multi-Tenancy)
* Tenant isolation is enforced in all query controllers. Non-super-admins are restricted to loading and saving data associated with their own `organizationId`.
