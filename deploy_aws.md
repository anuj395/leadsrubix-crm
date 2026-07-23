# Leads Rubix CRM: Complete End-to-End AWS Production & CI/CD Deployment Documentation

This document serves as the absolute single source of truth for the production deployment, infrastructure architecture, database setup, security hardening, monitoring, and automated CI/CD pipeline of the Leads Rubix CRM.

---

## 1. Branching & Deployment Architecture

The repository enforces a structured git-to-deployment workflow:

```
[Local Feature Branch]
        |
        ↓ (Push / Commit)
[GitLab: feature/<name>]
        |
        ↓ (Merge Request)
[GitLab: dev_anuj]  ----> Triggers: Install & Typecheck/Build Validation
        |
        ↓ (Merge Request / Approval)
[GitLab: prod]      ----> Triggers: AWS Auto Deploy
                                  |
                                  ↓ (GitLab CI/CD Runner SSH)
                            [AWS EC2 Server]
                                  |
                                  ├── ReactJS Frontend (Served by Nginx)
                                  └── NodeJS Backend (Managed by PM2)
```

---

## 2. Infrastructure Setup & Configurations

### AWS EC2 Resource Details
* **Region**: Asia Pacific (Mumbai) `ap-south-1`
* **Instance Type**: `t3.medium` (2 vCPUs, 4 GiB RAM)
* **Root Volume**: 30 GiB gp3 SSD (configured for general-purpose high I/O)
* **Instance Name**: `Leads-Rubix-CRM-Server`
* **Instance IP**: `13.232.163.144`
* **Private Key File**: [`leads-crm-key.pem`](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/leads-crm-key.pem) (stored in your local project workspace root).

### Security Group Inbound Rules (`leads-crm-sg`)
| Protocol | Port | Source | Purpose |
| :--- | :--- | :--- | :--- |
| **TCP** | `22` | `0.0.0.0/0` (Anywhere) | SSH login (GitLab pipeline & admin access) |
| **TCP** | `80` | `0.0.0.0/0` (Anywhere) | Public HTTP traffic (HTTP redirect/Certbot) |
| **TCP** | `443` | `0.0.0.0/0` (Anywhere) | Public HTTPS traffic (Client Web UI) |

---

## 3. Server Software Provisioning & Manual Setup

### A. Repository & Dependencies
Log in to the server using the private key:
```bash
ssh -i ./leads-crm-key.pem ubuntu@13.232.163.144
```

To configure Node.js, Git, pnpm, and PM2:
```bash
# Update local package definitions
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential

# Node.js 20.x setup
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Enable pnpm and install PM2 globally
sudo npm install -g pnpm pm2
```

Clone the repository into the `/home/ubuntu` directory:
```bash
git clone https://gitlab.com/dev3597/leads-rubix-migrate-crm.git /home/ubuntu/Leads-Rubix-CRM
sudo chown -R ubuntu:ubuntu /home/ubuntu/Leads-Rubix-CRM
```

### B. Directory Permissions
For Nginx (`www-data` user) to successfully read and serve your frontend static assets, run:
```bash
sudo chmod +x /home/ubuntu
sudo chmod -R o+r /home/ubuntu/Leads-Rubix-CRM
sudo find /home/ubuntu/Leads-Rubix-CRM -type d -exec chmod o+x {} +
```

---

## 4. Local Database Setup & Configuration

MongoDB is running self-hosted on the same EC2 instance to optimize resource limits and costs.

### A. Installation (Ubuntu 24.04 Noble using Jammy Repository)
```bash
sudo apt-get install -y gnupg

# Import the MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg --yes

# Create list file using Jammy target
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable Mongod system service
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
```

### B. Database Seeding & Data Initialization
The backend server (`src/index.js`) is configured with an **idempotent seeder** that runs automatically on start. It creates:
* **Super-Admin**: `info@leadsrubix.com` / `lead@1221`
* **Default Roles**: `superAdmin`, `admin`, `leadManager`, `teamLead`, `sales`.
* **Screens & Fields**: Automatically populates 23 screens and 650 permission items.
* **Sidebar Menus**: Automatically initializes Lead Distribution, Support, and Account menu configs.

---

## 5. Web Server Configuration (Nginx)

Nginx acts as the front-facing reverse proxy, handling static ReactJS assets and routing API requests to the backend API process.

Create a server configuration file under `/etc/nginx/sites-available/leads-crm`:
```nginx
server {
    listen 80;
    server_name yourdomain.com 13.232.163.144;

    # Static UI Bundle
    location / {
        root /home/ubuntu/Leads-Rubix-CRM/artifacts/web/dist/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy Routing
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site configuration and restart:
```bash
sudo ln -sf /etc/nginx/sites-available/leads-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

---

## 6. Environment Variables Configuration

