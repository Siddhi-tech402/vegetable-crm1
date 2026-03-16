import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';

// GET all farmers
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

    const query: any = {};
    // Admin sees all data; vendors/farmers see only their own
    if (session.user.role !== 'admin') {
      query.createdBy = session.user.id;
    }
    
    if (financialYear) {
      query.financialYear = financialYear;
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { village: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const [farmers, total] = await Promise.all([
      Farmer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Farmer.countDocuments(query),
    ]);

    return NextResponse.json({
      farmers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Farmers GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new farmer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Generate code if not provided
    if (!body.code) {
      const lastFarmer = await Farmer.findOne({ createdBy: session.user.id })
        .sort({ code: -1 })
        .select('code');
      
      const lastNum = lastFarmer ? parseInt(lastFarmer.code.replace('F', '')) : 0;
      body.code = `F${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Check for duplicate code
    const existing = await Farmer.findOne({ code: body.code, createdBy: session.user.id });
    if (existing) {
      return NextResponse.json({ error: 'Farmer code already exists' }, { status: 400 });
    }

    const farmer = await Farmer.create({
      ...body,
      createdBy: session.user.id,
      syncStatus: 'synced',
    });

    return NextResponse.json({ farmer }, { status: 201 });
  } catch (error: any) {
    console.error('Farmer POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
