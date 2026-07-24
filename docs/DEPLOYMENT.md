# Deployment & Operations Guide

This document covers deployment configurations, manual server access, and automated pipelines.

## 1. Hosting Environment
* **Platform**: AWS EC2 instance (`13.232.163.144`).
* **Process Manager**: PM2 running backend processes.
* **Web Server**: Nginx hosting static frontend assets.
* **Database**: MongoDB running locally on the instance.

## 2. Automated deployment (GitHub Actions)
* **Trigger branch**: `prod`
* **Workflow**: The `.github/workflows/deploy.yml` runs when a pull request is merged into `prod`. It SSHs into the server, checks out the code, pulls the latest changes, runs `pnpm install`, builds the client, and restarts PM2.

## 3. SSH manual access
```bash
ssh -i ./leads-crm-key.pem ubuntu@13.232.163.144
```
