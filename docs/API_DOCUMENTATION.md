# API Documentation

This document lists the primary REST API endpoints available in the backend server.

## 1. Authentication
* **`POST /api/auth/signup`**:
  * Registers a new organization administrator.
* **`POST /api/auth/login`**:
  * Authenticates users and returns a JWT token.

---

## 2. Dynamic Screens & Config
* **`POST /api/screens/resolve`**:
  * Resolves dynamic form field configs for the current screen based on the user's role and industry. Supports bypass authentication for `organization` signup.

---

## 3. Organizations Management
* **`GET /api/organizations`**:
  * Returns a paginated list of all active organizations (Super Admin only).
* **`POST /api/organizations`**:
  * Creates a new organization and provisions a default administrator account.
