const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  
  const screen = await db.collection('screens').findOne({ key: 'configApi' });
  const statusField = await db.collection('screen_fields').findOne({ screen_id: screen._id, field_key: 'status' });
  console.log('Status Field Options:', JSON.stringify(statusField.options));
  
  await mongoose.disconnect();
}

main().catch(console.error);
