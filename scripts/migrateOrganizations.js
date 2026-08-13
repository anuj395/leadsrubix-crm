// scripts/migrateOrganizations.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Connect to the local database
const mongoUri = 'mongodb://localhost:27017/leadsrubix-migrate-crm';

// Load Model Definition
require('../artifacts/api-server/src/models/organizationModel');
const Organization = mongoose.model('Organization');

async function runMigration() {
  console.log('[migration] Connecting to local MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('[migration] Connected successfully.');

  const sourceFile = path.join(__dirname, 'old_organizations.json');
  if (!fs.existsSync(sourceFile)) {
    console.error('[migration] Source file not found:', sourceFile);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const oldOrgs = Array.isArray(raw) ? raw : [raw];

  console.log(`[migration] Found ${oldOrgs.length} organization(s) to migrate.`);

  for (const old of oldOrgs) {
    const id = new mongoose.Types.ObjectId(old._id.$oid);
    
    // Build phone dialing code from contact code + number
    const contactCode = old.admin_contact_code || old.organization_mobile_code || '91';
    const contactNum = old.admin_contact_number || old.mobile_number || '';
    const formattedPhone = contactNum ? `+${contactCode} ${contactNum}` : '';

    const mapped = {
      _id: id,
      first_name: old.admin_first_name || '',
      last_name: old.admin_last_name || '',
      contact_no: formattedPhone,
      email_id: old.email_id || old.admin_email_id || '',
      country: old.country || 'India',
      state: old.state || '',
      city: old.city || '',
      pincode: old.pincode || '',
      industry_id: old.industry_id || 'temp0001',
      num_employees: Number(old.no_of_employees) || 0,
      address: old.address || '',
      is_active: old.status === 'ACTIVE',
      createdAt: old.created_at?.$date ? new Date(old.created_at.$date) : new Date(),
      updatedAt: old.created_at?.$date ? new Date(old.created_at.$date) : new Date(),
    };

    console.log(`[migration] Migrating: ${old.organization_name} (ID: ${id})`);
    
    // Upsert into collection using findOneAndUpdate to avoid duplicates
    await Organization.findOneAndUpdate(
      { _id: id },
      { $set: mapped },
      { upsert: true, new: true }
    );
  }

  console.log('[migration] Migration completed successfully.');
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('[migration] Migration failed with error:', err);
  process.exit(1);
});
