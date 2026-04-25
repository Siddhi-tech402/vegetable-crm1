import nodemailer from 'nodemailer';

function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.');
  }

  return { transporter: nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } }), gmailUser };
}

// ─── Send 6-digit OTP code ────────────────────────────────────────────────────
export async function sendOtpEmail(
  toEmail: string,
  userName: string,
  otp: string
): Promise<void> {
  const { transporter, gmailUser } = createTransporter();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Vegetable CRM';

  const mailOptions = {
    from: `"${appName}" <${gmailUser}>`,
    to: toEmail,
    subject: `${otp} is your ${appName} verification code`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your verification code</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 32px; text-align: center; }
    .header .logo { display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 14px; margin-bottom: 14px; }
    .header .logo span { color: #fff; font-size: 26px; font-weight: 800; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .body { padding: 40px 32px; text-align: center; }
    .body h2 { color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 10px; }
    .body p { color: #6b7280; font-size: 14px; line-height: 1.7; margin: 0 0 28px; }
    .otp-box { display: inline-block; background: #f0fdf4; border: 2px dashed #10b981; border-radius: 14px; padding: 20px 40px; margin: 8px 0 28px; }
    .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #065f46; font-family: 'Courier New', monospace; }
    .email-badge { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 18px; margin-bottom: 20px; font-size: 14px; font-weight: 600; color: #1e40af; word-break: break-all; }
    .expiry-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 20px; display: inline-block; margin-bottom: 28px; }
    .expiry-box p { color: #92400e; font-size: 13px; margin: 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px; }
    .footer { background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo"><span>V</span></div>
      <h1>${appName}</h1>
    </div>
    <div class="body">
      <h2>Hi ${userName} 👋, here is your verification code</h2>
      <p style="margin-bottom:10px;">Verifying email address:</p>
      <div class="email-badge">📧 ${toEmail}</div>
      <p>Enter the code below on the login page.<br/>Do not share this code with anyone.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <br/>
      <div class="expiry-box">
        <p>⏰ This code expires in <strong>10 minutes</strong></p>
      </div>
      <hr class="divider" />
      <p style="font-size:12px; color:#9ca3af;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ─── Send verification link email (used at signup) ────────────────────────────
export async function sendVerificationEmail(
  toEmail: string,
  userName: string,
  token: string
): Promise<void> {
  const { transporter, gmailUser } = createTransporter();
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Vegetable CRM';

  const mailOptions = {
    from: `"${appName}" <${gmailUser}>`,
    to: toEmail,
    subject: `Verify your ${appName} account`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 32px; text-align: center; }
    .header .logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; margin-bottom: 16px; }
    .header .logo span { color: #ffffff; font-size: 28px; font-weight: 800; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px 32px; }
    .body h2 { color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    .body p { color: #6b7280; font-size: 15px; line-height: 1.7; margin: 0 0 24px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    .link-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; word-break: break-all; font-size: 12px; color: #6b7280; }
    .link-box a { color: #10b981; }
    .expiry { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin-top: 24px; }
    .expiry p { color: #92400e; font-size: 13px; margin: 0; }
    .footer { background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo"><span>V</span></div>
      <h1>${appName}</h1>
      <p>Email Verification</p>
    </div>
    <div class="body">
      <h2>Hi ${userName} 👋</h2>
      <p>
        Welcome to <strong>${appName}</strong>! We're excited to have you on board.<br/>
        Please verify your email address to activate your account and get started.
      </p>
      <div class="btn-wrap">
        <a href="${verificationUrl}" class="btn">✓ Verify My Email</a>
      </div>
      <hr class="divider" />
      <p style="font-size:13px; color:#6b7280; margin-bottom:8px;">
        If the button above doesn't work, copy and paste the link below into your browser:
      </p>
      <div class="link-box">
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>
      <div class="expiry">
        <p>⏰ This verification link will expire in <strong>1 hour</strong>. If it expires, please sign up again.</p>
      </div>
    </div>
    <div class="footer">
      <p>
        If you didn't create an account with ${appName}, you can safely ignore this email.<br/>
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
}
