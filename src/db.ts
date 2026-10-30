/**
 * db.ts â€” Resilient In-Memory & MongoDB Database Layer for StudioSpace
 *
 * Designed to work seamlessly in both:
 *  1. Vercel Serverless (in-memory store with seeded data, 0ms latency, no binaries)
 *  2. Local or Cloud MongoDB (Atlas / local mongod when MONGODB_URI is provided)
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { User, Studio, Booking, Wishlist } from './types.js';

dotenv.config();

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. In-Memory Store
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface StoreRecord {
  _id: any;
  [key: string]: any;
}

function newId(): string {
  let id = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

const store: {
  users: StoreRecord[];
  studios: StoreRecord[];
  bookings: StoreRecord[];
  wishlists: StoreRecord[];
  seeded: boolean;
} = {
  users: [],
  studios: [],
  bookings: [],
  wishlists: [],
  seeded: false,
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. Mock Collection (in-place mutations)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class MockCollection<T extends StoreRecord> {
  private rows: T[];

  constructor(rows: T[]) {
    this.rows = rows;
  }

  private matchesFilter(doc: T, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const key of Object.keys(filter)) {
      const filterVal = filter[key];
      const docVal = (doc as any)[key];

      if (key === '$or') {
        const matched = filterVal.some((subFilter: any) => this.matchesFilter(doc, subFilter));
        if (!matched) return false;
        continue;
      }

      if (filterVal && typeof filterVal === 'object' && !(filterVal instanceof ObjectId) && !Array.isArray(filterVal)) {
        for (const op of Object.keys(filterVal)) {
          if (op === '$in') {
            const inList = filterVal.$in.map((v: any) => String(v));
            if (!inList.includes(String(docVal))) return false;
          } else if (op === '$gte') {
            if (!(docVal >= filterVal.$gte)) return false;
          } else if (op === '$lte') {
            if (!(docVal <= filterVal.$lte)) return false;
          } else if (op === '$regex') {
            const regex = filterVal.$regex instanceof RegExp
              ? filterVal.$regex
              : new RegExp(filterVal.$regex, filterVal.$options || 'i');
            if (Array.isArray(docVal)) {
              if (!docVal.some(item => regex.test(String(item)))) return false;
            } else {
              if (!regex.test(String(docVal ?? ''))) return false;
            }
          }
        }
        continue;
      }

      // Exact value match (stringified to support ObjectId comparisons)
      if (String(docVal) !== String(filterVal)) return false;
    }
    return true;
  }

  find(filter: any = {}) {
    const matched = this.rows.filter(doc => this.matchesFilter(doc, filter));
    const cursor = {
      _results: [...matched],
      sort(sortSpec: any) {
        if (!sortSpec || Object.keys(sortSpec).length === 0) return this;
        const [key, dir] = Object.entries(sortSpec)[0] as [string, number];
        this._results.sort((a, b) => {
          let av = (a as any)[key];
          let bv = (b as any)[key];
          if (av instanceof Date) av = av.getTime();
          if (bv instanceof Date) bv = bv.getTime();
          if (typeof av === 'number' && typeof bv === 'number') {
            return dir === 1 ? av - bv : bv - av;
          }
          if (av < bv) return dir === 1 ? -1 : 1;
          if (av > bv) return dir === 1 ? 1 : -1;
          return 0;
        });
        return this;
      },
      limit(n: number) {
        this._results = this._results.slice(0, n);
        return this;
      },
      async toArray() {
        return this._results;
      },
    };
    return cursor;
  }

  async findOne(filter: any): Promise<T | null> {
    return this.rows.find(doc => this.matchesFilter(doc, filter)) ?? null;
  }

  async insertOne(doc: Omit<T, '_id'>): Promise<{ insertedId: string }> {
    const id = newId();
    const record = { ...doc, _id: id } as T;
    this.rows.push(record);
    return { insertedId: id };
  }

  async insertMany(docs: Omit<T, '_id'>[]): Promise<{ insertedIds: string[] }> {
    const ids: string[] = [];
    for (const doc of docs) {
      const { insertedId } = await this.insertOne(doc);
      ids.push(insertedId);
    }
    return { insertedIds: ids };
  }

  async updateOne(filter: any, update: any): Promise<void> {
    const idx = this.rows.findIndex(doc => this.matchesFilter(doc, filter));
    if (idx === -1) return;
    if (update.$set) {
      Object.assign(this.rows[idx], update.$set);
    }
    if (update.$push) {
      for (const [key, val] of Object.entries(update.$push)) {
        if (!Array.isArray((this.rows[idx] as any)[key])) {
          (this.rows[idx] as any)[key] = [];
        }
        (this.rows[idx] as any)[key].push(val);
      }
    }
  }

  async deleteOne(filter: any): Promise<void> {
    const idx = this.rows.findIndex(doc => this.matchesFilter(doc, filter));
    if (idx !== -1) {
      this.rows.splice(idx, 1);
    }
  }

  async deleteMany(filter: any): Promise<void> {
    // In-place mutation guarantees the underlying store array is cleared
    if (!filter || Object.keys(filter).length === 0) {
      this.rows.length = 0;
      return;
    }
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.matchesFilter(this.rows[i], filter)) {
        this.rows.splice(i, 1);
      }
    }
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.rows.filter(doc => this.matchesFilter(doc, filter)).length;
  }

  aggregate(pipeline: any[]) {
    const data = [...this.rows];
    const results: any[] = [];
    for (const stage of pipeline) {
      if (stage.$group) {
        const groupMap = new Map<string, number>();
        const idField = stage.$group._id?.replace('$', '') ?? '';
        for (const doc of data) {
          const key = (doc as any)[idField] ?? 'unknown';
          groupMap.set(key, (groupMap.get(key) ?? 0) + 1);
        }
        for (const [k, count] of groupMap.entries()) {
          results.push({ _id: k, count });
        }
      }
    }
    return { async toArray() { return results; } };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. Public API
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let useMongo = false;
let mongoDb: Db | null = null;
let mongoClient: MongoClient | null = null;

export async function connectToDatabase(): Promise<any> {
  const uri = process.env.MONGODB_URI;
  const isVercel = Boolean(process.env.VERCEL);
  const isLocalhost = Boolean(uri && (uri.includes('localhost') || uri.includes('127.0.0.1')));

  // Don't attempt localhost MongoDB connection if we are on Vercel
  if (uri && !(isVercel && isLocalhost)) {
    try {
      if (!mongoDb) {
        mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
        await mongoClient.connect();
        mongoDb = mongoClient.db('studiospace');
        console.log('[DB] Connected to MongoDB.');
      }
      useMongo = true;
      return mongoDb;
    } catch (err: any) {
      console.warn('[DB] MongoDB connection failed, falling back to in-memory store:', err.message);
    }
  }

  console.log('[DB] Using in-memory data store.');
  return store;
}

export function getDb(): any {
  if (useMongo && mongoDb) return mongoDb;
  return store;
}

export function getUsersCollection(): any {
  if (useMongo && mongoDb) return mongoDb.collection<User>('users');
  return new MockCollection<StoreRecord>(store.users);
}

export function getStudiosCollection(): any {
  if (useMongo && mongoDb) return mongoDb.collection<Studio>('studios');
  return new MockCollection<StoreRecord>(store.studios);
}

export function getBookingsCollection(): any {
  if (useMongo && mongoDb) return mongoDb.collection<Booking>('bookings');
  return new MockCollection<StoreRecord>(store.bookings);
}

export function getWishlistCollection(): any {
  if (useMongo && mongoDb) return mongoDb.collection<Wishlist>('wishlists');
  return new MockCollection<StoreRecord>(store.wishlists);
}

export function isSeeded(): boolean {
  return store.seeded;
}

export function markSeeded(): void {
  store.seeded = true;
}

export async function closeDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    useMongo = false;
  }
}
