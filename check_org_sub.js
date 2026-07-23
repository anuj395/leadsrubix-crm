const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/leadrubix-crm');
  console.log('Connected to MongoDB.');

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String,
    industryId: String,
    organizationId: String
  }));

  const Organization = mongoose.model('Organization', new mongoose.Schema({
    industryId: String,
    validTill: Date,
    trialPeriod: mongoose.Schema.Types.Mixed,
    trialPeriodDays: Number,
    gracePeriodDays: Number,
    paymentStatus: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }));

  const user = await User.findOne({ email: /anuj/i });
  console.log('User found:', user);

  if (user) {
    const org = await Organization.findOne({ industryId: user.industryId });
    console.log('Organization found:', org);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
