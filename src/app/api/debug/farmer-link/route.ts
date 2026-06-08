import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import SalesBill from '@/models/SalesBill';
import SupplyEntry from '@/models/SupplyEntry';

// GET /api/debug/farmer-link — shows what the resolver finds for the current farmer user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = session.user.id;
    const userName = session.user.name;
    const userEmail = session.user.email;

    // Check 1: linked by userId
    const byUserId = await Farmer.findOne({ userId });

    // Check 2: linked by email
    const byEmail = userEmail
      ? await Farmer.findOne({ email: userEmail.toLowerCase() })
      : null;

    // Check 3: match by name (case-insensitive)
    const byName = userName
      ? await Farmer.find({ name: new RegExp(userName.trim(), 'i') })
      : [];

    // All farmers in DB (to help diagnose name mismatches)
    const allFarmers = await Farmer.find({}).select('code name email userId').limit(20);

    // Bills count for each farmer found
    let billsForLinked = 0;
    let suppliesForLinked = 0;
    const linked = byUserId || byEmail || byName[0] || null;
    if (linked) {
      const nameRegex = new RegExp(`^${linked.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      billsForLinked = await SalesBill.countDocuments({
        $or: [{ farmerId: linked._id }, { farmerName: nameRegex }],
      });
      suppliesForLinked = await SupplyEntry.countDocuments({
        $or: [{ farmerId: linked._id }, { farmerName: nameRegex }],
      });
    }

    return NextResponse.json({
      session: { id: userId, name: userName, email: userEmail, role: session.user.role },
      farmerLinkedByUserId: byUserId ? { _id: byUserId._id, code: byUserId.code, name: byUserId.name } : null,
      farmerLinkedByEmail: byEmail ? { _id: byEmail._id, code: byEmail.code, name: byEmail.name } : null,
      farmerMatchedByName: byName.map(f => ({ _id: f._id, code: f.code, name: f.name })),
      farmerResolved: linked ? { _id: linked._id, code: linked.code, name: linked.name } : null,
      billsFound: billsForLinked,
      suppliesFound: suppliesForLinked,
      allFarmersInDB: allFarmers.map(f => ({
        _id: f._id,
        code: f.code,
        name: f.name,
        email: f.email,
        hasUserId: !!f.userId,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
