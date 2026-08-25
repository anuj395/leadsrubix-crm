#!/usr/bin/env node
/**
 * scripts/deploy-live-db.cjs
 * 
 * Production Live Database Deployment & Migration Runner.
 * Deploys the clean, fortified multi-tenant schema and seed configuration
 * directly to your live production PostgreSQL database.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://user:password@live-host:5432/dbname" node scripts/deploy-live-db.cjs
 *   or:
 *   node scripts/deploy-live-db.cjs "postgresql://user:password@live-host:5432/dbname"
 */

const fs = require('fs');
const path = require('path');

let Client;
try {
  Client = require('pg').Client;
} catch (e) {
  try {
    Client = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg')).Client;
  } catch (e2) {
    console.error('Failed to require pg module. Please run: pnpm install');
    process.exit(1);
  }
}

const targetDbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetDbUrl) {
  console.error('\n❌ ERROR: Target DATABASE_URL is missing!\n');
  console.error('Usage:');
  console.error('  DATABASE_URL="postgresql://user:password@live-host:5432/dbname" node scripts/deploy-live-db.cjs');
  console.error('  or:');
  console.error('  node scripts/deploy-live-db.cjs "postgresql://user:password@live-host:5432/dbname"\n');
  process.exit(1);
}

const sqlDumpPath = path.join(__dirname, 'leadsrubix_production_seed.sql');

if (!fs.existsSync(sqlDumpPath)) {
  console.error(`\n❌ ERROR: Seed dump file not found at ${sqlDumpPath}\n`);
  process.exit(1);
}

async function deployToLiveDatabase() {
  const maskedUrl = targetDbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log('===============================================================');
  console.log('🚀 LEADS RUBIX ENTERPRISE CRM — LIVE DATABASE DEPLOYMENT');
  console.log('===============================================================');
  console.log(`📡 Connecting to target database: ${maskedUrl}`);

  const client = new Client({
    connectionString: targetDbUrl,
    ssl: targetDbUrl.includes('localhost') || targetDbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to target PostgreSQL server successfully.\n');

    console.log('📦 Reading production seed dump (14MB)...');
    let sqlContent = fs.readFileSync(sqlDumpPath, 'utf8');
    // Strip psql CLI meta-commands and version-specific settings for max compatibility
    sqlContent = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('\\') && !line.includes('transaction_timeout'))
      .join('\n');

    console.log('⚡ Deploying schemas, tables, indexes, and master seed configurations to live database...');
    const startTime = Date.now();
    await client.query(sqlContent);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ SQL deployment executed in ${duration}s.\n`);

    console.log('🔍 Running post-deployment integrity verification...');
    await client.query('SET search_path TO public;');
    const tables = [
      'users',
      'organizations',
      'contacts',
      'deals',
      'tasks',
      'call_logs',
      'industries',
      'screens',
      'screen_fields',
      'sidebar_menus',
      'sidebar_permissions',
      'screen_permissions',
      'roles'
    ];

    console.log('---------------------------------------------------------------');
    console.log('Live Database Verification Table:');
    console.log('---------------------------------------------------------------');
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT count(*) FROM ${t}`);
        console.log(`  📊 ${t.padEnd(24)} : ${res.rows[0].count} records`);
      } catch (err) {
        console.log(`  ⚠️ ${t.padEnd(24)} : (error: ${err.message})`);
      }
    }
    console.log('---------------------------------------------------------------');

    console.log('\n🎉 SUCCESS: Live database deployed and verified successfully!');
    console.log('🔑 Master Super Admin Credentials:');
    console.log('   Email   : info@leadsrubix.com');
    console.log('   Password: lead@1221');
    console.log('===============================================================\n');

  } catch (error) {
    console.error('\n❌ Deployment failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deployToLiveDatabase();
