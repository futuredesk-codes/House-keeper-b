import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  const redacted = env.mongoUri.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@');
  // eslint-disable-next-line no-console
  console.log(`[db] Connected to MongoDB: ${redacted}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
