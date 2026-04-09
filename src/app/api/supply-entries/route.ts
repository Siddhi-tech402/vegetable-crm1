import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SupplyEntry from '@/models/SupplyEntry';
import Farmer from '@/models/Farmer';
import Vegetable from '@/models/Vegetable';
import { resolveFarmerForSessionUser } from '@/lib/farmerResolver';

// GET all supply entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const financialYear = searchParams.get('financialYear');
    const status = searchParams.get('status');

    const query: any = {};

    // If user is a farmer, only show their supply entries
    if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (farmer) {
        // Query by farmerId OR farmerName (case-insensitive) to handle cases where
        // the entry was created before the farmer user account existed.
        const farmerNameRegex = { $regex: new RegExp(`^${farmer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
        query.$or = [
          { farmerId: farmer._id },
          { farmerName: farmerNameRegex },
        ];
        // Backfill farmerId for entries only matched by name
        SupplyEntry.updateMany(
          { farmerName: farmerNameRegex, farmerId: { $exists: false } },
          { $set: { farmerId: farmer._id } }
        ).catch(() => {});
      } else {
        // Farmer profile not linked — return empty
        return NextResponse.json({
          supplyEntries: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    }

    if (financialYear) {
      query.financialYear = financialYear;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchOr = [
        { vegetableName: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } },
        { farmerCode: { $regex: search, $options: 'i' } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const skip = (page - 1) * limit;

    const [supplyEntries, total] = await Promise.all([
      SupplyEntry.find(query).sort({ entryDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      SupplyEntry.countDocuments(query),
    ]);

    return NextResponse.json({
      supplyEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('SupplyEntries GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new supply entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // If farmer role, resolve farmerId from session
    if (session.user.role === 'farmer' && !body.farmerId) {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (farmer) {
        body.farmerId = farmer._id;
        body.farmerName = farmer.name;
        body.farmerCode = farmer.code;
      }
    }

    // Handle offline sync data format (items array from IndexedDB)
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const item = body.items[0];
      if (!body.vegetableName && item.vegetableName) {
        body.vegetableName = item.vegetableName;
      }
      if (!body.quantity && item.qty) {
        body.quantity = item.qty;
      }
      if (!body.expectedPrice && item.rate) {
        body.expectedPrice = item.rate;
      }
      if (!body.unit && item.unit) {
        body.unit = item.unit;
      }
      if (!body.expectedAmount && item.amount) {
        body.expectedAmount = item.amount;
      }
    }

    // Map 'date' field from offline store to 'entryDate'
    if (body.date && !body.entryDate) {
      body.entryDate = body.date;
    }

    // Resolve vegetableId from vegetableName for payloads that send names only
    if ((!body.vegetableId || !String(body.vegetableId).match(/^[0-9a-fA-F]{24}$/)) && body.vegetableName) {
      const vegetableQuery: any = {
        name: { $regex: new RegExp(`^${body.vegetableName}$`, 'i') },
      };
      if (session.user.role === 'vendor') {
        vegetableQuery.createdBy = session.user.id;
      } else if (session.user.role === 'farmer') {
        vegetableQuery.isActive = true;
      }

      const vegetable = await Vegetable.findOne(vegetableQuery).sort({ createdAt: -1 });
      if (vegetable) {
        body.vegetableId = vegetable._id;
        body.vegetableName = vegetable.name;
        body.unit = body.unit || vegetable.unit || 'kg';
      }
    }

    if (!body.vegetableId) {
      return NextResponse.json({ error: 'Vegetable not found. Please select a valid vegetable.' }, { status: 400 });
    }

    // Calculate expectedAmount if not provided
    if (!body.expectedAmount && body.quantity && body.expectedPrice) {
      body.expectedAmount = body.quantity * body.expectedPrice;
    }

    const supplyEntry = await SupplyEntry.create({
      ...body,
      createdBy: session.user.id,
      syncStatus: 'synced',
    });

    return NextResponse.json({ supplyEntry, _id: supplyEntry._id }, { status: 201 });
  } catch (error: any) {
    console.error('SupplyEntry POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
