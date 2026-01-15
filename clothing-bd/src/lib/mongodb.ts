import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB_NAME as string;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!dbName) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable');
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getCollection(collectionName: string) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}

export const COLLECTIONS = {
  USERS: 'users',
  STATS: 'stats',
  ACCESSORIES: 'accessories',
} as const;
