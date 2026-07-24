// src/db.js
// MongoDB connection setup using mongoose.
// Falls back to an in-process MongoDB (mongodb-memory-server) when no MONGO_URI is provided.
const mongoose = require('mongoose');
const config = require('./config');

// Globally convert all default camelCase timestamps to snake_case in MongoDB
mongoose.plugin((schema) => {
  if (schema.options.timestamps === true) {
    schema.options.timestamps = {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }
  if (schema.options.timestamps) {
    const createdAtKey = schema.options.timestamps.createdAt;
    const updatedAtKey = schema.options.timestamps.updatedAt;
    if (createdAtKey && createdAtKey !== 'createdAt' && !schema.paths['createdAt'] && !schema.virtuals['createdAt']) {
      schema.virtual('createdAt')
        .get(function() { return this[createdAtKey]; })
        .set(function(v) { this[createdAtKey] = v; });
    }
    if (updatedAtKey && updatedAtKey !== 'updatedAt' && !schema.paths['updatedAt'] && !schema.virtuals['updatedAt']) {
      schema.virtual('updatedAt')
        .get(function() { return this[updatedAtKey]; })
        .set(function(v) { this[updatedAtKey] = v; });
    }
  }
});

let memoryServer = null;

const connect = async () => {
  let uri = config.mongoUri;
  const useMemory = process.env.USE_MEMORY_DB === 'true';

  try {
    if (useMemory) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log('[db] Started in-memory MongoDB at', uri);
    }

    await mongoose.connect(uri);
    console.log('[db] MongoDB connected');
  } catch (err) {
    console.error('[db] MongoDB connection error:', err);
    process.exit(1);
  }
};

const disconnect = async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
};

module.exports = { connect, disconnect, mongoose };
