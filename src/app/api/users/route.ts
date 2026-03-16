export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
