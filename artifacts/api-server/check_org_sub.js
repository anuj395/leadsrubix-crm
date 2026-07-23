const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/leadrubix-crm');
  console.log('Connected to MongoDB.');

  const Organization = mongoose.model('Organization', new mongoose.Schema({
    industryId: String,
    validTill: Date,
    trialPeriod: mongoose.Schema.Types.Mixed,
    trialPeriodDays: Number,
    gracePeriodDays: Number,
    paymentStatus: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }));

  const allOrgs = await Organization.find({});
  console.log('All Organizations:', allOrgs);

  await mongoose.disconnect();
}

main().catch(console.error);
