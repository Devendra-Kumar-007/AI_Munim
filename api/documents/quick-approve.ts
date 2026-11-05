import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { approverName } = req.body || {};
  const state = await getAppState();
  accountingEngine.setState(state);
  const success = accountingEngine.quickApproveAndPost(approverName);
  if (success) {
    await saveAppState(accountingEngine.getState());
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'No active draft to approve' });
}

