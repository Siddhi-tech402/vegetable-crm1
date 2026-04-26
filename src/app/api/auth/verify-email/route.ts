import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('[verify-email] token received:', token ? token.slice(0, 10) + '...' : 'NONE');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user with this token (case-sensitive exact match)
    const user = await User.findOne({ emailVerificationToken: token.trim() });

    console.log('[verify-email] user found:', user ? user.email : 'NOT FOUND');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or already used verification link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (!user.emailVerificationExpiry || new Date() > user.emailVerificationExpiry) {
      // Clean up expired token
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiry = undefined;
      await user.save();

      console.log('[verify-email] token expired for:', user.email);
      return NextResponse.json(
        { error: 'Verification link has expired. Please request a new one from the login page.' },
        { status: 410 }
      );
    }

    // Mark user as verified and clear token
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    console.log('[verify-email] successfully verified:', user.email);

    return NextResponse.json(
      { message: 'Email verified successfully! You can now log in.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[verify-email] error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
