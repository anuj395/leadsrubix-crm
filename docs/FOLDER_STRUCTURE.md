# Monorepo Folder Structure

This project is organized as a pnpm monorepo containing both the backend and frontend client workspaces.

```text
Leads-Rubix-CRM/
  ├── .agents/                 # Workspace customization and agent rules
  ├── docs/                    # Centralized project documentation
  ├── package.json             # Root monorepo workspace configurations
  └── artifacts/
        ├── api-server/        # Node.js/Express Backend API server
        │     ├── src/
        │     │    ├── controllers/ # Request controllers
        │     │    ├── middlewares/ # Express middlewares (auth, rbac)
        │     │    ├── models/      # Mongoose Database models
        │     │    └── routes/      # API Route definitions
        └── web/               # ReactJS/Vite Frontend Web client
              ├── src/
              │    ├── components/  # Shared global components
              │    ├── features/    # Module-specific pages and logic
              │    └── services/    # Frontend API integrations
```
