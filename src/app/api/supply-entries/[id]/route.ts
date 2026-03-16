import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SupplyEntry from '@/models/SupplyEntry';
import Farmer from '@/models/Farmer';
import Vegetable from '@/models/Vegetable';
import { buildIdQuery } from '@/lib/apiHelpers';
import { resolveFarmerForSessionUser } from '@/lib/farmerResolver';

// GET single supply entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const query = buildIdQuery(params.id);

    // If farmer, restrict to their own entries
    if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (farmer) {
        query.farmerId = farmer._id;
      }
    }

    const supplyEntry = await SupplyEntry.findOne(query);

    if (!supplyEntry) {
      return NextResponse.json({ error: 'Supply entry not found' }, { status: 404 });
    }

    return NextResponse.json({ supplyEntry });
  } catch (error: any) {
    console.error('SupplyEntry GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update supply entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const query = buildIdQuery(params.id);

    // If farmer, restrict to their own entries
    if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (farmer) {
        query.farmerId = farmer._id;
      }
    }

    // Handle offline sync data format
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const item = body.items[0];
      if (!body.vegetableName && item.vegetableName) body.vegetableName = item.vegetableName;
      if (!body.quantity && item.qty) body.quantity = item.qty;
      if (!body.expectedPrice && item.rate) body.expectedPrice = item.rate;
      if (!body.unit && item.unit) body.unit = item.unit;
      if (!body.expectedAmount && item.amount) body.expectedAmount = item.amount;
    }

    if (body.date && !body.entryDate) {
      body.entryDate = body.date;
    }

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

    if (body.quantity && body.expectedPrice) {
      body.expectedAmount = body.quantity * body.expectedPrice;
    }

    const supplyEntry = await SupplyEntry.findOneAndUpdate(
      query,
      { ...body, syncStatus: 'synced', updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!supplyEntry) {
      return NextResponse.json({ error: 'Supply entry not found' }, { status: 404 });
    }

    return NextResponse.json({ supplyEntry });
  } catch (error: any) {
    console.error('SupplyEntry PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE supply entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const query = buildIdQuery(params.id);

    // If farmer, restrict to their own entries
    if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (farmer) {
        query.farmerId = farmer._id;
      }
    }

    const supplyEntry = await SupplyEntry.findOneAndDelete(query);

    if (!supplyEntry) {
      return NextResponse.json({ error: 'Supply entry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Supply entry deleted successfully' });
  } catch (error: any) {
    console.error('SupplyEntry DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
