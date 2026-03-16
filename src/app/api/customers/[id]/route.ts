import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { buildIdQuery } from '@/lib/apiHelpers';

// GET single customer
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

    const createdBy = session.user.role === 'admin' ? undefined : session.user.id;
    const customer = await Customer.findOne(buildIdQuery(params.id, createdBy));

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Customer GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update customer
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

    const createdByForUpdate = session.user.role === 'admin' ? undefined : session.user.id;
    const customer = await Customer.findOneAndUpdate(
      buildIdQuery(params.id, createdByForUpdate),
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Customer PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE customer
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

    const createdByForDelete = session.user.role === 'admin' ? undefined : session.user.id;
    const customer = await Customer.findOneAndDelete(
      buildIdQuery(params.id, createdByForDelete)
    );

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Customer DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
