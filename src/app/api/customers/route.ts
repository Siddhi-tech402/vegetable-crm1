import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';

// GET all customers
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
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(query),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Customers GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new customer
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
      const lastCustomer = await Customer.findOne({ createdBy: session.user.id })
        .sort({ code: -1 })
        .select('code');
      
      const lastNum = lastCustomer ? parseInt(lastCustomer.code.replace('C', '')) : 0;
      body.code = `C${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Check for duplicate code
    const existing = await Customer.findOne({ code: body.code, createdBy: session.user.id });
    if (existing) {
      return NextResponse.json({ error: 'Customer code already exists' }, { status: 400 });
    }

    const customer = await Customer.create({
      ...body,
      createdBy: session.user.id,
      syncStatus: 'synced',
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    console.error('Customer POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
