# AWS Deployment & CI/CD Auto-Deploy Guide

This guide documents the active production deployment details, branching workflow, and automated CD pipeline.

---

## 1. Active Infrastructure Status

* **Status**: **LIVE & ACTIVE**
* **Deployment Target**: **AWS EC2** (Mumbai - `ap-south-1`)
* **Public Server IP**: `13.232.163.144`
* **Public Web URL**: [http://13.232.163.144/](http://13.232.163.144/)
* **Instance Type**: `t3.medium` (2 vCPUs, 4 GiB RAM)
* **Local Database**: MongoDB Server Community v7.0
* **Process Manager**: PM2 running `api-server`
* **Static Web Server**: Nginx serving `/home/ubuntu/Leads-Rubix-CRM/artifacts/web/dist/public`

---

## 2. Branching & Deployment Architecture

```
[Local Feature Branch]
        |
        ↓ (Push / Commit)
[GitHub: feature/<name>]
        |
        ↓ (Merge Request / Pull Request)
[GitHub: dev_anuj]
        |
        ↓ (Merge Request / Approval)
[GitHub: prod]      ----> Triggers: AWS Auto Deploy (GitHub Actions)
                                  |
                                  ↓ (GitHub Actions Runner SSH)
                            [AWS EC2 Server]
                                  |
                                  ├── ReactJS Frontend (Served by Nginx)
                                  └── NodeJS Backend (Managed by PM2)
```

---

## 3. GitHub Actions Secrets Configuration
The following environment secrets have been successfully registered under **Settings > Secrets and variables > Actions** in your GitHub repository:
* `EC2_HOST`: `13.232.163.144`
* `SSH_PRIVATE_KEY`: Content of the generated `leads-crm-key.pem` key.

---

## 4. Key Management & SSH Access
* Your private SSH key is downloaded and configured in your workspace root: [`leads-crm-key.pem`](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/leads-crm-key.pem).
* To log in manually to the server:
  ```bash
  ssh -i ./leads-crm-key.pem ubuntu@13.232.163.144
  ```
