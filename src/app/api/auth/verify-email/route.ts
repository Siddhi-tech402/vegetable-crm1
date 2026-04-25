import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user with this token
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or already used verification token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (!user.emailVerificationExpiry || new Date() > user.emailVerificationExpiry) {
      // Clean up expired token
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiry = undefined;
      await user.save();

      return NextResponse.json(
        { error: 'Verification link has expired. Please sign up again.' },
        { status: 410 }
      );
    }

    // Mark user as verified and clear token
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return NextResponse.json(
      { message: 'Email verified successfully! You can now log in.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
