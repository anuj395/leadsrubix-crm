module.exports = {
  apps: [
    {
      name: 'leadsrubix-api-staging',
      cwd: './artifacts/api-server',
      script: 'src/index.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 8080,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/leadsrubix_crm',
        FRONTEND_URL: 'https://staging-web.leadsrubix.com',
        JWT_SECRET: 'leadsrubix_enterprise_jwt_secret_key_2026'
      }
    }
  ]
};