### Backend Env Path: `/home/ubuntu/Leads-Rubix-CRM/artifacts/api-server/.env`
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/leadrubix-crm
JWT_SECRET=lead@1221_leads_secret_keys
JWT_EXPIRES_IN=7d
```

### Frontend Env Path: `/home/ubuntu/Leads-Rubix-CRM/artifacts/web/.env`
```env
VITE_API_URL=http://yourdomain.com/api
```

---

## 7. Domain & DNS Setup
1. Log in to your Domain Registrar (e.g., GoDaddy, Namecheap, AWS Route 53).
2. Go to **DNS Zone File Management**.
3. Add an **A Record**:
   * **Host/Name**: `@` (or subdomain like `crm`)
   * **Value/IP**: `13.232.163.144`
   * **TTL**: `600` (or default)
4. Add a **CNAME Record** (Optional):
   * **Host/Name**: `www`
   * **Value**: `yourdomain.com`

---

## 8. SSL Configuration (Let's Encrypt / Certbot)
After DNS propagation completes, install SSL on Nginx:
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Request and configure SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal cron
sudo certbot renew --dry-run
```
Certbot will automatically alter `/etc/nginx/sites-available/leads-crm` to listen on port `443` with SSL keys, redirecting port `80` requests to secure `https`.

---

## 9. PM2 Process Configuration
The backend server runs under PM2 control. 

* **Start API server**:
  ```bash
  pm2 start /home/ubuntu/Leads-Rubix-CRM/artifacts/api-server/src/index.js --name "api-server"
  pm2 save
  ```
* **Auto-start on boot**:
  ```bash
  pm2 startup systemd
  # (Copy and run the output command generated by pm2 in the terminal)
  ```

---

## 10. Continuous Integration & Deployment (GitLab CI/CD)

The CI/CD pipeline automates verification on `dev_anuj` and deploys directly to AWS on `prod`.

### GitLab CI/CD Variables Config
Under **Settings > CI/CD > Variables**:
1. `EC2_HOST` = `13.232.163.144`
2. `SSH_PRIVATE_KEY` = *(Content of `leads-crm-key.pem`)*

### Pipeline Configuration: `.gitlab-ci.yml`
```yaml
image: node:20-alpine

stages:
  - install
  - validate
  - build
  - deploy

variables:
  PNPM_HOME: ".pnpm-store"
  PORT: "3000"

cache:
  key:
    files:
      - pnpm-lock.yaml
  paths:
    - .pnpm-store
    - node_modules/

before_script:
  - corepack enable
  - corepack prepare pnpm@latest --activate
  - pnpm config set store-dir .pnpm-store

install_dependencies:
  stage: install
  script:
    - pnpm install --frozen-lockfile
  rules:
    - if: $CI_COMMIT_BRANCH == "dev_anuj"
    - if: $CI_COMMIT_BRANCH == "prod"

typecheck:
  stage: validate
  script:
    - pnpm run typecheck
  rules:
    - if: $CI_COMMIT_BRANCH == "dev_anuj"
    - if: $CI_COMMIT_BRANCH == "prod"

build:
  stage: build
  script:
    - pnpm run build
  rules:
    - if: $CI_COMMIT_BRANCH == "dev_anuj"
    - if: $CI_COMMIT_BRANCH == "prod"

deploy_prod:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk update && apk add openssh-client git
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan -H "$EC2_HOST" >> ~/.ssh/known_hosts
  script:
    - ssh ubuntu@$EC2_HOST "cd /home/ubuntu/Leads-Rubix-CRM && git checkout prod && git pull origin prod && pnpm install --no-frozen-lockfile && PORT=3000 pnpm run build && pm2 restart api-server"
  rules:
    - if: $CI_COMMIT_BRANCH == "prod"
```

---

## 11. Backup & Recovery Procedures
To set up automated daily MongoDB backups:

1. Create a script `/home/ubuntu/backup_db.sh`:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/home/ubuntu/backups/$(date +%F)"
   mkdir -p "$BACKUP_DIR"
   mongodump --db leadrubix-crm --out "$BACKUP_DIR"
   # Keep only last 7 days of backups
   find /home/ubuntu/backups/* -type d -ctime +7 -exec rm -rf {} +
   ```
2. Configure permissions: `chmod +x /home/ubuntu/backup_db.sh`.
3. Add a daily cron job using `crontab -e`:
   ```cron
   0 2 * * * /home/ubuntu/backup_db.sh
   ```
4. **Recovery command**:
   ```bash
   mongorestore --db leadrubix-crm /home/ubuntu/backups/<date_folder>/leadrubix-crm
   ```

---

## 12. Monitoring & Log Locations

* **Nginx HTTP Access Logs**: `/var/log/nginx/access.log`
* **Nginx Error Logs**: `/var/log/nginx/error.log`
* **PM2 Logs**: `pm2 logs api-server`
* **MongoDB logs**: `sudo tail -n 50 /var/log/mongodb/mongod.log`
* **PM2 Monitoring Dashboard**: `pm2 monit`

---

## 13. Security Hardening Configurations
1. **Firewall (UFW)**: Allow only required ports.
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
2. **Passwordless SSH Only**:
   * Open SSH config: `sudo nano /etc/ssh/sshd_config`
   * Set `PasswordAuthentication no`
   * Reload daemon: `sudo systemctl reload sshd`
