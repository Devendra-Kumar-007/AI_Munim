import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail, verifySmtp } from '../_lib/email.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toEmail } = req.body || {};
  if (!toEmail) {
    // If no recipient is specified, just verify the SMTP handshake
    const verifyRes = await verifySmtp();
    return res.status(verifyRes.success ? 200 : 400).json(verifyRes);
  }

  const result = await sendEmail({
    to: toEmail,
    subject: 'AI Munim: Gmail SMTP Integration Test',
    text: `Greetings from AI Munim!\n\nThis is a verification email to confirm that your Gmail SMTP configuration is operating successfully.\n\nAutomated payment reminders, tax reports, and invoices can now be dispatched securely.\n\nTimestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">AI Munim Email System</h2>
        <p>Your Gmail SMTP integration is connected and verified!</p>
        <p style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px;">
          <strong>Target:</strong> ${toEmail}<br/>
          <strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
        <p style="font-size: 12px; color: #64748b;">This email was dispatched via Nodemailer Gmail SMTP.</p>
      </div>
    `
  });

  if (result.success) {
    return res.status(200).json({ success: true, message: `Test email sent successfully to ${toEmail}` });
  } else {
    return res.status(400).json({ success: false, error: result.error });
  }
}

