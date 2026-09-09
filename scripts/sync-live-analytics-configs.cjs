#!/usr/bin/env node
/**
 * scripts/sync-live-analytics-configs.cjs
 *
 * One-shot database runner that synchronizes dynamic dashboard industry templates
 * into PostgreSQL analytics_configs table, cleanly populating all 7 industry baselines
 * and clearing out legacy/orphaned baseline configurations while preserving tenant overrides.
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
require('dotenv').config({ path: envPath });
const { connect } = require(path.join(apiServerDir, 'src/db'));
require(path.join(apiServerDir, 'src/models/industryModel'));
require(path.join(apiServerDir, 'src/models/analyticsConfigModel'));
const { seedAnalyticsConfig } = require(path.join(apiServerDir, 'src/seed'));

async function main() {
  console.log('🚀 Connecting to PostgreSQL...');
  await connect();

  const Industry = pgMongoose.model('Industry');
  const AC = pgMongoose.model('AnalyticsConfig');

  console.log('📦 Executing seedAnalyticsConfig()...');
  await seedAnalyticsConfig();

  console.log('\n🔍 Verifying baseline configurations per industry:');
  const industries = await Industry.find({}).lean();
  for (const ind of industries) {
    const indIdStr = String(ind._id);
    const cfg = await AC.findOne({
      $or: [
        { industry_id: indIdStr },
        { industryId: indIdStr },
        { industry_id: ind.code },
        { industryId: ind.code }
      ],
      $and: [
        { $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }] },
        { $or: [{ organizationId: null }, { organizationId: { $exists: false } }, { organizationId: '' }] }
      ]
    }).lean();

    console.log(`  ✓ Industry: ${ind.name.padEnd(20)} (${ind.code}) | DocID: ${cfg?._id} | Tabs: ${cfg?.tabs?.length || 0} tabs [${cfg?.tabs?.map(t => t.label).join(', ') || 'NONE'}]`);
  }

  const totalConfigs = await AC.countDocuments({});
  console.log(`\n✅ Finished sync. Total analytics_configs documents in DB: ${totalConfigs}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
