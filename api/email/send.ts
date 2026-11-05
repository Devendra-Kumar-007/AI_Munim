import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail } from '../_lib/email.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, text, html, attachments } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: 'Both "to" and "subject" are required' });
  }

  const result = await sendEmail({ to, subject, text, html, attachments });
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

