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
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width: 520px; width: 100%;">

                  <!-- Main Card -->
                  <tr>
                    <td style="background-color: #111113; border: 1px solid #1e1e24; border-radius: 16px; overflow: hidden;">
                      <!-- Gradient accent bar -->
                      <div style="height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);"></div>

                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding: 32px 28px 28px;">
                        <!-- Sender Info -->
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="width: 48px; vertical-align: top;">
                                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-align: center; line-height: 48px;">
                                    <span style="font-size: 20px; font-weight: 600; color: #ffffff;">${name.charAt(0).toUpperCase()}</span>
                                  </div>
                                </td>
                                <td style="padding-left: 14px; vertical-align: center;">
                                  <div style="font-size: 16px; font-weight: 600; color: #f1f5f9; line-height: 1.3;">${name}</div>
                                  <a href="mailto:${email}" style="font-size: 13px; color: #818cf8; text-decoration: none; line-height: 1.4;">${email}</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <div style="height: 1px; background-color: #1e1e24;"></div>
                          </td>
                        </tr>

                        <!-- Message -->
                        <tr>
                          <td>
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #6366f1; margin-bottom: 12px;">Message</div>
                            <div style="font-size: 15px; line-height: 1.7; color: #cbd5e1; white-space: pre-line; background-color: #0a0a0c; border: 1px solid #1e1e24; border-radius: 10px; padding: 18px 20px;">${message.replace(/\n/g, '<br/>')}</div>
                          </td>
                        </tr>

                        <!-- Reply Button -->
                        <tr>
                          <td style="padding-top: 28px;" align="center">
                            <a href="mailto:${email}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #7c3aed); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px; letter-spacing: 0.2px;">Reply to ${name.split(' ')[0]}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 28px;">
                      <p style="font-size: 12px; color: #4a4a57; margin: 0; line-height: 1.6;">
                        Sent from the contact form on <a href="https://vante.app" style="color: #818cf8; text-decoration: none;">vante.app</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    return NextResponse.json({ success: true });
    //
  } catch {
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
