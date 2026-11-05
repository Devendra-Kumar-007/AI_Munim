import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.body || {};
  const state = await getAppState();
  accountingEngine.setState(state);
  const ok = accountingEngine.sendBankLineToException(id);

  if (ok) {
    await saveAppState(accountingEngine.getState());
  }

  return res.status(200).json({ success: ok });
}

