import { afterAll, afterEach, beforeAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import '../src/models/User.js';
import '../src/models/Request.js';
import '../src/models/RequestEvent.js';

/**
 * Global test bootstrap.
 *
 * mongodb-memory-server downloads (or reuses) a real mongod binary and runs it
 * in memory, so the suite exercises actual MongoDB behaviour — indexes, $text
 * search, $facet, unique constraints — without a running database or Docker.
 *
 * NODE_ENV=test and a stub JWT_SECRET are set BEFORE src/config/env.js is
 * imported (it is imported transitively via src/app.js), because that module
 * validates process.env at import time.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-characters-long-xxxx';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'sevadesk-test' });
  // Indexes must exist in tests too: the list endpoint relies on them, and a
  // test that only passes because an index is missing proves nothing.
  await Promise.all([
    mongoose.model('Request').syncIndexes(),
    mongoose.model('User').syncIndexes(),
    mongoose.model('RequestEvent').syncIndexes(),
  ]);
}, 120_000);

afterEach(async () => {
  // Wipe between tests so each starts from a known state. The native driver is
  // used because RequestEvent blocks deleteMany() by design.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
