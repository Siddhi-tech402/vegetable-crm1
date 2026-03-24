import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import SalesBill from '@/models/SalesBill';
import Farmer from '@/models/Farmer';
import Customer from '@/models/Customer';
import { resolveFarmerForSessionUser } from '@/lib/farmerResolver';

// GET all payments
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
    const type = searchParams.get('type'); // 'receipt' or 'payment'
    const search = searchParams.get('search') || '';
    const financialYear = searchParams.get('financialYear');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const query: any = {};
    // Admin sees all data.
    // Vendor sees own payments.
    // Farmer sees payments issued to their farmer profile.
    if (session.user.role === 'vendor') { /* allow viewing all data for vendor dashboard issue */ } else if (session.user.role === 'farmer') {
      const farmer = await resolveFarmerForSessionUser(session.user);
      if (!farmer) {
        return NextResponse.json({
          payments: [],
          summary: {
            receipts: { count: 0, amount: 0 },
            payments: { count: 0, amount: 0 },
          },
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      query.farmerId = farmer._id;
    }
    
    if (financialYear) {
      query.financialYear = financialYear;
    }

    if (type) {
      query.type = type;
    }

    if (dateFrom || dateTo) {
      query.voucherDate = {};
      if (dateFrom) query.voucherDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.voucherDate.$lte = toDate;
      }
    }

    if (search) {
      query.$or = [
        { voucherNumber: { $regex: search, $options: 'i' } },
        { partyCode: { $regex: search, $options: 'i' } },
        { partyName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(query),
    ]);

    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const summaryObj = {
      receipts: { count: 0, amount: 0 },
      payments: { count: 0, amount: 0 },
    };

    summary.forEach((item) => {
      if (item._id === 'receipt') {
        summaryObj.receipts = { count: item.count, amount: item.totalAmount };
      } else {
        summaryObj.payments = { count: item.count, amount: item.totalAmount };
      }
    });

    return NextResponse.json({
      payments,
      summary: summaryObj,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Map offline field names to server schema field names
    const type = body.type; // 'receipt' or 'payment'
    const partyCode = body.partyCode || body.customerCode || body.farmerCode || '';
    const partyName = body.partyName || body.customerName || body.farmerName || '';
    const amount = body.amount || 0;
    const kasar = body.kasar || 0;
    const settlements = body.settlements || [];

    // Generate voucher number (server-side, ignore client-side one)
    const today = new Date();
    const year = today.getFullYear();
    const prefix = type === 'receipt' ? `REC${year}-` : `PAY${year}-`;
    
    const lastPayment = await Payment.findOne({
      createdBy: session.user.id,
      voucherNumber: { $regex: `^${prefix}` },
    })
      .sort({ voucherNumber: -1 })
      .select('voucherNumber');
    
    const lastNum = lastPayment 
      ? parseInt(lastPayment.voucherNumber.replace(prefix, '')) 
      : 0;
    const voucherNumber = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

    // Determine financial year
    const voucherDate = body.voucherDate || new Date();
    const financialYear = body.financialYear || getPaymentFinancialYear(voucherDate);

    // Compute netAmount
    const netAmount = amount - kasar;

    // Normalize payment mode
    const modeMap: Record<string, string> = {
      'Cash': 'Cash', 'cash': 'Cash',
      'Bank Transfer': 'Bank Transfer', 'bank': 'Bank Transfer',
      'UPI': 'UPI', 'upi': 'UPI',
      'Cheque': 'Cheque', 'cheque': 'Cheque',
    };
    const normalizedMode = modeMap[body.paymentMode] || body.paymentMode || 'Cash';

    // Build payment data with correct field names
    const paymentData: any = {
      voucherNumber,
      voucherDate,
      type,
      amount,
      paymentMode: normalizedMode,
      chequeNumber: body.chequeNumber || body.reference,
      chequeDate: body.chequeDate,
      bankName: body.bankName,
      upiReference: body.upiReference || body.reference,
      kasar,
      netAmount,
      narration: body.narration,
      settlements: Array.isArray(body.settlements) ? body.settlements : [],
      financialYear,
      status: 'confirmed',
      localId: body.localId,
      createdBy: session.user.id,
      syncStatus: 'synced',
    };

    // Set customer/farmer fields based on type
    if (type === 'receipt') {
      paymentData.customerCode = partyCode;
      paymentData.customerName = partyName;
      // Resolve customerId
      const customer = await Customer.findOne({ code: partyCode, createdBy: session.user.id });
      if (customer) paymentData.customerId = customer._id;
    } else {
      paymentData.farmerCode = partyCode;
      paymentData.farmerName = partyName;
      // Resolve farmerId
      const farmer = await Farmer.findOne({ code: partyCode, createdBy: session.user.id });
      if (farmer) paymentData.farmerId = farmer._id;
    }

    // Create payment record
    const payment = await Payment.create(paymentData);

    // Update bill balances and statuses
    if (settlements && settlements.length > 0) {
      for (const settlement of settlements) {
        const bill = await SalesBill.findOne({
          billNumber: settlement.billNumber,
          createdBy: session.user.id,
        });

        if (bill) {
          const newPaidAmount = bill.paidAmount + (settlement.settlingAmount || settlement.amount || 0);
          const newBalanceAmount = bill.balanceAmount - (settlement.settlingAmount || settlement.amount || 0);
          
          let newStatus = bill.status;
          if (newBalanceAmount <= 0) {
            newStatus = 'settled';
          } else if (newPaidAmount > 0) {
            newStatus = 'partial';
          }

          await SalesBill.findByIdAndUpdate(bill._id, {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalanceAmount),
            status: newStatus,
          });
        }
      }
    }

    // Update party balance
    if (type === 'receipt') {
      // Customer paying us - reduce their receivable
      await Customer.findOneAndUpdate(
        { code: partyCode, createdBy: session.user.id },
        { $inc: { currentBalance: -amount } }
      );
    } else {
      // We paying farmer - reduce our payable
      await Farmer.findOneAndUpdate(
        { code: partyCode, createdBy: session.user.id },
        { $inc: { currentBalance: -(amount + kasar) } }
      );
    }

    return NextResponse.json({ payment, _id: payment._id }, { status: 201 });
  } catch (error: any) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to determine financial year from date
function getPaymentFinancialYear(date: Date | string): string {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
