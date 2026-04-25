import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or code.' }, { status: 400 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'Email is already verified.' }, { status: 400 });
    }

    if (!user.emailVerificationToken || user.emailVerificationToken !== code.trim()) {
      return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 });
    }

    if (!user.emailVerificationExpiry || new Date() > user.emailVerificationExpiry) {
      // Clear expired token
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiry = undefined;
      await user.save();
      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Mark verified and clear token
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
