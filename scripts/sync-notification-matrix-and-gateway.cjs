#!/usr/bin/env node
/**
 * scripts/sync-notification-matrix-and-gateway.cjs
 *
 * Synchronizes and repairs WhatsApp gateway configurations and notification matrix rules
 * in PostgreSQL. Ensures verified WHAPI platform gateway is active and client tenants
 * have all channels (WhatsApp, Email, Push, In-App) properly enabled.
 */

const path = require('path');
const apiServerDir = path.join(__dirname, '../artifacts/api-server');
const pgMongoose = require(path.join(apiServerDir, 'src/db/pgMongoose'));
const mongoosePath = require.resolve('mongoose', { paths: [apiServerDir] });
require.cache[mongoosePath] = {
  id: mongoosePath,
  filename: mongoosePath,
  loaded: true,
  exports: pgMongoose,
};

const envPath = process.env.ENV_FILE || path.join(apiServerDir, '.env');
try {
  const dotenv = require(require.resolve('dotenv', { paths: [apiServerDir] }));
  dotenv.config({ path: envPath });
} catch (e) {
  // dotenv might be injected by node --env-file
}
const { connect } = require(path.join(apiServerDir, 'src/db'));

require(path.join(apiServerDir, 'src/models/whatsappConfigModel'));
require(path.join(apiServerDir, 'src/models/notificationMatrixRuleModel'));
require(path.join(apiServerDir, 'src/models/organizationModel'));

const { DEFAULT_MATRIX_RULES, STANDARD_EVENTS } = require(path.join(apiServerDir, 'src/services/notificationDefaults'));

