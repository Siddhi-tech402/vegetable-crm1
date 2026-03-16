import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Vegetable from '@/models/Vegetable';
import { buildIdQuery } from '@/lib/apiHelpers';

// GET single vegetable
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
    const vegetable = await Vegetable.findOne(buildIdQuery(params.id, createdBy));

    if (!vegetable) {
      return NextResponse.json({ error: 'Vegetable not found' }, { status: 404 });
    }

    return NextResponse.json({ vegetable });
  } catch (error: any) {
    console.error('Vegetable GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update vegetable
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
    const vegetable = await Vegetable.findOneAndUpdate(
      buildIdQuery(params.id, createdByForUpdate),
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!vegetable) {
      return NextResponse.json({ error: 'Vegetable not found' }, { status: 404 });
    }

    return NextResponse.json({ vegetable });
  } catch (error: any) {
    console.error('Vegetable PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE vegetable
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
    const vegetable = await Vegetable.findOneAndDelete(
      buildIdQuery(params.id, createdByForDelete)
    );

    if (!vegetable) {
      return NextResponse.json({ error: 'Vegetable not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Vegetable deleted successfully' });
  } catch (error: any) {
    console.error('Vegetable DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
