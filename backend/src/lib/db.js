import { MongoClient } from 'mongodb';

let dbPromise;

async function connect() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db('resume-enhancer');
  await ensureIndexes(db);
  console.log('MongoDB connected!');
  return db;
}

async function ensureIndexes(db) {
  const indexes = [
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('resumes').createIndex({ userId: 1, updatedAt: -1 }),
    db.collection('resume_history').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('resumes').createIndex({ shareId: 1 }, { sparse: true }),
    db.collection('jobs').createIndex({ userId: 1, updatedAt: -1 }),
  ];
  const results = await Promise.allSettled(indexes);
  results.filter(r => r.status === 'rejected').forEach(r => console.warn('Index creation skipped:', r.reason.message));
}

// Shared connection; a failed attempt is retried on the next request
export function getDB() {
  if (!dbPromise) dbPromise = connect().catch(err => { dbPromise = null; throw err; });
  return dbPromise;
}

export async function pingDB() {
  try {
    const db = await getDB();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
