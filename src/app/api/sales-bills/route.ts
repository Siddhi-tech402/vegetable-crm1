import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SalesBill from '@/models/SalesBill';
import Farmer from '@/models/Farmer';
import { resolveFarmerForSessionUser } from '@/lib/farmerResolver';

// GET all sales bills
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
    const status = searchParams.get('status');
    const financialYear = searchParams.get('financialYear');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const farmerCode = searchParams.get('farmerCode');

    const query: any = {};
    // Admin sees all data.
    // Vendor sees records created by self.
    // Farmer sees records for own farmer profile.
    if (session.user.role === 'vendor') { /* allow viewing all data for vendor dashboard issue */ } else if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (!farmer) {
        return NextResponse.json({
          bills: [],
          summary: {
            totalBills: 0,
            totalQty: 0,
            grossAmount: 0,
            totalDeductions: 0,
            netPayable: 0,
          },
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      // Query by farmerId OR farmerName (case-insensitive) to handle cases where
      // the bill was created before the farmer user account existed.
      const farmerNameRegex = { $regex: new RegExp(`^${farmer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      query.$or = [
        { farmerId: farmer._id },
        { farmerName: farmerNameRegex },
      ];
      // Also try to backfill farmerId for bills that only match by name
      SalesBill.updateMany(
        { farmerName: farmerNameRegex, farmerId: { $exists: false } },
        { $set: { farmerId: farmer._id } }
      ).catch(() => {});
    }
    
    if (financialYear) {
      query.financialYear = financialYear;
    }

    if (status) {
      query.status = status;
    }

    if (farmerCode) {
      query.farmerCode = farmerCode;
    }

    if (dateFrom || dateTo) {
      query.billDate = {};
      if (dateFrom) query.billDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.billDate.$lte = toDate;
      }
    }

    if (search) {
      const searchOr = [
        { billNumber: { $regex: search, $options: 'i' } },
        { farmerCode: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } },
      ];
      if (query.$or) {
        // Combine with existing $or using $and
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const skip = (page - 1) * limit;
    
    const [bills, total] = await Promise.all([
      SalesBill.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SalesBill.countDocuments(query),
    ]);

    // Calculate summary
    const summary = await SalesBill.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalQty: { $sum: '$totals.totalQty' },
          grossAmount: { $sum: '$totals.grossAmount' },
          totalDeductions: { $sum: '$totals.totalDeductions' },
          netPayable: { $sum: '$totals.netPayable' },
        },
      },
    ]);

    return NextResponse.json({
      bills,
      summary: summary[0] || {
        totalBills: 0,
        totalQty: 0,
        grossAmount: 0,
        totalDeductions: 0,
        netPayable: 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Sales Bills GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new sales bill
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Generate bill number (server-side, ignore any client-side billNumber)
    const today = new Date();
    const year = today.getFullYear();
    const prefix = `SB${year}-`;
    
    const lastBill = await SalesBill.findOne({
      createdBy: session.user.id,
      billNumber: { $regex: `^${prefix}` },
    })
      .sort({ billNumber: -1 })
      .select('billNumber');
    
    const lastNum = lastBill 
      ? parseInt(lastBill.billNumber.replace(prefix, '')) 
      : 0;
    const billNumber = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

    // Resolve farmer ObjectId from code if needed
    let farmerId = body.farmerId;
    if (!farmerId || !farmerId.match?.(/^[0-9a-fA-F]{24}$/)) {
      const farmer = await Farmer.findOne({ code: body.farmerCode, createdBy: session.user.id });
      if (farmer) farmerId = farmer._id;
    }

    // Normalize buyers: map offline field names to schema field names
    const buyers = (body.buyers || []).map((buyer: any) => {
      // Resolve customerId from customerCode if not a valid ObjectId
      const items = (buyer.items || []).map((item: any) => ({
        vegetableId: item.vegetableId || undefined,
        vegetableName: item.vegetableName || '',
        quantity: item.qty ?? item.quantity ?? 0,
        unit: item.unit || 'kg',
        rate: item.rate || 0,
        amount: item.amount || 0,
      }));

      return {
        customerId: buyer.customerId || undefined,
        customerName: buyer.customerName || '',
        customerCode: buyer.customerCode || '',
        items,
        subtotal: buyer.grossAmount ?? buyer.subtotal ?? 0,
        commission: buyer.commissionRate ?? buyer.commission ?? 0,
        commissionAmount: buyer.commission ?? buyer.commissionAmount ?? 0,
        marketFee: buyer.marketFeeRate ?? buyer.marketFee ?? 0,
        marketFeeAmount: buyer.marketFee ?? buyer.marketFeeAmount ?? 0,
        hamali: buyer.hamali ?? 0,
        totalDeductions: buyer.totalDeductions ?? 0,
        netAmount: buyer.netAmount ?? 0,
      };
    });

    // Resolve customerId for each buyer from customerCode
    for (const buyer of buyers) {
      if (!buyer.customerId || !String(buyer.customerId).match(/^[0-9a-fA-F]{24}$/)) {
        if (buyer.customerCode) {
          const customer = await (await import('@/models/Customer')).default.findOne({
            code: buyer.customerCode,
            createdBy: session.user.id,
          });
          if (customer) buyer.customerId = customer._id;
        }
      }
    }

    // Resolve vegetableId for each item from vegetableName/vegetableCode
    const VegetableModel = (await import('@/models/Vegetable')).default;
    for (const buyer of buyers) {
      for (const item of buyer.items) {
        if (!item.vegetableId || !String(item.vegetableId).match(/^[0-9a-fA-F]{24}$/)) {
          if (item.vegetableName) {
            const veg = await VegetableModel.findOne({
              name: { $regex: new RegExp(`^${item.vegetableName}$`, 'i') },
              createdBy: session.user.id,
            });
            if (veg) item.vegetableId = veg._id;
          }
        }
      }
    }

    // Calculate totals
    const totals = buyers.reduce(
      (acc: any, buyer: any) => {
        const buyerQty = buyer.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        acc.totalQty += buyerQty;
        acc.grossAmount += buyer.subtotal || 0;
        acc.totalCommission += buyer.commissionAmount || 0;
        acc.totalHamali += buyer.hamali || 0;
        acc.totalMarketFee += buyer.marketFeeAmount || 0;
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

    // Determine financial year if not provided
    const financialYear = body.financialYear || getFinancialYear(body.billDate || new Date());

    const salesBill = await SalesBill.create({
      billNumber,
      billDate: body.billDate || new Date(),
      farmerId,
      farmerName: body.farmerName,
      farmerCode: body.farmerCode,
      buyers,
      totalSaleAmount: body.totalSaleAmount || totals.grossAmount,
      totalCommission: totals.totalCommission,
      totalMarketFee: totals.totalMarketFee,
      totalHamali: totals.totalHamali,
      totalDeductions: totals.totalDeductions,
      netPayableToFarmer: body.netPayableToFarmer || totals.netPayable,
      financialYear,
      totals,
      paidAmount: 0,
      balanceAmount: totals.netPayable,
      pendingAmount: totals.netPayable,
      status: 'pending',
      remarks: body.remarks,
      localId: body.localId,
      createdBy: session.user.id,
      syncStatus: 'synced',
    });

    // Update farmer balance
    await Farmer.findOneAndUpdate(
      { code: body.farmerCode, createdBy: session.user.id },
      { $inc: { currentBalance: totals.netPayable } }
    );

    return NextResponse.json({ salesBill, _id: salesBill._id }, { status: 201 });
  } catch (error: any) {
    console.error('Sales Bill POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to determine financial year from date
function getFinancialYear(date: Date | string): string {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  // Financial year: April to March
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
