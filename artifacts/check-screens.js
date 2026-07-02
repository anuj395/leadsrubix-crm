const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  
  const screens = await db.collection('screens').find({}).toArray();
  console.log('\nAll Screens in DB:');
  screens.forEach(s => {
    console.log(`Key: ${s.key}, Name: ${s.name}`);
  });
  
  await mongoose.disconnect();
}

main().catch(console.error);
