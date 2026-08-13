// src/db.js
// Redirect database connection to PostgreSQL-backed Mongoose emulator (pgMongoose)
const mongoose = require('./db/pgMongoose');

const connect = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('[db] PostgreSQL connected via pgMongoose');
  } catch (err) {
    console.error('[db] PostgreSQL connection error:', err);
    process.exit(1);
  }
};

const disconnect = async () => {
  await mongoose.disconnect();
};

module.exports = { connect, disconnect, mongoose };
