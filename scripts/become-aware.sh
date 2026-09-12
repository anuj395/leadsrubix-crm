#!/usr/bin/env bash
set -e

# ==============================================================================
# 🧠 LEADS RUBIX CRM — AUTONOMOUS AGENT BOOTSTRAP & SELF-AWARENESS SCRIPT
# ==============================================================================
# This script provisions any new machine (macOS, Ubuntu, Debian, Linux) into a
# fully functional Leads Rubix CRM environment with zero manual configuration.
# ==============================================================================

echo "=============================================================================="
echo "🚀 LEADS RUBIX CRM — INITIATING ZERO-TOUCH AGENT BOOTSTRAP"
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# 1. Detect Operating System
OS="$(uname -s)"
echo "🖥️  Detected OS: ${OS}"

# 2. Check Node.js and pnpm
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required (v20+). Please install Node.js."
  exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js: ${NODE_VERSION}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "📦 Installing pnpm globally..."
  npm install -g pnpm
fi
PNPM_VERSION=$(pnpm -v)
echo "✅ pnpm: ${PNPM_VERSION}"

# 3. Ensure Environment Files are Provisioned
echo "⚙️  Provisioning Environment Configuration Files..."

cat << 'EOF' > "${ROOT_DIR}/artifacts/api-server/.env"
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:22333,https://web.leadsrubix.com,https://app.leadsrubix.com
JWT_SECRET=leadsrubix_enterprise_jwt_secret_key_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadsrubix_crm
AWS_ACCESS_KEY_ID=AKIA4KHGJPGZTLWMCIEF
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=ap-south-1
AWS_S3_BUCKET=leadsrubix-crm-media-uploads
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=info@leadsrubix.com
SMTP_PASS=jucupgkwmniheujp
FB_VERIFY_TOKEN=EQ1bdEHo4XI4TxhD2EOps
RAZORPAY_KEY_ID=rzp_test_TWla4Tl3ghuDDM
RAZORPAY_KEY_SECRET=cHrUvAOrAaL8yN59yoBWnKpF
EOF

cat << 'EOF' > "${ROOT_DIR}/artifacts/web/.env"
VITE_API_BASE_URL=https://api1.leadsrubix.com
VITE_APP_NAME=LeadsRubix
VITE_ALLOW_DEMO_FALLBACK=false
EOF

cat << 'EOF' > "${ROOT_DIR}/.env"
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:22333
JWT_SECRET=leadsrubix_dev_secret_key_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadsrubix_crm
AWS_ACCESS_KEY_ID=AKIA4KHGJPGZTLWMCIEF
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=ap-south-1
AWS_S3_BUCKET=leadsrubix-crm-media-uploads
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=info@leadsrubix.com
SMTP_PASS=jucupgkwmniheujp
FB_VERIFY_TOKEN=EQ1bdEHo4XI4TxhD2EOps
EOF

echo "✅ All environment configuration files successfully provisioned."

# 4. Install Dependencies Across Monorepo
echo "📦 Installing workspace dependencies across API, Web, and Mobile..."
pnpm install --no-frozen-lockfile

# 5. Run Verification Tests
echo "🧪 Running API Server Test Suite..."
pnpm --filter api-server test

echo "🏗️  Testing Web Production Build..."
pnpm --filter web build

echo "📱 Checking Mobile TypeScript Consistency..."
pnpm --filter app exec tsc --noEmit

echo "=============================================================================="
echo "🎉 SUCCESS: MACHINE IS 100% PROVISIONED AND SELF-AWARE!"
echo "You can now develop, run staging, or deploy anywhere."
echo "=============================================================================="
