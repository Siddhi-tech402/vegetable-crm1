import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return success anyway (don't leak whether email exists)
      return NextResponse.json({ message: 'If that email exists, a code has been sent.' });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'This email is already verified.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationToken = otp;
    user.emailVerificationExpiry = expiry;
    await user.save();

    console.log('[OTP] Sending code to:', user.email, '| GMAIL_USER set:', !!process.env.GMAIL_USER);
    await sendOtpEmail(user.email, user.name, otp);

    return NextResponse.json({ message: 'Verification code sent to your email.' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send code. Please try again.' },
      { status: 500 }
    );
  }
}
