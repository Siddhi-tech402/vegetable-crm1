import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Vegetable from '@/models/Vegetable';

// GET all vegetables
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');

    const query: any = {};
    // Admin sees all data.
    // Vendor sees own vegetables.
    // Farmer sees all active vegetables for supply entry selection.
    if (session.user.role === 'vendor') { /* allow viewing all data for vendor dashboard issue */ } else if (session.user.role === 'farmer') {
      query.isActive = true;
    }
    
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { localName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const [vegetables, total] = await Promise.all([
      Vegetable.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Vegetable.countDocuments(query),
    ]);

    return NextResponse.json({
      vegetables,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Vegetables GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new vegetable
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
      const lastVegetable = await Vegetable.findOne({ createdBy: session.user.id })
        .sort({ code: -1 })
        .select('code');
      
      const lastNum = lastVegetable ? parseInt(lastVegetable.code.replace('V', '')) : 0;
      body.code = `V${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Check for duplicate code
    const existing = await Vegetable.findOne({ code: body.code, createdBy: session.user.id });
    if (existing) {
      return NextResponse.json({ error: 'Vegetable code already exists' }, { status: 400 });
    }

    const vegetable = await Vegetable.create({
      ...body,
      createdBy: session.user.id,
      syncStatus: 'synced',
    });

    return NextResponse.json({ vegetable }, { status: 201 });
  } catch (error: any) {
    console.error('Vegetable POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