async function main() {
  console.log('🚀 Connecting to PostgreSQL database...');
  await connect();

  const WhatsAppConfig = pgMongoose.model('WhatsAppConfig');
  const NotificationMatrixRule = pgMongoose.model('NotificationMatrixRule');

  // =========================================================================
  // 1. REPAIR & CONSOLIDATE WHATSAPP CONFIGURATIONS
  // =========================================================================
  console.log('\n📱 Step 1: Consolidating WhatsApp Gateway Configs...');

  // Delete obsolete / broken null-org records
  const obsoleteIds = ['6a66f5a7fb5d173a6a4ee39e', '6aa2869700005db2eee32d96', '6aa0015800002eaf32204463'];
  for (const obsId of obsoleteIds) {
    const deleted = await WhatsAppConfig.findByIdAndDelete(obsId);
    if (deleted) {
      console.log(`  ✓ Removed obsolete null-org config: ${obsId}`);
    }
  }

  // Ensure canonical universal config (null org) has active WHAPI
  let universalConfig = await WhatsAppConfig.findOne({
    $or: [{ organization_id: null }, { organizationId: null }]
  });

  const universalData = {
    organization_id: null,
    organizationId: null,
    use_custom_api: false,
    wapi: {
      active: true,
      wapi_url: 'https://gate.whapi.cloud',
      wapi_token: 'OV27q3a1QL7Kv1YizZisCHMxAwp2lk7O',
      incoming_json: '{\n  "Customer Name": "customer_name",\n  "Contact Number": "contact_no",\n  "Alternate Number": "alternate_no",\n  "Country Code": "country_code",\n  "Lead Type": "lead_type",\n  "Email": "email",\n  "Lead Source": "lead_source",\n  "Organization Name": "organizationName",\n  "Message": "Hii dear"\n}',
      transfer_json: '{\n  "Customer Name": "customer_name",\n  "Contact Number": "contact_no",\n  "Alternate Number": "alternate_no",\n  "Country Code": "country_code",\n  "Lead Type": "lead_type",\n  "Email": "email",\n  "Lead Source": "lead_source",\n  "Organization Name": "organizationName",\n  "Message": "Hi abcd"\n}'
    },
    simply: { active: false, access_token: '' },
    chat_simplified: { active: false, api_key: '' },
    notify_assigned_agent: true,
    notify_admin: true,
    notify_customer_welcome: false
  };

  if (universalConfig) {
    Object.assign(universalConfig, universalData);
    await universalConfig.save();
    console.log(`  ✓ Updated canonical Universal WhatsApp Config: ${universalConfig._id}`);
  } else {
    universalConfig = await WhatsAppConfig.create(universalData);
    console.log(`  ✓ Created canonical Universal WhatsApp Config: ${universalConfig._id}`);
  }

  // Update client organization zu2arMdOBVxoE0hqfMEo (Propadd Realtech Pvt Ltd)
  const clientOrgId = 'zu2arMdOBVxoE0hqfMEo';
  let clientConfig = await WhatsAppConfig.findOne({
    $or: [{ organization_id: clientOrgId }, { organizationId: clientOrgId }]
  });

  if (clientConfig) {
    clientConfig.use_custom_api = false;
    clientConfig.wapi = {
      active: true,
      wapi_url: 'https://gate.whapi.cloud',
      wapi_token: 'OV27q3a1QL7Kv1YizZisCHMxAwp2lk7O'
    };
    clientConfig.notify_assigned_agent = true;
    clientConfig.notify_admin = true;
    await clientConfig.save();
    console.log(`  ✓ Updated client org ${clientOrgId} WhatsApp Config with verified WHAPI gateway`);
  }

  // =========================================================================
  // 2. SEED GLOBAL DEFAULT NOTIFICATION MATRIX RULES
  // =========================================================================
  console.log('\n🌐 Step 2: Seeding Global Universal Notification Matrix Rules...');
  for (const defRule of DEFAULT_MATRIX_RULES) {
    const existingGlobal = await NotificationMatrixRule.findOne({
      organization_id: null,
      event_key: defRule.event_key
    });

    if (!existingGlobal) {
      await NotificationMatrixRule.create({
        organization_id: null,
        event_key: defRule.event_key,
        event_label: defRule.event_label,
        is_enabled: defRule.is_enabled,
        routing: defRule.routing
      });
      console.log(`  ✓ Seeded global rule: ${defRule.event_key}`);
    } else {
      existingGlobal.routing = defRule.routing;
      existingGlobal.is_enabled = defRule.is_enabled;
      await existingGlobal.save();
      console.log(`  ✓ Synchronized global rule: ${defRule.event_key}`);
    }
  }

  // =========================================================================
  // 3. REPAIR CLIENT TENANT MATRIX RULES (zu2arMdOBVxoE0hqfMEo)
  // =========================================================================
  console.log(`\n🏢 Step 3: Repairing Matrix Rules for Client Tenant (${clientOrgId})...`);
  for (const defRule of DEFAULT_MATRIX_RULES) {
    const existingTenantRule = await NotificationMatrixRule.findOne({
      $or: [{ organization_id: clientOrgId }, { organizationId: clientOrgId }],
      event_key: defRule.event_key
    });

    const activeRouting = {
      assigned_agent: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: true, in_app: true }
      },
      team_lead: {
        enabled: true,
        channels: { whatsapp: false, email: true, push: true, in_app: true }
      },
      org_admin: {
        enabled: true,
        channels: { whatsapp: true, email: true, push: false, in_app: true },
        override_phone: '',
        override_email: ''
      },
      customer: defRule.routing?.customer || { enabled: false, channels: { whatsapp: false, email: false } }
    };

    if (existingTenantRule) {
      existingTenantRule.is_enabled = true;
      existingTenantRule.routing = activeRouting;
      await existingTenantRule.save();
      console.log(`  ✓ Updated tenant rule: ${defRule.event_key} (WhatsApp + Email + Push + Bell ACTIVE)`);
    } else {
      await NotificationMatrixRule.create({
        organization_id: clientOrgId,
        event_key: defRule.event_key,
        event_label: defRule.event_label,
        is_enabled: true,
        routing: activeRouting
      });
      console.log(`  ✓ Created tenant rule: ${defRule.event_key} (WhatsApp + Email + Push + Bell ACTIVE)`);
    }
  }

  // =========================================================================
  // 4. VERIFY RESULTS
  // =========================================================================
  console.log('\n🔍 Step 4: Verification of Repaired Configurations:');
  const allConfigs = await WhatsAppConfig.find({}).lean();
  console.log(`Total WhatsApp configs: ${allConfigs.length}`);
  for (const c of allConfigs) {
    console.log(`  - Config ID: ${c._id} | Org: ${c.organization_id || 'GLOBAL UNIVERSAL'} | WAPI Active: ${c.wapi?.active} | Token: ${c.wapi?.wapi_token ? c.wapi.wapi_token.slice(0, 10) + '...' : 'NONE'}`);
  }

  const tenantRules = await NotificationMatrixRule.find({
    $or: [{ organization_id: clientOrgId }, { organizationId: clientOrgId }]
  }).lean();
  console.log(`\nClient Org (${clientOrgId}) Active Matrix Rules (${tenantRules.length} events):`);
  for (const r of tenantRules) {
    const agWA = r.routing?.assigned_agent?.channels?.whatsapp ? 'ON' : 'OFF';
    const agEM = r.routing?.assigned_agent?.channels?.email ? 'ON' : 'OFF';
    const adWA = r.routing?.org_admin?.channels?.whatsapp ? 'ON' : 'OFF';
    console.log(`  - Event: ${r.event_key.padEnd(20)} | Agent WA: ${agWA} | Agent Email: ${agEM} | Admin WA: ${adWA}`);
  }

  console.log('\n✅ All database repairs and syncs completed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Sync Error:', err);
  process.exit(1);
});
