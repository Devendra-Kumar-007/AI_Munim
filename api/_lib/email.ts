import nodemailer from 'nodemailer';
import { getIntegrations } from './db.ts';

export async function createGmailTransporter() {
  const integrations = await getIntegrations();
  const user = process.env.GMAIL_USER || integrations.gmailUser;
  const pass = process.env.GMAIL_APP_PASSWORD || integrations.gmailAppPassword;

  if (!user || !pass) {
    return {
      transporter: null,
      user: null,
      error: 'Gmail SMTP credentials missing. Please set GMAIL_USER and GMAIL_APP_PASSWORD.'
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: pass.replace(/\s+/g, '') // remove spaces from app password
    }
  });

  return { transporter, user, fromName: integrations.fromName || 'AI Munim Accounts' };
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content?: any; path?: string }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { transporter, user, fromName, error } = await createGmailTransporter();
    if (!transporter || !user) {
      return { success: false, error };
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error('[Nodemailer Error]', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email via Gmail SMTP.'
    };
  }
}

export async function verifySmtp(): Promise<{ success: boolean; message: string }> {
  try {
    const { transporter, error } = await createGmailTransporter();
    if (!transporter) {
      return { success: false, message: error || 'Incomplete SMTP configuration.' };
    }

    await transporter.verify();
    return { success: true, message: 'Gmail SMTP connection verified successfully.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'SMTP authentication failed.' };
  }
}

