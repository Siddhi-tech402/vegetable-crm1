import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendOtpEmail } from '@/lib/email';

// Send 6-digit OTP to verify email before login
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't leak whether email exists
      return NextResponse.json({ message: 'If that email exists, a code has been sent.' });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'This email is already verified.' }, { status: 400 });
    }

    // Generate 6-digit OTP (valid for 10 minutes)
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.emailVerificationToken = otp;
    user.emailVerificationExpiry = expiry;
    await user.save();

    console.log('[send-otp] Sending code to:', user.email);
    await sendOtpEmail(user.email, user.name, otp);

    return NextResponse.json({ message: 'Verification code sent to your email.' });
  } catch (error: any) {
    console.error('[send-otp] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send code. Please try again.' },
      { status: 500 }
    );
  }
}
