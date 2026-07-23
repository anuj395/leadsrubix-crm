const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/leadrubix-crm');
  console.log('Connected to MongoDB.');

  const Organization = mongoose.model('Organization', new mongoose.Schema({
    industryId: String,
    validTill: Date,
    trialPeriod: mongoose.Schema.Types.Mixed,
    paymentStatus: mongoose.Schema.Types.Mixed,
    isActive: Boolean
  }));

  // Update all organizations to be valid until 2030
  const futureDate = new Date('2030-12-31T00:00:00.000Z');
  
  const result = await Organization.updateMany(
    {},
    {
      $set: {
        validTill: futureDate,
        trialPeriod: false,
        paymentStatus: true,
        isActive: true
      }
    }
  );

  console.log('Migration completed successfully:', result);
  await mongoose.disconnect();
}

main().catch(console.error);
