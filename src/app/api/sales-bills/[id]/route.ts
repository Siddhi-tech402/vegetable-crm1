import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SalesBill from '@/models/SalesBill';
import Payment from '@/models/Payment';
import Farmer from '@/models/Farmer';
import { buildIdQuery } from '@/lib/apiHelpers';

// GET single sales bill
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
    const salesBill = await SalesBill.findOne(buildIdQuery(params.id, createdBy));

    if (!salesBill) {
      return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 });
    }

    // Get payments associated with this bill
    const paymentQuery: any = { 'settlements.billNumber': salesBill.billNumber };
    if (session.user.role !== 'admin') {
      paymentQuery.createdBy = session.user.id;
    }
    const payments = await Payment.find(paymentQuery).sort({ date: -1 });

    return NextResponse.json({ salesBill, payments });
  } catch (error: any) {
    console.error('Sales Bill GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update sales bill
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

    // Only allow updates if bill is pending
    const createdByForUpdate = session.user.role === 'admin' ? undefined : session.user.id;
    const existingBill = await SalesBill.findOne(buildIdQuery(params.id, createdByForUpdate));

    if (!existingBill) {
      return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 });
    }

    if (existingBill.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot modify bill with payments' },
        { status: 400 }
      );
    }

    // Recalculate totals if buyers changed
    if (body.buyers) {
      const buyers = body.buyers;
      body.totals = buyers.reduce(
        (acc: any, buyer: any) => {
          const buyerQty = buyer.items.reduce(
            (sum: number, item: any) => sum + (item.qty || 0),
            0
          );
          acc.totalQty += buyerQty;
          acc.grossAmount += buyer.grossAmount || 0;
          acc.totalCommission += buyer.commission || 0;
          acc.totalHamali += buyer.hamali || 0;
          acc.totalMarketFee += buyer.marketFee || 0;
          acc.totalDeductions += buyer.totalDeductions || 0;
          acc.netPayable += buyer.netAmount || 0;
          return acc;
        },
        {
          totalQty: 0,
          grossAmount: 0,
          totalCommission: 0,
          totalHamali: 0,
          totalMarketFee: 0,
          totalDeductions: 0,
          netPayable: 0,
        }
      );
      body.balanceAmount = body.totals.netPayable;
    }

    const salesBill = await SalesBill.findOneAndUpdate(
      buildIdQuery(params.id, createdByForUpdate),
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    // Update farmer balance difference
    if (body.totals && existingBill.totals && salesBill) {
      const diff = body.totals.netPayable - existingBill.totals.netPayable;
      if (diff !== 0) {
        const farmerUpdateQuery: any = { code: salesBill.farmerCode };
        if (session.user.role !== 'admin') {
          farmerUpdateQuery.createdBy = session.user.id;
        }
        await Farmer.findOneAndUpdate(
          farmerUpdateQuery,
          { $inc: { currentBalance: diff } }
        );
      }
    }

    return NextResponse.json({ salesBill });
  } catch (error: any) {
    console.error('Sales Bill PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE sales bill
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
    const salesBill = await SalesBill.findOne(buildIdQuery(params.id, createdByForDelete));

    if (!salesBill) {
      return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 });
    }

    if (salesBill.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete bill with payments' },
        { status: 400 }
      );
    }

    await SalesBill.deleteOne({ _id: salesBill._id });

    // Reverse farmer balance
    if (salesBill.totals) {
      const farmerQuery: any = { code: salesBill.farmerCode };
      if (session.user.role !== 'admin') {
        farmerQuery.createdBy = session.user.id;
      }
      await Farmer.findOneAndUpdate(
        farmerQuery,
        { $inc: { currentBalance: -salesBill.totals.netPayable } }
      );
    }

    return NextResponse.json({ message: 'Sales bill deleted successfully' });
  } catch (error: any) {
    console.error('Sales Bill DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
