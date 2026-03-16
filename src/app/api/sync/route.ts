import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import Customer from '@/models/Customer';
import Vegetable from '@/models/Vegetable';
import SalesBill from '@/models/SalesBill';
import Payment from '@/models/Payment';

// POST sync data from offline storage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { queue } = await request.json();
    
    if (!queue || !Array.isArray(queue)) {
      return NextResponse.json({ error: 'Invalid sync queue' }, { status: 400 });
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const item of queue) {
      try {
        const { id, type, action, data } = item;

        // Get the appropriate model
        let Model: any;
        switch (type) {
          case 'farmers':
            Model = Farmer;
            break;
          case 'customers':
            Model = Customer;
            break;
          case 'vegetables':
            Model = Vegetable;
            break;
          case 'salesBills':
            Model = SalesBill;
            break;
          case 'payments':
            Model = Payment;
            break;
          default:
            throw new Error(`Unknown type: ${type}`);
        }

        // Perform the action
        switch (action) {
          case 'create':
            const createData = {
              ...data,
              createdBy: session.user.id,
              syncStatus: 'synced',
            };
            delete createData._id; // Remove local ID
            delete createData.localId;
            await Model.create(createData);
            break;

          case 'update':
            await Model.findOneAndUpdate(
              { _id: data._id, createdBy: session.user.id },
              { ...data, syncStatus: 'synced', updatedAt: new Date() }
            );
            break;

          case 'delete':
            await Model.findOneAndDelete({
              _id: data._id,
              createdBy: session.user.id,
            });
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        results.success.push(id);
      } catch (error: any) {
        results.failed.push({ id: item.id, error: error.message });
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET sync - fetch all data for offline storage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const lastSyncAt = searchParams.get('lastSyncAt');
    const financialYear = searchParams.get('financialYear');

    const query: any = { createdBy: session.user.id };
    
    if (lastSyncAt) {
      query.updatedAt = { $gt: new Date(lastSyncAt) };
    }

    if (financialYear) {
      query.financialYear = financialYear;
    }

    // Fetch all data
    const [farmers, customers, vegetables, salesBills, payments] = await Promise.all([
      Farmer.find({ createdBy: session.user.id, ...query }).lean(),
      Customer.find({ createdBy: session.user.id, ...query }).lean(),
      Vegetable.find({ createdBy: session.user.id }).lean(), // Vegetables don't have FY
      SalesBill.find({ createdBy: session.user.id, ...query }).lean(),
      Payment.find({ createdBy: session.user.id, ...query }).lean(),
    ]);

    return NextResponse.json({
      data: {
        farmers,
        customers,
        vegetables,
        salesBills,
        payments,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
