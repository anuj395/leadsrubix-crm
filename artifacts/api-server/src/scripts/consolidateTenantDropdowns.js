// src/scripts/consolidateTenantDropdowns.js
// Migration script to consolidate duplicate Team, Designation, and Branch documents
// for all tenant organizations into single canonical documents with unified industry codes.

const path = require('path');
const fs = require('fs');

const currentEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.resolve(__dirname, `../../.env.${currentEnv}`),
  path.resolve(__dirname, `../.env.${currentEnv}`),
  path.resolve(__dirname, `../../.env`),
  path.resolve(__dirname, `../.env`),
];
for (const f of envFiles) {
  if (fs.existsSync(f)) {
    require('dotenv').config({ path: f });
    break;
  }
}

const pgMongoose = require('../db/pgMongoose');
require.cache[require.resolve('mongoose')] = {
  id: require.resolve('mongoose'),
  filename: require.resolve('mongoose'),
  loaded: true,
  exports: pgMongoose,
};

const { connect, disconnect, mongoose } = require('../db');

// Models
require('../models/userModel');
require('../models/industryModel');
require('../models/organizationModel');
require('../models/teamModel');
require('../models/branchModel');
require('../models/designationModel');

async function run() {
  console.log('[Consolidate] Connecting to database...');
  await connect();

  const Organization = mongoose.model('Organization');
  const Industry = mongoose.model('Industry');
  const Team = mongoose.model('Team');
  const Branch = mongoose.model('Branch');
  const Designation = mongoose.model('Designation');

  console.log('[Consolidate] Fetching tenant organizations...');
  const orgs = await Organization.find({}).lean().exec();
  console.log(`[Consolidate] Found ${orgs.length} organizations.`);

  for (const org of orgs) {
    const orgId = org.organization_id || org.organizationId || String(org._id);
    let canonicalIndustry = org.industry_id || org.industryId || 'temp0001';

    // Resolve Industry code
    const indDoc = await Industry.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(canonicalIndustry) ? canonicalIndustry : null },
        { code: canonicalIndustry }
      ]
    }).lean().exec();
    const finalIndustryCode = indDoc?.code || canonicalIndustry;

    console.log(`\n--- Processing Org: ${org.name || org.organizationName || orgId} (${orgId}), Industry: ${finalIndustryCode} ---`);

    // 1. Consolidate Teams
    const teamDocs = await Team.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).sort({ updatedAt: -1 }).exec();

    if (teamDocs.length > 1) {
      console.log(`  [Teams] Found ${teamDocs.length} duplicate documents. Merging...`);
      const primaryDoc = teamDocs[0];
      const seenTeams = new Set((primaryDoc.teams || []).map(t => (t.name || '').toLowerCase().trim()));

      for (let i = 1; i < teamDocs.length; i++) {
        const otherDoc = teamDocs[i];
        for (const t of (otherDoc.teams || [])) {
          const key = (t.name || '').toLowerCase().trim();
          if (key && !seenTeams.has(key)) {
            seenTeams.add(key);
            primaryDoc.teams.push(t);
            console.log(`    Merged team: "${t.name}" into primary document.`);
          }
        }
        await Team.findByIdAndDelete(otherDoc._id);
        console.log(`    Deleted duplicate Team document: ${otherDoc._id}`);
      }
      primaryDoc.industry_id = finalIndustryCode;
      await primaryDoc.save();
      console.log(`  [Teams] Successfully consolidated into primary document: ${primaryDoc._id}`);
    } else if (teamDocs.length === 1) {
      if (teamDocs[0].industry_id !== finalIndustryCode) {
        teamDocs[0].industry_id = finalIndustryCode;
        await teamDocs[0].save();
        console.log(`  [Teams] Normalized industry_id to: ${finalIndustryCode}`);
      }
    }

    // 2. Consolidate Designations
    const desDocs = await Designation.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).sort({ updatedAt: -1 }).exec();

    if (desDocs.length > 1) {
      console.log(`  [Designations] Found ${desDocs.length} duplicate documents. Merging...`);
      const primaryDoc = desDocs[0];
      const seenDes = new Set((primaryDoc.designations || []).map(d => (d.name || d.value || d.label || '').toLowerCase().trim()));

      for (let i = 1; i < desDocs.length; i++) {
        const otherDoc = desDocs[i];
        for (const d of (otherDoc.designations || [])) {
          const key = (d.name || d.value || d.label || '').toLowerCase().trim();
          if (key && !seenDes.has(key)) {
            seenDes.add(key);
            primaryDoc.designations.push(d);
            console.log(`    Merged designation: "${d.name || d.label}" into primary document.`);
          }
        }
        await Designation.findByIdAndDelete(otherDoc._id);
        console.log(`    Deleted duplicate Designation document: ${otherDoc._id}`);
      }
      primaryDoc.industry_id = finalIndustryCode;
      await primaryDoc.save();
      console.log(`  [Designations] Successfully consolidated into primary document: ${primaryDoc._id}`);
    } else if (desDocs.length === 1) {
      if (desDocs[0].industry_id !== finalIndustryCode) {
        desDocs[0].industry_id = finalIndustryCode;
        await desDocs[0].save();
        console.log(`  [Designations] Normalized industry_id to: ${finalIndustryCode}`);
      }
    }

    // 3. Consolidate Branches
    const branchDocs = await Branch.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).sort({ updatedAt: -1 }).exec();

    if (branchDocs.length > 1) {
      console.log(`  [Branches] Found ${branchDocs.length} duplicate documents. Merging...`);
      const primaryDoc = branchDocs[0];
      const seenBranches = new Set((primaryDoc.branches || []).map(b => (b.name || '').toLowerCase().trim()));

      for (let i = 1; i < branchDocs.length; i++) {
        const otherDoc = branchDocs[i];
        for (const b of (otherDoc.branches || [])) {
          const key = (b.name || '').toLowerCase().trim();
          if (key && !seenBranches.has(key)) {
            seenBranches.add(key);
            primaryDoc.branches.push(b);
            console.log(`    Merged branch: "${b.name}" into primary document.`);
          }
        }
        await Branch.findByIdAndDelete(otherDoc._id);
        console.log(`    Deleted duplicate Branch document: ${otherDoc._id}`);
      }
      primaryDoc.industry_id = finalIndustryCode;
      await primaryDoc.save();
      console.log(`  [Branches] Successfully consolidated into primary document: ${primaryDoc._id}`);
    } else if (branchDocs.length === 1) {
      if (branchDocs[0].industry_id !== finalIndustryCode) {
        branchDocs[0].industry_id = finalIndustryCode;
        await branchDocs[0].save();
        console.log(`  [Branches] Normalized industry_id to: ${finalIndustryCode}`);
      }
    }
  }

  console.log('\n[Consolidate] Completed successfully!');
  await disconnect();
}

run().catch((err) => {
  console.error('[Consolidate] Fatal error:', err);
  process.exit(1);
});
