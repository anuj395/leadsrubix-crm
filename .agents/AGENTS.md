# Project Customization Rules

## GitLab Branching Workflow
* The `main` branch is the primary branch.
* The `prod` and `dev_anuj` branches are created from the `main` branch.
* All development work should be done in the `dev_anuj` branch.
* Configure the Antigravity IDE pipeline to use the `dev_anuj` branch.
* Direct pushes to the `dev_anuj` and `prod` branches are restricted. Code must only be pushed to the `dev_anuj` branch when explicitly instructed to do so by the user. Until then, all development must remain local (or in a feature branch) and must not be pushed to `dev_anuj`.

## Feature Branching Workflow
* Developers should create feature branches from `dev_anuj`.
* Structure: `dev_anuj` → `feature/<feature-name>` → Merge Request → `dev_anuj`.

## Continuous Deployment (CD) Workflow
```
dev_anuj
    |
    ↓
Testing & Validation (GitLab CI)
    |
    ↓
Merge Request
    |
    ↓
prod branch
    |
    ↓
AWS Auto Deploy (GitLab CD)
    |
    ├── ReactJS Frontend (Served by Nginx)
    └── NodeJS Backend (Managed by PM2)
```
* Merging changes into the `prod` branch automatically triggers the GitLab CI/CD pipeline deploy stage, deploying the backend and frontend to the AWS EC2 server.
