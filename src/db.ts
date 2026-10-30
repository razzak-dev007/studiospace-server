import { MongoClient, Db, Collection } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { User, Studio, Booking, Wishlist } from './types.js';

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;
let memoryServer: MongoMemoryServer | null = null;

const DB_NAME = 'studiospace';

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studiospace';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
    // Short timeout to avoid hanging if local server is not running
    const testClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2500 });
    await testClient.connect();
    client = testClient;
    db = client.db(DB_NAME);
    console.log('[Database] Successfully connected to live MongoDB server!');
    return db;
  } catch (err: any) {
    console.warn(`[Database] Live MongoDB connection failed (${err.message}). Starting in-memory MongoDB fallback...`);
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: DB_NAME },
      });
      const memUri = memoryServer.getUri();
      console.log(`[Database] In-memory MongoDB started at: ${memUri}`);
      client = new MongoClient(memUri);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('[Database] In-memory MongoDB connected successfully!');
      return db;
    } catch (memErr: any) {
      console.error('[Database] Fatal: Failed to initialize in-memory MongoDB:', memErr);
      throw memErr;
    }
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized! Call connectToDatabase() first.');
  }
  return db;
}

export function getUsersCollection(): Collection<User> {
  return getDb().collection<User>('users');
}

export function getStudiosCollection(): Collection<Studio> {
  return getDb().collection<Studio>('studios');
}

export function getBookingsCollection(): Collection<Booking> {
  return getDb().collection<Booking>('bookings');
}

export function getWishlistCollection(): Collection<Wishlist> {
  return getDb().collection<Wishlist>('wishlists');
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
  if (memoryServer) {
    await memoryServer.stop();
  }
  db = null;
  client = null;
}
