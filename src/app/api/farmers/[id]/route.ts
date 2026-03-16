import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import { buildIdQuery } from '@/lib/apiHelpers';

// GET single farmer
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
    const farmer = await Farmer.findOne(buildIdQuery(params.id, createdBy));

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ farmer });
  } catch (error: any) {
    console.error('Farmer GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update farmer
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
    const farmer = await Farmer.findOneAndUpdate(
      buildIdQuery(params.id, createdByForUpdate),
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ farmer });
  } catch (error: any) {
    console.error('Farmer PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE farmer
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
    const farmer = await Farmer.findOneAndDelete(
      buildIdQuery(params.id, createdByForDelete)
    );

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Farmer deleted successfully' });
  } catch (error: any) {
    console.error('Farmer DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
