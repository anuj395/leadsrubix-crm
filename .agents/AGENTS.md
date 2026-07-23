# Project Customization Rules

## GitHub Branching Workflow
* The `main` branch is the primary branch.
* The `prod` and `dev_anuj` branches are created from the `main` branch.
* All development work should be done in a feature branch branched off from `dev_anuj`.
* Pushing must be done manually via the terminal. Pull Requests must not be created automatically.

## Feature Branching Workflow
* Developers should create feature branches from `dev_anuj`.
* Structure: `dev_anuj` → `feature/<feature-name>`.
* **No Direct Pulls / Auto-PRs**: Changes must NOT be automatically pulled into the feature branch by agents, and PRs must NOT be created automatically.
* **Manual PR Creation**: The developer pushes the code from the terminal and manually opens/merges the PR through the GitHub Web UI.

## Continuous Deployment (CD) Workflow
```
dev_anuj
    |
    ↓
Pull Request (Manual on GitHub)
    |
    ↓
prod branch
    |
    ↓
AWS Auto Deploy (GitHub Actions)
    |
    ├── ReactJS Frontend (Served by Nginx)
    └── NodeJS Backend (Managed by PM2)
```
* Merging changes into the `prod` branch manually on GitHub automatically triggers the GitHub Actions workflow deploy stage, deploying the backend and frontend to the AWS EC2 server.
