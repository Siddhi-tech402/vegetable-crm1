import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import SalesBill from '@/models/SalesBill';
import SupplyEntry from '@/models/SupplyEntry';
import { resolveFarmerForSessionUser } from '@/lib/farmerResolver';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const resolvedFarmer = await resolveFarmerForSessionUser(session.user);

  const allFarmers = await Farmer.find({}).select('_id code name email userId createdBy').lean();
  const allBillsCount = await SalesBill.countDocuments({});
  const billsForFarmer = resolvedFarmer
    ? await SalesBill.find({ farmerId: resolvedFarmer._id }).select('billNumber farmerName farmerCode farmerId').lean()
    : [];

  const allBillSample = await SalesBill.find({}).select('billNumber farmerName farmerCode farmerId').limit(5).lean();

  const supplyCount = resolvedFarmer
    ? await SupplyEntry.countDocuments({ farmerId: resolvedFarmer._id })
    : 0;

  return NextResponse.json({
    sessionUser: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    resolvedFarmer: resolvedFarmer ? {
      _id: resolvedFarmer._id,
      code: resolvedFarmer.code,
      name: resolvedFarmer.name,
      email: resolvedFarmer.email,
      userId: resolvedFarmer.userId,
      createdBy: resolvedFarmer.createdBy,
    } : null,
    allFarmers,
    totalBillsInDB: allBillsCount,
    billsMatchingFarmer: billsForFarmer,
    billSample: allBillSample,
    supplyEntriesForFarmer: supplyCount,
  });
}
