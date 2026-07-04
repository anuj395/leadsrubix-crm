# CRM Architecture Flow

This document describes the high-level authentication/authorization flow for the
backend, matching the diagram you attached.

1. **Super‑Admin creation**
   - A special `superAdmin` user is bootstrapped manually (or via `signup`).
   - Typically the first account is created with a known email (e.g. `admin@example.com`).
   - Only Super‑Admin can assign other admins or elevate roles.

2. **Signup**
   - New users can register using the `/api/auth/signup` endpoint.
   - Required fields: `email`, `password`, `role`.
   - Optional fields: `industryId` (string) — used to associate users with an industry or tenant.
   - The backend verifies the role is allowed and email is unique.
   - Passwords are hashed and a JWT is returned along with basic user info.

3. **Google login (OAuth)**
   - Optionally, clients can perform Google Sign-In on the frontend and send
the received OAuth token to `/api/auth/google` (not implemented yet—stubbed).
   - Backend would verify the token with Google, extract the email, and either
find or create a corresponding user, issuing a JWT the same way as normal login.

4. **Login**
   - Existing users call `/api/auth/login` with `email`/`password`.
   - On success they receive a JWT; this token encodes their `id` and `role`.

5. **Authorization**
   - Every protected request must include `Authorization: Bearer <token>`.
   - The `authenticate` middleware decodes and validates the token.
   - The `authorize([...roles])` middleware checks the user's role against a
whitelist for the route.

6. **Role hierarchy (logical, not enforced automatically)**
   - `superAdmin`
      - can create/modify `admin` accounts.
   - `admin`
      - can create/modify `leadManager` / `teamLead` / `sales`.
   - `leadManager` / `teamLead` / `sales`
      - limited to their own CRM activities (managed by additional routes).

7. **Route examples**
   - `POST /api/auth/signup` – everyone
   - `POST /api/auth/login` – everyone
   - `GET /api/users` – `admin` or higher (`superAdmin`)
   - `POST /api/users` – `admin` or higher (`superAdmin`)
   - Other resource routes can be further protected with specific roles.

> ⚠ The diagram is purely conceptual; the current implementation handles the
auth flows and role checking but does not enforce a strict "hierarchy"—that is
left to business logic elsewhere in the system.

You can extend this architecture by adding:

- Google OAuth integration (use `google-auth-library` or Passport.js)
- Administrative endpoints for changing user roles
- Email verification, password reset, etc.

This document should help you visualize the flow and translate it into code.
