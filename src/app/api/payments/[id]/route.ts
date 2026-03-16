import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { buildIdQuery } from '@/lib/apiHelpers';

// GET single payment
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
    const payment = await Payment.findOne(buildIdQuery(params.id, createdBy));

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error: any) {
    console.error('Payment GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Note: Payments should typically not be updated or deleted
// They should be reversed with a new counter-entry
// But providing basic implementation for admin purposes

// DELETE payment (Admin only - should create reversal instead)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin to delete
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin can delete payments' },
        { status: 403 }
      );
    }

    await connectDB();

    const payment = await Payment.findOne(buildIdQuery(params.id, session.user.id));

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // In production, you would:
    // 1. Reverse the bill balance updates
    // 2. Reverse the party balance updates
    // 3. Create an audit log entry
    // For now, just mark as deleted (soft delete)

    await Payment.findByIdAndUpdate(payment._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: session.user.id,
    });

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    console.error('Payment DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
