# AWS Deployment & CI/CD Auto-Deploy Guide

This guide documents the branching workflow, manual EC2 configuration, and continuous deployment (CD) automation setup.

---

## 1. Branching & Deployment Architecture

```
[Local Feature Branch]
        |
        ↓ (Push)
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

## 2. Manual EC2 Server Setup (One-Time)
Connect to your EC2 instance via SSH and run:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install pnpm & PM2 globally
sudo npm install -g pnpm pm2
```

Clone the repository and install the dependencies:
```bash
git clone <your-gitlab-repo-url> /home/ubuntu/Leads-Rubix-CRM
cd /home/ubuntu/Leads-Rubix-CRM
pnpm install --frozen-lockfile
```

---

## 3. Configuring Environment Variables

### A. Backend Configuration
Create `.env` in `/home/ubuntu/Leads-Rubix-CRM/artifacts/api-server/.env`:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/leadrubix-crm
JWT_SECRET=your_jwt_signing_secret_here
JWT_EXPIRES_IN=7d
```

### B. Frontend Configuration
Create `.env` in `/home/ubuntu/Leads-Rubix-CRM/artifacts/web/.env`:
```env
VITE_API_URL=http://your-ec2-domain-or-ip/api
```

---

## 4. Setup PM2 & Nginx

### A. Start the Backend API using PM2
```bash
pm2 start /home/ubuntu/Leads-Rubix-CRM/artifacts/api-server/src/index.js --name "api-server"
pm2 save
pm2 startup
```

### B. Configure Nginx
Install Nginx:
```bash
sudo apt install nginx -y
```

Create config `sudo nano /etc/nginx/sites-available/leads-crm`:
```nginx
server {
    listen 80;
    server_name your-ec2-domain-or-ip;

    # Frontend Static Bundle
    location / {
        root /home/ubuntu/Leads-Rubix-CRM/artifacts/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and reload:
```bash
sudo ln -s /etc/nginx/sites-available/leads-crm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

---

## 5. Setting Up GitLab CI/CD Auto-Deploy

To authorize the GitLab CI/CD runner to deploy automatically on pushes to the `prod` branch, configure these variables in **GitLab UI** under **Settings > CI/CD > Variables**:

1. **`SSH_PRIVATE_KEY`**:
   * The private SSH key (`id_rsa` or similar) that matches a public key configured in `/home/ubuntu/.ssh/authorized_keys` on your EC2 instance.
2. **`EC2_HOST`**:
   * The public IP address or DNS domain name of your EC2 instance.
