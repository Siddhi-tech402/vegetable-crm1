import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

// POST - Migrate existing data: backfill createdBy and fix indexes
export async function POST(request: NextRequest) {
  try {
    // Allow migration via session OR via secret key (for CLI/curl usage)
    const session = await getServerSession(authOptions);
    const url = new URL(request.url);
    const secretKey = url.searchParams.get('key');
    const isAuthorized = session || secretKey === process.env.NEXTAUTH_SECRET;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Pass ?key=NEXTAUTH_SECRET or be logged in.' }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const userId = session 
      ? new mongoose.Types.ObjectId(session.user.id)
      : await getFirstUserId(db);
    
    if (!userId) {
      return NextResponse.json({ error: 'No user found to assign as createdBy' }, { status: 400 });
    }
    const results: Record<string, any> = {};

    // Collections that need createdBy backfill
    const collectionsToFix = ['customers', 'farmers', 'vegetables', 'supplyentries', 'salesbills', 'payments'];

    for (const colName of collectionsToFix) {
      try {
        const collection = db.collection(colName);

        // Backfill createdBy where missing
        const updateResult = await collection.updateMany(
          { createdBy: { $exists: false } },
          { $set: { createdBy: userId } }
        );

        // Drop old unique index on code alone (if it exists)
        try {
          const indexes = await collection.indexes();
          for (const idx of indexes) {
            // Find index that is unique on a single field (code, billNumber, voucherNumber)
            if (
              idx.unique &&
              idx.key &&
              Object.keys(idx.key).length === 1 &&
              ('code' in idx.key || 'billNumber' in idx.key || 'voucherNumber' in idx.key)
            ) {
              await collection.dropIndex(idx.name!);
              results[`${colName}_dropped_index`] = idx.name;
            }
          }
        } catch (indexErr: any) {
          results[`${colName}_index_error`] = indexErr.message;
        }

        results[colName] = {
          updatedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount,
        };
      } catch (err: any) {
        results[colName] = { error: err.message };
      }
    }

    return NextResponse.json({
      message: 'Migration completed successfully',
      results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: get the first vendor/admin user ID from the users collection
async function getFirstUserId(db: any): Promise<mongoose.Types.ObjectId | null> {
  try {
    const user = await db.collection('users').findOne({ role: { $in: ['vendor', 'admin'] } });
    return user ? user._id : null;
  } catch {
    return null;
  }
}

export const GET = POST;
