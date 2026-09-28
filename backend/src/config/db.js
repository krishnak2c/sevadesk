import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Mongoose connection lifecycle, kept in one place so `server.js` and
 * `scripts/seed.js` do the same thing.
 */

mongoose.set('strictQuery', true);

let connectPromise = null;

export async function connectDB(uri = env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  connectPromise ??= mongoose.connect(uri, {
    // Fail fast instead of buffering operations for 10s when Mongo is down.
    serverSelectionTimeoutMS: 5000,
    autoIndex: !env.NODE_ENV || env.NODE_ENV === 'development',
  });

  try {
    return await connectPromise;
  } catch (err) {
    connectPromise = null;
    throw err;
  }
}

export async function disconnectDB() {
  connectPromise = null;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

/** Ready state -> the string shape the /health contract promises. */
export function dbHealthState() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
