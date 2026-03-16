import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

// POST - Clean seeded/mock data from all collections
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const body = await request.json();
    const { collections, clearAll } = body;

    const results: Record<string, number> = {};

    const collectionsToClear = clearAll
      ? ['vegetables', 'farmers', 'customers', 'salesbills', 'payments']
      : (collections || []);

    for (const collectionName of collectionsToClear) {
      try {
        const collection = db.collection(collectionName);
        const countBefore = await collection.countDocuments();

        if (clearAll) {
          // Delete all documents
          const result = await collection.deleteMany({});
          results[collectionName] = result.deletedCount;
        } else {
          // Delete only records with localId starting with "local_" (synced from IndexedDB seed)
          const result = await collection.deleteMany({
            $or: [
              { localId: { $regex: /^local_/ } },
              { syncStatus: 'synced', localId: { $exists: true } },
            ],
          });
          results[collectionName] = result.deletedCount;
        }
      } catch (err: any) {
        results[collectionName] = -1; // Error indicator
        console.error(`Error cleaning ${collectionName}:`, err.message);
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      results,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
