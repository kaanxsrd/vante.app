import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 1000 * 60 * 10;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const rate = rateLimitMap.get(ip) || { count: 0, last: now };
  if (now - rate.last > WINDOW_MS) {
    rate.count = 0;
    rate.last = now;
  }
  if (rate.count >= RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }
  rate.count++;
  rateLimitMap.set(ip, rate);

  const { name, email, message } = await req.json();
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `Contact Form <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `Contact Form Message from ${name}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      html: `
        <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: #f8fafc; min-height: 100vh; padding: 48px 0;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 4px 32px 0 #0002; padding: 0 0 32px 0; border: 1px solid #e5e7eb;">
            <div style="padding: 32px 32px 0 32px;">
              <div style="background: #f1f5f9; border-radius: 12px; padding: 24px 20px; box-shadow: 0 2px 8px 0 #0001; border: 1px solid #e0e7ef;">
                <div style="margin-bottom: 18px;">
                  <span style="font-weight: 600; color: #2563eb;">Name:</span>
                  <span style="margin-left: 8px; color: #0f172a;">${name}</span>
                </div>
                <div style="margin-bottom: 18px;">
                  <span style="font-weight: 600; color: #2563eb;">Email:</span>
                  <span style="margin-left: 8px; color: #0f172a;">${email}</span>
                </div>
                <div>
                  <span style="font-weight: 600; color: #2563eb;">Message:</span>
                  <div style="margin-top: 8px; color: #0f172a; white-space: pre-line; border-left: 3px solid #2563eb; padding-left: 12px;">${message.replace(
                    /\n/g,
                    '<br/>',
                  )}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
