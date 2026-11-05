import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';
import { sendEmail } from '../_lib/email.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { index, recipientEmail } = req.body || {};
  const state = await getAppState();
  accountingEngine.setState(state);
  const result = accountingEngine.sendReminder(index);

  if (result.success) {
    const item = state.receivables[index];
    if (recipientEmail && item) {
      try {
        await sendEmail({
          to: recipientEmail,
          subject: `Payment Reminder: Invoice ${item.invoiceNo} (${state.company.legalName})`,
          text: `Dear ${item.customer},\n\nThis is a friendly reminder that payment of ₹${item.amount.toLocaleString('en-IN')} for invoice ${item.invoiceNo} was due on ${item.dueDate} (${item.agingDays} days ago).\n\nPlease arrange for settlement at your earliest convenience.\n\nThank you,\nFinance Department\n${state.company.legalName}`
        });
      } catch (e) {
        console.warn('Reminder email dispatch skipped:', e);
      }
    }
    await saveAppState(accountingEngine.getState());
  }

  return res.status(200).json(result);
}

